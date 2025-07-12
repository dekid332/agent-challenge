import { storage } from "../storage";

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  last_updated: string;
}

class CoinGeckoService {
  private readonly baseUrl = "https://api.coingecko.com/api/v3";
  private readonly stablecoinIds = [
    "usd-coin",
    "tether",
    "dai",
    "frax",
    "terrausd",
    "true-usd",
    "paxos-standard",
    "binance-usd",
    "fei-usd",
    "origin-dollar",
  ];

  async fetchPrices(): Promise<CoinGeckoPrice[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${this.stablecoinIds.join(",")}&order=market_cap_desc&per_page=20&page=1&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch prices from CoinGecko:", error);
      return [];
    }
  }

  async updateAllPrices(): Promise<void> {
    try {
      const prices = await this.fetchPrices();
      
      for (const price of prices) {
        const symbol = price.symbol.toUpperCase();
        const existing = await storage.getStablecoinBySymbol(symbol);
        
        if (existing) {
          // Update existing stablecoin
          const pegStatus = this.calculatePegStatus(price.current_price);
          await storage.updateStablecoin(existing.id, {
            currentPrice: price.current_price.toFixed(6),
            priceChange24h: price.price_change_percentage_24h.toFixed(4),
            pegStatus,
          });
          
          // Create alert if depegged
          if (pegStatus === "ALERT" || pegStatus === "DEPEGGED") {
            await storage.createAlert({
              type: "DEPEG",
              coin: symbol,
              message: `${symbol} ${pegStatus.toLowerCase()} detected: $${price.current_price.toFixed(4)} (${price.price_change_percentage_24h.toFixed(2)}%)`,
              severity: pegStatus === "DEPEGGED" ? "CRITICAL" : "HIGH",
              metadata: {
                price: price.current_price,
                change: price.price_change_percentage_24h,
                marketCap: price.market_cap,
              },
            });
          }
        } else {
          // Create new stablecoin entry
          await storage.createStablecoin({
            symbol,
            name: price.name,
            currentPrice: price.current_price.toFixed(6),
            priceChange24h: price.price_change_percentage_24h.toFixed(4),
            pegStatus: this.calculatePegStatus(price.current_price),
            isActive: true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to update prices:", error);
    }
  }

  private calculatePegStatus(price: number): string {
    const deviation = Math.abs(price - 1.0);
    
    if (deviation >= 0.05) {
      return "DEPEGGED"; // 5% or more deviation
    } else if (deviation >= 0.01) {
      return "ALERT"; // 1% or more deviation
    } else {
      return "STABLE"; // Less than 1% deviation
    }
  }

  async getStablecoinData(symbol: string): Promise<CoinGeckoPrice | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${symbol.toLowerCase()}&order=market_cap_desc&per_page=1&page=1&sparkline=false`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error(`Failed to fetch data for ${symbol}:`, error);
      return null;
    }
  }
}

export const coinGeckoService = new CoinGeckoService();
