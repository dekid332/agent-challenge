import { TwitterApi } from 'twitter-api-v2';
import { storage } from '../server/storage';

export class TwitterOAuth2Bot {
  private client: TwitterApi | null = null;
  private isInitialized = false;
  private lastTweetTime = 0;
  private readonly tweetCooldown = 300000; // 5 minutes between tweets
  private hourlyIntervalId: NodeJS.Timeout | null = null;

  async initialize(): Promise<boolean> {
    try {
      console.log('🐦 Initializing Twitter OAuth 2.0 Bot...');
      
      // Get OAuth 2.0 credentials
      const clientId = process.env.TWITTER_CLIENT_ID;
      const clientSecret = process.env.TWITTER_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('❌ Missing Twitter OAuth 2.0 credentials');
        return false;
      }

      console.log('🐦 Using Twitter API v2 with OAuth 2.0 Client Credentials');
      
      // Initialize with OAuth 2.0 client credentials flow
      this.client = new TwitterApi(clientSecret);

      // Test the connection with a simple API call
      const appInfo = await this.client.v2.me();
      console.log(`🐦 Twitter OAuth 2.0 Bot initialized for user: ${appInfo.data.username}`);
      
      this.isInitialized = true;
      this.startHourlyPosting();
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Twitter OAuth 2.0 Bot:', error);
      
      // Try bearer token approach as fallback
      try {
        console.log('🐦 Trying bearer token approach...');
        const bearerToken = process.env.TWITTER_BEARER_TOKEN;
        if (bearerToken) {
          this.client = new TwitterApi(bearerToken);
          // Bearer token only allows read operations, but let's test
          console.log('🐦 Bearer token configured, but posting requires user context');
        }
      } catch (bearerError) {
        console.error('❌ Bearer token approach also failed:', bearerError);
      }
      
      return false;
    }
  }

  private startHourlyPosting() {
    // Post every hour
    this.hourlyIntervalId = setInterval(async () => {
      await this.postHourlyContent();
    }, 3600000); // 1 hour

    // Also post one after 30 seconds for testing
    setTimeout(() => {
      this.postHourlyContent();
    }, 30000);
    
    console.log('🕐 Hourly Twitter OAuth 2.0 posting scheduled');
  }

  private async postHourlyContent(): Promise<void> {
    if (!this.isInitialized || !this.client) {
      console.log('🐦 Twitter OAuth 2.0 bot not initialized');
      return;
    }

    try {
      const tweet = await this.generateTweetContent();
      if (tweet) {
        await this.postTweet(tweet);
      }
    } catch (error) {
      console.error('🐦 Error during hourly OAuth 2.0 posting:', error);
    }
  }

  async postTweet(message: string): Promise<boolean> {
    if (!this.client || !this.isInitialized) {
      console.log('🐦 Twitter OAuth 2.0 bot not initialized');
      return false;
    }

    try {
      // Check cooldown
      const now = Date.now();
      if (now - this.lastTweetTime < this.tweetCooldown) {
        console.log('🕒 Tweet cooldown active, skipping post');
        return false;
      }

      console.log('🐦 Posting tweet via OAuth 2.0...');
      
      // Use v2 API with OAuth 2.0
      const tweet = await this.client.v2.tweet(message);
      console.log('✅ Tweet posted successfully via OAuth 2.0:', tweet.data.id);
      this.lastTweetTime = now;
      return true;
      
    } catch (error) {
      console.error('🐦 Failed to post tweet via OAuth 2.0:', error);
      
      // Log the tweet content for manual posting
      console.log('📝 TWEET CONTENT FOR MANUAL POSTING:');
      console.log('═══════════════════════════════════════');
      console.log(message);
      console.log('═══════════════════════════════════════');
      
      return false;
    }
  }

  private async generateTweetContent(): Promise<string> {
    try {
      // Get recent data
      const stablecoins = await storage.getStablecoins();
      const recentAlerts = await storage.getAlerts(3);
      const whaleTransactions = await storage.getWhaleTransactions(3);
      
      // Generate different types of content
      const contentTypes = ['status', 'whale', 'alert'];
      const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      
      switch (randomType) {
        case 'status':
          const stableCount = stablecoins.filter(coin => 
            Math.abs(parseFloat(coin.currentPrice || '1') - 1) < 0.01
          ).length;
          return `🐸 PEGG WATCH STATUS UPDATE\n\n✅ Stable: ${stableCount}/${stablecoins.length} coins\n🔍 Monitoring 24/7\n🚨 Alerts: ${recentAlerts.length}\n\nKeeping your stablecoins pegged! 🎯\n\n#StablecoinWatch #DeFi #PEGGWATCH`;
          
        case 'whale':
          if (whaleTransactions.length > 0) {
            const tx = whaleTransactions[0];
            const amount = parseFloat(tx.amount || '0');
            const formattedAmount = amount >= 1000000 ? 
              `${(amount / 1000000).toFixed(1)}M` : 
              `${(amount / 1000).toFixed(0)}K`;
            return `🐋 WHALE SPOTTED!\n\n${formattedAmount} ${tx.token} ${tx.direction === 'in' ? 'incoming' : 'outgoing'}\n\nThe big fish are moving! 🌊\n\n#WhaleWatch #DeFi #PEGGWATCH`;
          }
          return `🐋 Whale watchers unite! 🌊\n\nMonitoring the biggest wallets 24/7\nBig moves = Big alerts 🚨\n\n#WhaleWatch #DeFi #PEGGWATCH`;
          
        case 'alert':
          if (recentAlerts.length > 0) {
            const alert = recentAlerts[0];
            return `🚨 ALERT: ${alert.coin} ${alert.message}\n\nStay vigilant, crypto fam! 🐸\n\n#DepegAlert #StablecoinWatch #PEGGWATCH`;
          }
          return `🐸 All systems green! 💚\n\nPEGG WATCH keeping your stablecoins safe\nNo depegs detected 🎯\n\n#StablecoinWatch #DeFi #PEGGWATCH`;
          
        default:
          return `🐸 PEGG WATCH is ON DUTY!\n\nMonitoring stablecoins 24/7\nYour crypto guardian 🛡️\n\n#PEGGWATCH #DeFi #StablecoinSafety`;
      }
    } catch (error) {
      console.error('Error generating tweet content:', error);
      return `🐸 PEGG WATCH: Always watching, always protecting! 🛡️\n\n#PEGGWATCH #DeFi`;
    }
  }

  async sendAlert(alert: any): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    const tweet = this.formatAlertTweet(alert);
    return await this.postTweet(tweet);
  }

  async sendDigest(digest: any): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    const tweet = this.formatDigestTweet(digest);
    return await this.postTweet(tweet);
  }

  async sendTestPost(): Promise<boolean> {
    const testTweet = `🐸 PEGG WATCH OAuth 2.0 TEST\n\nTesting new authentication system...\nAll systems operational! ✅\n\nTime: ${new Date().toLocaleString()}\n\n#PEGGWATCH #OAuth2Test`;
    return await this.postTweet(testTweet);
  }

  private formatAlertTweet(alert: any): string {
    const emoji = this.getAlertEmoji(alert.type, alert.severity);
    const severity = alert.severity === 'CRITICAL' ? '🚨 CRITICAL' : '⚠️ ALERT';
    
    return `${emoji} ${severity}: ${alert.message}\n\nStay informed, stay safe! 🐸\n\n#${alert.type}Alert #PEGGWATCH`;
  }

  private formatDigestTweet(digest: any): string {
    return `📊 DAILY DIGEST\n\n${digest.summary}\n\nYour daily crypto health check! 🐸\n\n#DailyDigest #PEGGWATCH`;
  }

  private getAlertEmoji(type: string, severity: string): string {
    if (severity === 'CRITICAL') return '🚨';
    if (type === 'DEPEG') return '📉';
    if (type === 'WHALE') return '🐋';
    return '⚠️';
  }

  private truncateTweet(tweet: string): string {
    if (tweet.length <= 280) return tweet;
    return tweet.substring(0, 277) + '...';
  }

  stop() {
    if (this.hourlyIntervalId) {
      clearInterval(this.hourlyIntervalId);
      this.hourlyIntervalId = null;
    }
  }

  getStatus() {
    return {
      name: "Twitter OAuth 2.0 Bot",
      isInitialized: this.isInitialized,
      mode: "oauth2",
      lastTweetTime: this.lastTweetTime > 0 ? new Date(this.lastTweetTime).toISOString() : null,
      cooldownRemaining: Math.max(0, this.tweetCooldown - (Date.now() - this.lastTweetTime)),
      hourlyPosting: this.hourlyIntervalId !== null,
    };
  }
}

// Export a singleton instance
export const twitterOAuth2Bot = new TwitterOAuth2Bot();