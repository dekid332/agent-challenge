export interface Stablecoin {
  id: number;
  symbol: string;
  name: string;
  currentPrice: string | null;
  priceChange24h: string | null;
  pegStatus: string;
  lastUpdated: Date | null;
  isActive: boolean | null;
}

export interface Alert {
  id: number;
  type: string;
  coin: string | null;
  message: string;
  severity: string;
  metadata: any;
  createdAt: Date | null;
  isRead: boolean | null;
}

export interface WhaleWallet {
  id: number;
  address: string;
  name: string;
  type: string;
  balance: any;
  lastActivity: Date | null;
  isActive: boolean | null;
}

export interface WhaleTransaction {
  id: number;
  walletId: number | null;
  txHash: string;
  token: string;
  amount: string | null;
  direction: string;
  timestamp: Date | null;
  blockNumber: number | null;
}

export interface RuggedCoin {
  id: number;
  name: string;
  symbol: string;
  deathDate: Date;
  cause: string;
  marketCapAtDeath: string | null;
  story: string;
  memeQuote: string | null;
  imageUrl: string | null;
  links: any;
}

export interface DigestEntry {
  id: number;
  date: Date;
  summary: string;
  bestPerformer: string | null;
  worstPerformer: string | null;
  avgPegDeviation: string | null;
  whaleActivityCount: number | null;
  alertCount: number | null;
  memeQuote: string | null;
  postedToChannels: any;
  createdAt: Date | null;
}
