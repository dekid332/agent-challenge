import { storage } from "../server/storage";
import { etherscanService } from "../server/services/etherscanService";
import { websocketService } from "../server/services/websocketService";
import { botService } from "../server/services/botService";
import { multiChainService, NetworkName, NETWORKS } from "../server/services/multiChainService";
import { etherscanV2Service } from "../server/services/etherscanV2Service";
import { multiChainWhaleService } from "../server/services/multiChainWhaleService";

export class WhaleTrailAgent {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 300000; // 5 minutes
  private readonly minAlertAmount = 15000; // $15,000 USD minimum threshold
  private readonly criticalAlertAmount = 10000000; // 10M tokens

  constructor() {
    this.initializeDefaultWhales();
    this.addMajorWhaleWallets();
  }
  
  private async addMajorWhaleWallets() {
    try {
      const majorWhales = [
        // High-volume multi-chain whales
        {
          address: "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf",
          name: "Polygon Ecosystem Growth",
          type: "WHALE" as const,
          network: "Polygon"
        },
        {
          address: "0x1ab4973a48dc892cd9b3da5cc3ca2c51a6b2e6c1",
          name: "Arbitrum Whale",
          type: "WHALE" as const,
          network: "Arbitrum"
        },
        {
          address: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
          name: "Uniswap Router",
          type: "WHALE" as const,
          network: "Base"
        },
        {
          address: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
          name: "Solana Foundation",
          type: "WHALE" as const,
          network: "Solana"
        }
      ];

      for (const whale of majorWhales) {
        try {
          const existing = await storage.getWhaleWallets();
          const exists = existing.some(w => w.address === whale.address);
          
          if (!exists) {
            await storage.createWhaleWallet(whale);
            console.log(`✅ Added major whale: ${whale.name} (${whale.network})`);
          }
        } catch (error) {
          console.log(`⚠️ Could not add whale ${whale.name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error("❌ Error adding major whale wallets:", error);
    }
  }

  private async initializeDefaultWhales() {
    // Initialize known whale wallets across multiple networks
    const defaultWhales = [
      // Ethereum Network
      {
        address: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
        name: "Binance Hot Wallet",
        type: "EXCHANGE",
        network: "ethereum",
      },
      {
        address: "0x55fe002aeff02f77364de339a1292923a15844b8",
        name: "Circle Treasury",
        type: "TREASURY",
        network: "ethereum",
      },
      {
        address: "0x5041ed759dd4afc3a72b8192c143f72f4724081a",
        name: "Circle Reserve",
        type: "TREASURY",
        network: "ethereum",
      },
      {
        address: "0x742d35cc6432c788c1ae3ad1e50d4b789c31c7a2",
        name: "Unknown Whale #1",
        type: "WHALE",
        network: "ethereum",
      },
      {
        address: "0x8eb8a3b98659cce290402893d0123abb75e3ab28",
        name: "Coinbase Cold Storage",
        type: "EXCHANGE",
        network: "ethereum",
      },
      {
        address: "0x6262998ced04146fa42253a5c0af90ca02dfd2a3",
        name: "Crypto.com",
        type: "EXCHANGE",
        network: "ethereum",
      },
      // Polygon Network
      {
        address: "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf",
        name: "Polygon Bridge",
        type: "TREASURY",
        network: "polygon",
      },
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "Centre USD Coin",
        type: "TREASURY",
        network: "polygon",
      },
      // Arbitrum Network
      {
        address: "0xA0b86991c31cC62B0C3C8e0e4f4999AE3D3B9A0D",
        name: "Arbitrum Bridge",
        type: "TREASURY",
        network: "arbitrum",
      },
      // Base Network
      {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        name: "Base USDC",
        type: "TREASURY",
        network: "base",
      },
    ];

    for (const whale of defaultWhales) {
      const existing = await storage.getWhaleWalletByAddress(whale.address);
      if (!existing) {
        await storage.createWhaleWallet({
          address: whale.address,
          name: whale.name,
          type: whale.type,
          balance: {},
          isActive: true,
        });
      }
    }
  }

  async start() {
    if (this.isRunning) {
      console.log("🐋 Whale Trail Agent already running");
      return;
    }

    this.isRunning = true;
    console.log("🐋 Starting Whale Trail Agent");

    // Run immediately
    await this.scanWhaleActivity();

    // Set up recurring scans
    this.intervalId = setInterval(async () => {
      await this.scanWhaleActivity();
    }, this.checkInterval);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log("🐋 Stopping Whale Trail Agent");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async scanWhaleActivity() {
    try {
      console.log("🐋 Scanning whale activity across all supported chains...");
      
      // Use the new multi-chain whale service for comprehensive scanning
      const realWhaleTransactions = await multiChainWhaleService.scanAllChainsForWhaleActivity();
      
      // Store real transactions in database
      for (const tx of realWhaleTransactions) {
        try {
          await storage.createWhaleTransaction({
            walletId: Math.floor(Math.random() * 10) + 1,
            txHash: tx.txHash,
            amount: tx.amount,
            tokenSymbol: tx.tokenSymbol,
            direction: tx.direction,
            timestamp: tx.timestamp,
            network: tx.network,
            explorerUrl: tx.explorerUrl
          });
        } catch (error) {
          console.error(`Error storing whale transaction ${tx.txHash}:`, error);
        }
      }

      if (realWhaleTransactions.length > 0) {
        console.log(`🐋 Stored ${realWhaleTransactions.length} real whale transactions from blockchain APIs`);
        
        // Broadcast real whale activity
        websocketService.broadcast({
          type: "whale_activity",
          data: realWhaleTransactions,
        });
      }
      
      // Also run legacy Ethereum scanning for backward compatibility
      const whaleWallets = await storage.getWhaleWallets();
      const newTransactions = [];

      for (const wallet of whaleWallets) {
        const transactions = await this.scanWalletTransactions(wallet);
        newTransactions.push(...transactions);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (newTransactions.length > 0) {
        console.log(`🐋 Legacy scan found ${newTransactions.length} additional whale transactions`);
        
        // Broadcast whale activity
        websocketService.broadcast({
          type: "whale_activity",
          data: newTransactions,
        });
      } else {
        console.log("🐋 No new whale activity detected");
      }
      
    } catch (error) {
      console.error("🐋 Error scanning whale activity:", error);
      await this.createErrorAlert(error);
    }
  }

  private async scanWalletTransactions(wallet: any) {
    try {
      // Get recent transactions from Etherscan
      const transactions = await etherscanService.getWalletTransactions(wallet.address);
      const newTransactions = [];

      // Get existing transactions to avoid duplicates
      const existingTxs = await storage.getWhaleTransactionsByWallet(wallet.id);
      const existingHashes = new Set(existingTxs.map(tx => tx.txHash));

      for (const tx of transactions.slice(0, 20)) { // Check last 20 transactions
        if (existingHashes.has(tx.hash)) {
          continue; // Skip if already processed
        }

        if (this.isStablecoinTransaction(tx.tokenSymbol)) {
          const amount = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
          const direction = tx.from.toLowerCase() === wallet.address.toLowerCase() ? "OUT" : "IN";

          // Store transaction
          const transaction = await storage.createWhaleTransaction({
            walletId: wallet.id,
            txHash: tx.hash,
            token: tx.tokenSymbol,
            amount: amount.toFixed(6),
            direction,
            blockNumber: parseInt(tx.blockNumber),
          });

          newTransactions.push(transaction);

          // Create alert for large transactions
          if (amount >= this.minAlertAmount) {
            await this.createWhaleAlert(wallet, transaction, amount);
          }
        }
      }

      return newTransactions;
    } catch (error) {
      console.error(`🐋 Error scanning wallet ${wallet.address}:`, error);
      return [];
    }
  }

  private isStablecoinTransaction(tokenSymbol: string): boolean {
    const stablecoins = [
      "USDC", "USDT", "DAI", "FRAX", "BUSD", "TUSD", "USDP", "GUSD", 
      "LUSD", "SUSD", "OUSD", "USDN", "USTC", "USDD", "MIM", "DUSD"
    ];
    return stablecoins.includes(tokenSymbol.toUpperCase());
  }

  private async createWhaleAlert(wallet: any, transaction: any, amount: number) {
    const severity = amount >= this.criticalAlertAmount ? "CRITICAL" : "HIGH";
    const direction = transaction.direction.toLowerCase();
    const formattedAmount = this.formatAmount(amount);
    const memeQuote = this.generateMemeQuote(direction, amount, wallet.type);

    const message = `🐋 Large ${transaction.token} ${direction}: ${formattedAmount} ${direction === "in" ? "to" : "from"} ${wallet.name}`;

    const alert = await storage.createAlert({
      type: "WHALE",
      coin: transaction.token,
      message,
      severity,
      metadata: {
        walletName: wallet.name,
        walletAddress: wallet.address,
        walletType: wallet.type,
        amount,
        direction: transaction.direction,
        txHash: transaction.txHash,
        memeQuote,
      },
    });

    // Broadcast whale alert
    websocketService.broadcast({
      type: "whale_alert",
      data: {
        alert,
        wallet: wallet.name,
        amount: formattedAmount,
        token: transaction.token,
        direction: transaction.direction,
        memeQuote,
      },
    });

    // Send to bot channels if critical
    if (severity === "CRITICAL") {
      await botService.sendAlertToAllChannels(alert);
    }

    console.log(`🐋 ${severity} WHALE ALERT: ${message}`);
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  }

  private generateMemeQuote(direction: string, amount: number, walletType: string): string {
    const quotes = {
      large_in: [
        "🐸 'Big whale incoming! Pegg is making room in the pond'",
        "🐸 'Someone just backed up the money truck'",
        "🐸 'Pegg spotted a financial tsunami approaching'",
        "🐸 'The whales are accumulating... Pegg is taking notes'",
      ],
      large_out: [
        "🐸 'Whale alert! Someone's making it rain elsewhere'",
        "🐸 'Big money is moving, Pegg is watching closely'",
        "🐸 'The whales are migrating... Pegg wonders where to'",
        "🐸 'That's a lot of zeros leaving the building'",
      ],
      massive_in: [
        "🐸 'HOLY MOLY! Pegg has never seen a whale this big!'",
        "🐸 'The ocean just got a new Moby Dick'",
        "🐸 'Pegg is speechless... and that's saying something'",
        "🐸 'Someone just moved the GDP of a small country'",
      ],
      massive_out: [
        "🐸 'MASSIVE WHALE EXODUS! Pegg is shaking in his lily pad'",
        "🐸 'The great whale migration has begun'",
        "🐸 'Pegg thinks someone just bought an island'",
        "🐸 'That withdrawal could fund a space program'",
      ],
      exchange: [
        "🐸 'The exchange whales are restocking their inventory'",
        "🐸 'Pegg sees institutional money moving'",
        "🐸 'The big fish are feeding again'",
      ],
      treasury: [
        "🐸 'The treasury is either minting or burning... Pegg is curious'",
        "🐸 'Official whale business, Pegg salutes'",
        "🐸 'Treasury operations detected, Pegg stands at attention'",
      ],
    };

    let category = direction === "in" ? "large_in" : "large_out";
    
    if (amount >= this.criticalAlertAmount) {
      category = direction === "in" ? "massive_in" : "massive_out";
    }

    // Override with wallet type specific quotes if available
    if (walletType === "EXCHANGE" && quotes.exchange) {
      category = "exchange";
    } else if (walletType === "TREASURY" && quotes.treasury) {
      category = "treasury";
    }

    const categoryQuotes = quotes[category as keyof typeof quotes] || quotes.large_in;
    return categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];
  }

  private async createErrorAlert(error: any) {
    await storage.createAlert({
      type: "SYSTEM",
      coin: null,
      message: `Whale Trail Agent encountered an error: ${error.message}`,
      severity: "MEDIUM",
      metadata: {
        error: error.message,
        memeQuote: "🐸 'Pegg lost track of the whales... they're sneaky like that'",
      },
    });
  }

  async addWhaleWallet(address: string, name: string, type: string = "WHALE") {
    const existing = await storage.getWhaleWalletByAddress(address);
    if (existing) {
      throw new Error("Wallet already being tracked");
    }

    return await storage.createWhaleWallet({
      address,
      name,
      type,
      balance: {},
      isActive: true,
    });
  }

  async removeWhaleWallet(address: string) {
    const wallet = await storage.getWhaleWalletByAddress(address);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return await storage.updateWhaleWallet(wallet.id, {
      isActive: false,
    });
  }

  getStatus() {
    return {
      name: "Whale Trail Agent",
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      minAlertAmount: this.minAlertAmount,
      criticalAlertAmount: this.criticalAlertAmount,
    };
  }
}

export const whaleTrailAgent = new WhaleTrailAgent();
