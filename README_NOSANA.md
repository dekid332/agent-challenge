# 🐸 PEGG WATCH - Nosana Agent Challenge Entry

> **$3,000 Nosana Agent Challenge Submission**  
> Advanced AI-powered stablecoin monitoring system built with Mastra framework

A comprehensive multi-agent AI system that monitors stablecoins, tracks whale movements, and preserves the history of failed stablecoins. Built specifically for the **Nosana Agent Challenge** using the Mastra framework.

## 🏆 Challenge Compliance

✅ **Mastra Framework Integration**: Full implementation with proper agent structure  
✅ **Custom AI Agents**: PEGG WATCH agent with specialized tools  
✅ **Production Ready**: Docker containerization with Nosana deployment files  
✅ **Complete Documentation**: Setup, deployment, and usage instructions  
✅ **Open Source**: MIT licensed with full source code access  

## 🚀 Features

### AI Agent System (Mastra Framework)
- **PEGG WATCH Agent**: Main AI agent with personality and domain expertise
- **Depeg Detection Tool**: Real-time stablecoin price monitoring
- **Whale Tracker Tool**: Large transaction monitoring across multiple chains
- **Rug Museum Tool**: Historical database of failed stablecoins

### Real-time Monitoring
- **10+ Stablecoins**: USDC, USDT, DAI, FRAX, TUSD, BUSD, and more
- **Multi-chain Support**: Ethereum, Solana, Polygon, Arbitrum, Base, Optimism
- **Whale Activity**: Track transactions >$100K across all supported networks
- **Alert System**: Instant notifications for critical market events

### Bot Integrations
- **Telegram Bot**: @PegWatch_bot with real-time alerts
- **Discord Bot**: Slash commands and automated notifications
- **Twitter Integration**: Automated market updates (optional)

### Web Dashboard
- **Real-time Interface**: Live price monitoring and whale activity
- **Interactive Charts**: Price history and stability metrics
- **Rug Museum**: Educational content about failed stablecoins
- **AI Chatbot**: Chat with Pegg about stablecoin markets

## 📦 Quick Start

### Prerequisites
- Node.js v20+ 
- PostgreSQL database
- API keys (OpenAI, Etherscan, Telegram Bot)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pegg-watch.git
cd pegg-watch

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Set up database
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 🐳 Docker Deployment

### Build and Run Locally

```bash
# Build the Docker image
docker build -t dekid2/peggwatch .

# Run the container
docker run -p 5000:5000 \
  -e OPENAI_API_KEY=your_key \
  -e DATABASE_URL=your_db_url \
  -e TELEGRAM_BOT_TOKEN=your_token \
  dekid2/peggwatch
```

### Deploy to Nosana

```bash
# Deploy using Nosana CLI
nosana job deploy --file nosana.yaml

# Or upload the nosana.yaml file to Nosana dashboard
```

## 🔧 Configuration

### Required Environment Variables

```env
# AI Functionality
OPENAI_API_KEY=your_openai_api_key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Bot Tokens
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DISCORD_BOT_TOKEN=your_discord_bot_token

# Blockchain APIs
ETHERSCAN_API_KEY=your_etherscan_api_key
SOLSCAN_API_KEY=your_solscan_api_key
```

See `.env.example` for complete configuration options.

## 🏗️ Architecture

### Mastra Agent Structure
```
src/mastra/
├── agents/
│   └── pegg-watch/
│       ├── pegg-watch-agent.ts     # Main AI agent
│       ├── depeg-detector-tool.ts  # Price monitoring tool
│       ├── whale-tracker-tool.ts   # Transaction tracking tool
│       └── rug-museum-tool.ts      # Historical data tool
├── config.ts                       # Mastra configuration
└── index.ts                        # Agent registry
```

### Technology Stack
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **AI Framework**: Mastra + OpenAI
- **Real-time**: WebSocket connections
- **Blockchain**: Multi-chain APIs (Etherscan, Solscan)
- **Deployment**: Docker + Nosana

## 🎯 Nosana Deployment

### Pre-deployment Checklist
✅ Docker image builds successfully  
✅ All environment variables configured  
✅ Database migrations completed  
✅ Health checks passing  
✅ Bot tokens validated  
✅ API keys working  

### Deployment Steps
1. **Push to GitHub**: Commit all changes
2. **Build Docker Image**: `docker build -t dekid2/peggwatch .`
3. **Push to Registry**: `docker push dekid2/peggwatch`
4. **Deploy to Nosana**: Upload `nosana.yaml` to Nosana dashboard
5. **Configure Secrets**: Add environment variables in Nosana
6. **Monitor Deployment**: Check logs and health status

### Social Media Announcement
```
🚀 PEGG WATCH is now live on @nosana_ci! 

🐸 AI-powered stablecoin monitoring
🐋 Real-time whale tracking
📊 Multi-chain DeFi surveillance
🤖 Built with @mastra_ai framework

Built for the #NosanaAgentChallenge 💰

GitHub: https://github.com/your-username/pegg-watch
Live: https://your-nosana-deployment.com

#AI #DeFi #Stablecoins #Blockchain
```

## 🛠️ Development

### Project Structure
```
pegg-watch/
├── src/mastra/           # Mastra agent system
├── client/              # React frontend
├── server/              # Express backend
├── agents/              # Legacy agent system
├── bots/                # Bot integrations
├── shared/              # Shared utilities
├── database.sql         # Database schema
├── Dockerfile           # Container configuration
├── nosana.yaml          # Nosana deployment config
└── .env.example         # Environment template
```

## 📊 Performance Metrics

### Current Monitoring Scope
- **Stablecoins**: 10+ major stablecoins tracked
- **Blockchains**: 6+ networks supported
- **Whale Transactions**: 100K+ threshold monitoring
- **Update Frequency**: 30-second price checks, 5-minute whale scans
- **Alert Response**: <5 second notification delivery

## 🔐 Security

### Data Protection
- Environment variables for sensitive data
- Non-root Docker container execution
- Rate limiting on API endpoints
- Input validation and sanitization

## 🆘 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check DATABASE_URL format
# Ensure PostgreSQL is running
# Verify network connectivity
```

**Bot Not Responding**
```bash
# Validate bot tokens
# Check bot permissions
# Review API rate limits
```

**Mastra Agent Errors**
```bash
# Verify OPENAI_API_KEY
# Check agent configuration
# Review tool implementations
```

## 📜 License

MIT License - see LICENSE file for details.

## 🏆 Acknowledgments

- **Nosana**: For hosting the Agent Challenge
- **Mastra**: For the excellent AI framework
- **OpenAI**: For GPT model access
- **Community**: For testing and feedback

---

**Built for the Nosana Agent Challenge 2024**  
*Monitoring DeFi, one peg at a time* 🐸