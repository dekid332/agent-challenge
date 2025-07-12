import { storage } from '../storage';

// Multi-chain whale scanner for real blockchain data
export class RealWhaleScanner {
  private readonly ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  private readonly SOLSCAN_API_KEY = process.env.SOLSCAN_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NTE4OTg3ODEyNjUsImVtYWlsIjoia2Eza2luZ29AZ21haWwuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzUxODk4NzgxfQ.Bb-WRY1pc6NowtLndjirY7tH0nuELXBPLk6YyWaWcIQ';
  
  private readonly MIN_AMOUNT_THRESHOLD = 100000; // $100K minimum for whale transactions
  private readonly MAX_AGE_MINUTES = 10; // Only show transactions within last 10 minutes

  // Chain-specific whale wallets to monitor
  private readonly CHAIN_WALLETS = {
    ethereum: [
      { address: '0x3f5CE5FBFe3E9af3971dd833D26bA9b5C9c01e7A', name: 'Circle Treasury (ETH)', type: 'TREASURY' },
      { address: '0x742d35cc6432c788c1ae3ad1e50d4b789c31c7a2', name: 'Circle Reserve (ETH)', type: 'TREASURY' },
      { address: '0x28C6c06298d514Db089934071355E5743bf21d60', name: 'Binance Hot Wallet (ETH)', type: 'EXCHANGE' },
      { address: '0x503828976D22510aad0201ac7EC88293211D23Da', name: 'Coinbase Cold Storage (ETH)', type: 'EXCHANGE' }
    ],
    polygon: [
      { address: '0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489', name: 'Polygon Bridge', type: 'BRIDGE' },
      { address: '0x2791Bca1F2de4661ED88A30C99A7a9449Aa84174', name: 'USDC Polygon Token', type: 'CONTRACT' }
    ],
    arbitrum: [
      { address: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a', name: 'Arbitrum Gateway', type: 'BRIDGE' },
      { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', name: 'USDC Arbitrum Token', type: 'CONTRACT' }
    ],
    optimism: [
      { address: '0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1', name: 'Optimism Gateway', type: 'BRIDGE' },
      { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', name: 'USDC Optimism Token', type: 'CONTRACT' }
    ],
    base: [
      { address: '0x3154Cf16ccdb4C6d922629664174b904d80F2C35', name: 'Base Bridge', type: 'BRIDGE' },
      { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USDC Base Token', type: 'CONTRACT' }
    ]
  };

  private readonly SOLANA_WHALES = [
    { address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', name: 'Circle Reserve (SOL)', type: 'INSTITUTIONAL' },
    { address: 'H2WSS2ggcKP7a3eH7qLjayABrHPJNGSTNw9qXNGztTj9', name: 'FTX Bankruptcy Estate', type: 'INSTITUTIONAL' },
    { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', name: 'Binance Hot Wallet', type: 'EXCHANGE' },
    { address: 'GThUX1Atko4tqhN2NaiTazWSeFWMuiUiswPiHKtaW7A', name: 'Orca Whale', type: 'WHALE' },
    { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'USDT Solana Token', type: 'TOKEN_CONTRACT' },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USDC Solana Token', type: 'TOKEN_CONTRACT' }
  ];

  async scanAllChains(): Promise<void> {
    console.log('🐋 Scanning whale activity across all supported chains...');
    
    try {
      // Scan Ethereum and EVM chains
      await this.scanEthereumChains();
      
      // Scan Solana
      await this.scanSolanaChain();
      
      console.log('✅ Multi-chain whale scan completed');
    } catch (error) {
      console.error('❌ Error scanning whale activity:', error);
    }
  }

  private async scanEthereumChains(): Promise<void> {
    const chains = [
      { id: 1, name: 'ethereum', rpcUrl: 'https://api.etherscan.io/v2/api' },
      { id: 137, name: 'polygon', rpcUrl: 'https://api.etherscan.io/v2/api' },
      { id: 42161, name: 'arbitrum', rpcUrl: 'https://api.etherscan.io/v2/api' },
      { id: 8453, name: 'base', rpcUrl: 'https://api.etherscan.io/v2/api' },
      { id: 10, name: 'optimism', rpcUrl: 'https://api.etherscan.io/v2/api' }
    ];

    for (const chain of chains) {
      try {
        await this.scanChainWhales(chain);
      } catch (error) {
        console.error(`❌ Error scanning ${chain.name}:`, error.message);
      }
    }
  }

  private async scanChainWhales(chain: any): Promise<void> {
    // Get whales specific to this chain
    const chainWhales = this.CHAIN_WALLETS[chain.name as keyof typeof this.CHAIN_WALLETS] || [];
    
    for (const whale of chainWhales) {
      try {
        const transactions = await this.getEthereumTransactions(whale.address, chain);
        
        for (const tx of transactions) {
          if (this.isSignificantTransaction(tx)) {
            const txData = {
              walletName: whale.name,
              txHash: tx.hash,
              amount: parseInt(tx.value) / Math.pow(10, 18), // Convert from wei
              tokenSymbol: 'ETH',
              direction: tx.to.toLowerCase() === whale.address.toLowerCase() ? 'in' : 'out',
              timestamp: new Date(parseInt(tx.timeStamp) * 1000),
              network: chain.name,
              explorerUrl: this.getExplorerUrl(tx.hash, chain.name),
              walletAddress: whale.address
            };
            
            await this.storeWhaleTransaction(txData);
            
            // Send Telegram alert for huge transactions (>1M)
            if (txData.amount > 1000000) {
              await this.sendTelegramAlert(txData);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error scanning ${whale.name} on ${chain.name}:`, error.message);
      }
    }
  }

  private async scanSolanaChain(): Promise<void> {
    if (!this.SOLSCAN_API_KEY) {
      console.log('⚠️ No Solscan API key - skipping Solana whale scanning');
      return;
    }

    for (const whale of this.SOLANA_WHALES) {
      try {
        const transactions = await this.getSolanaTransactions(whale.address);
        
        for (const tx of transactions) {
          if (this.isSignificantSolanaTransaction(tx)) {
            const txData = {
              walletName: whale.name,
              txHash: tx.txHash,
              amount: tx.amount,
              tokenSymbol: tx.tokenSymbol || 'SOL',
              direction: tx.changeType === 'inc' ? 'in' : 'out',
              timestamp: new Date(tx.blockTime * 1000),
              network: 'solana',
              explorerUrl: `https://solscan.io/tx/${tx.txHash}`,
              walletAddress: whale.address
            };
            
            await this.storeWhaleTransaction(txData);
            
            // Send Telegram alert for huge Solana transactions (>1M)
            if (txData.amount > 1000000) {
              await this.sendTelegramAlert(txData);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error scanning Solana whale ${whale.name}:`, error.message);
      }
    }
  }

  private async getEthereumTransactions(address: string, chain: any): Promise<any[]> {
    try {
      const url = `${chain.rpcUrl}?chainid=${chain.id}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${this.ETHERSCAN_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== '1' || !data.result) {
        // If no real transactions, generate demo ones for demonstration
        return this.generateDemoEthereumTransactions(address, chain.name);
      }
      
      return data.result || [];
    } catch (error) {
      console.log(`⚠️ API failed for ${chain.name}, generating demo transactions`);
      return this.generateDemoEthereumTransactions(address, chain.name);
    }
  }

  private generateDemoEthereumTransactions(address: string, chainName: string): any[] {
    console.log(`⚠️ No real transactions found for ${chainName}, returning empty array`);
    return [];
  }

  private async getSolanaTransactions(address: string): Promise<any[]> {
    try {
      if (!this.SOLSCAN_API_KEY) {
        console.log('⚠️ No Solscan API key provided for real Solana data');
        return [];
      }

      console.log('🔍 Fetching real Solana transactions for:', address);

      // Try the public API endpoint first
      let url = `https://public-api.solscan.io/account/transactions?account=${address}&limit=10`;
      let response = await fetch(url);
      
      if (!response.ok) {
        console.log('⚠️ Public API failed, trying with API key');
        response = await fetch(url, {
          headers: {
            'token': this.SOLSCAN_API_KEY,
            'Accept': 'application/json'
          }
        });
      }
      
      if (!response.ok) {
        console.log('⚠️ Solana API failed with status:', response.status);
        return [];
      }
      
      const transactions = await response.json();
      
      if (!transactions || transactions.length === 0) {
        console.log('⚠️ No Solana transactions found for address:', address);
        return [];
      }
      
      return transactions.slice(0, 10).map((tx: any) => ({
        txHash: tx.signature || tx.txHash || `solana_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: Math.abs(parseFloat(tx.lamportChange || tx.amount || (Math.random() * 1000000))) / 1e9,
        changeType: (tx.lamportChange || tx.amount || 0) > 0 ? 'inc' : 'dec',
        blockTime: tx.blockTime || Date.now() / 1000,
        tokenSymbol: tx.token?.symbol || 'SOL'
      })).filter((tx: any) => tx.amount > 0.01); // Minimum 0.01 SOL
    } catch (error) {
      console.error(`❌ Error fetching Solana transactions for ${address}:`, error.message);
      return [];
    }
  }

  private generateDemoSolanaTransactions(address: string): any[] {
    console.log('⚠️ No real Solana transactions available, returning empty array');
    return [];
  }

  private isSignificantTransaction(tx: any): boolean {
    const value = parseInt(tx.value) / Math.pow(10, 18); // Convert from wei to ETH
    const ageMinutes = (Date.now() - (parseInt(tx.timeStamp) * 1000)) / (1000 * 60);
    
    return value >= this.MIN_AMOUNT_THRESHOLD && ageMinutes <= this.MAX_AGE_MINUTES;
  }

  private isSignificantSolanaTransaction(tx: any): boolean {
    const ageMinutes = (Date.now() - (tx.blockTime * 1000)) / (1000 * 60);
    
    return tx.amount >= this.MIN_AMOUNT_THRESHOLD && ageMinutes <= this.MAX_AGE_MINUTES;
  }

  private async storeWhaleTransaction(txData: any): Promise<void> {
    try {
      // Find or create whale wallet with proper network tagging
      const whales = await storage.getWhaleWallets();
      let walletId = whales.find(w => w.address.toLowerCase() === txData.walletAddress.toLowerCase())?.id;
      
      if (!walletId) {
        const newWallet = await storage.createWhaleWallet({
          address: txData.walletAddress,
          name: `${txData.walletName} (${txData.network.toUpperCase()})`,
          type: 'WHALE',
          balance: {},
          isActive: true
        });
        walletId = newWallet.id;
      }

      // Store transaction with proper network tagging
      await storage.createWhaleTransaction({
        walletId,
        txHash: txData.txHash,
        amount: Math.round(txData.amount),
        tokenSymbol: txData.tokenSymbol,
        direction: txData.direction,
        timestamp: txData.timestamp,
        network: txData.network,
        explorerUrl: txData.explorerUrl,
        walletName: `${txData.walletName} (${txData.network.toUpperCase()})`
      });

      console.log(`🐋 ${txData.network.toUpperCase()}: ${txData.direction} ${txData.amount.toFixed(1)}K ${txData.tokenSymbol} - ${txData.walletName}`);
    } catch (error) {
      console.error('❌ Error storing whale transaction:', error);
    }
  }

  private getExplorerUrl(txHash: string, network: string): string {
    const explorers = {
      ethereum: 'https://etherscan.io/tx/',
      polygon: 'https://polygonscan.com/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
      base: 'https://basescan.org/tx/',
      optimism: 'https://optimistic.etherscan.io/tx/',
      solana: 'https://solscan.io/tx/'
    };
    
    return `${explorers[network as keyof typeof explorers] || explorers.ethereum}${txHash}`;
  }

  private async sendTelegramAlert(txData: any): Promise<void> {
    try {
      const { telegramBot } = await import('../../bots/telegramBot');
      
      const message = `🚨 HUGE WHALE ALERT! 🐋\n\n` +
        `💰 ${txData.amount.toFixed(1)}M ${txData.tokenSymbol} ${txData.direction === 'in' ? '📈' : '📉'}\n` +
        `🏢 ${txData.walletName}\n` +
        `⛓️ Network: ${txData.network.toUpperCase()}\n` +
        `🔗 ${txData.explorerUrl}\n\n` +
        `#WhaleAlert #${txData.network} #PEGGWATCH`;
      
      await telegramBot.sendTestMessage(message);
      console.log(`📱 Telegram alert sent for ${txData.amount.toFixed(1)}M ${txData.tokenSymbol} whale movement`);
    } catch (error) {
      console.error('❌ Failed to send Telegram alert:', error);
    }
  }
}

export const realWhaleScanner = new RealWhaleScanner();