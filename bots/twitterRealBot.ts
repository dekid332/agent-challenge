import puppeteer, { Browser, Page } from 'puppeteer';

export class TwitterRealBot {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;
  private username: string;
  private password: string;
  private lastTweetTime = 0;
  private readonly tweetCooldown = 300000; // 5 minutes between tweets

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  async initialize(): Promise<boolean> {
    try {
      console.log("🐦 Initializing Twitter Real Bot...");
      
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
          '--single-process',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });
      
      // Set user agent to appear more like a real browser
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      // Navigate to Twitter login
      await this.page.goto('https://twitter.com/login', { waitUntil: 'networkidle0' });
      
      // Wait for username input and enter credentials
      await this.page.waitForSelector('input[name="text"]', { timeout: 10000 });
      await this.page.type('input[name="text"]', this.username);
      
      // Click Next button
      await this.page.click('[role="button"][data-testid="LoginForm_Login_Button"]');
      
      // Wait for password input
      await this.page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await this.page.type('input[name="password"]', this.password);
      
      // Click Log in button
      await this.page.click('[role="button"][data-testid="LoginForm_Login_Button"]');
      
      // Wait for home page to load
      await this.page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 });
      
      this.isInitialized = true;
      console.log("🐦 Twitter Real Bot initialized successfully");
      return true;
    } catch (error) {
      console.error("🐦 Failed to initialize Twitter Real Bot:", error);
      await this.cleanup();
      return false;
    }
  }

  async postTweet(message: string): Promise<boolean> {
    if (!this.isInitialized || !this.page) {
      console.log("🐦 Bot not initialized, attempting to initialize...");
      const success = await this.initialize();
      if (!success) return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastTweetTime < this.tweetCooldown) {
      console.log("🐦 Tweet cooldown active, skipping tweet");
      return false;
    }

    try {
      // Navigate to home page if not already there
      await this.page!.goto('https://twitter.com/home', { waitUntil: 'networkidle0' });
      
      // Wait for tweet compose area and click it
      await this.page!.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      await this.page!.click('[data-testid="tweetTextarea_0"]');
      
      // Clear any existing text and type new message
      await this.page!.keyboard.down('Control');
      await this.page!.keyboard.press('KeyA');
      await this.page!.keyboard.up('Control');
      await this.page!.keyboard.press('Backspace');
      
      await this.page!.type('[data-testid="tweetTextarea_0"]', message);
      
      // Wait a moment for the tweet to be composed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Click the Tweet button
      await this.page!.click('[data-testid="tweetButtonInline"]');
      
      // Wait for tweet to be posted
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.lastTweetTime = now;
      console.log("🐦 Tweet posted successfully:", message.substring(0, 50) + "...");
      return true;
    } catch (error) {
      console.error("🐦 Failed to post tweet:", error);
      return false;
    }
  }

  async sendAlert(alert: any): Promise<boolean> {
    if (alert.severity !== "CRITICAL") {
      return false; // Only post critical alerts
    }

    const tweet = this.formatAlertTweet(alert);
    return await this.postTweet(tweet);
  }

  async sendDigest(digest: any): Promise<boolean> {
    const tweet = this.formatDigestTweet(digest);
    return await this.postTweet(tweet);
  }

  async sendTestPost(): Promise<boolean> {
    const testTweet = `🤖 PEGG WATCH is online!
Monitoring stablecoins and whale activity 24/7.
Real-time alerts coming soon! 🚨
#DeFi #StablecoinWatch #CryptoSecurity`;
    
    return await this.postTweet(testTweet);
  }

  private formatAlertTweet(alert: any): string {
    const emoji = this.getAlertEmoji(alert.type, alert.severity);
    let tweet = `${emoji} ${alert.message}`;
    
    if (alert.type === "DEPEG") {
      tweet += ` #${alert.coin}Depeg #StablecoinAlert`;
    } else if (alert.type === "WHALE") {
      tweet += ` #WhaleAlert #CryptoWhales`;
    }
    
    tweet += ` #DeFi #CryptoSecurity`;
    
    return this.truncateTweet(tweet);
  }

  private formatDigestTweet(digest: any): string {
    const tweet = `📊 Daily PEGG WATCH Digest
${digest.summary}
#DeFi #StablecoinWatch #CryptoDaily`;
    
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

  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  getStatus() {
    return {
      name: "Twitter Real Bot",
      isInitialized: this.isInitialized,
      mode: "production",
      lastTweetTime: this.lastTweetTime > 0 ? new Date(this.lastTweetTime).toISOString() : null,
      cooldownRemaining: Math.max(0, this.tweetCooldown - (Date.now() - this.lastTweetTime)),
      username: this.username
    };
  }

  async stop(): Promise<void> {
    await this.cleanup();
    this.isInitialized = false;
  }
}

// Create singleton instance
export const twitterRealBot = new TwitterRealBot(
  "Peg_watch",
  "7qk7ch697qk7ch69"
);