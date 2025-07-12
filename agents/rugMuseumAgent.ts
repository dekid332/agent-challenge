import { storage } from "../server/storage";
import rugMuseumData from "../data/rugMuseum.json";

export class RugMuseumAgent {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      console.log("🪦 Rug Museum already initialized");
      return;
    }

    console.log("🪦 Initializing Rug Museum Agent");
    await this.loadRugMuseumData();
    this.isInitialized = true;
    console.log("🪦 Rug Museum Agent initialized");
  }

  private async loadRugMuseumData() {
    try {
      // Load rugged coins from JSON file
      const { ruggedCoins } = rugMuseumData;
      
      for (const rugData of ruggedCoins) {
        const existing = await storage.getRuggedCoinBySymbol(rugData.symbol);
        
        if (!existing) {
          await storage.createRuggedCoin({
            name: rugData.name,
            symbol: rugData.symbol,
            deathDate: new Date(rugData.deathDate),
            cause: rugData.cause,
            marketCapAtDeath: rugData.marketCapAtDeath,
            story: rugData.story,
            memeQuote: rugData.memeQuote,
            imageUrl: rugData.imageUrl,
            links: rugData.links,
          });
        }
      }
      
      console.log(`🪦 Loaded ${ruggedCoins.length} rugged coins into the museum`);
    } catch (error) {
      console.error("🪦 Error loading rug museum data:", error);
    }
  }

  async addRuggedCoin(rugData: any) {
    try {
      const existing = await storage.getRuggedCoinBySymbol(rugData.symbol);
      if (existing) {
        throw new Error(`${rugData.symbol} already exists in the museum`);
      }

      const ruggedCoin = await storage.createRuggedCoin({
        name: rugData.name,
        symbol: rugData.symbol,
        deathDate: new Date(rugData.deathDate),
        cause: rugData.cause,
        marketCapAtDeath: rugData.marketCapAtDeath || "0",
        story: rugData.story,
        memeQuote: rugData.memeQuote || this.generateMemeQuote(rugData.symbol),
        imageUrl: rugData.imageUrl || null,
        links: rugData.links || [],
      });

      console.log(`🪦 Added ${rugData.symbol} to the Rug Museum`);
      return ruggedCoin;
    } catch (error) {
      console.error("🪦 Error adding rugged coin:", error);
      throw error;
    }
  }

  async searchRuggedCoins(query: string) {
    try {
      const allRugs = await storage.getRuggedCoins();
      const lowerQuery = query.toLowerCase();
      
      return allRugs.filter(rug => 
        rug.name.toLowerCase().includes(lowerQuery) ||
        rug.symbol.toLowerCase().includes(lowerQuery) ||
        rug.cause.toLowerCase().includes(lowerQuery) ||
        rug.story.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error("🪦 Error searching rugged coins:", error);
      return [];
    }
  }

  async getRuggedCoinBySymbol(symbol: string) {
    try {
      const rug = await storage.getRuggedCoinBySymbol(symbol.toUpperCase());
      if (!rug) {
        return null;
      }
      
      return {
        ...rug,
        memeQuote: rug.memeQuote || this.generateMemeQuote(symbol),
        formattedDeathDate: this.formatDate(rug.deathDate),
        formattedMarketCap: this.formatMarketCap(rug.marketCapAtDeath),
      };
    } catch (error) {
      console.error("🪦 Error getting rugged coin:", error);
      return null;
    }
  }

  async getRandomRuggedCoin() {
    try {
      const allRugs = await storage.getRuggedCoins();
      if (allRugs.length === 0) {
        return null;
      }
      
      const randomIndex = Math.floor(Math.random() * allRugs.length);
      return allRugs[randomIndex];
    } catch (error) {
      console.error("🪦 Error getting random rugged coin:", error);
      return null;
    }
  }

  async getRugMuseumStats() {
    try {
      const allRugs = await storage.getRuggedCoins();
      
      const totalRugs = allRugs.length;
      const totalMarketCapLost = allRugs.reduce((sum, rug) => {
        return sum + parseFloat(rug.marketCapAtDeath || "0");
      }, 0);

      // Group by cause
      const causeBreakdown = allRugs.reduce((acc, rug) => {
        const cause = rug.cause.toLowerCase();
        acc[cause] = (acc[cause] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by year
      const yearBreakdown = allRugs.reduce((acc, rug) => {
        const year = new Date(rug.deathDate).getFullYear();
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return {
        totalRugs,
        totalMarketCapLost,
        formattedTotalLoss: this.formatMarketCap(totalMarketCapLost.toString()),
        causeBreakdown,
        yearBreakdown,
        avgLossPerRug: totalMarketCapLost / totalRugs,
      };
    } catch (error) {
      console.error("🪦 Error getting rug museum stats:", error);
      return {
        totalRugs: 0,
        totalMarketCapLost: 0,
        formattedTotalLoss: "$0",
        causeBreakdown: {},
        yearBreakdown: {},
        avgLossPerRug: 0,
      };
    }
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatMarketCap(marketCap: string | null): string {
    if (!marketCap) return "Unknown";
    
    const num = parseFloat(marketCap);
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(2)}`;
  }

  private generateMemeQuote(symbol: string): string {
    const quotes = [
      `🐸 "RIP ${symbol}, you were too young to rug"`,
      `🐸 "Pegg remembers when ${symbol} was $1... those were the days"`,
      `🐸 "Another one bites the dust. Pegg keeps count"`,
      `🐸 "${symbol} joined the choir invisible"`,
      `🐸 "Pegg lights a candle for ${symbol}"`,
      `🐸 "In memory of ${symbol} - may it rest in pieces"`,
      `🐸 "${symbol} taught us that not all heroes wear capes... some wear rugs"`,
      `🐸 "Pegg's condolences to ${symbol} holders"`,
      `🐸 "${symbol} is now farming in the great DeFi protocol in the sky"`,
      `🐸 "Pegg adds ${symbol} to the hall of shame"`,
    ];

    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  getStatus() {
    return {
      name: "Rug Museum Agent",
      isInitialized: this.isInitialized,
      description: "Curator of failed stablecoin history",
    };
  }
}

export const rugMuseumAgent = new RugMuseumAgent();
