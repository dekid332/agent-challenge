import { storage } from "../server/storage";
import { websocketService } from "../server/services/websocketService";
import { botService } from "../server/services/botService";

export class DigestAgent {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly digestTime = "00:00"; // Daily at midnight
  private dailyIntervalId: NodeJS.Timeout | null = null;
  private lastDigestDate: string | null = null;

  async start() {
    if (this.isRunning) {
      console.log("📊 Digest Agent already running");
      return;
    }

    this.isRunning = true;
    console.log("📊 Starting Digest Agent");

    // Check every minute if it's time to create a digest
    this.intervalId = setInterval(async () => {
      await this.checkDigestTime();
    }, 60000);

    // Also check immediately
    await this.checkDigestTime();
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log("📊 Stopping Digest Agent");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkDigestTime() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDate = now.toDateString();

    // Check if it's digest time and we haven't created one today
    if (currentTime === this.digestTime && this.lastDigestDate !== currentDate) {
      await this.createDailyDigest();
      this.lastDigestDate = currentDate;
    }
  }

  async createDailyDigest() {
    try {
      console.log("📊 Creating daily digest...");
      
      const digestData = await this.collectDigestData();
      const digest = await this.generateDigest(digestData);
      
      // Store digest in database
      const savedDigest = await storage.createDigestEntry(digest);
      
      // Broadcast to WebSocket clients
      websocketService.broadcast({
        type: "digest_ready",
        data: savedDigest,
      });

      // Send to all bot channels
      await botService.sendDigestToAllChannels(savedDigest);
      
      console.log("📊 Daily digest created and distributed");
      return savedDigest;
    } catch (error) {
      console.error("📊 Error creating daily digest:", error);
      await this.createErrorAlert(error);
    }
  }

  private async collectDigestData() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all data from last 24 hours
    const [stablecoins, alerts, whaleTransactions] = await Promise.all([
      storage.getStablecoins(),
      storage.getAlerts(1000),
      storage.getWhaleTransactions(1000),
    ]);

    // Filter data for last 24 hours
    const todayAlerts = alerts.filter(alert => 
      alert.createdAt && new Date(alert.createdAt) >= yesterday
    );

    const todayWhaleActivity = whaleTransactions.filter(tx => 
      tx.timestamp && new Date(tx.timestamp) >= yesterday
    );

    return {
      stablecoins,
      todayAlerts,
      todayWhaleActivity,
      timeframe: "24h",
    };
  }

  private async generateDigest(data: any) {
    const { stablecoins, todayAlerts, todayWhaleActivity } = data;
    
    // Calculate key metrics
    const metrics = this.calculateMetrics(stablecoins, todayAlerts, todayWhaleActivity);
    
    // Generate summary
    const summary = this.generateSummary(metrics);
    
    // Generate meme quote
    const memeQuote = this.generateMemeQuote(metrics);

    return {
      date: new Date(),
      summary,
      bestPerformer: metrics.bestPerformer,
      worstPerformer: metrics.worstPerformer,
      avgPegDeviation: metrics.avgPegDeviation.toFixed(4),
      whaleActivityCount: todayWhaleActivity.length,
      alertCount: todayAlerts.length,
      memeQuote,
      postedToChannels: [], // Will be updated when posted
    };
  }

  private calculateMetrics(stablecoins: any[], alerts: any[], whaleActivity: any[]) {
    // Calculate average peg deviation
    const deviations = stablecoins.map(coin => {
      const price = parseFloat(coin.currentPrice || "1.0");
      return Math.abs(price - 1.0);
    });
    const avgPegDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;

    // Find best and worst performers
    const sortedByChange = stablecoins.sort((a, b) => {
      const aChange = parseFloat(a.priceChange24h || "0");
      const bChange = parseFloat(b.priceChange24h || "0");
      return bChange - aChange;
    });

    const bestPerformer = sortedByChange[0]?.symbol || "N/A";
    const worstPerformer = sortedByChange[sortedByChange.length - 1]?.symbol || "N/A";

    // Categorize alerts
    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate stability score
    const stableCount = stablecoins.filter(coin => coin.pegStatus === "STABLE").length;
    const stabilityScore = (stableCount / stablecoins.length) * 100;

    // Calculate whale activity volume
    const whaleVolume = whaleActivity.reduce((sum, tx) => {
      return sum + parseFloat(tx.amount || "0");
    }, 0);

    return {
      avgPegDeviation,
      bestPerformer,
      worstPerformer,
      totalCoins: stablecoins.length,
      stableCount,
      stabilityScore,
      alertCount: alerts.length,
      alertsByType,
      alertsBySeverity,
      whaleActivityCount: whaleActivity.length,
      whaleVolume,
      criticalAlerts: alertsBySeverity.CRITICAL || 0,
      depegAlerts: alertsByType.DEPEG || 0,
    };
  }

  private generateSummary(metrics: any): string {
    const stability = this.getStabilityLevel(metrics.stabilityScore);
    const whaleActivity = this.getWhaleActivityLevel(metrics.whaleActivityCount);
    const alertLevel = this.getAlertLevel(metrics.alertCount);

    return `📊 Daily Stablecoin Digest: ${metrics.totalCoins} coins tracked with ${stability} stability (${metrics.stableCount}/${metrics.totalCoins} stable). ${metrics.alertCount} alerts detected with ${alertLevel} activity. Whale movements: ${whaleActivity} with ${metrics.whaleActivityCount} transactions. Market sentiment: ${this.getMarketSentiment(metrics)}.`;
  }

  private getStabilityLevel(score: number): string {
    if (score >= 90) return "EXCELLENT";
    if (score >= 80) return "GOOD";
    if (score >= 70) return "FAIR";
    if (score >= 60) return "MODERATE";
    return "POOR";
  }

  private getWhaleActivityLevel(count: number): string {
    if (count >= 50) return "VERY HIGH";
    if (count >= 20) return "HIGH";
    if (count >= 10) return "MODERATE";
    if (count >= 5) return "LOW";
    return "MINIMAL";
  }

  private getAlertLevel(count: number): string {
    if (count >= 20) return "HIGH";
    if (count >= 10) return "MODERATE";
    if (count >= 5) return "LOW";
    return "MINIMAL";
  }

  private getMarketSentiment(metrics: any): string {
    if (metrics.criticalAlerts > 0) return "CRITICAL";
    if (metrics.depegAlerts > 3) return "BEARISH";
    if (metrics.stabilityScore > 90) return "BULLISH";
    if (metrics.stabilityScore > 80) return "NEUTRAL";
    return "CAUTIOUS";
  }

  private generateMemeQuote(metrics: any): string {
    const quotes = {
      EXCELLENT: [
        "🐸 'Pegg is living his best life in this stable paradise!'",
        "🐸 'All is well in the stablecoin kingdom'",
        "🐸 'Even Pegg is impressed by this level of stability'",
        "🐸 'This is what peak performance looks like'",
      ],
      GOOD: [
        "🐸 'Pegg approves of today's stability performance'",
        "🐸 'Not bad, not bad at all'",
        "🐸 'Pegg gives this day two thumbs up'",
        "🐸 'Solid work, stablecoin family'",
      ],
      FAIR: [
        "🐸 'Pegg has seen better days, but also worse'",
        "🐸 'Room for improvement, but not terrible'",
        "🐸 'Pegg is cautiously optimistic'",
        "🐸 'Could be worse, could be better'",
      ],
      POOR: [
        "🐸 'Pegg is not having a good time...'",
        "🐸 'This is why we can't have nice things'",
        "🐸 'Pegg is stress-eating flies today'",
        "🐸 'Someone please check on the stablecoins'",
      ],
      CRITICAL: [
        "🐸 'PEGG IS NOT OKAY! SOMEONE CALL THE AUTHORITIES!'",
        "🐸 'This is a five-alarm fire in the stablecoin world'",
        "🐸 'Pegg is preparing for the apocalypse'",
        "🐸 'May the crypto gods have mercy on our souls'",
      ],
    };

    const sentiment = this.getMarketSentiment(metrics);
    const stabilityLevel = this.getStabilityLevel(metrics.stabilityScore);
    
    // Use critical quotes if we have critical alerts, otherwise use stability level
    const quoteCategory = sentiment === "CRITICAL" ? "CRITICAL" : stabilityLevel;
    const categoryQuotes = quotes[quoteCategory as keyof typeof quotes] || quotes.FAIR;
    
    return categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];
  }

  private async createErrorAlert(error: any) {
    await storage.createAlert({
      type: "SYSTEM",
      coin: null,
      message: `Digest Agent encountered an error: ${error.message}`,
      severity: "MEDIUM",
      metadata: {
        error: error.message,
        memeQuote: "🐸 'Pegg's daily report got lost in the mail...'",
      },
    });
  }

  getStatus() {
    return {
      name: "Digest Agent",
      isRunning: this.isRunning,
      digestTime: this.digestTime,
      lastDigestDate: this.lastDigestDate,
    };
  }
}

export const digestAgent = new DigestAgent();
