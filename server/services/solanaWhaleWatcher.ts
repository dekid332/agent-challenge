import { Connection, PublicKey, clusterApiUrl, ParsedTransactionWithMeta } from '@solana/web3.js';
import { websocketService } from './websocketService.js';
import { storage } from '../storage.js';

export class SolanaWhaleWatcher {
  private connection: Connection;
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private readonly SCAN_INTERVAL = 30000; // 30 seconds
  private lastProcessedSlot = 0;

  // Token addresses on Solana
  private readonly TOKEN_ADDRESSES = {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERkUczZz3aQn51MQ9ew1vKhzNw6GJjGwaH', 
    SOL: 'So11111111111111111111111111111111111111112' // Wrapped SOL
  };

  // Token Program ID
  private readonly TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

  // Whale thresholds (lowered for better detection)
  private readonly WHALE_THRESHOLDS = {
    USDC: 10000,  // 10K USDC (lowered from 100K)
    USDT: 10000,  // 10K USDT (lowered from 100K)
    SOL: 50,      // 50 SOL (lowered from 500)
    WSOL: 50      // 50 Wrapped SOL (lowered from 500)
  };

  constructor() {
    // Use mainnet-beta for real Solana data
    this.connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    console.log('🚀 SolanaWhaleWatcher initialized with mainnet-beta');
  }

  async start(): Promise<void> {
    if (this.isScanning) {
      console.log('⚠️ SolanaWhaleWatcher already running');
      return;
    }

    try {
      this.isScanning = true;
      console.log('🐋 Starting Solana whale scanning...');
      
      // Get current slot to start scanning from
      this.lastProcessedSlot = await this.connection.getSlot();
      console.log(`📍 Starting scan from slot: ${this.lastProcessedSlot}`);

      // Start periodic scanning
      this.scanInterval = setInterval(async () => {
        await this.scanLatestBlocks();
      }, this.SCAN_INTERVAL);

      // Do initial scan
      await this.scanLatestBlocks();

    } catch (error) {
      console.error('❌ Failed to start SolanaWhaleWatcher:', error);
      this.isScanning = false;
    }
  }

  async stop(): Promise<void> {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('🛑 SolanaWhaleWatcher stopped');
  }

  private async scanLatestBlocks(): Promise<void> {
    try {
      const currentSlot = await this.connection.getSlot();
      
      if (currentSlot <= this.lastProcessedSlot) {
        return; // No new blocks to process
      }

      console.log(`🔍 Scanning Solana blocks ${this.lastProcessedSlot + 1} to ${currentSlot}`);

      // Scan multiple recent blocks for better transaction coverage
      const blocksToScan = Math.min(5, currentSlot - this.lastProcessedSlot);
      let transactionCount = 0;
      
      for (let slot = this.lastProcessedSlot + 1; slot <= currentSlot && slot <= this.lastProcessedSlot + blocksToScan; slot++) {
        try {
          // Get block with all transactions
          const block = await this.connection.getBlock(slot, {
            maxSupportedTransactionVersion: 0,
            transactionDetails: 'full',
            rewards: false
          });

          if (!block || !block.transactions) {
            continue;
          }

          transactionCount += block.transactions.length;

          // Process each transaction in the block
          for (const tx of block.transactions) {
            if (tx.meta?.err) continue; // Skip failed transactions
            
            await this.analyzeTransaction(tx, slot);
          }
        } catch (blockError) {
          console.log(`⚠️ Skipping slot ${slot}: ${blockError.message}`);
        }
      }

      if (transactionCount > 0) {
        console.log(`📊 Solana scan complete: ${transactionCount} transactions in ${blocksToScan} blocks`);
      }
      this.lastProcessedSlot = currentSlot;

    } catch (error) {
      console.error('❌ Error scanning Solana blocks:', error.message);
    }
  }

  private async analyzeTransaction(tx: any, slot: number): Promise<void> {
    try {
      let foundWhaleActivity = false;

      // Check token balance changes for USDC/USDT transfers
      if (tx.meta?.preTokenBalances && tx.meta?.postTokenBalances) {
        const preBalances = tx.meta.preTokenBalances;
        const postBalances = tx.meta.postTokenBalances;

        // Compare pre and post balances to detect large transfers
        for (const postBalance of postBalances) {
          const preBalance = preBalances.find(pre => 
            pre.accountIndex === postBalance.accountIndex
          );

          if (!preBalance) {
            // New token balance (likely a transfer in)
            const tokenMint = postBalance.mint;
            const amount = postBalance.uiTokenAmount?.uiAmount || 0;
            
            const whaleData = this.checkWhaleThreshold(tokenMint, amount);
            if (whaleData) {
              await this.processWhaleTransaction({
                signature: tx.transaction.signatures[0],
                tokenMint,
                amount,
                tokenSymbol: whaleData.symbol,
                slot,
                timestamp: new Date(),
                accountIndex: postBalance.accountIndex,
                direction: 'in'
              });
              foundWhaleActivity = true;
            }
            continue;
          }

          const tokenMint = postBalance.mint;
          const amountChange = Math.abs(
            (postBalance.uiTokenAmount?.uiAmount || 0) - 
            (preBalance.uiTokenAmount?.uiAmount || 0)
          );

          // Check if this is a whale transaction
          const whaleData = this.checkWhaleThreshold(tokenMint, amountChange);
          if (whaleData && amountChange > 0) {
            await this.processWhaleTransaction({
              signature: tx.transaction.signatures[0],
              tokenMint,
              amount: amountChange,
              tokenSymbol: whaleData.symbol,
              slot,
              timestamp: new Date(),
              accountIndex: postBalance.accountIndex,
              direction: 'transfer'
            });
            foundWhaleActivity = true;
          }
        }
      }

      // Check for SOL transfers (native)
      if (tx.meta?.preBalances && tx.meta?.postBalances) {
        for (let i = 0; i < tx.meta.postBalances.length; i++) {
          const solChange = Math.abs(
            (tx.meta.postBalances[i] - tx.meta.preBalances[i]) / 1000000000 // Convert lamports to SOL
          );

          if (solChange >= this.WHALE_THRESHOLDS.SOL && solChange > 0.1) { // Minimum 0.1 SOL to avoid dust
            await this.processWhaleTransaction({
              signature: tx.transaction.signatures[0],
              tokenMint: 'native',
              amount: solChange,
              tokenSymbol: 'SOL',
              slot,
              timestamp: new Date(),
              accountIndex: i,
              direction: 'native'
            });
            foundWhaleActivity = true;
          }
        }
      }

      // Log some transaction activity for debugging
      if (foundWhaleActivity) {
        console.log(`🐋 Whale activity detected in slot ${slot}`);
      }

    } catch (error) {
      console.error('❌ Error analyzing transaction:', error.message);
    }
  }

  private checkWhaleThreshold(tokenMint: string, amount: number): { symbol: string } | null {
    if (tokenMint === this.TOKEN_ADDRESSES.USDC && amount >= this.WHALE_THRESHOLDS.USDC) {
      return { symbol: 'USDC' };
    }
    if (tokenMint === this.TOKEN_ADDRESSES.USDT && amount >= this.WHALE_THRESHOLDS.USDT) {
      return { symbol: 'USDT' };
    }
    if (tokenMint === this.TOKEN_ADDRESSES.SOL && amount >= this.WHALE_THRESHOLDS.WSOL) {
      return { symbol: 'WSOL' };
    }
    return null;
  }

  private async processWhaleTransaction(whaleData: any): Promise<void> {
    const txData = {
      walletName: `Solana ${whaleData.tokenSymbol} Whale`,
      txHash: whaleData.signature,
      amount: whaleData.amount.toFixed(2),
      tokenSymbol: whaleData.tokenSymbol,
      direction: whaleData.direction || 'transfer',
      timestamp: whaleData.timestamp,
      network: 'solana',
      explorerUrl: `https://solscan.io/tx/${whaleData.signature}`,
      walletAddress: `slot-${whaleData.slot}-${whaleData.accountIndex}`
    };

    // Store in database
    await storage.createWhaleTransaction(txData);

    // Broadcast via WebSocket
    websocketService.broadcast('whale_alert', {
      type: 'solana_whale_detected',
      data: txData
    });

    // Console log formatted alert
    console.log(`🐋 SOLANA WHALE DETECTED: ${whaleData.amount.toFixed(2)} ${whaleData.tokenSymbol} (${whaleData.direction})`);
    console.log(`   📍 Slot: ${whaleData.slot}`);
    console.log(`   🔗 Explorer: https://solscan.io/tx/${whaleData.signature}`);
    console.log(`   ⏰ Time: ${whaleData.timestamp.toISOString()}`);

    // Send Telegram alert for significant transactions
    const alertThreshold = whaleData.tokenSymbol === 'SOL' ? 100 : 25000; // 100 SOL or 25K USDC/USDT
    if (whaleData.amount > alertThreshold) {
      try {
        const { telegramBot } = await import('../../bots/telegramBot.js');
        await telegramBot.sendAlert({
          type: 'whale_transaction',
          data: txData,
          severity: 'high'
        });
      } catch (error) {
        console.log('📱 Telegram alert not sent:', error.message);
      }
    }
  }

  async scanSpecificTransaction(signature: string): Promise<void> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });

      if (tx) {
        await this.analyzeTransaction(tx, 0);
      }
    } catch (error) {
      console.error('❌ Error scanning specific transaction:', error.message);
    }
  }

  getStatus() {
    return {
      service: 'SolanaWhaleWatcher',
      status: this.isScanning ? 'online' : 'offline',
      lastProcessedSlot: this.lastProcessedSlot,
      scanInterval: this.SCAN_INTERVAL,
      thresholds: this.WHALE_THRESHOLDS
    };
  }
}

export const solanaWhaleWatcher = new SolanaWhaleWatcher();