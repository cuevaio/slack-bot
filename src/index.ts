/**
 * Slack Poetry Bot - AI-Powered Poetry Generator
 * 
 * Architecture Overview:
 * This bot uses a two-tier async processing pattern to handle Slack's 3-second timeout requirement:
 * 
 * 1. Webhook Endpoint (/custom-bot/events):
 *    - Receives Slack events (DMs, mentions)
 *    - Validates requests and filters events
 *    - Queues valid messages via QStash for background processing
 *    - Returns immediate response to Slack (< 3 seconds)
 * 
 * 2. Processing Endpoint (/api/process-message):
 *    - Called asynchronously by QStash
 *    - Generates AI poetry using OpenAI GPT-4 mini
 *    - Sends response back to original Slack channel
 *    - Handles longer processing times without timeout issues
 * 
 * This pattern ensures reliable message processing while maintaining Slack's response time requirements.
 */

// === Dependencies ===
import { Client as QstashClient } from "@upstash/qstash"; // Async queue for background message processing
import { generateText } from "ai"; // AI SDK for OpenAI integration
import { Hono } from "hono"; // Fast, lightweight web framework
import { env } from "hono/adapter"; // Environment variable adapter for Hono

// === Type Definitions ===
import type {
  SlackAppMentionEvent,
  SlackMessageEvent,
  SlackUrlVerification,
  SlackWebhookPayload,
} from "./lib/types.js";
import { verifySlackRequest } from "./lib/verify-slack-request.js";

// === Global Instances ===
const qstash = new QstashClient(); // QStash client for async message queuing
const app = new Hono(); // Hono app instance

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
  // === Environment Configuration ===
  // Extract required environment variables for Slack integration
  const { SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, BASE_URL } = env<{
    SLACK_SIGNING_SECRET: string; // Secret for verifying requests from Slack
    SLACK_BOT_TOKEN: string; // Bot token for Slack API authentication
    BASE_URL: string; // Base URL for this service (for QStash callbacks)
  }>(c);
  console.log("Received Slack webhook event");

  // === Request Body Parsing ===
  // Parse incoming JSON payload for debugging and processing
  const json = await c.req.json();
  console.log("Received body:", JSON.stringify(json, null, 2));

  // Validate that all required environment variables are present
  if (!SLACK_SIGNING_SECRET || !SLACK_BOT_TOKEN) {
    console.error("Missing required environment variables");
    return c.json({ error: "Missing env vars" }, 500);
  }

  // Read raw body text for signature verification (required by Slack security)
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

    // === Async Processing via QStash ===
    // Queue the message for background AI processing to avoid Slack's 3-second timeout
    // QStash will asynchronously call our /api/process-message endpoint
    await qstash.publish({
      url: `${BASE_URL}/api/process-message`, // Target endpoint for background processing
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageEvent), // Forward the complete Slack event data
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

    // === Async Processing via QStash ===
    // Queue the mention for background AI processing to maintain fast webhook response
    // QStash enables reliable async processing with automatic retries
    await qstash.publish({
      url: `${BASE_URL}/api/process-message`, // Target endpoint for background processing
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...mentionEvent, text: cleanText }), // Send cleaned text without bot mention
    });
  }

  // === Unsupported Event Types ===
  else {
    console.log(`Ignoring unsupported event type: ${event.type}`);
  }

  return c.json({ ok: true });
});

/**
 * Async message processing endpoint that handles AI-powered responses.
 * 
 * This endpoint is called asynchronously via QStash to process Slack messages
 * and generate AI-powered poetry responses. It's decoupled from the main webhook
 * to ensure fast response times to Slack's 3-second timeout requirement.
 * 
 * @param {Context} c - Hono request context containing the Slack event data
 * @returns {Response} JSON response indicating processing status
 * 
 * Flow:
 * 1. Extract Slack bot token from environment
 * 2. Parse the incoming Slack event (message or app mention)
 * 3. Generate AI response using OpenAI GPT-4 mini model
 * 4. Send the AI response back to the original Slack channel
 * 5. Return success/error status
 */
app.post("/api/process-message", async (c) => {
  try {
    const { SLACK_BOT_TOKEN } = env<{
      SLACK_BOT_TOKEN: string;
    }>(c);
    const event = (await c.req.json()) as SlackMessageEvent;
    
    // === AI Response Generation ===
    // Use OpenAI GPT-4.1 mini model to generate creative poetry responses
    // The system prompt configures the AI as an arts teacher specializing in poetry
    console.log(`Generating AI response for prompt: "${event.text}"`);
    const { text } = await generateText({
      model: "openai/gpt-4.1-mini", // Cost-effective model optimized for creative tasks
      system: "You are an arts teacher who writes the best possible poetry.", // Role-based prompt for consistent artistic responses
      prompt: `Write a poem about the following prompt: ${event.text}`, // User's message becomes the poem topic
    });

    // === Slack API Response ===
    // Send the generated poetry back to the original Slack channel
    // Uses Slack's chat.postMessage API with bot token authentication
    console.log(`Sending AI response to channel ${event.channel}`);
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`, // Bot token for authentication
      },
      body: JSON.stringify({
        channel: event.channel, // Reply to the same channel where the message came from
        text: text, // AI-generated poetry content
      }),
    });

    // Handle Slack API response and error checking
    const result = await response.json();
    if (!result.ok) {
      console.error("Failed to send message to Slack:", result.error);
      return c.json({ error: "Failed to send message to Slack" }, 500);
    }

    // Event processing completed successfully
    console.log(`Successfully processed and responded to event`);

    return c.json({ ok: true });
  } catch (error) {
    console.error(`Error processing message with AI for event:`, error);

    return c.json({ error: "Error processing message with AI" }, 500);
  }
});

export default app;
