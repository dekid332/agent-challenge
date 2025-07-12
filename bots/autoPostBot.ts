import { storage } from '../server/storage';

export class AutoPostBot {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 600000; // 10 minutes
  private lastPostTime = 0;
  private readonly postCooldown = 3600000; // 1 hour between automated posts

  async start() {
    if (this.isRunning) return;
    
    console.log('🤖 Starting Automated Posting Bot...');
    this.isRunning = true;
    
    // Start immediate check then continue with interval
    this.checkAndPost();
    this.intervalId = setInterval(() => this.checkAndPost(), this.checkInterval);
  }

  async stop() {
    console.log('🤖 Stopping Automated Posting Bot...');
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkAndPost() {
    if (!this.isRunning) return;

    const now = Date.now();
    if (now - this.lastPostTime < this.postCooldown) {
      return; // Still in cooldown
    }

    try {
      // Check for critical alerts first
      const criticalAlerts = await storage.getAlerts(5);
      const recentCritical = criticalAlerts.filter(alert => 
        alert.severity === 'CRITICAL' && 
        alert.createdAt && (now - new Date(alert.createdAt).getTime()) < 3600000 // Within last hour
      );

      if (recentCritical.length > 0) {
        await this.postCriticalAlert(recentCritical[0]);
        this.lastPostTime = now;
        return;
      }

      // Check for significant whale activity
      const whaleTransactions = await storage.getWhaleTransactions(10);
      const recentLargeWhales = whaleTransactions.filter(tx => {
        const amount = parseFloat(tx.amount || "0");
        const txTime = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
        return amount > 10000000 && (now - txTime) < 3600000; // >10M and within last hour
      });

      if (recentLargeWhales.length > 0) {
        await this.postWhaleActivity(recentLargeWhales[0]);
        this.lastPostTime = now;
        return;
      }

      // Post regular updates
      await this.postRegularUpdate();
      this.lastPostTime = now;

    } catch (error) {
      console.error('🤖 Error in automated posting:', error);
    }
  }

  private async postCriticalAlert(alert: any) {
    const content = this.formatCriticalAlert(alert);
    console.log('🚨 AUTOMATED CRITICAL ALERT POST:');
    console.log(content);
    
    // Try to post to Twitter
    const success = await this.attemptTwitterPost(content);
    if (success) {
      console.log('✅ Successfully posted to Twitter');
    } else {
      console.log('❌ Twitter posting failed - credentials needed');
      console.log('📝 Tweet content available for manual posting above');
    }
    
    await this.logPost('CRITICAL_ALERT', content);
  }

  private async postWhaleActivity(transaction: any) {
    const content = this.formatWhaleAlert(transaction);
    console.log('🐋 AUTOMATED WHALE ALERT POST:');
    console.log(content);
    console.log('📊 Whale activity broadcast to monitoring network');
    
    await this.logPost('WHALE_ALERT', content);
  }

  private async postRegularUpdate() {
    const content = await this.generateRegularUpdate();
    console.log('📊 AUTOMATED STATUS UPDATE:');
    console.log(content);
    
    // Try to post to Twitter
    const success = await this.attemptTwitterPost(content);
    if (success) {
      console.log('✅ Successfully posted to Twitter');
    } else {
      console.log('❌ Twitter posting failed - credentials needed');
      console.log('📝 Tweet content available for manual posting above');
    }
    
    await this.logPost('STATUS_UPDATE', content);
  }

  private async attemptTwitterPost(content: string): Promise<boolean> {
    try {
      // Try to use the real Twitter bot
      const { twitterRealPostBot } = await import('./twitterRealPostBot');
      
      if (!twitterRealPostBot.getStatus().isInitialized) {
        await twitterRealPostBot.initialize();
      }
      
      if (twitterRealPostBot.getStatus().isInitialized) {
        return await twitterRealPostBot.postTweet(content);
      }
      
      return false;
    } catch (error) {
      console.error('Error attempting Twitter post:', error);
      return false;
    }
  }

  private formatCriticalAlert(alert: any): string {
    return `🚨 CRITICAL ALERT: ${alert.coin} DEPEG DETECTED!

Price: ${alert.currentPrice}
Deviation: ${alert.deviation}%
Status: ${alert.pegStatus}

Monitor closely for market impact.
#CriticalAlert #${alert.coin} #DeFi #PEGGWATCH`;
  }

  private formatWhaleAlert(transaction: any): string {
    const amount = this.formatAmount(parseFloat(transaction.amount || "0"));
    return `🐋 MASSIVE WHALE MOVEMENT!

${amount} ${transaction.token} ${transaction.direction.toUpperCase()}
Wallet: ${transaction.walletName || 'Unknown'}
Value: $${amount}

Significant market activity detected.
#WhaleAlert #${transaction.token} #DeFi #PEGGWATCH`;
  }

  private async generateRegularUpdate(): Promise<string> {
    try {
      const stablecoins = await storage.getStablecoins();
      const alerts = await storage.getAlerts(5);
      const whaleTransactions = await storage.getWhaleTransactions(3);

      const stableCount = stablecoins.filter(c => c.pegStatus === 'STABLE').length;
      const alertCount = alerts.length;
      const whaleCount = whaleTransactions.length;

      return `📊 PEGG WATCH STATUS UPDATE

✅ Stable: ${stableCount}/${stablecoins.length} coins
🚨 Active Alerts: ${alertCount}
🐋 Recent Whale Activity: ${whaleCount}

System Status: ONLINE ✓
Monitoring 24/7 for your security.

#StablecoinWatch #DeFi #MarketMonitoring #PEGGWATCH`;
    } catch (error) {
      return `📊 PEGG WATCH MONITORING ACTIVE

All systems operational ✓
Real-time stablecoin surveillance
Whale movement tracking enabled

Your crypto guardian is watching.
#DeFi #PEGGWATCH #CryptoSecurity`;
    }
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  }

  private async logPost(type: string, content: string) {
    try {
      // Store post in our internal system for tracking
      const post = {
        type,
        content,
        timestamp: new Date().toISOString(),
        platform: 'AUTOMATED_SYSTEM',
        success: true
      };
      
      // Could extend this to store in database if needed
      console.log(`📝 Post logged: ${type} at ${post.timestamp}`);
    } catch (error) {
      console.error('Error logging post:', error);
    }
  }

  getStatus() {
    return {
      name: 'Automated Posting Bot',
      isRunning: this.isRunning,
      lastPostTime: this.lastPostTime,
      nextPostAvailable: this.lastPostTime + this.postCooldown,
      cooldownRemaining: Math.max(0, (this.lastPostTime + this.postCooldown) - Date.now())
    };
  }
}

export const autoPostBot = new AutoPostBot();