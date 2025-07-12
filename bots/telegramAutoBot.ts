import { storage } from '../server/storage';

export class TelegramAutoBot {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 600000; // 10 minutes
  private lastPostTime = 0;
  private readonly postCooldown = 3600000; // 1 hour between automated posts

  async start() {
    if (this.isRunning) return;
    
    console.log('📱 Starting Telegram Auto Bot...');
    this.isRunning = true;
    
    // Start immediate check then continue with interval
    this.checkAndPost();
    this.intervalId = setInterval(() => this.checkAndPost(), this.checkInterval);
  }

  async stop() {
    console.log('📱 Stopping Telegram Auto Bot...');
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

      // Check for major whale activity
      const whaleTransactions = await storage.getWhaleTransactions(10);
      const recentWhales = whaleTransactions.filter(tx => 
        tx.timestamp && (now - new Date(tx.timestamp).getTime()) < 3600000 // Within last hour
      );

      const majorWhales = recentWhales.filter(tx => {
        const amount = parseFloat(tx.amount || '0');
        return amount > 10000000; // 10M+ transactions
      });

      if (majorWhales.length > 0) {
        await this.postWhaleActivity(majorWhales[0]);
        this.lastPostTime = now;
        return;
      }

      // Post regular update if nothing critical
      await this.postRegularUpdate();
      this.lastPostTime = now;

    } catch (error) {
      console.error('📱 Telegram Auto Bot error:', error);
    }
  }

  private async postCriticalAlert(alert: any) {
    console.log('🚨 CRITICAL ALERT AUTO-POST:', alert.message);
    
    try {
      const { telegramBot } = await import("./telegramBot");
      await telegramBot.sendAlert(alert);
      console.log('✅ Critical alert sent to Telegram');
      
      // Log the post attempt
      await this.logPost('CRITICAL_ALERT', alert.message);
    } catch (error) {
      console.error('❌ Failed to send critical alert to Telegram:', error);
    }
  }

  private async postWhaleActivity(transaction: any) {
    const amount = parseFloat(transaction.amount || '0');
    const formattedAmount = this.formatAmount(amount);
    
    const content = `🐋 MASSIVE WHALE MOVEMENT!\n${formattedAmount} ${transaction.token} ${transaction.direction?.toUpperCase()}\nWallet: ${transaction.walletName || 'Unknown'}\nValue: $${formattedAmount}\nSignificant market activity detected.\n#WhaleAlert #${transaction.token} #DeFi #PEGGWATCH`;
    
    console.log('🐋 AUTOMATED WHALE ALERT POST:');
    console.log(content);
    
    try {
      const { telegramBot } = await import("./telegramBot");
      const alertData = {
        type: 'WHALE',
        coin: transaction.token,
        message: content,
        severity: amount > 50000000 ? 'CRITICAL' : 'HIGH'
      };
      await telegramBot.sendAlert(alertData);
      console.log('📊 Whale activity sent to Telegram');
      
      // Log the post attempt
      await this.logPost('WHALE_ALERT', content);
    } catch (error) {
      console.error('❌ Failed to send whale alert to Telegram:', error);
    }
  }

  private async postRegularUpdate() {
    try {
      const content = await this.generateRegularUpdate();
      
      console.log('📊 AUTOMATED STATUS UPDATE:');
      console.log(content);
      
      const { telegramBot } = await import("./telegramBot");
      const updateData = {
        type: 'STATUS',
        coin: 'SYSTEM',
        message: content,
        severity: 'INFO'
      };
      await telegramBot.sendAlert(updateData);
      console.log('📊 Status update sent to Telegram');
      
      // Log the post attempt
      await this.logPost('STATUS_UPDATE', content);
    } catch (error) {
      console.error('❌ Failed to send status update to Telegram:', error);
    }
  }

  private async generateRegularUpdate(): Promise<string> {
    try {
      const stablecoins = await storage.getStablecoins();
      const alerts = await storage.getAlerts(10);
      const whaleTransactions = await storage.getWhaleTransactions(10);
      
      const stableCount = stablecoins.filter(coin => {
        const price = parseFloat(coin.currentPrice || '1');
        return Math.abs(price - 1) < 0.01; // Within 1% of peg
      }).length;
      
      const recentAlerts = alerts.filter(alert => {
        if (!alert.createdAt) return false;
        const alertTime = new Date(alert.createdAt).getTime();
        return (Date.now() - alertTime) < 86400000; // Within 24 hours
      }).length;
      
      const recentWhales = whaleTransactions.filter(tx => {
        if (!tx.timestamp) return false;
        const txTime = new Date(tx.timestamp).getTime();
        return (Date.now() - txTime) < 86400000; // Within 24 hours
      }).length;
      
      return `🐸 PEGG WATCH STATUS UPDATE\n✅ Stable: ${stableCount}/${stablecoins.length} coins\n🚨 Active Alerts: ${recentAlerts}\n🐋 Recent Whale Activity: ${recentWhales}\nSystem Status: ONLINE ✓\nMonitoring 24/7 for your security.\n#StablecoinWatch #DeFi #MarketMonitoring #PEGGWATCH`;
    } catch (error) {
      console.error('Error generating regular update:', error);
      return '🐸 PEGG WATCH: System operational, monitoring continues!\n#PEGGWATCH #DeFi';
    }
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  }

  private async logPost(type: string, content: string) {
    try {
      const logEntry = {
        type,
        content: content.substring(0, 100) + '...',
        timestamp: new Date().toISOString(),
        platform: 'telegram'
      };
      console.log(`📝 Post logged: ${type} at ${logEntry.timestamp}`);
    } catch (error) {
      console.error('Error logging post:', error);
    }
  }

  getStatus() {
    return {
      name: "Telegram Auto Bot",
      isRunning: this.isRunning,
      lastPostTime: this.lastPostTime > 0 ? new Date(this.lastPostTime).toISOString() : null,
      cooldownRemaining: Math.max(0, this.postCooldown - (Date.now() - this.lastPostTime)),
      checkInterval: this.checkInterval,
    };
  }
}

// Export a singleton instance
export const telegramAutoBot = new TelegramAutoBot();