// Service to generate realistic whale transaction data for demonstration
export class MockWhaleDataService {
  generateMockTransactions(count: number = 20) {
    const networks = ["Ethereum", "Polygon", "Arbitrum", "Base", "Optimism", "Solana"];
    const tokens = ["USDC", "USDT", "DAI", "FRAX", "BUSD"];
    const directions = ["in", "out"];
    const whaleNames = [
      "Circle Treasury", "Binance Hot Wallet", "Coinbase Institutional", 
      "Tether Treasury", "Polygon Bridge", "Arbitrum Gateway", 
      "Base Bridge", "Optimism Gateway", "Solana Foundation"
    ];

    const transactions = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const network = networks[Math.floor(Math.random() * networks.length)];
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const whaleName = whaleNames[Math.floor(Math.random() * whaleNames.length)];
      
      // Generate amounts between 10K and 50M
      const amount = Math.floor(Math.random() * 50000000) + 10000;
      
      // Generate recent timestamps (within last 10 minutes)
      const ageMinutes = Math.floor(Math.random() * 10);
      const timestamp = new Date(now - (ageMinutes * 60 * 1000));
      
      const txHash = this.generateTxHash(network);
      const explorerUrl = this.getExplorerUrl(network, txHash);

      transactions.push({
        walletId: Math.floor(Math.random() * 10) + 1,
        txHash,
        amount,
        tokenSymbol: token,
        direction,
        timestamp,
        network,
        explorerUrl,
        ageMinutes,
        walletName: whaleName,
        usdValue: amount // Assuming 1:1 USD for stablecoins
      });
    }

    return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private generateTxHash(network: string): string {
    if (network === "Solana") {
      // Solana transaction signatures are longer
      return Array.from({length: 88}, () => 
        Math.random().toString(36)[2] || '0'
      ).join('');
    } else {
      // Ethereum-style tx hash
      return '0x' + Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    }
  }

  private getExplorerUrl(network: string, txHash: string): string {
    const explorers: { [key: string]: string } = {
      "Ethereum": "https://etherscan.io/tx/",
      "Polygon": "https://polygonscan.com/tx/",
      "Arbitrum": "https://arbiscan.io/tx/",
      "Base": "https://basescan.org/tx/",
      "Optimism": "https://optimistic.etherscan.io/tx/",
      "Solana": "https://solscan.io/tx/"
    };
    
    return (explorers[network] || "https://etherscan.io/tx/") + txHash;
  }

  getChainActivitySummary() {
    const chains = [
      { id: 1, name: "Ethereum", symbol: "ETH" },
      { id: 137, name: "Polygon", symbol: "MATIC" },
      { id: 42161, name: "Arbitrum", symbol: "ETH" },
      { id: 10, name: "Optimism", symbol: "ETH" },
      { id: 8453, name: "Base", symbol: "ETH" },
      { id: 56, name: "BNB Chain", symbol: "BNB" },
      { id: 43114, name: "Avalanche", symbol: "AVAX" },
      { id: 250, name: "Fantom", symbol: "FTM" },
      { id: 100, name: "Gnosis", symbol: "xDAI" },
      { id: 1101, name: "Polygon zkEVM", symbol: "ETH" },
      { id: 999, name: "Solana", symbol: "SOL" }
    ];

    return chains.map(chain => ({
      ...chain,
      explorerUrl: this.getExplorerUrl(chain.name, ""),
      transactionCount: Math.floor(Math.random() * 50) + 1, // 1-50 transactions
      totalVolume: Math.floor(Math.random() * 100000000) + 1000000, // 1M-100M volume
      supported: true,
      lastUpdated: new Date().toISOString()
    }));
  }
}

export const mockWhaleDataService = new MockWhaleDataService();