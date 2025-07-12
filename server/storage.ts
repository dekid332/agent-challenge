import {
  stablecoins,
  alerts,
  whaleWallets,
  whaleTransactions,
  ruggedCoins,
  digestEntries,
  chatMessages,
  type Stablecoin,
  type Alert,
  type WhaleWallet,
  type WhaleTransaction,
  type RuggedCoin,
  type DigestEntry,
  type ChatMessage,
  type InsertStablecoin,
  type InsertAlert,
  type InsertWhaleWallet,
  type InsertWhaleTransaction,
  type InsertRuggedCoin,
  type InsertDigestEntry,
  type InsertChatMessage,
} from "@shared/schema";

export interface IStorage {
  // Stablecoins
  getStablecoins(): Promise<Stablecoin[]>;
  getStablecoinBySymbol(symbol: string): Promise<Stablecoin | undefined>;
  createStablecoin(stablecoin: InsertStablecoin): Promise<Stablecoin>;
  updateStablecoin(id: number, updates: Partial<InsertStablecoin>): Promise<Stablecoin>;

  // Alerts
  getAlerts(limit?: number): Promise<Alert[]>;
  getUnreadAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<void>;

  // Whale Wallets
  getWhaleWallets(): Promise<WhaleWallet[]>;
  getWhaleWalletByAddress(address: string): Promise<WhaleWallet | undefined>;
  createWhaleWallet(wallet: InsertWhaleWallet): Promise<WhaleWallet>;
  updateWhaleWallet(id: number, updates: Partial<InsertWhaleWallet>): Promise<WhaleWallet>;
  removeWhaleWallet(id: number): Promise<void>;

  // Whale Transactions
  getWhaleTransactions(limit?: number): Promise<WhaleTransaction[]>;
  getWhaleTransactionsByWallet(walletId: number): Promise<WhaleTransaction[]>;
  createWhaleTransaction(transaction: InsertWhaleTransaction): Promise<WhaleTransaction>;

  // Rugged Coins
  getRuggedCoins(): Promise<RuggedCoin[]>;
  getRuggedCoinBySymbol(symbol: string): Promise<RuggedCoin | undefined>;
  createRuggedCoin(ruggedCoin: InsertRuggedCoin): Promise<RuggedCoin>;

  // Digest Entries
  getDigestEntries(limit?: number): Promise<DigestEntry[]>;
  getLatestDigest(): Promise<DigestEntry | undefined>;
  createDigestEntry(digest: InsertDigestEntry): Promise<DigestEntry>;

  // Chat Messages
  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private stablecoins: Map<number, Stablecoin> = new Map();
  private alerts: Map<number, Alert> = new Map();
  private whaleWallets: Map<number, WhaleWallet> = new Map();
  private whaleTransactions: Map<number, WhaleTransaction> = new Map();
  private ruggedCoins: Map<number, RuggedCoin> = new Map();
  private digestEntries: Map<number, DigestEntry> = new Map();
  private chatMessages: Map<number, ChatMessage> = new Map();
  private currentId = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize default stablecoins
    const defaultStablecoins: InsertStablecoin[] = [
      { symbol: "USDC", name: "USD Coin", currentPrice: "0.9998", priceChange24h: "0.02", pegStatus: "STABLE", isActive: true },
      { symbol: "USDT", name: "Tether", currentPrice: "1.0001", priceChange24h: "0.01", pegStatus: "STABLE", isActive: true },
      { symbol: "DAI", name: "Dai", currentPrice: "0.9876", priceChange24h: "-1.24", pegStatus: "ALERT", isActive: true },
      { symbol: "FRAX", name: "Frax", currentPrice: "1.0012", priceChange24h: "0.12", pegStatus: "STABLE", isActive: true },
    ];

    defaultStablecoins.forEach(coin => {
      this.createStablecoin(coin);
    });

    // Initialize default whale wallets
    const defaultWhales: InsertWhaleWallet[] = [
      { address: "0x3f5CE5FBFe3E9af3971dd833D26bA9b5C9c01e7A", name: "Circle Treasury (ETH)", type: "TREASURY", balance: {}, isActive: true },
      { address: "0x742d35cc6432c788c1ae3ad1e50d4b789c31c7a2", name: "Circle Reserve (ETH)", type: "TREASURY", balance: {}, isActive: true },
      { address: "0x28C6c06298d514Db089934071355E5743bf21d60", name: "Binance Hot Wallet (ETH)", type: "EXCHANGE", balance: {}, isActive: true },
      { address: "0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489", name: "Polygon Bridge", type: "BRIDGE", balance: {}, isActive: true },
      { address: "0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a", name: "Arbitrum Gateway", type: "BRIDGE", balance: {}, isActive: true },
      { address: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1", name: "Optimism Gateway", type: "BRIDGE", balance: {}, isActive: true },
      { address: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35", name: "Base Bridge", type: "BRIDGE", balance: {}, isActive: true },
      { address: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", name: "Solana Foundation", type: "WHALE", balance: {}, isActive: true },
    ];

    defaultWhales.forEach(whale => {
      this.createWhaleWallet(whale);
    });
  }

  async getStablecoins(): Promise<Stablecoin[]> {
    return Array.from(this.stablecoins.values()).filter(coin => coin.isActive);
  }

  async getStablecoinBySymbol(symbol: string): Promise<Stablecoin | undefined> {
    return Array.from(this.stablecoins.values()).find(coin => coin.symbol === symbol);
  }

  async createStablecoin(stablecoin: InsertStablecoin): Promise<Stablecoin> {
    const id = this.currentId++;
    const newCoin: Stablecoin = {
      ...stablecoin,
      id,
      lastUpdated: new Date(),
    };
    this.stablecoins.set(id, newCoin);
    return newCoin;
  }

  async updateStablecoin(id: number, updates: Partial<InsertStablecoin>): Promise<Stablecoin> {
    const existing = this.stablecoins.get(id);
    if (!existing) throw new Error("Stablecoin not found");
    
    const updated: Stablecoin = {
      ...existing,
      ...updates,
      lastUpdated: new Date(),
    };
    this.stablecoins.set(id, updated);
    return updated;
  }

  async getAlerts(limit = 50): Promise<Alert[]> {
    const allAlerts = Array.from(this.alerts.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return allAlerts.slice(0, limit);
  }

  async getUnreadAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => !alert.isRead);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.currentId++;
    const newAlert: Alert = {
      ...alert,
      id,
      createdAt: new Date(),
      isRead: false,
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.isRead = true;
      this.alerts.set(id, alert);
    }
  }

  async getWhaleWallets(): Promise<WhaleWallet[]> {
    return Array.from(this.whaleWallets.values()).filter(wallet => wallet.isActive);
  }

  async getWhaleWalletByAddress(address: string): Promise<WhaleWallet | undefined> {
    return Array.from(this.whaleWallets.values()).find(wallet => wallet.address === address);
  }

  async createWhaleWallet(wallet: InsertWhaleWallet): Promise<WhaleWallet> {
    const id = this.currentId++;
    const newWallet: WhaleWallet = {
      ...wallet,
      id,
      lastActivity: new Date(),
    };
    this.whaleWallets.set(id, newWallet);
    return newWallet;
  }

  async updateWhaleWallet(id: number, updates: Partial<InsertWhaleWallet>): Promise<WhaleWallet> {
    const existing = this.whaleWallets.get(id);
    if (!existing) throw new Error("Whale wallet not found");
    
    const updated: WhaleWallet = {
      ...existing,
      ...updates,
      lastActivity: new Date(),
    };
    this.whaleWallets.set(id, updated);
    return updated;
  }

  async removeWhaleWallet(id: number): Promise<void> {
    if (!this.whaleWallets.has(id)) {
      throw new Error(`Whale wallet with id ${id} not found`);
    }
    this.whaleWallets.delete(id);
    console.log(`🗑️ Removed whale wallet with id ${id}`);
  }

  async getWhaleTransactions(limit = 50): Promise<WhaleTransaction[]> {
    const allTransactions = Array.from(this.whaleTransactions.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
    return allTransactions.slice(0, limit);
  }

  async getWhaleTransactionsByWallet(walletId: number): Promise<WhaleTransaction[]> {
    return Array.from(this.whaleTransactions.values())
      .filter(tx => tx.walletId === walletId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
  }

  async createWhaleTransaction(transaction: InsertWhaleTransaction): Promise<WhaleTransaction> {
    const id = this.currentId++;
    const newTransaction: WhaleTransaction = {
      ...transaction,
      id,
      timestamp: new Date(),
    };
    this.whaleTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getRuggedCoins(): Promise<RuggedCoin[]> {
    return Array.from(this.ruggedCoins.values())
      .sort((a, b) => b.deathDate.getTime() - a.deathDate.getTime());
  }

  async getRuggedCoinBySymbol(symbol: string): Promise<RuggedCoin | undefined> {
    return Array.from(this.ruggedCoins.values()).find(coin => coin.symbol === symbol);
  }

  async createRuggedCoin(ruggedCoin: InsertRuggedCoin): Promise<RuggedCoin> {
    const id = this.currentId++;
    const newRuggedCoin: RuggedCoin = {
      ...ruggedCoin,
      id,
    };
    this.ruggedCoins.set(id, newRuggedCoin);
    return newRuggedCoin;
  }

  async getDigestEntries(limit = 30): Promise<DigestEntry[]> {
    const allEntries = Array.from(this.digestEntries.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return allEntries.slice(0, limit);
  }

  async getLatestDigest(): Promise<DigestEntry | undefined> {
    const entries = await this.getDigestEntries(1);
    return entries[0];
  }

  async createDigestEntry(digest: InsertDigestEntry): Promise<DigestEntry> {
    const id = this.currentId++;
    const newDigest: DigestEntry = {
      ...digest,
      id,
      createdAt: new Date(),
    };
    this.digestEntries.set(id, newDigest);
    return newDigest;
  }

  // Chat Messages
  async getChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    const userMessages = Array.from(this.chatMessages.values())
      .filter(msg => msg.userId === userId)
      .sort((a, b) => (a.timestamp || new Date()).getTime() - (b.timestamp || new Date()).getTime())
      .slice(-limit);
    return userMessages;
  }

  async createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentId++;
    const newMessage: ChatMessage = {
      id,
      ...chatMessage,
      timestamp: new Date(),
    };
    this.chatMessages.set(id, newMessage);
    return newMessage;
  }
}

// Import PostgreSQL storage
import { PostgreSQLStorage } from './storage/postgresql';

// Use PostgreSQL if DATABASE_URL is provided, otherwise fallback to memory
const usePostgreSQL = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');

// Create and export storage instance
export const storage = usePostgreSQL ? new PostgreSQLStorage() : new MemStorage();

// Test database connection if using PostgreSQL
if (usePostgreSQL) {
  console.log('🗄️ Using PostgreSQL storage (Supabase)');
  (storage as PostgreSQLStorage).testConnection().then(connected => {
    if (connected) {
      console.log('✅ PostgreSQL connection successful');
    } else {
      console.log('❌ PostgreSQL connection failed');
    }
  });
} else {
  console.log('🗄️ Using in-memory storage');
}
