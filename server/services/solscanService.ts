import { config } from "dotenv";

config();

export class SolscanService {
  private readonly baseUrl = "https://public-api.solscan.io";
  private readonly apiKey = process.env.SOLSCAN_API_KEY;

  async getWalletTokens(address: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error("SOLSCAN_API_KEY not configured");
      }

      const url = `${this.baseUrl}/account/tokens?account=${address}`;
      const response = await fetch(url, {
        headers: {
          'token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data?.length || 0} tokens for Solana wallet ${address}`);
      return data;

    } catch (error) {
      console.error(`❌ Error fetching Solana wallet tokens:`, error);
      throw error;
    }
  }

  async getWalletTransactions(address: string, limit = 50): Promise<any[]> {
    try {
      if (!this.apiKey) {
        throw new Error("SOLSCAN_API_KEY not configured");
      }

      const url = `${this.baseUrl}/account/transactions?account=${address}&limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          'token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data?.length || 0} transactions for Solana wallet ${address}`);
      return data || [];

    } catch (error) {
      console.error(`❌ Error fetching Solana transactions:`, error);
      return [];
    }
  }

  async getWalletBalance(address: string): Promise<number> {
    try {
      if (!this.apiKey) {
        throw new Error("SOLSCAN_API_KEY not configured");
      }

      const url = `${this.baseUrl}/account/${address}`;
      const response = await fetch(url, {
        headers: {
          'token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const solBalance = data.lamports / 1000000000; // Convert lamports to SOL
      const estimatedValue = solBalance * 200; // SOL ~$200 rough estimate

      console.log(`💰 Solana wallet ${address}: ${solBalance.toFixed(4)} SOL (~$${estimatedValue.toFixed(0)})`);
      return estimatedValue;

    } catch (error) {
      console.error(`❌ Error fetching Solana balance:`, error);
      return 0;
    }
  }

  async scanRecentTransactions(address: string, maxAgeMinutes = 10): Promise<any[]> {
    try {
      const transactions = await this.getWalletTransactions(address, 100);
      const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
      
      const recentTransactions = transactions.filter(tx => {
        const txTime = tx.blockTime * 1000;
        const ageMinutes = Math.floor((Date.now() - txTime) / (1000 * 60));
        return ageMinutes <= maxAgeMinutes;
      });

      console.log(`⏰ Found ${recentTransactions.length} Solana transactions within ${maxAgeMinutes} minutes for ${address}`);
      return recentTransactions;

    } catch (error) {
      console.error(`❌ Error scanning recent Solana transactions:`, error);
      return [];
    }
  }

  formatAmount(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + "M";
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + "K";
    }
    return amount.toFixed(0);
  }

  isApiConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const solscanService = new SolscanService();