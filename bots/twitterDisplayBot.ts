import { storage } from '../server/storage';

export class TwitterDisplayBot {
  private isInitialized = false;
  private hourlyIntervalId: NodeJS.Timeout | null = null;
  private lastTweetTime = 0;
  private readonly tweetCooldown = 300000; // 5 minutes between tweets

  async initialize(): Promise<boolean> {
    console.log('🐦 Initializing Twitter Display Bot (Simulation Mode)...');
    this.isInitialized = true;
    this.startHourlyPosting();
    console.log('🐦 Twitter Display Bot initialized - tweets will be shown in console for manual posting');
    return true;
  }

  private startHourlyPosting() {
    // Post every hour (3600000 ms)
    this.hourlyIntervalId = setInterval(async () => {
      await this.postHourlyContent();
    }, 3600000); // 1 hour

    // Also post one immediately for testing
    setTimeout(() => {
      this.postHourlyContent();
    }, 10000); // 10 seconds after initialization
    
    console.log('🕐 Hourly Twitter posting scheduled (display mode)');
  }

  private async postHourlyContent(): Promise<void> {
    if (!this.isInitialized) {
      console.log('🐦 Twitter bot not initialized, skipping hourly post');
      return;
    }

    try {
      // Randomly choose content type
      const contentTypes = ['whale', 'rug', 'digest'];
      const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

      let tweet = '';

      switch (randomType) {
        case 'whale':
          tweet = await this.generateWhaleContent();
          break;
        case 'rug':
          tweet = await this.generateRugContent();
          break;
        case 'digest':
          tweet = await this.generateDigestContent();
          break;
      }

      if (tweet) {
        await this.displayTweet(tweet);
      }
    } catch (error) {
      console.error('🐦 Error during hourly posting:', error);
    }
  }

  private async generateWhaleContent(): Promise<string> {
    try {
      const transactions = await storage.getWhaleTransactions(5);
      
      if (transactions.length === 0) {
        return `🐋 WHALE WATCH: Currently monitoring large stablecoin movements 24/7. 
Stay alert for major market shifts! 

#WhaleAlert #DeFi #PEGGWATCH`;
      }

      const latestTx = transactions[0];
      const wallets = await storage.getWhaleWallets();
      const wallet = wallets.find(w => w.id === latestTx.walletId);
      
      const amount = this.formatAmount(parseFloat(latestTx.amount || "0"));
      const direction = latestTx.direction.toLowerCase();
      
      return `🐋 WHALE SPOTTED!

Large ${latestTx.token} movement detected:
${amount} ${direction === 'in' ? 'into' : 'from'} ${wallet?.name || 'Unknown Wallet'}

Direction: ${direction.toUpperCase()}
Tracking all major movements 📊

#WhaleAlert #${latestTx.token} #DeFi #PEGGWATCH`;
    } catch (error) {
      return `🐋 Whale tracking systems online! Monitoring stablecoin movements across major wallets. 

#WhaleAlert #DeFi #PEGGWATCH`;
    }
  }

  private async generateRugContent(): Promise<string> {
    try {
      const ruggedCoins = await storage.getRuggedCoins();
      
      if (ruggedCoins.length === 0) {
        return `🪦 RUG MUSEUM: Preserving the history of failed stablecoins to learn from the past.

Education prevents repetition! 

#RugPull #DeFi #PEGGWATCH`;
      }

      const randomRug = ruggedCoins[Math.floor(Math.random() * ruggedCoins.length)];
      
      return `🪦 RUG MUSEUM SPOTLIGHT:

${randomRug.name} (${randomRug.symbol})
💀 Failed: ${this.formatDate(new Date(randomRug.deathDate))}
💰 Peak Market Cap: ${this.formatMarketCap(randomRug.marketCapAtDeath)}

Remember: ${this.getRugLesson(randomRug.symbol)}

#RugPull #${randomRug.symbol} #DeFi #PEGGWATCH`;
    } catch (error) {
      return `🪦 Exploring crypto history in the Rug Museum. Learning from failed projects to build a safer future.

#RugPull #DeFi #PEGGWATCH`;
    }
  }

  private async generateDigestContent(): Promise<string> {
    try {
      const stablecoins = await storage.getStablecoins();
      const alerts = await storage.getAlerts(10);
      
      const stableCount = stablecoins.filter(c => c.pegStatus === 'STABLE').length;
      const alertCount = alerts.filter(a => a.type === 'DEPEG').length;
      const whaleAlerts = alerts.filter(a => a.type === 'WHALE').length;
      
      return `📊 PEGG WATCH DIGEST:

✅ Stable Coins: ${stableCount}/${stablecoins.length}
🚨 Depeg Alerts: ${alertCount}
🐋 Whale Alerts: ${whaleAlerts}

Market Health: ${this.getMarketHealth(stableCount, stablecoins.length)}

Keeping the peg stable! 🎯

#StablecoinWatch #DeFi #PEGGWATCH`;
    } catch (error) {
      return `📊 Daily stablecoin monitoring active! Tracking pegs, whale movements, and market stability 24/7.

#StablecoinWatch #DeFi #PEGGWATCH`;
    }
  }

  private async displayTweet(message: string): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastTweetTime < this.tweetCooldown) {
      console.log('🐦 Tweet cooldown active, skipping display');
      return false;
    }

    console.log('\n🐦 ========== READY TO TWEET ==========');
    console.log('📝 Tweet Content:');
    console.log(message);
    console.log('📏 Character Count:', message.length);
    console.log('🔗 Ready to copy and paste to X/Twitter');
    console.log('=====================================\n');

    this.lastTweetTime = now;
    return true;
  }

  async sendAlert(alert: any): Promise<boolean> {
    if (alert.severity !== "CRITICAL") {
      return false; // Only post critical alerts
    }

    const tweet = this.formatAlertTweet(alert);
    return await this.displayTweet(tweet);
  }

  async sendDigest(digest: any): Promise<boolean> {
    const tweet = this.formatDigestTweet(digest);
    return await this.displayTweet(tweet);
  }

  async sendTestPost(): Promise<boolean> {
    const testTweet = `🤖 PEGG WATCH is online!
Monitoring stablecoins and whale activity 24/7.
Real-time alerts coming soon! 🚨

#DeFi #StablecoinWatch #CryptoSecurity #PEGGWATCH`;
    
    return await this.displayTweet(testTweet);
  }

  private formatAlertTweet(alert: any): string {
    const emoji = this.getAlertEmoji(alert.type, alert.severity);
    let tweet = `${emoji} ${alert.message}`;
    
    if (alert.type === "DEPEG") {
      tweet += ` #${alert.coin}Depeg #StablecoinAlert`;
    } else if (alert.type === "WHALE") {
      tweet += ` #WhaleAlert #CryptoWhales`;
    }
    
    tweet += ` #DeFi #PEGGWATCH`;
    
    return this.truncateTweet(tweet);
  }

  private formatDigestTweet(digest: any): string {
    const tweet = `📊 Daily PEGG WATCH Digest
${digest.summary}

#DeFi #StablecoinWatch #CryptoDaily #PEGGWATCH`;
    
    return this.truncateTweet(tweet);
  }

  private getAlertEmoji(type: string, severity: string): string {
    if (type === "DEPEG") {
      return severity === "CRITICAL" ? "🚨" : "⚠️";
    } else if (type === "WHALE") {
      return severity === "CRITICAL" ? "🐋" : "🐳";
    }
    return "📢";
  }

  private truncateTweet(tweet: string): string {
    if (tweet.length <= 280) return tweet;
    return tweet.substring(0, 277) + "...";
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  private formatMarketCap(marketCap: string | null): string {
    if (!marketCap || marketCap === 'Unknown') return 'Unknown';
    const num = parseFloat(marketCap);
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  }

  private getRugLesson(symbol: string): string {
    const lessons = [
      "Always DYOR before investing",
      "Diversification is key",
      "If it seems too good to be true, it probably is",
      "Check the team and tokenomics",
      "Never invest more than you can afford to lose"
    ];
    return lessons[Math.floor(Math.random() * lessons.length)];
  }

  private getMarketHealth(stable: number, total: number): string {
    const percentage = (stable / total) * 100;
    if (percentage >= 90) return "Excellent 🟢";
    if (percentage >= 80) return "Good 🟡";
    if (percentage >= 70) return "Caution ⚠️";
    return "Critical 🔴";
  }

  stop() {
    if (this.hourlyIntervalId) {
      clearInterval(this.hourlyIntervalId);
      this.hourlyIntervalId = null;
    }
  }

  getStatus() {
    return {
      name: "Twitter Display Bot",
      isInitialized: this.isInitialized,
      mode: "display",
      lastTweetTime: this.lastTweetTime > 0 ? new Date(this.lastTweetTime).toISOString() : null,
      cooldownRemaining: Math.max(0, this.tweetCooldown - (Date.now() - this.lastTweetTime)),
      hourlyPosting: this.hourlyIntervalId !== null
    };
  }
}

export const twitterDisplayBot = new TwitterDisplayBot();