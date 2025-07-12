import TelegramBot from "node-telegram-bot-api";
import { storage } from "../server/storage";
import { rugMuseumAgent } from "../agents/rugMuseumAgent";

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private isInitialized = false;
  private chatIds: Set<string> = new Set();

  async initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn("📱 Telegram bot token not provided");
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.setupCommands();
      this.setupEventHandlers();
      this.isInitialized = true;
      console.log("📱 Telegram bot initialized successfully");
    } catch (error) {
      console.error("📱 Failed to initialize Telegram bot:", error);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    // Set bot commands
    this.bot.setMyCommands([
      { command: "start", description: "Start the bot and get welcome message" },
      { command: "help", description: "Show available commands" },
      { command: "track", description: "Track a specific stablecoin" },
      { command: "prices", description: "Get current stablecoin prices" },
      { command: "alerts", description: "Get recent alerts" },
      { command: "whales", description: "Get whale activity" },
      { command: "digest", description: "Get latest daily digest" },
      { command: "rug", description: "Get info about a rugged coin" },
      { command: "museum", description: "Get rug museum stats" },
      { command: "subscribe", description: "Subscribe to alerts" },
      { command: "unsubscribe", description: "Unsubscribe from alerts" },
    ]);
  }

  private setupEventHandlers() {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id.toString();
      this.chatIds.add(chatId);
      
      const welcomeMessage = `🐸 Welcome to PEGG WATCH!

I'm your friendly neighborhood stablecoin monitoring bot. I keep track of:
• Stablecoin prices and depegs
• Whale movements and large transactions  
• Daily market digests
• The infamous Rug Museum

Use /help to see all available commands.

Stay stable, stay vigilant! 🐸💰`;

      this.bot?.sendMessage(chatId, welcomeMessage);
    });

    // Handle /help command
    this.bot.onText(/\/help/, (msg) => {
      const helpMessage = `🐸 PEGG WATCH Commands:

💰 **Stablecoin Tracking:**
/track <symbol> - Track a specific stablecoin
/prices - Get current prices
/alerts - Recent alerts

🐋 **Whale Watching:**
/whales - Recent whale activity

📊 **Market Data:**
/digest - Latest daily digest

🪦 **Rug Museum:**
/rug <symbol> - Info about a rugged coin
/museum - Museum statistics

⚙️ **Settings:**
/subscribe - Get live alerts
/unsubscribe - Stop alerts

Need help? Just ask Pegg! 🐸`;

      this.bot?.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown" });
    });

    // Handle /track command
    this.bot.onText(/\/track (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const symbol = match?.[1]?.toUpperCase();
      
      if (!symbol) {
        this.bot?.sendMessage(chatId, "🐸 Please specify a stablecoin symbol. Example: /track USDC");
        return;
      }

      try {
        const coin = await storage.getStablecoinBySymbol(symbol);
        if (!coin) {
          this.bot?.sendMessage(chatId, `🐸 Sorry, I don't track ${symbol} yet. Try USDC, USDT, DAI, or FRAX.`);
          return;
        }

        const price = parseFloat(coin.currentPrice || "1.0");
        const change = parseFloat(coin.priceChange24h || "0");
        const status = coin.pegStatus;
        const emoji = this.getStatusEmoji(status);

        const message = `${emoji} **${coin.name} (${symbol})**

💰 Price: $${price.toFixed(4)}
📈 24h Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
🎯 Peg Status: ${status}
🕒 Last Updated: ${coin.lastUpdated ? new Date(coin.lastUpdated).toLocaleString() : 'Unknown'}

${this.getPeggQuote(status, symbol)}`;

        this.bot?.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        this.bot?.sendMessage(chatId, "🐸 Oops! Something went wrong while tracking that coin.");
      }
    });

    // Handle /prices command
    this.bot.onText(/\/prices/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        const coins = await storage.getStablecoins();
        if (coins.length === 0) {
          this.bot?.sendMessage(chatId, "🐸 No stablecoins being tracked yet!");
          return;
        }

        let message = "💰 **Current Stablecoin Prices:**\n\n";
        
        for (const coin of coins.slice(0, 10)) {
          const price = parseFloat(coin.currentPrice || "1.0");
          const change = parseFloat(coin.priceChange24h || "0");
          const emoji = this.getStatusEmoji(coin.pegStatus);
          
          message += `${emoji} **${coin.symbol}**: $${price.toFixed(4)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)\n`;
        }

        message += "\n🐸 Stay vigilant, stay stable!";
        this.bot?.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        this.bot?.sendMessage(chatId, "🐸 Error fetching prices. Try again later!");
      }
    });

    // Handle /alerts command
    this.bot.onText(/\/alerts/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        const alerts = await storage.getAlerts(5);
        if (alerts.length === 0) {
          this.bot?.sendMessage(chatId, "🐸 No recent alerts. All is peaceful in the stablecoin pond!");
          return;
        }

        let message = "🚨 **Recent Alerts:**\n\n";
        
        for (const alert of alerts) {
          const emoji = this.getAlertEmoji(alert.type, alert.severity);
          const time = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Unknown';
          
          message += `${emoji} **${alert.type}**: ${alert.message}\n`;
          message += `🕒 ${time}\n\n`;
        }

        this.bot?.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        this.bot?.sendMessage(chatId, "🐸 Error fetching alerts. Try again later!");
      }
    });

    // Handle /digest command
    this.bot.onText(/\/digest/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        const digest = await storage.getLatestDigest();
        if (!digest) {
          this.bot?.sendMessage(chatId, "🐸 No digest available yet. Check back later!");
          return;
        }

        const message = `📊 **Daily Digest**
${new Date(digest.date).toLocaleDateString()}

${digest.summary}

🥇 Best Performer: ${digest.bestPerformer || 'N/A'}
🥉 Worst Performer: ${digest.worstPerformer || 'N/A'}
🚨 Alerts: ${digest.alertCount || 0}
🐋 Whale Activity: ${digest.whaleActivityCount || 0}

${digest.memeQuote || "🐸 'Pegg's daily wisdom'"}`;

        this.bot?.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        this.bot?.sendMessage(chatId, "🐸 Error fetching digest. Try again later!");
      }
    });

    // Handle /rug command
    this.bot.onText(/\/rug (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const symbol = match?.[1]?.toUpperCase();
      
      if (!symbol) {
        this.bot?.sendMessage(chatId, "🐸 Please specify a coin symbol. Example: /rug UST");
        return;
      }

      try {
        const rug = await rugMuseumAgent.getRuggedCoinBySymbol(symbol);
        if (!rug) {
          this.bot?.sendMessage(chatId, `🐸 No rug record found for ${symbol}. Maybe it's still alive?`);
          return;
        }

        const message = `🪦 **${rug.name} (${rug.symbol})**

💀 Death Date: ${rug.formattedDeathDate}
💸 Market Cap Lost: ${rug.formattedMarketCap}
⚰️ Cause of Death: ${rug.cause}

📖 **Story:**
${rug.story}

${rug.memeQuote}`;

        this.bot?.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        this.bot?.sendMessage(chatId, "🐸 Error fetching rug data. Try again later!");
      }
    });

    // Handle /subscribe command
    this.bot.onText(/\/subscribe/, (msg) => {
      const chatId = msg.chat.id.toString();
      this.chatIds.add(chatId);
      this.bot?.sendMessage(msg.chat.id, "🐸 You're now subscribed to live alerts! Stay vigilant!");
    });

    // Handle /unsubscribe command
    this.bot.onText(/\/unsubscribe/, (msg) => {
      const chatId = msg.chat.id.toString();
      this.chatIds.delete(chatId);
      this.bot?.sendMessage(msg.chat.id, "🐸 You've been unsubscribed from alerts. Stay safe out there!");
    });

    // Handle errors
    this.bot.on("error", (error) => {
      console.error("📱 Telegram bot error:", error);
    });
  }

  async sendAlert(alert: any) {
    if (!this.bot || this.chatIds.size === 0) return;

    const emoji = this.getAlertEmoji(alert.type, alert.severity);
    const message = `${emoji} **${alert.type} Alert**

${alert.message}

${alert.metadata?.memeQuote || "🐸 'Pegg is watching...'"}`;

    for (const chatId of this.chatIds) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error(`📱 Failed to send alert to chat ${chatId}:`, error);
        // Remove invalid chat IDs
        this.chatIds.delete(chatId);
      }
    }
  }

  async sendDigest(digest: any) {
    if (!this.bot || this.chatIds.size === 0) return;

    const message = `📊 **Daily Digest**
${new Date(digest.date).toLocaleDateString()}

${digest.summary}

🥇 Best: ${digest.bestPerformer || 'N/A'}
🥉 Worst: ${digest.worstPerformer || 'N/A'}
🚨 Alerts: ${digest.alertCount || 0}
🐋 Whales: ${digest.whaleActivityCount || 0}

${digest.memeQuote || "🐸 'Pegg's daily wisdom'"}`;

    for (const chatId of this.chatIds) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error(`📱 Failed to send digest to chat ${chatId}:`, error);
        this.chatIds.delete(chatId);
      }
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case "STABLE": return "✅";
      case "ALERT": return "⚠️";
      case "DEPEGGED": return "🚨";
      default: return "🔍";
    }
  }

  private getAlertEmoji(type: string, severity: string): string {
    if (severity === "CRITICAL") return "🚨";
    if (type === "DEPEG") return "⚠️";
    if (type === "WHALE") return "🐋";
    return "ℹ️";
  }

  private getPeggQuote(status: string, symbol: string): string {
    const quotes = {
      STABLE: [`🐸 "${symbol} is as stable as Pegg's lily pad!"`],
      ALERT: [`🐸 "Pegg is keeping a close eye on ${symbol}..."`],
      DEPEGGED: [`🐸 "PEGG PANIC MODE ACTIVATED FOR ${symbol}!"`],
    };

    const statusQuotes = quotes[status as keyof typeof quotes] || quotes.STABLE;
    return statusQuotes[0];
  }

  async sendTestMessage(message: string): Promise<boolean> {
    if (!this.bot || !this.isInitialized) {
      console.log("📱 Telegram bot not initialized");
      return false;
    }

    // If no chats are subscribed, send to a test chat (first chat that interacted)
    if (this.chatIds.size === 0) {
      console.log("📱 No subscribed chats for test message. Start a chat with @PegWatch_bot first!");
      return false;
    }

    let successCount = 0;
    console.log(`📱 Sending test message to ${this.chatIds.size} chats`);
    
    for (const chatId of this.chatIds) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        successCount++;
        console.log(`📱 Test message sent successfully to chat ${chatId}`);
      } catch (error) {
        console.error(`📱 Failed to send test message to chat ${chatId}:`, error);
        // Remove invalid chat ID
        this.chatIds.delete(chatId);
      }
    }

    console.log(`📱 Test message sent to ${successCount}/${this.chatIds.size} chats`);
    return successCount > 0;
  }

  getStatus() {
    return {
      name: "Telegram Bot",
      isInitialized: this.isInitialized,
      subscribedChats: this.chatIds.size,
    };
  }
}

export const telegramBot = new TelegramBotService();
