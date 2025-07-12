import puppeteer, { Browser, Page } from 'puppeteer';

export class TwitterPuppeteerBot {
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
      console.log('🤖 Initializing Twitter Puppeteer bot...');
      
      this.browser = await puppeteer.launch({
        headless: true, // Set to false for debugging
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
      
      await this.loginToTwitter();
      this.isInitialized = true;
      
      console.log('🐦 Twitter Puppeteer bot initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Twitter Puppeteer bot:', error);
      await this.cleanup();
      return false;
    }
  }

  private async loginToTwitter(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      console.log('🔐 Logging into Twitter...');
      
      // Navigate to Twitter login
      await this.page.goto('https://twitter.com/login', { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for and enter username/email
      await this.page.waitForSelector('input[name="text"]', { timeout: 15000 });
      await this.page.type('input[name="text"]', this.username, { delay: 100 });

      // Click Next button
      await this.page.click('div[role="button"]:has-text("Next"), button:has-text("Next"), div[data-testid="ocfEnterTextNextButton"]');
      
      // Wait for password field and enter password
      await this.page.waitForSelector('input[name="password"]', { timeout: 15000 });
      await this.page.type('input[name="password"]', this.password, { delay: 100 });

      // Click Login button
      await this.page.click('div[data-testid="LoginForm_Login_Button"], button:has-text("Log in")');

      // Wait for successful login (check for home timeline or profile)
      await this.page.waitForFunction(
        () => window.location.href.includes('twitter.com/home') || 
               window.location.href.includes('twitter.com/i/flow') ||
               document.querySelector('div[data-testid="tweetTextarea_0"]'),
        { timeout: 30000 }
      );

      console.log('✅ Successfully logged into Twitter');

    } catch (error) {
      console.error('❌ Twitter login failed:', error);
      throw error;
    }
  }

  async postTweet(message: string): Promise<boolean> {
    if (!this.isInitialized || !this.page) {
      console.error('❌ Twitter bot not initialized');
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastTweetTime < this.tweetCooldown) {
      console.log('⏰ Tweet cooldown active, skipping...');
      return false;
    }

    try {
      console.log('🐦 Posting tweet:', message.substring(0, 50) + '...');

      // Navigate to home if not already there
      if (!this.page.url().includes('twitter.com/home')) {
        await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
      }

      // Wait for tweet compose area
      await this.page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 10000 });

      // Click on the tweet compose area
      await this.page.click('div[data-testid="tweetTextarea_0"]');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear any existing text and type new message
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      
      await this.page.type('div[data-testid="tweetTextarea_0"]', message, { delay: 50 });

      // Wait for tweet button to be enabled
      await this.page.waitForFunction(
        () => {
          const button = document.querySelector('div[data-testid="tweetButtonInline"]') as HTMLElement;
          return button && !button.hasAttribute('disabled') && button.getAttribute('aria-disabled') !== 'true';
        },
        { timeout: 5000 }
      );

      // Click the tweet button
      await this.page.click('div[data-testid="tweetButtonInline"]');

      // Wait for tweet to be posted (URL change or success indicator)
      await this.page.waitForFunction(
        () => {
          // Check if tweet compose area is empty (indicates successful post)
          const textarea = document.querySelector('div[data-testid="tweetTextarea_0"]') as HTMLElement;
          return !textarea || textarea.innerText.trim() === '';
        },
        { timeout: 10000 }
      );

      this.lastTweetTime = now;
      console.log('✅ Tweet posted successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to post tweet:', error);
      
      // Try to reinitialize on failure
      try {
        await this.cleanup();
        await this.initialize();
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize bot:', reinitError);
      }
      
      return false;
    }
  }

  async sendAlert(alert: any): Promise<boolean> {
    if (!alert) return false;

    let message = '';
    
    if (alert.type === 'DEPEG') {
      message = `🚨 DEPEG ALERT!\n\n${alert.coin} has lost its peg!\nCurrent status: ${alert.message}\n\n#DeFi #Stablecoins #PeggWatch`;
    } else if (alert.type === 'WHALE') {
      message = `🐋 WHALE ALERT!\n\n${alert.message}\n\n#Crypto #WhaleWatch #DeFi #PeggWatch`;
    } else {
      message = `📢 ${alert.message}\n\n#DeFi #PeggWatch`;
    }

    // Truncate if too long (Twitter limit is 280 characters)
    if (message.length > 280) {
      message = message.substring(0, 277) + '...';
    }

    return await this.postTweet(message);
  }

  async sendDigest(digest: any): Promise<boolean> {
    if (!digest) return false;

    const message = `📊 Daily Crypto Digest\n\n${digest.summary}\n\nStay vigilant, crypto fam! 🛡️\n\n#DeFi #CryptoNews #PeggWatch`;
    
    return await this.postTweet(message);
  }

  async sendTestPost(): Promise<boolean> {
    const testMessage = `🤖 PEGG WATCH is online!\n\nMonitoring stablecoins and whale activity 24/7.\nReal-time alerts coming soon! 🚨\n\n#DeFi #StablecoinWatch #CryptoSecurity`;
    
    return await this.postTweet(testMessage);
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
      this.isInitialized = false;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  getStatus() {
    return {
      name: 'Twitter Puppeteer Bot',
      isInitialized: this.isInitialized,
      lastTweetTime: this.lastTweetTime ? new Date(this.lastTweetTime) : null,
      cooldownRemaining: Math.max(0, this.tweetCooldown - (Date.now() - this.lastTweetTime))
    };
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Twitter Puppeteer bot...');
    await this.cleanup();
  }
}

// Create and export the bot instance
export const twitterPuppeteerBot = new TwitterPuppeteerBot(
  'Peg_watch', // username
  '7qk7ch697qk7ch69' // password
);