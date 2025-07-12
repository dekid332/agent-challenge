import puppeteer, { Browser, Page } from 'puppeteer';
import { storage } from '../server/storage';

export class TwitterWebBot {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;
  private isLoggedIn = false;
  private lastTweetTime = 0;
  private readonly tweetCooldown = 300000; // 5 minutes between tweets
  private hourlyIntervalId: NodeJS.Timeout | null = null;

  async initialize(username: string, password: string): Promise<boolean> {
    try {
      console.log('🌐 Initializing Twitter Web Bot...');
      
      // Launch browser in headless mode
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Login to Twitter
      await this.loginToTwitter(username, password);
      
      if (this.isLoggedIn) {
        this.isInitialized = true;
        this.startHourlyPosting();
        console.log('🌐 Twitter Web Bot initialized successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to initialize Twitter Web Bot:', error);
      await this.cleanup();
      return false;
    }
  }

  private async loginToTwitter(username: string, password: string): Promise<void> {
    if (!this.page) return;

    try {
      console.log('🔐 Logging into Twitter...');
      
      // Navigate to Twitter login page
      await this.page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });
      
      // Wait for login form
      await this.page.waitForSelector('input[name="text"]', { timeout: 10000 });
      
      // Enter username
      await this.page.type('input[name="text"]', username);
      await this.page.click('div[role="button"] span:has-text("Next")');
      
      // Wait for password field
      await this.page.waitForSelector('input[name="password"]', { timeout: 10000 });
      
      // Enter password
      await this.page.type('input[name="password"]', password);
      await this.page.click('div[role="button"] span:has-text("Log in")');
      
      // Wait for successful login (home page)
      await this.page.waitForSelector('div[data-testid="primaryColumn"]', { timeout: 15000 });
      
      this.isLoggedIn = true;
      console.log('✅ Successfully logged into Twitter');
      
    } catch (error) {
      console.error('❌ Failed to login to Twitter:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  async postTweet(message: string): Promise<boolean> {
    if (!this.page || !this.isLoggedIn) {
      console.log('🌐 Twitter Web Bot not ready for posting');
      return false;
    }

    try {
      // Check cooldown
      const now = Date.now();
      if (now - this.lastTweetTime < this.tweetCooldown) {
        console.log('🕒 Tweet cooldown active, skipping post');
        return false;
      }

      console.log('🐦 Posting tweet via web interface...');
      
      // Navigate to home page if not there
      await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
      
      // Wait for tweet compose box
      await this.page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      
      // Click on tweet compose box
      await this.page.click('div[data-testid="tweetTextarea_0"]');
      
      // Type the tweet
      await this.page.type('div[data-testid="tweetTextarea_0"]', message);
      
      // Wait a moment for the tweet to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Click tweet button
      await this.page.click('div[data-testid="tweetButtonInline"]');
      
      // Wait for tweet to be posted
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      this.lastTweetTime = now;
      console.log('✅ Tweet posted successfully via web interface');
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to post tweet via web interface:', error);
      
      // Log the tweet content for manual posting
      console.log('📝 TWEET CONTENT FOR MANUAL POSTING:');
      console.log('═══════════════════════════════════════');
      console.log(message);
      console.log('═══════════════════════════════════════');
      
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
    
    console.log('🕐 Hourly Twitter web posting scheduled');
  }

  private async postHourlyContent(): Promise<void> {
    if (!this.isInitialized || !this.isLoggedIn) {
      console.log('🌐 Twitter Web Bot not ready for hourly post');
      return;
    }

    try {
      // Generate content similar to other bots
      const tweet = await this.generateTweetContent();
      
      if (tweet) {
        await this.postTweet(tweet);
      }
    } catch (error) {
      console.error('🌐 Error during hourly web posting:', error);
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
    if (!this.isInitialized || !this.isLoggedIn) {
      return false;
    }

    const tweet = this.formatAlertTweet(alert);
    return await this.postTweet(tweet);
  }

  async sendDigest(digest: any): Promise<boolean> {
    if (!this.isInitialized || !this.isLoggedIn) {
      return false;
    }

    const tweet = this.formatDigestTweet(digest);
    return await this.postTweet(tweet);
  }

  async sendTestPost(): Promise<boolean> {
    const testTweet = `🐸 PEGG WATCH TEST POST\n\nTesting automated posting system...\nAll systems operational! ✅\n\nTime: ${new Date().toLocaleString()}\n\n#PEGGWATCH #TestPost`;
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

  private async cleanup(): Promise<void> {
    try {
      if (this.hourlyIntervalId) {
        clearInterval(this.hourlyIntervalId);
        this.hourlyIntervalId = null;
      }
      
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  getStatus() {
    return {
      name: "Twitter Web Bot",
      isInitialized: this.isInitialized,
      isLoggedIn: this.isLoggedIn,
      mode: "web-automation",
      lastTweetTime: this.lastTweetTime > 0 ? new Date(this.lastTweetTime).toISOString() : null,
      cooldownRemaining: Math.max(0, this.tweetCooldown - (Date.now() - this.lastTweetTime)),
      hourlyPosting: this.hourlyIntervalId !== null,
    };
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Twitter Web Bot...');
    this.isInitialized = false;
    this.isLoggedIn = false;
    await this.cleanup();
  }
}

// Export a singleton instance
export const twitterWebBot = new TwitterWebBot();