# PEGG WATCH - Meme-powered AI Stablecoin Monitor

**Winner of the $3,000 Nosana Agent Challenge**

A comprehensive multi-agent AI system for monitoring stablecoins, tracking whale movements, and preserving the history of failed stablecoins. Built with the Mastra framework for the Nosana Agent Challenge.

## 🏆 Challenge Submission

This project was developed for the **Nosana Agent Challenge** using the Mastra framework. It demonstrates:

- **Mastra Agent Architecture**: Custom PEGG WATCH agent with specialized tools
- **Multi-Chain Integration**: Real-time monitoring across 50+ blockchain networks
- **AI-Powered Analytics**: OpenAI-powered market analysis and meme commentary
- **Production-Ready Deployment**: Docker containerization for Nosana platform

## 🤖 Mastra Agent Structure

### Main Agent: PEGG WATCH Agent
**Location**: `src/mastra/agents/pegg-watch/pegg-watch-agent.ts`

The PEGG WATCH agent is powered by three specialized tools:

1. **Depeg Detector Tool** (`depeg-detector-tool.ts`)
   - Monitors stablecoin prices via CoinGecko API
   - Detects deviations from $1 peg (1% and 5% thresholds)
   - Generates severity levels and meme commentary

2. **Whale Tracker Tool** (`whale-tracker-tool.ts`)
   - Tracks large wallet movements across multiple chains
   - Monitors 1M+ token transactions
   - Provides whale activity summaries

3. **Rug Museum Tool** (`rug-museum-tool.ts`)
   - Maintains historical database of failed stablecoins
   - Includes Terra UST, Iron Finance, Basis Cash, and more
   - Educational content with failure analysis

## 🚀 Features

- **Real-time Stablecoin Monitoring**: Track 10+ stablecoins with 30-second intervals
- **Multi-Chain Whale Tracking**: Monitor whale activity across Ethereum, Solana, Polygon, Arbitrum, Base, Optimism
- **Rug Museum**: Historical archive of 8+ failed stablecoins worth $60B+ in losses
- **AI-Powered Commentary**: OpenAI-generated memes and market analysis
- **Multi-platform Notifications**: Telegram bot with automated alerts
- **Interactive Dashboard**: Real-time updates and visualizations
- **WebSocket Real-time Updates**: Live price feeds and whale alerts

## 🛠 Tech Stack

- **AI Framework**: Mastra with OpenAI GPT-4o-mini
- **Frontend**: React 18, Vite, TailwindCSS, Shadcn UI
- **Backend**: Node.js 20, Express, TypeScript (ESM)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections
- **Blockchain APIs**: Etherscan V2 API (50+ chains), Solscan API
- **Deployment**: Docker, Nosana platform

## 🔧 Setup Instructions

### Prerequisites
- Node.js v20.0 or higher
- PostgreSQL database
- OpenAI API key
- Telegram bot token (optional)
- Etherscan API key (optional)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/pegg-watch.git
cd pegg-watch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Set up the database
psql -d your_database -f database.sql

# Run the development server
npm run dev

# Visit http://localhost:5000
```

## 🌍 Environment Variables

Required for full functionality:

```env
# Core Configuration
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@host:5432/database

# AI Configuration
OPENAI_API_KEY=sk-proj-your-openai-key
API_BASE_URL=https://api.openai.com/v1
MODEL_NAME_AT_ENDPOINT=gpt-4o-mini

# Bot Integration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Blockchain APIs
ETHERSCAN_API_KEY=your-etherscan-api-key

# Admin Access
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
```

## 🐳 Docker Deployment

### Build and Run Locally
```bash
# Build the Docker image
docker build -t dekid2/peggwatch:latest .

# Run the container
docker run -p 5000:5000 \
  -e OPENAI_API_KEY=your-key \
  -e DATABASE_URL=your-db-url \
  dekid2/peggwatch:latest
```

### Nosana Platform Deployment
```bash
# Deploy to Nosana using the nosana.yaml configuration
nosana deploy --config nosana.yaml
```

## 📊 Agent Descriptions

### 1. Depeg Detector Agent
- **Purpose**: Real-time stablecoin price monitoring
- **Frequency**: Every 30 seconds
- **Thresholds**: 1% deviation (alert), 5% deviation (critical)
- **Coverage**: 10+ major stablecoins (USDC, USDT, DAI, FRAX, etc.)

### 2. Whale Trail Agent
- **Purpose**: Track large wallet movements
- **Frequency**: Every 5 minutes
- **Threshold**: $10,000+ transactions
- **Coverage**: 50+ blockchain networks via Etherscan V2 API

### 3. Rug Museum Agent
- **Purpose**: Historical failed stablecoin archive
- **Collection**: 8+ major failures (Terra UST, Iron Finance, etc.)
- **Educational**: Failure analysis and lessons learned

### 4. Digest Agent
- **Purpose**: Daily performance summaries
- **Schedule**: Midnight UTC
- **Content**: Market health, whale activity, alert summaries

## 🎯 Nosana Agent Challenge Compliance

✅ **Mastra Framework**: Built with official Mastra agent structure
✅ **Custom Agent**: PEGG WATCH agent with 3 specialized tools
✅ **Docker Ready**: Lightweight, non-root container
✅ **Production Deployment**: Nosana platform compatible
✅ **OpenAI Integration**: GPT-4o-mini powered analysis
✅ **Real-time Monitoring**: WebSocket and API integrations
✅ **Educational Value**: Rug Museum preserves DeFi history

## 📈 Live Monitoring Data

- **Stablecoins Tracked**: 10 major tokens
- **Whale Transactions**: 100+ recent movements
- **Network Coverage**: Ethereum, Solana, Polygon, Arbitrum, Base, Optimism
- **Real-time Updates**: WebSocket connections
- **Alert System**: Telegram notifications for critical events

## 🛡 Security Features

- **Non-root Docker container**: Enhanced security
- **Environment variable protection**: Secrets management
- **API key validation**: Secure external integrations
- **Admin authentication**: Protected dashboard access
- **Input validation**: Zod schema validation

## 📝 License

MIT License - Built for the Nosana Agent Challenge 2024

## 🏁 Deployment Steps

1. **Development**: `npm run dev` - Local development server
2. **Build**: `npm run build` - Production build
3. **Docker**: `docker build -t dekid2/peggwatch .` - Container build
4. **Deploy**: `nosana deploy` - Nosana platform deployment

---

**Built with 🐸 by the PEGG WATCH team for the Nosana Agent Challenge**