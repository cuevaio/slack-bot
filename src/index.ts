import { Hono } from "hono";
import { verifySlackRequest } from "./lib/verify-slack-request.js";

const app = new Hono();

// --- Hello World endpoint ---
app.get("/", (c) => {
  return c.text("Hello World! 🌍");
});

// --- Slack event endpoint ---
app.post("/custom-bot/events", async (c) => {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const botToken = process.env.SLACK_BOT_TOKEN;

  if (!signingSecret || !botToken) {
    return c.json({ error: "Missing env vars" }, 500);
  }

  // Read the raw body first for signature verification
  const rawBody = await c.req.text();
  const body = JSON.parse(rawBody);

  // Handle Slack URL verification BEFORE signature verification
  // URL verification requests don't have proper signature headers
  if (body.type === "url_verification") {
    console.log("Received URL verification challenge:", body.challenge);
    return c.json({ challenge: body.challenge });
  }

  // Verify request signature for all other events
  const valid = await verifySlackRequest(c.req.raw, rawBody, signingSecret);
  if (!valid) return c.json({ error: "Invalid signature" }, 401);

  // Handle incoming messages
  if (body.type === "event_callback") {
    const event = body.event;
    
    // Only process message events
    if (event.type === "message") {
      console.log("Message event received:", {
        user: event.user,
        bot_id: event.bot_id,
        channel: event.channel,
        channel_type: event.channel_type,
        text: event.text?.substring(0, 50) + "...", // Log first 50 chars
        subtype: event.subtype
      });

      // Filter out bot messages and non-DM messages
      const isBotMessage = event.bot_id || event.subtype === "bot_message";
      const isDM = event.channel_type === "im"; // 'im' = instant message (DM)
      const hasText = event.text && event.text.trim().length > 0;
      const isRegularMessage = !event.subtype; // No subtype means regular user message

      if (isBotMessage) {
        console.log("Ignoring bot message");
        return c.json({ ok: true });
      }

      if (!isDM) {
        console.log("Ignoring non-DM message, channel type:", event.channel_type);
        return c.json({ ok: true });
      }

      if (!hasText || !isRegularMessage) {
        console.log("Ignoring message without text or with subtype:", event.subtype);
        return c.json({ ok: true });
      }

      console.log(`Processing DM from user ${event.user}: ${event.text}`);

      // Reply with "OK, GOT IT" only to user DMs
      try {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${botToken}`,
          },
          body: JSON.stringify({
            channel: event.channel,
            text: "OK, GOT IT",
          }),
        });

        const result = await response.json();
        if (!result.ok) {
          console.error("Failed to send message:", result.error);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  }

  return c.json({ ok: true });
});

export default app;
