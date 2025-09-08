import { Client as QstashClient } from "@upstash/qstash";
import { generateText } from "ai";
import { Hono } from "hono";
import { env } from "hono/adapter";

import type {
  SlackAppMentionEvent,
  SlackMessageEvent,
  SlackUrlVerification,
  SlackWebhookPayload,
} from "./lib/types.js";
import { verifySlackRequest } from "./lib/verify-slack-request.js";

const qstash = new QstashClient();

const app = new Hono();

// --- Hello World endpoint ---
app.get("/", (c) => {
  return c.text("Hello World! 🌍");
});

// --- Slack event endpoint ---
/**
 * Handles incoming Slack events including:
 * - URL verification challenges during app setup
 * - Direct messages (IM) to the bot
 * - App mentions in channels
 */
app.post("/custom-bot/events", async (c) => {
  const { SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, BASE_URL } = env<{
    SLACK_SIGNING_SECRET: string;
    SLACK_BOT_TOKEN: string;
    BASE_URL: string;
  }>(c);
  console.log("Received Slack webhook event");

  // Parse the incoming request body
  const json = await c.req.json();
  console.log("Received body:", JSON.stringify(json, null, 2));

  if (!SLACK_SIGNING_SECRET || !SLACK_BOT_TOKEN) {
    console.error("Missing required environment variables");
    return c.json({ error: "Missing env vars" }, 500);
  }

  // Read the raw body for signature verification
  const rawBody = await c.req.text();
  const body: SlackWebhookPayload = JSON.parse(rawBody);

  // === URL Verification Phase ===
  // Handle Slack URL verification BEFORE signature verification
  // URL verification requests don't have proper signature headers
  if (body.type === "url_verification") {
    console.log("Received URL verification challenge:", body.challenge);
    return c.json({ challenge: body.challenge });
  }

  // === Security Verification ===
  // Verify request signature for all other events
  const valid = await verifySlackRequest(
    c.req.raw,
    rawBody,
    SLACK_SIGNING_SECRET
  );
  if (!valid) {
    console.error("Invalid Slack signature - rejecting request");
    return c.json({ error: "Invalid signature" }, 401);
  }

  // === Event Type Filtering ===
  // Only process event_callback type events, reject all others
  if (body.type !== "event_callback") {
    console.log(
      `Ignoring non-event_callback event type: ${
        (body as SlackUrlVerification).type
      }`
    );
    return c.json({ ok: true });
  }

  // === Event Processing ===
  // At this point we know it's an event_callback type
  const event = body.event;

  console.log(`Processing event type: ${event.type} from user: ${event.user}`);

  // === IM Message Handling ===
  // Handle direct messages (private conversations with the bot)
  if (
    event.type === "message" &&
    (event as SlackMessageEvent).channel_type === "im"
  ) {
    const messageEvent = event as SlackMessageEvent;

    console.log("IM message received:", {
      user: messageEvent.user,
      channel: messageEvent.channel,
      text: messageEvent.text?.substring(0, 100) + "...",
      subtype: messageEvent.subtype,
      bot_id: messageEvent.bot_id,
    });

    // Filter out bot messages and messages with subtypes (system messages, etc.)
    const isBotMessage =
      messageEvent.bot_id || messageEvent.subtype === "bot_message";
    const hasText = messageEvent.text && messageEvent.text.trim().length > 0;
    const isRegularMessage = !messageEvent.subtype; // No subtype means regular user message

    if (isBotMessage) {
      console.log("Ignoring bot message in IM");
      return c.json({ ok: true });
    }

    if (!hasText || !isRegularMessage) {
      console.log(
        `Ignoring IM message without text or with subtype: ${messageEvent.subtype}`
      );
      return c.json({ ok: true });
    }

    console.log(
      `Processing IM message from user ${messageEvent.user}: "${messageEvent.text}"`
    );

    await qstash.publish({
      url: `${BASE_URL}/api/process-message`,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageEvent),
    });
  }

  // === App Mention Handling ===
  // Handle @mentions of the bot in channels
  else if (event.type === "app_mention") {
    const mentionEvent = event as SlackAppMentionEvent;

    console.log("App mention received:", {
      user: mentionEvent.user,
      channel: mentionEvent.channel,
      text: `${mentionEvent.text?.substring(0, 100)}...`,
    });

    // Extract the message text without the bot mention
    const hasText = mentionEvent.text && mentionEvent.text.trim().length > 0;

    if (!hasText) {
      console.log("Ignoring app mention without text");
      return c.json({ ok: true });
    }

    // Remove the bot mention from the text to get the actual prompt
    const cleanText = mentionEvent.text?.replace(/<@[^>]+>/g, "").trim() || "";

    if (!cleanText) {
      console.log("Ignoring app mention with only bot mention and no content");
      return c.json({ ok: true });
    }

    console.log(
      `Processing app mention from user ${mentionEvent.user} in channel ${mentionEvent.channel}: "${cleanText}"`
    );

    // Generate AI response for app mentions
    await qstash.publish({
      url: `${BASE_URL}/api/process-message`,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...mentionEvent, text: cleanText }),
    });
  }

  // === Unsupported Event Types ===
  else {
    console.log(`Ignoring unsupported event type: ${event.type}`);
  }

  return c.json({ ok: true });
});

app.post("/api/process-message", async (c) => {
  try {
    const { SLACK_BOT_TOKEN } = env<{
      SLACK_BOT_TOKEN: string;
    }>(c);
    const event = (await c.req.json()) as SlackMessageEvent;
    // Generate AI response
    console.log(`Generating AI response for prompt: "${event.text}"`);
    const { text } = await generateText({
      model: "openai/gpt-4.1-mini",
      system: "You are an arts teacher who writes the best possible poetry.",
      prompt: `Write a poem about the following prompt: ${event.text}`,
    });

    // Send response to Slack
    console.log(`Sending AI response to channel ${event.channel}`);
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: event.channel,
        text: text,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error("Failed to send message to Slack:", result.error);
      return c.json({ error: "Failed to send message to Slack" }, 500);
    }

    // Mark event as processed only after successful response
    console.log(`Successfully processed and responded to event`);

    return c.json({ ok: true });
  } catch (error) {
    console.error(`Error processing message with AI for event:`, error);

    return c.json({ error: "Error processing message with AI" }, 500);
  }
});

export default app;
