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
    if (event.type === "message" && !event.subtype) {
      console.log(`Got a message from ${event.user}: ${event.text}`);

      // Reply with "OK, GOT IT"
      await fetch("https://slack.com/api/chat.postMessage", {
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
    }
  }

  return c.json({ ok: true });
});

export default app;
