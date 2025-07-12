import { storage } from "../storage";

export interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  explorerUrl: string;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  { id: 1, name: "Ethereum", symbol: "ETH", explorerUrl: "https://etherscan.io" },
  { id: 137, name: "Polygon", symbol: "MATIC", explorerUrl: "https://polygonscan.com" },
  { id: 42161, name: "Arbitrum", symbol: "ETH", explorerUrl: "https://arbiscan.io" },
  { id: 10, name: "Optimism", symbol: "ETH", explorerUrl: "https://optimistic.etherscan.io" },
  { id: 8453, name: "Base", symbol: "ETH", explorerUrl: "https://basescan.org" },
  { id: 56, name: "BNB Chain", symbol: "BNB", explorerUrl: "https://bscscan.com" },
  { id: 43114, name: "Avalanche", symbol: "AVAX", explorerUrl: "https://snowscan.xyz" },
  { id: 250, name: "Fantom", symbol: "FTM", explorerUrl: "https://ftmscan.com" },
  { id: 100, name: "Gnosis", symbol: "xDAI", explorerUrl: "https://gnosisscan.io" },
  { id: 1101, name: "Polygon zkEVM", symbol: "ETH", explorerUrl: "https://zkevm.polygonscan.com" },
  { id: 999, name: "Solana", symbol: "SOL", explorerUrl: "https://solscan.io" }
];

export class EtherscanV2Service {
  private readonly baseUrl = "https://api.etherscan.io/v2/api";
  private readonly apiKey = process.env.ETHERSCAN_API_KEY;

  constructor() {
    if (!this.apiKey) {
      console.warn("⚠️ ETHERSCAN_API_KEY not found - multi-chain whale tracking disabled");
    }
  }

  async getWalletTransactions(address: string, chainId: number, page: number = 1): Promise<any[]> {
    if (!this.apiKey) {
      console.warn(`⚠️ No API key - skipping transactions for ${address} on chain ${chainId}`);
      return [];
    }

    try {
      const url = `${this.baseUrl}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=100&sort=desc&apikey=${this.apiKey}`;
      
      console.log(`🔍 Fetching transactions for ${address} on chain ${chainId}`);
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "1" && data.result) {
        console.log(`✅ Found ${data.result.length} transactions for ${address} on chain ${chainId}`);
        return data.result;
      } else {
        console.log(`ℹ️ No transactions found for ${address} on chain ${chainId}: ${data.message}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error fetching transactions for ${address} on chain ${chainId}:`, error);
      return [];
    }
  }

  async getTokenTransactions(address: string, chainId: number, contractAddress?: string): Promise<any[]> {
    if (!this.apiKey) {
      console.warn(`⚠️ No API key - skipping token transactions for ${address} on chain ${chainId}`);
      return [];
    }

    try {
      let url = `${this.baseUrl}?chainid=${chainId}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${this.apiKey}`;
      
      if (contractAddress) {
        url += `&contractaddress=${contractAddress}`;
      }

      console.log(`🔍 Fetching token transactions for ${address} on chain ${chainId}`);
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "1" && data.result) {
        console.log(`✅ Found ${data.result.length} token transactions for ${address} on chain ${chainId}`);
        return data.result;
      } else {
        console.log(`ℹ️ No token transactions found for ${address} on chain ${chainId}: ${data.message}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error fetching token transactions for ${address} on chain ${chainId}:`, error);
      return [];
    }
  }

  async getBalance(address: string, chainId: number): Promise<string> {
    if (!this.apiKey) {
      console.warn(`⚠️ No API key - skipping balance for ${address} on chain ${chainId}`);
      return "0";
    }

    try {
      const url = `${this.baseUrl}?chainid=${chainId}&module=account&action=balance&address=${address}&tag=latest&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "1") {
        return data.result;
      } else {
        console.log(`ℹ️ Could not get balance for ${address} on chain ${chainId}: ${data.message}`);
        return "0";
      }
    } catch (error) {
      console.error(`❌ Error fetching balance for ${address} on chain ${chainId}:`, error);
      return "0";
    }
  }

  async scanMultiChainWhaleActivity(): Promise<void> {
    if (!this.apiKey) {
      console.warn("⚠️ No API key - multi-chain whale scanning disabled");
      return;
    }

    const whales = await storage.getWhaleWallets();
    const minAmount = 15000; // $15,000 threshold

    for (const whale of whales) {
      // If whale has specific chain, scan only that chain
      if (whale.network && whale.network !== "ethereum") {
        const chainConfig = SUPPORTED_CHAINS.find(c => c.name.toLowerCase() === whale.network.toLowerCase());
        if (chainConfig) {
          await this.scanWalletOnChain(whale, chainConfig, minAmount);
        }
      } else {
        // Scan across all major chains for unspecified whales
        const majorChains = SUPPORTED_CHAINS.slice(0, 5); // Top 5 chains
        for (const chain of majorChains) {
          await this.scanWalletOnChain(whale, chain, minAmount);
        }
      }
    }
  }

  private async scanWalletOnChain(whale: any, chain: ChainConfig, minAmount: number): Promise<void> {
    try {
      const transactions = await this.getTokenTransactions(whale.address, chain.id);
      
      // Filter for recent transactions (last 2 hours)
      const twoHoursAgo = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);
      const recentTransactions = transactions.filter(tx => 
        parseInt(tx.timeStamp) > twoHoursAgo
      );

      for (const tx of recentTransactions.slice(0, 10)) { // Check last 10 recent transactions
        const value = parseFloat(tx.value || "0");
        const decimals = parseInt(tx.tokenDecimal || "18");
        const amount = value / Math.pow(10, decimals);

        if (amount >= minAmount) {
          await this.createWhaleAlert(whale, tx, chain, amount);
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning ${whale.address} on ${chain.name}:`, error);
    }
  }

  private async createWhaleAlert(whale: any, transaction: any, chain: ChainConfig, amount: number): Promise<void> {
    try {
      const direction = transaction.to.toLowerCase() === whale.address.toLowerCase() ? "IN" : "OUT";
      const tokenSymbol = transaction.tokenSymbol || "TOKEN";
      
      const alert = {
        type: "WHALE_ALERT",
        coin: tokenSymbol,
        message: `🐋 Large ${tokenSymbol} ${direction.toLowerCase()}: ${this.formatAmount(amount)} ${direction === "IN" ? "to" : "from"} ${whale.name}`,
        severity: amount > 100000 ? "HIGH" : "MEDIUM",
        network: chain.name.toLowerCase(),
        walletAddress: whale.address,
        txHash: transaction.hash,
        amount: amount.toString(),
        timestamp: new Date(parseInt(transaction.timeStamp) * 1000)
      };

      await storage.createAlert(alert);
      console.log(`🐋 ${alert.severity} WHALE ALERT: ${alert.message}`);
    } catch (error) {
      console.error("❌ Error creating whale alert:", error);
    }
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + "M";
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + "K";
    }
    return amount.toFixed(0);
  }

  getChainConfig(chainId: number): ChainConfig | undefined {
    return SUPPORTED_CHAINS.find(c => c.id === chainId);
  }

  getSupportedChains(): ChainConfig[] {
    return SUPPORTED_CHAINS;
  }
}

export const etherscanV2Service = new EtherscanV2Service();