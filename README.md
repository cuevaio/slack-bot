# Serverless Slack Bot Tutorial 🚀🤖

**Learn to Build Slack Bots with Serverless Functions (No Framework Required)**

This repository demonstrates how to build a production-ready Slack bot using **serverless functions** and **TypeScript** without relying on Slack's official `@slack/bolt` framework. Perfect for developers who want to understand the underlying mechanics of Slack bot development or prefer the flexibility of serverless architectures.

## 🎯 What You'll Learn

- **Raw Slack API Integration**: Direct webhook handling and event processing
- **Serverless Architecture**: Deploy to Vercel with automatic scaling and cost efficiency  
- **TypeScript Best Practices**: Full type safety for Slack events and payloads
- **Security Implementation**: Request signature verification and event deduplication
- **AI Integration**: Connect with OpenAI for intelligent bot responses

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
- **AI-Powered**: Uses OpenAI GPT-4.1-mini to generate high-quality poetry
- **Duplicate Prevention**: Redis-based event deduplication to prevent double responses
- **Type Safety**: Full TypeScript implementation with comprehensive Slack event types
- **Security**: Slack request signature verification for secure webhook handling

## 🏗️ Architecture

```
src/
├── index.ts              # Main application logic and event handling
├── lib/
│   ├── types.ts          # TypeScript types for Slack events
│   ├── redis.ts          # Redis connection for event deduplication
│   └── verify-slack-request.ts  # Slack signature verification
```

## 🚀 Event Handling

The bot intelligently handles different types of Slack events:

### IM Messages (Direct Messages)
- **Trigger**: User sends a direct message to the bot
- **Processing**: Filters out bot messages and system messages
- **Response**: Generates poetry based on the message content

### App Mentions (Channel Messages)  
- **Trigger**: User mentions the bot in a channel (`@botname prompt`)
- **Processing**: Strips the bot mention and processes the remaining text
- **Response**: Posts the generated poem as a reply in the channel

### Filtered Events
- Bot messages (ignored to prevent loops)
- System messages with subtypes (ignored)
- Empty or whitespace-only messages (ignored)
- Non-event_callback events (rejected early)

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
- Redis instance (for event deduplication)
- Slack app with appropriate permissions

### Environment Variables

Create a `.env.local` file with the following variables:

```env
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
OPENAI_API_KEY=your_openai_api_key
REDIS_URL=your_redis_connection_string
```

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

## 🔍 Monitoring

The bot provides comprehensive logging:

- **Event Reception**: Logs all incoming Slack events with sanitized content
- **Event Filtering**: Clear messages about why events are ignored or processed
- **AI Processing**: Logs when AI generation starts and completes
- **Slack API**: Logs success/failure of message posting to Slack
- **Duplicates**: Alerts when duplicate events are detected and prevented

## 🛡️ Security Features

- **Signature Verification**: All requests verified against Slack's signing secret
- **Event Deduplication**: Redis-based prevention of duplicate event processing  
- **Type Safety**: Comprehensive TypeScript types prevent runtime errors
- **Input Validation**: Proper filtering of bot messages and invalid content

## 🤖 AI Configuration

The bot uses OpenAI's GPT-4.1-mini with this system prompt:
> "You are an arts teacher who writes the best possible poetry."

Poems are generated based on user prompts, creating personalized creative content for each request.

## 📚 Learning Resources

### Next Steps After This Tutorial:
1. **Extend Functionality**: Add slash commands, interactive components, or file uploads
2. **Advanced Patterns**: Implement conversation state, user preferences, or team management
3. **Performance Optimization**: Add caching layers, optimize cold starts, or implement batching
4. **Production Hardening**: Add comprehensive error handling, monitoring, and alerting

### Related Documentation:
- [Slack Events API](https://api.slack.com/events-api) - Official event types and payloads
- [Slack Web API](https://api.slack.com/web) - Available endpoints for bot responses  
- [Vercel Functions](https://vercel.com/docs/functions) - Serverless deployment platform
- [Redis Patterns](https://redis.io/docs/manual/patterns/) - Data structures for state management

### Alternative Implementations:
- **AWS Lambda**: Adapt this code for Lambda deployment with API Gateway
- **Cloudflare Workers**: Minimal changes needed for edge computing deployment
- **Firebase Functions**: Google Cloud alternative with similar patterns
- **Railway/Fly.io**: Traditional hosting with persistent connections
