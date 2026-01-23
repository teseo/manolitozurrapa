🇬🇧 English | [🇪🇸 Español](README_ES.md)

# ManolitoZurrapa

> *The most authentic Andalusian Twitch bot on the internet, illo*

Twitch bot with Andalusian personality that creates clips, answers questions with AI, searches the web, celebrates channel events, compliments the queens of chat, and generates stream summaries.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![Twitch](https://img.shields.io/badge/Twitch-Bot-9146FF?logo=twitch)
![AI](https://img.shields.io/badge/AI-DeepSeek%20%7C%20Groq%20%7C%20OpenAI-orange?logo=openai)
![Brave](https://img.shields.io/badge/Brave-Search_API-FB542B?logo=brave)
![Discord](https://img.shields.io/badge/Discord-Webhooks-5865F2?logo=discord)

---

## Features

### Clip System
- **`!clip [duration] [title]`** - Creates stream clips
- Durations: 15, 30, 45, 60, 90 seconds
- 30s cooldown between clips
- Permissions: Broadcaster, Mods, VIPs
- Automatic Discord notification

### AI Chat (DeepSeek / Groq / OpenAI)
- **`!oyemanolito <question>`** - Quick chat with Manolito
- **`@ManolitoZurrapa <message>`** - Full interaction (chat + search)
- Andalusian personality: illo, quillo, aro, ozú, miarma...
- Channel context: knows the streamer and community
- User memory: remembers your last conversations
- **Anti prompt-injection protection**: sanitizes malicious inputs

### Web Search (Brave Search + AI)
- **`@ManolitoZurrapa search for <query>`** - Search the web
- Variants: "busca", "buscame", "puedes buscar" (ES), "search for" (EN), "soek" (AF)
- Synthesizes results from multiple sources
- 10-minute cooldown after reaching limit (resets counter)

### Multi-language
- **Spanish** - Andalusian accent (illo, quillo, miarma...)
- **English** - British/Australian casual (mate, bloke, cheers...)
- **Afrikaans** - South African slang (boet, tjom, lekker...)
- Automatic language detection
- Responds in the same detected language

### Stream Summary
- **`!resumen`** - Generates stream summary (broadcaster only)
- Progressive summary system every 30 minutes
- Tracks: clips, subs, raids, bits, searches
- Combines mini-summaries into a final summary

### Twitch Events
The bot automatically responds to:
- **Subscriptions** - Welcomes new subs
- **Resubs** - Celebrates loyalty
- **Sub gifts** - Thanks gifters
- **Raids** - Welcomes raiders
- **Bits/Cheers** - Thanks donations
- **Watch Streaks** - Celebrates viewing streaks

### Token Auto-Refresh
- Proactive validation every 30 minutes
- Automatic refresh before expiration
- Transparent chat client reconnection
- Discord notifications if something fails

### Security
- **Prompt injection protection**: Blocks attempts to manipulate the bot
  - "ignore previous instructions", "reveal system prompt", etc.
- **Input sanitization**: Cleans delimiters and malicious patterns
- **User content wrapping**: Isolates user messages from system prompt

### Tier System

| Tier | AI Messages | Searches |
|------|-------------|----------|
| No sub | - | - |
| T1 / Prime | 30/session | - |
| T2 | 60/session | 10 + 10min cooldown |
| T3 | Unlimited | 150 + 10min cooldown |
| VIP/Mod | Unlimited | 150 + 10min cooldown |
| Broadcaster | Unlimited | Unlimited |

---

## Installation

```bash
# Clone the repo
git clone https://github.com/teseo/manolitozurrapa.git
cd manolitozurrapa

# Install dependencies
npm install

# Configure credentials
cp .env.example .env
cp src/config/community.example.ts src/config/community.ts
cp CONTEXTO.example.md CONTEXTO.md

# Edit configuration files with your data

# OAuth authentication with Twitch
npm run auth

# Build TypeScript
npm run build

# Start the bot
npm start
```

---

## Configuration

### Environment variables (`.env`)

```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_CHANNEL=your_channel
TWITCH_BOT_USERNAME=bot_name
AI_API_KEY=your_ai_api_key
AI_PROVIDER=deepseek
BRAVE_API_KEY=your_brave_api_key
DISCORD_WEBHOOK_URL=your_webhook_url
```

### Configuration files

- **`CONTEXTO.md`** - Channel info for AI responses
- **`literales.json`** - Texts, compliments and personality (ES/EN/AF)
- **`src/config/community.ts`** - Community: queens, mods, VIPs, emotes

---

## Project Structure

```
manolitozurrapa/
├── src/
│   ├── index.ts              # Main bot
│   ├── env.ts                # Environment variables loader
│   ├── auth.ts               # OAuth authentication
│   ├── config/
│   │   ├── constants.ts      # Configuration and limits
│   │   └── community.ts      # Channel roles and emotes
│   ├── services/
│   │   ├── ai.ts             # Groq/Llama integration
│   │   ├── search.ts         # Brave Search
│   │   ├── discord.ts        # Discord Webhooks
│   │   └── twitch.ts         # Twitch API
│   ├── managers/
│   │   ├── token.ts          # OAuth token management
│   │   ├── memory.ts         # User memory
│   │   └── stream-summary.ts # Stream summaries
│   ├── utils/
│   │   ├── helpers.ts        # General utilities
│   │   └── logger.ts         # Logging system
│   └── types/
│       └── index.ts          # TypeScript types
├── tests/                    # Unit tests
├── literales.json            # Multi-language texts
├── data/                     # Session data (ignored)
└── logs/                     # Session logs (ignored)
```

---

## Scripts

```bash
npm start          # Start bot (production)
npm run dev        # Start with hot-reload
npm run build      # Compile TypeScript
npm run auth       # Get OAuth tokens
npm test           # Run tests
npm run validate   # Check TypeScript syntax
```

---

## Bot Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `!clip [sec] [title]` | Create clip | VIP/Mod/Broadcaster |
| `!oyemanolito <msg>` | AI chat | Subs |
| `@ManolitoZurrapa <msg>` | AI chat (+ search with "search for") | Subs (search T2+) |
| `!cuentamealgomanolito` | Fun fact | Everyone |
| `!mismensajes` | Check remaining usage | Everyone |
| `!resumen` | Stream summary | Broadcaster |
| `!ayudaclip` | Clip help | Everyone |

---

## Tech Stack

- **Runtime:** Node.js 20+ (ES Modules)
- **Language:** TypeScript 5+
- **Chat:** tmi.js
- **LLM:** Multi-provider (DeepSeek, Groq, OpenAI, OpenRouter)
- **Search:** Brave Search API
- **Notifications:** Discord Webhooks
- **Auth:** Twitch OAuth 2.0 with auto-refresh
- **Tests:** Jest

---

## License

MIT

---

<p align="center">
  <i>Made with manzanilla in Andalucía</i> 🇳🇬<br>
  <b>¡Claro que sí!</b>
</p>
