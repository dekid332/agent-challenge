import { TwitterApi } from "twitter-api-v2";
import { storage } from "../server/storage";

export class TwitterBotService {
  private client: TwitterApi | null = null;
  private isInitialized = false;
  private lastTweetTime = 0;
  private readonly tweetCooldown = 300000; // 5 minutes between tweets
  private hourlyIntervalId: NodeJS.Timeout | null = null;

  async initialize() {
    const appKey = process.env.X_API_KEY;
    const appSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

    console.log("🐦 Twitter API credentials check:", {
      appKey: appKey ? `${appKey.substring(0, 5)}...` : "missing",
      appSecret: appSecret ? `${appSecret.substring(0, 5)}...` : "missing",
      accessToken: accessToken ? `${accessToken.substring(0, 5)}...` : "missing",
      accessSecret: accessSecret ? `${accessSecret.substring(0, 5)}...` : "missing"
    });

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
      console.warn("🐦 Twitter API credentials not provided");
      return;
    }

    try {
      this.client = new TwitterApi({
        appKey,
        appSecret,
        accessToken,
        accessSecret,
      });

      // Test authentication with a simple API call
      console.log("🐦 Testing Twitter API authentication...");
      const user = await this.client.v2.me();
      console.log(`🐦 Twitter bot initialized for @${user.data.username}`);
      this.isInitialized = true;
      
      // Start hourly posting schedule
      this.startHourlySchedule();
    } catch (error) {
      console.error("🐦 Failed to initialize Twitter bot:", error);
      
      // Additional debugging
      if (error.code === 401) {
        console.error("🐦 401 Unauthorized - Check if:");
        console.error("  - App has Read and Write permissions");
        console.error("  - Access tokens were regenerated after permission change");
        console.error("  - Bearer token is not being used (we need OAuth 1.0a)");
      }
    }
  }

  async sendTweet(message: string, mediaIds?: string[]): Promise<boolean> {
    if (!this.client || !this.isInitialized) {
      console.warn("🐦 Twitter client not initialized");
      return false;
    }

    // Rate limiting
    const now = Date.now();
    if (now - this.lastTweetTime < this.tweetCooldown) {
      console.log("🐦 Tweet rate limited, skipping");
      return false;
    }

    try {
      const tweet = await this.client.v2.tweet({
        text: message,
        media: mediaIds ? { media_ids: mediaIds } : undefined,
      });

      this.lastTweetTime = now;
      console.log("🐦 Tweet sent successfully:", tweet.data.id);
      return true;
    } catch (error) {
      console.error("🐦 Failed to send tweet:", error);
      return false;
    }
  }

  async sendAlert(alert: any): Promise<boolean> {
    if (alert.severity !== "CRITICAL") {
      return false; // Only tweet critical alerts
    }

    const tweetText = this.formatAlertTweet(alert);
    return await this.sendTweet(tweetText);
  }

  async sendDigest(digest: any): Promise<boolean> {
    const tweetText = this.formatDigestTweet(digest);
    return await this.sendTweet(tweetText);
  }

  async sendDepegAlert(coin: string, price: number, deviation: number): Promise<boolean> {
    const tweetText = this.formatDepegTweet(coin, price, deviation);
    return await this.sendTweet(tweetText);
  }

  async sendWhaleAlert(walletName: string, amount: string, token: string, direction: string): Promise<boolean> {
    const tweetText = this.formatWhaleTweet(walletName, amount, token, direction);
    return await this.sendTweet(tweetText);
  }

  private formatAlertTweet(alert: any): string {
    const hashtags = this.getHashtags(alert.type, alert.coin);
    const emoji = this.getAlertEmoji(alert.type, alert.severity);
    
    let tweet = `${emoji} ${alert.type.toUpperCase()} ALERT\n\n`;
    tweet += `${alert.message}\n\n`;
    tweet += `${alert.metadata?.memeQuote || "🐸 'Pegg is watching...'"}`;
    tweet += `\n\n${hashtags}`;

    return this.truncateTweet(tweet);
  }

  private formatDigestTweet(digest: any): string {
    const date = new Date(digest.date).toLocaleDateString();
    const hashtags = "#PeggWatch #StablecoinDigest #DeFi #CryptoAlert";
    
    let tweet = `📊 DAILY PEGG DIGEST - ${date}\n\n`;
    tweet += `🥇 Best: ${digest.bestPerformer || 'N/A'}\n`;
    tweet += `🥉 Worst: ${digest.worstPerformer || 'N/A'}\n`;
    tweet += `🚨 Alerts: ${digest.alertCount || 0}\n`;
    tweet += `🐋 Whale Activity: ${digest.whaleActivityCount || 0}\n\n`;
    tweet += `${digest.memeQuote || "🐸 'Pegg's daily wisdom'"}\n\n`;
    tweet += hashtags;

    return this.truncateTweet(tweet);
  }

  private formatDepegTweet(coin: string, price: number, deviation: number): string {
    const hashtags = `#${coin} #Depeg #PeggWatch #StablecoinAlert`;
    const deviationPercent = (deviation * 100).toFixed(2);
    
    let tweet = `🚨 DEPEG ALERT\n\n`;
    tweet += `${coin} has lost its peg!\n`;
    tweet += `💰 Price: $${price.toFixed(4)}\n`;
    tweet += `📉 Deviation: ${deviationPercent}%\n\n`;
    tweet += `🐸 "Pegg is not happy about this..."\n\n`;
    tweet += hashtags;

    return this.truncateTweet(tweet);
  }

  private formatWhaleTweet(walletName: string, amount: string, token: string, direction: string): string {
    const hashtags = `#${token} #WhaleAlert #PeggWatch #CryptoWhale`;
    const action = direction === "IN" ? "moved to" : "moved from";
    
    let tweet = `🐋 WHALE ALERT\n\n`;
    tweet += `${amount} ${token} ${action} ${walletName}\n\n`;
    tweet += `🐸 "Big fish swimming in the ${token} pond..."\n\n`;
    tweet += hashtags;

    return this.truncateTweet(tweet);
  }

  private getAlertEmoji(type: string, severity: string): string {
    if (severity === "CRITICAL") return "🚨";
    if (type === "DEPEG") return "⚠️";
    if (type === "WHALE") return "🐋";
    return "ℹ️";
  }

  private getHashtags(type: string, coin?: string): string {
    let hashtags = "#PeggWatch #StablecoinAlert #DeFi #CryptoAlert";
    
    if (coin) {
      hashtags += ` #${coin}`;
    }
    
    if (type === "DEPEG") {
      hashtags += " #Depeg";
    } else if (type === "WHALE") {
      hashtags += " #WhaleAlert";
    }
    
    return hashtags;
  }

  private truncateTweet(tweet: string): string {
    const maxLength = 280;
    if (tweet.length <= maxLength) {
      return tweet;
    }
    
    // Try to truncate at a word boundary
    const truncated = tweet.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + "...";
    }
    
    return truncated + "...";
  }

  async scheduleRegularTweets() {
    if (!this.isInitialized) return;

    // Schedule daily digest tweets
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 12 && now.getMinutes() === 0) { // Daily at noon
        const digest = await storage.getLatestDigest();
        if (digest) {
          await this.sendDigest(digest);
        }
      }
    }, 60000); // Check every minute

    // Schedule weekly summary tweets
    setInterval(async () => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0) { // Monday at 9 AM
        await this.sendWeeklySummary();
      }
    }, 60000);
  }

  private async sendWeeklySummary() {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const alerts = await storage.getAlerts(1000);
      const weeklyAlerts = alerts.filter(alert => 
        alert.createdAt && new Date(alert.createdAt) >= oneWeekAgo
      );

      const depegAlerts = weeklyAlerts.filter(alert => alert.type === "DEPEG").length;
      const whaleAlerts = weeklyAlerts.filter(alert => alert.type === "WHALE").length;

      const tweet = `📊 WEEKLY PEGG SUMMARY\n\n` +
        `🚨 Depeg Alerts: ${depegAlerts}\n` +
        `🐋 Whale Alerts: ${whaleAlerts}\n` +
        `📈 Total Alerts: ${weeklyAlerts.length}\n\n` +
        `🐸 "Another week in the wild world of stablecoins!"\n\n` +
        `#PeggWatch #WeeklySummary #StablecoinAlert #DeFi`;

      await this.sendTweet(tweet);
    } catch (error) {
      console.error("🐦 Failed to send weekly summary:", error);
    }
  }

  private startHourlySchedule() {
    if (this.hourlyIntervalId) {
      clearInterval(this.hourlyIntervalId);
    }
    
    // Post every hour
    this.hourlyIntervalId = setInterval(async () => {
      await this.postHourlyUpdate();
    }, 3600000); // 1 hour
    
    console.log("🐦 Started hourly posting schedule for Twitter bot");
  }

  private async postHourlyUpdate() {
    try {
      const contentType = Math.random();
      
      if (contentType < 0.3) {
        // 30% chance - Post about a rug
        await this.postAboutRug();
      } else if (contentType < 0.6) {
        // 30% chance - Post about whale activity
        await this.postAboutWhales();
      } else if (contentType < 0.8) {
        // 20% chance - Post about alerts
        await this.postAboutAlerts();
      } else {
        // 20% chance - General PEGG Watch update
        await this.postGeneralUpdate();
      }
    } catch (error) {
      console.error("🐦 Failed to post hourly update:", error);
    }
  }

  private async postAboutRug() {
    const rugs = await storage.getRuggedCoins();
    if (rugs.length === 0) return;
    
    const randomRug = rugs[Math.floor(Math.random() * rugs.length)];
    const tweet = `💀 RUG MUSEUM SPOTLIGHT\n\n` +
      `${randomRug.name} (${randomRug.symbol})\n` +
      `💸 Cause: ${randomRug.cause}\n` +
      `📅 Death: ${new Date(randomRug.deathDate).toLocaleDateString()}\n\n` +
      `${randomRug.memeQuote || "Another one bites the dust!"}\n\n` +
      `#RugPull #StablecoinAlert #PeggWatch #DeFi`;
    
    await this.sendTweet(tweet);
  }

  private async postAboutWhales() {
    const transactions = await storage.getWhaleTransactions(10);
    if (transactions.length === 0) return;
    
    const recentTx = transactions[0];
    const tweet = `🐋 WHALE ALERT\n\n` +
      `Detected large ${recentTx.token} movement!\n` +
      `💰 Amount: ${recentTx.amount}\n` +
      `📊 Direction: ${recentTx.direction}\n\n` +
      `🐸 "The whales are moving... are you watching?"\n\n` +
      `#WhaleAlert #PeggWatch #StablecoinMovement #DeFi`;
    
    await this.sendTweet(tweet);
  }

  private async postAboutAlerts() {
    const alerts = await storage.getAlerts(5);
    const recentAlert = alerts.find(alert => alert.type === "DEPEG");
    
    if (recentAlert) {
      const tweet = `🚨 DEPEG ALERT\n\n` +
        `${recentAlert.message}\n\n` +
        `🐸 "Keep your eyes pegged on the markets!"\n\n` +
        `#DepegAlert #PeggWatch #StablecoinAlert #DeFi`;
      
      await this.sendTweet(tweet);
    } else {
      await this.postGeneralUpdate();
    }
  }

  private async postGeneralUpdate() {
    const updates = [
      "🐸 PEGG WATCH is monitoring the stablecoin markets 24/7!\n\nStay informed about depegs, whale movements, and market stability.\n\n#PeggWatch #StablecoinMonitoring #DeFi",
      "💎 Another hour of stable monitoring complete!\n\n🔍 Scanning for depegs\n🐋 Tracking whale movements\n📊 Analyzing market data\n\n#PeggWatch #CryptoAlert",
      "🚀 PEGG WATCH: Your AI-powered stablecoin sentinel!\n\nNever miss a depeg or whale movement again.\n\n#PeggWatch #AIMonitoring #StablecoinAlert",
      "🌊 Riding the waves of stablecoin volatility!\n\nPEGG WATCH keeps you informed when the markets get wild.\n\n#PeggWatch #MarketWatch #DeFi"
    ];
    
    const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
    await this.sendTweet(randomUpdate);
  }

  async sendTestPost(): Promise<boolean> {
    const testTweet = "🧪 TEST POST\n\n" +
      "PEGG WATCH bot is online and functioning perfectly!\n\n" +
      "🐸 Ready to monitor stablecoins and track whales 24/7\n" +
      "🤖 All systems operational\n\n" +
      "#PeggWatch #TestPost #BotOnline";
    
    return await this.sendTweet(testTweet);
  }

  stop() {
    if (this.hourlyIntervalId) {
      clearInterval(this.hourlyIntervalId);
      this.hourlyIntervalId = null;
      console.log("🐦 Stopped hourly posting schedule");
    }
  }

  getStatus() {
    return {
      name: "Twitter Bot",
      isInitialized: this.isInitialized,
      lastTweetTime: this.lastTweetTime,
      cooldownRemaining: Math.max(0, this.tweetCooldown - (Date.now() - this.lastTweetTime)),
      hourlyScheduleActive: this.hourlyIntervalId !== null,
    };
  }
}

export const twitterBot = new TwitterBotService();
