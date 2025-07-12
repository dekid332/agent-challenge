import { coinGeckoService } from "../server/services/coinGeckoService";
import { storage } from "../server/storage";
import { websocketService } from "../server/services/websocketService";

export class DepegDetectorAgent {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 30000; // 30 seconds
  private readonly pegThreshold = 0.01; // 1% deviation
  private readonly criticalThreshold = 0.05; // 5% deviation

  constructor() {
    this.initializeDefaultCoins();
  }

  private async initializeDefaultCoins() {
    // Ensure default stablecoins are tracked
    const defaultCoins = [
      { symbol: "USDC", name: "USD Coin", coinGeckoId: "usd-coin" },
      { symbol: "USDT", name: "Tether", coinGeckoId: "tether" },
      { symbol: "DAI", name: "Dai", coinGeckoId: "dai" },
      { symbol: "FRAX", name: "Frax", coinGeckoId: "frax" },
      { symbol: "TUSD", name: "TrueUSD", coinGeckoId: "true-usd" },
      { symbol: "USDP", name: "Pax Dollar", coinGeckoId: "paxos-standard" },
    ];

    for (const coin of defaultCoins) {
      const existing = await storage.getStablecoinBySymbol(coin.symbol);
      if (!existing) {
        await storage.createStablecoin({
          symbol: coin.symbol,
          name: coin.name,
          currentPrice: "1.0000",
          priceChange24h: "0.0000",
          pegStatus: "STABLE",
          isActive: true,
        });
      }
    }
  }

  async start() {
    if (this.isRunning) {
      console.log("🔍 Depeg Detector already running");
      return;
    }

    this.isRunning = true;
    console.log("🔍 Starting Depeg Detector Agent");

    // Run immediately
    await this.checkForDepegs();

    // Set up recurring checks
    this.intervalId = setInterval(async () => {
      await this.checkForDepegs();
    }, this.checkInterval);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log("🔍 Stopping Depeg Detector Agent");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkForDepegs() {
    try {
      console.log("🔍 Running depeg detection scan...");
      
      // Update all prices from CoinGecko
      await coinGeckoService.updateAllPrices();
      
      // Get all active stablecoins
      const stablecoins = await storage.getStablecoins();
      
      for (const coin of stablecoins) {
        await this.analyzeCoin(coin);
      }
      
      console.log(`🔍 Scan complete - checked ${stablecoins.length} stablecoins`);
    } catch (error) {
      console.error("🔍 Error in depeg detection:", error);
      await this.createErrorAlert(error);
    }
  }

  private async analyzeCoin(coin: any) {
    const price = parseFloat(coin.currentPrice || "1.0");
    const change24h = parseFloat(coin.priceChange24h || "0");
    const deviation = Math.abs(price - 1.0);
    
    let newPegStatus = "STABLE";
    let alertSeverity = "LOW";
    let shouldAlert = false;

    // Determine peg status
    if (deviation >= this.criticalThreshold) {
      newPegStatus = "DEPEGGED";
      alertSeverity = "CRITICAL";
      shouldAlert = true;
    } else if (deviation >= this.pegThreshold) {
      newPegStatus = "ALERT";
      alertSeverity = "HIGH";
      shouldAlert = true;
    }

    // Check if status changed
    const statusChanged = coin.pegStatus !== newPegStatus;
    
    if (statusChanged) {
      // Update coin status
      await storage.updateStablecoin(coin.id, {
        pegStatus: newPegStatus,
      });

      // Create alert if needed
      if (shouldAlert) {
        await this.createDepegAlert(coin, price, change24h, deviation, newPegStatus, alertSeverity);
      } else if (newPegStatus === "STABLE" && coin.pegStatus !== "STABLE") {
        // Recovery alert
        await this.createRecoveryAlert(coin, price);
      }
    }
  }

  private async createDepegAlert(coin: any, price: number, change24h: number, deviation: number, pegStatus: string, severity: string) {
    const memeQuote = this.generateMemeQuote(pegStatus, coin.symbol);
    const deviationPercent = (deviation * 100).toFixed(2);
    
    const message = `${coin.symbol} ${pegStatus.toLowerCase()} detected: $${price.toFixed(4)} (${deviationPercent}% deviation)`;
    
    const alert = await storage.createAlert({
      type: "DEPEG",
      coin: coin.symbol,
      message,
      severity,
      metadata: {
        price,
        change24h,
        deviation,
        pegStatus,
        memeQuote,
      },
    });

    // Broadcast to WebSocket clients
    websocketService.broadcast({
      type: "depeg_alert",
      data: {
        alert,
        coin: coin.symbol,
        price,
        deviation,
        pegStatus,
        memeQuote,
      },
    });

    console.log(`🚨 ${severity} DEPEG ALERT: ${message}`);
  }

  private async createRecoveryAlert(coin: any, price: number) {
    const memeQuote = this.generateMemeQuote("RECOVERY", coin.symbol);
    const message = `${coin.symbol} peg recovered: $${price.toFixed(4)}`;
    
    const alert = await storage.createAlert({
      type: "RECOVERY",
      coin: coin.symbol,
      message,
      severity: "INFO",
      metadata: {
        price,
        memeQuote,
      },
    });

    websocketService.broadcast({
      type: "recovery_alert",
      data: {
        alert,
        coin: coin.symbol,
        price,
        memeQuote,
      },
    });

    console.log(`✅ RECOVERY: ${message}`);
  }

  private async createErrorAlert(error: any) {
    await storage.createAlert({
      type: "SYSTEM",
      coin: null,
      message: `Depeg Detector encountered an error: ${error.message}`,
      severity: "MEDIUM",
      metadata: {
        error: error.message,
        memeQuote: "🐸 \"Pegg is having technical difficulties...\"",
      },
    });
  }

  private generateMemeQuote(context: string, symbol: string): string {
    const quotes = {
      DEPEGGED: [
        "🐸 'PEGG IS SCREAMING INTO THE VOID!'",
        "🐸 'This is not financial advice, but PANIC!'",
        "🐸 'Even frogs know when the pond is poisoned'",
        "🐸 'The peg is broken, and so is my heart'",
        `🐸 'RIP ${symbol}, you were too young to die'`,
      ],
      ALERT: [
        "🐸 'Pegg is getting nervous...'",
        "🐸 'Something smells fishy in the stablecoin pond'",
        "🐸 'Houston, we have a peg problem'",
        "🐸 'This is fine... everything is fine...'",
        `🐸 '${symbol} is doing the limbo dance'`,
      ],
      RECOVERY: [
        "🐸 'Pegg is happy again!'",
        "🐸 'The peg has been restored to its former glory'",
        "🐸 'Order has been restored to the universe'",
        "🐸 'Like a phoenix rising from the ashes'",
        `🐸 'Welcome back to the $1 club, ${symbol}!'`,
      ],
    };

    const contextQuotes = quotes[context as keyof typeof quotes] || quotes.ALERT;
    return contextQuotes[Math.floor(Math.random() * contextQuotes.length)];
  }

  getStatus() {
    return {
      name: "Depeg Detector",
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      pegThreshold: this.pegThreshold,
      criticalThreshold: this.criticalThreshold,
    };
  }
}

export const depegDetectorAgent = new DepegDetectorAgent();
