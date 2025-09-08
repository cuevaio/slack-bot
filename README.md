# AI-Powered Slack Poetry Bot 🚀🤖

**Production-Ready Slack Bot with Async Processing Architecture**

This repository demonstrates how to build a production-ready AI-powered Slack bot using modern serverless technologies: **Hono**, **QStash**, and the **AI SDK**. The bot generates creative poetry in response to direct messages and channel mentions, while implementing a robust two-tier architecture to handle Slack's strict 3-second response requirements.

## 🎯 What You'll Learn

- **Async Processing Architecture**: Handle Slack's 3-second timeout using QStash for background processing
- **Modern Web Framework**: Build fast APIs with Hono's lightweight, edge-optimized framework
- **AI-Powered Responses**: Generate creative poetry using the AI SDK with OpenAI GPT-4 mini
- **Production-Grade Event Handling**: Implement reliable webhook processing with retry logic
- **TypeScript Best Practices**: Full type safety for Slack events and AI responses
- **Security Implementation**: Slack request signature verification and secure API handling

## 🚨 The Slack 3-Second Challenge

Slack's Events API has a strict requirement: **your server must respond with HTTP 200 within 3 seconds** or the event will be considered failed. According to [Slack's documentation](https://docs.slack.dev/apis/events-api/#failure), failure conditions include:

- **Response timeout**: Taking longer than 3 seconds to respond
- **Invalid responses**: Any non-200 HTTP status code (except redirects)
- **SSL issues**: Certificate validation failures
- **Connection problems**: Server unreachability

### The Retry Problem

When your server fails to respond within 3 seconds, Slack implements an exponential backoff retry strategy:

1. **Immediate retry** - Almost instant retry
2. **1-minute retry** - Second attempt after 1 minute  
3. **5-minute retry** - Final attempt after 5 minutes

**Critical Impact**: If your app fails to respond successfully to more than 95% of events within 60 minutes, Slack will **temporarily disable your event subscriptions**.

### Our QStash Solution

This bot solves the timeout challenge using **QStash** (Upstash's message queue) to implement a **two-tier async processing architecture**:

```
📱 Slack Event → 🚀 Webhook (< 3s response) → 📬 QStash Queue → 🤖 AI Processing → 💬 Response
```

**Benefits of this approach:**
- ✅ **Instant response**: Webhook responds to Slack in milliseconds
- ✅ **Reliable processing**: QStash ensures messages are processed even if AI generation takes time
- ✅ **Automatic retries**: QStash handles failed processing attempts
- ✅ **Scalable**: Handle high event volumes without timeout issues
- ✅ **Cost-effective**: Only pay for actual processing time

## ⚖️ Serverless vs @slack/bolt Framework

| Aspect | **Serverless Functions** (This Approach) | **@slack/bolt Framework** |
|--------|-------------------------------------------|---------------------------|
| **Learning Curve** | 📚 Steeper - understand Slack APIs directly | 🟢 Gentler - high-level abstractions |
| **Control & Flexibility** | 🎯 Full control over request/response flow | 🔒 Framework conventions and limitations |
| **Hosting Costs** | 💰 Pay-per-request, near $0 for low traffic | 💸 Persistent server costs (always running) |
| **Scaling** | 🚀 Automatic infinite scaling | 📈 Manual server scaling required |
| **Cold Start Issues** | ⚠️ Potential 3s timeout challenges | ✅ Always warm, no cold starts |
| **Infrastructure** | ☁️ Zero server management | 🖥️ Server maintenance and monitoring |
| **Debugging** | 🔍 More manual event inspection | 🛠️ Built-in debugging tools |
| **Long-running Tasks** | ❌ Limited by function timeouts | ✅ Handle extended operations |
| **Understanding** | 🧠 Deep knowledge of Slack mechanics | 📦 Abstracted implementation details |

### 🎯 Choose Serverless When:
- Building cost-effective bots with sporadic usage
- Learning how Slack APIs work under the hood
- Need maximum flexibility in request handling
- Want zero infrastructure management
- Prefer TypeScript with full type control

### 🎯 Choose @slack/bolt When:
- Need rapid prototyping with minimal setup
- Handling complex workflows and long-running tasks
- Want official Slack support and updates
- Team prefers framework conventions over custom code
- Building enterprise apps with dedicated infrastructure

## ✨ What This Bot Demonstrates

- **Direct Message Support**: Send the bot a private message with any prompt and receive a personalized poem
- **Channel Mentions**: Mention the bot in any channel (`@botname your prompt`) to get a public poetry response
- **Two-Tier Async Architecture**: Instant webhook responses + background AI processing via QStash
- **AI-Powered Creativity**: Uses OpenAI GPT-4 mini via AI SDK to generate high-quality poetry
- **Production-Grade Reliability**: Handles Slack's 3-second timeout with robust retry mechanisms
- **Type Safety**: Full TypeScript implementation with comprehensive Slack event types
- **Security**: Slack request signature verification for secure webhook handling

## 🏗️ Architecture & Tech Stack

### Project Structure
```
src/
├── index.ts              # Hono app with two-tier async processing
├── lib/
│   ├── types.ts          # TypeScript types for Slack events
│   └── verify-slack-request.ts  # Slack signature verification
```

### Technology Stack

- **🌐 [Hono](https://hono.dev/)**: Ultra-fast web framework optimized for edge runtimes
- **📬 [QStash](https://upstash.com/docs/qstash)**: Serverless message queue for async background processing  
- **🤖 [AI SDK](https://sdk.vercel.ai/)**: Type-safe AI integration for OpenAI GPT-4 mini
- **⚡ [Vercel](https://vercel.com/)**: Serverless deployment platform with automatic scaling
- **🔒 TypeScript**: Full type safety for Slack events and AI responses

### Two-Tier Processing Flow

```mermaid
graph LR
    A[Slack Event] --> B[Hono Webhook]
    B --> C{Event Valid?}
    C -->|Yes| D[QStash Publish]
    C -->|No| E[Return 200 OK]
    D --> E
    E --> F[< 3 Second Response]
    
    D --> G[QStash Queue]
    G --> H[Background Processor]
    H --> I[AI SDK + OpenAI]
    I --> J[Generated Poetry]
    J --> K[Slack API Response]
```

**Tier 1 - Instant Webhook Response** (`/custom-bot/events`):
1. Receives Slack events via Hono framework
2. Validates request signatures and event types
3. Publishes valid events to QStash queue
4. Returns HTTP 200 to Slack (< 3 seconds guaranteed)

**Tier 2 - Async AI Processing** (`/api/process-message`):
1. QStash triggers background processing endpoint
2. AI SDK generates poetry using OpenAI GPT-4 mini
3. Posts generated response back to original Slack channel
4. Handles longer processing times without timeout issues

## 🚀 Event Handling

The bot uses intelligent event filtering and async processing:

### IM Messages (Direct Messages)
- **Trigger**: User sends a direct message to the bot
- **Instant Response**: Webhook validates and queues event via QStash (< 3s)
- **Async Processing**: Background worker generates poetry using AI SDK
- **Final Response**: Bot posts generated poem back to the user

### App Mentions (Channel Messages)  
- **Trigger**: User mentions the bot in a channel (`@botname write about sunsets`)
- **Instant Response**: Webhook strips bot mention and queues clean text via QStash
- **Async Processing**: AI generates poetry based on the clean prompt
- **Final Response**: Bot posts poem as public reply in the channel

### Intelligent Event Filtering
The webhook tier filters events before queuing:
- ✅ **Valid events**: Direct messages and app mentions with content
- ❌ **Bot messages**: Ignored to prevent infinite loops
- ❌ **System messages**: Messages with subtypes are filtered out
- ❌ **Empty content**: Messages without text content are ignored
- ❌ **Invalid events**: Non-event_callback types rejected early

### Async Processing Benefits
- **No timeouts**: AI generation can take 10+ seconds without affecting Slack
- **Reliable delivery**: QStash ensures messages are processed even if temporary failures occur
- **Automatic retries**: Failed AI generations are automatically retried by QStash
- **Scalable**: Handle multiple conversations simultaneously without blocking

## 🔧 Why Build Without @slack/bolt?

This tutorial takes the **"learn by building"** approach by implementing Slack bot functionality from scratch. You'll gain deep understanding of:

1. **Raw Webhook Handling**: How Slack sends events to your application
2. **Event Type Processing**: Manual parsing and routing of different Slack events  
3. **Security Implementation**: Signature verification to prevent unauthorized requests
4. **State Management**: Redis-based deduplication and session handling
5. **API Integration**: Direct calls to Slack's Web API without abstractions
6. **Serverless Patterns**: Designing functions for optimal performance and cost

**Perfect for developers who want to:**
- Understand Slack's architecture beyond framework abstractions
- Implement custom logic that doesn't fit framework patterns
- Build ultra-lightweight bots with minimal dependencies
- Learn transferable skills for other webhook-based APIs

## 🛠️ Setup

### Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed globally  
- [QStash account](https://console.upstash.com/) for async message processing
- Slack app with appropriate permissions

### Environment Variables

Create a `.env.local` file with the following variables:

```env
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
OPENAI_API_KEY=your_openai_api_key
QSTASH_TOKEN=your_qstash_token
BASE_URL=https://your-domain.vercel.app
```

**Getting QStash credentials:**
1. Sign up at [Upstash Console](https://console.upstash.com/)
2. Create a new QStash database
3. Copy the `QSTASH_TOKEN` from your dashboard

### Slack App Configuration

1. Create a new Slack app at [api.slack.com](https://api.slack.com/apps)
2. Enable **Event Subscriptions** and set your webhook URL to: `https://your-domain.vercel.app/custom-bot/events`
3. Subscribe to these **Bot Events**:
   - `message.im` (for direct messages)
   - `app_mention` (for channel mentions)
4. Install the app to your workspace and copy the Bot User OAuth Token

### Required OAuth Scopes

Your Slack app needs these scopes:
- `chat:write` - Send messages as the bot
- `app_mentions:read` - Receive app mention events
- `im:read` - Receive direct message events

## 💻 Development

To develop locally:

```bash
npm install
vc dev
```

Open http://localhost:3000 to verify the server is running.

### Testing the Bot

1. **Direct Message Test**: Send a DM to your bot with any text (e.g., "ocean sunset")
2. **Channel Mention Test**: In a channel, type `@your-bot-name write about mountains`
3. **Check Logs**: Monitor the console for detailed event processing logs

## 🏗️ Build & Deploy

To build locally:

```bash
npm install
vc build
```

To deploy:

```bash
npm install
vc deploy
```

## 🔍 Monitoring & Observability

The bot provides comprehensive logging across both processing tiers:

**Webhook Tier Logging:**
- **Event Reception**: Logs all incoming Slack events with sanitized content
- **Event Filtering**: Clear messages about why events are ignored or processed
- **QStash Publishing**: Confirms successful queuing of events for background processing
- **Response Times**: Tracks webhook response times to ensure < 3 second compliance

**Background Processing Tier:**
- **AI Generation**: Logs when AI poetry generation starts and completes
- **Slack API Responses**: Logs success/failure of message posting to Slack
- **Error Handling**: Detailed error logging for troubleshooting failed processing
- **Queue Processing**: QStash automatically provides retry and failure metrics

## 🛡️ Security & Reliability Features

- **Signature Verification**: All webhook requests verified against Slack's signing secret
- **Async Reliability**: QStash ensures message processing even during temporary failures
- **Type Safety**: Comprehensive TypeScript types prevent runtime errors  
- **Input Validation**: Proper filtering of bot messages and invalid content
- **Automatic Retries**: QStash handles failed AI processing attempts automatically
- **Rate Limiting Protection**: Background processing prevents webhook timeout issues

## 🤖 AI Configuration

The bot uses **OpenAI GPT-4 mini** via the **AI SDK** with this configuration:

```typescript
const { text } = await generateText({
  model: "openai/gpt-4.1-mini", // Cost-effective model optimized for creative tasks
  system: "You are an arts teacher who writes the best possible poetry.",
  prompt: `Write a poem about the following prompt: ${userMessage}`,
});
```

**Why GPT-4 mini?**
- **Cost-effective**: Significantly cheaper than full GPT-4 for creative tasks
- **Fast generation**: Quick response times perfect for async processing
- **Creative quality**: Excellent for poetry and creative writing tasks

## 📚 Learning Resources

### Next Steps After This Tutorial:
1. **Extend Functionality**: Add slash commands, interactive components, or file uploads
2. **Advanced QStash Patterns**: Implement delayed jobs, scheduled poetry, or batch processing
3. **AI Enhancements**: Add conversation memory, style preferences, or multi-modal inputs
4. **Production Hardening**: Add comprehensive error handling, monitoring, and alerting

### Key Documentation:
- **[Slack Events API](https://docs.slack.dev/apis/events-api/#failure)** - Critical timeout and retry behavior
- **[QStash Documentation](https://upstash.com/docs/qstash)** - Async message processing patterns
- **[AI SDK Guide](https://sdk.vercel.ai/)** - Type-safe AI integration patterns
- **[Hono Documentation](https://hono.dev/)** - Ultra-fast web framework for edge runtimes
- **[Vercel Functions](https://vercel.com/docs/functions)** - Serverless deployment and scaling

### Alternative Deployment Options:
- **Cloudflare Workers**: Deploy the same Hono app to Cloudflare's edge network
- **AWS Lambda**: Adapt for Lambda with API Gateway (may need timeout adjustments)
- **Railway/Fly.io**: Traditional hosting with persistent QStash connections
- **Deno Deploy**: Edge deployment with native TypeScript support
