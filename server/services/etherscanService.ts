import { storage } from "../storage";

interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimal: string;
  timeStamp: string;
  blockNumber: string;
}

class EtherscanService {
  private readonly baseUrl = "https://api.etherscan.io/api";
  private readonly apiKey = process.env.ETHERSCAN_API_KEY || "";

  async getWalletTransactions(address: string): Promise<EtherscanTransaction[]> {
    try {
      if (!this.apiKey) {
        console.warn("Etherscan API key not provided");
        return [];
      }

      const response = await fetch(
        `${this.baseUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === "0") {
        console.warn(`Etherscan API error for ${address}:`, data.message);
        return [];
      }
      
      return data.result || [];
    } catch (error) {
      console.error(`Failed to fetch transactions for ${address}:`, error);
      return [];
    }
  }

  async scanAllWhaleWallets(): Promise<void> {
    try {
      const whaleWallets = await storage.getWhaleWallets();
      
      for (const wallet of whaleWallets) {
        await this.scanWalletActivity(wallet);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Failed to scan whale wallets:", error);
    }
  }

  async scanWalletActivity(wallet: any): Promise<void> {
    try {
      const transactions = await this.getWalletTransactions(wallet.address);
      const recentTransactions = transactions.slice(0, 10); // Get last 10 transactions
      
      for (const tx of recentTransactions) {
        // Check if transaction already exists
        const existing = await storage.getWhaleTransactionsByWallet(wallet.id);
        const txExists = existing.some(existingTx => existingTx.txHash === tx.hash);
        
        if (!txExists) {
          const amount = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
          const direction = tx.from.toLowerCase() === wallet.address.toLowerCase() ? "OUT" : "IN";
          
          // Only process stablecoin transactions
          if (this.isStablecoin(tx.tokenSymbol)) {
            await storage.createWhaleTransaction({
              walletId: wallet.id,
              txHash: tx.hash,
              token: tx.tokenSymbol,
              amount: amount.toFixed(6),
              direction,
              blockNumber: parseInt(tx.blockNumber),
            });
            
            // Create alert for large transactions
            if (amount >= 1000000) { // 1M+ tokens
              await storage.createAlert({
                type: "WHALE",
                coin: tx.tokenSymbol,
                message: `Large ${tx.tokenSymbol} ${direction.toLowerCase()}: ${this.formatAmount(amount)} ${direction === "IN" ? "to" : "from"} ${wallet.name}`,
                severity: amount >= 10000000 ? "HIGH" : "MEDIUM",
                metadata: {
                  walletName: wallet.name,
                  walletAddress: wallet.address,
                  amount,
                  direction,
                  txHash: tx.hash,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan wallet ${wallet.address}:`, error);
    }
  }

  private isStablecoin(symbol: string): boolean {
    const stablecoins = ["USDC", "USDT", "DAI", "FRAX", "BUSD", "TUSD", "USDP", "GUSD"];
    return stablecoins.includes(symbol.toUpperCase());
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1) + "B";
    } else if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + "M";
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + "K";
    } else {
      return amount.toFixed(2);
    }
  }

  async getWalletBalance(address: string): Promise<any> {
    try {
      if (!this.apiKey) {
        return {};
      }

      const response = await fetch(
        `${this.baseUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        ETH: parseFloat(data.result) / Math.pow(10, 18),
      };
    } catch (error) {
      console.error(`Failed to fetch balance for ${address}:`, error);
      return {};
    }
  }
}

export const etherscanService = new EtherscanService();
