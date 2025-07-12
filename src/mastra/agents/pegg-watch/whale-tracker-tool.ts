import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface WhaleWallet {
  address: string;
  name: string;
  type: string;
  lastActivity: Date;
  balance?: any;
}

interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  timestamp: Date;
  direction: string;
}

export const whaleTrackerTool = createTool({
  id: "track-whale-activity",
  description: "Monitor whale wallet activity and detect large stablecoin movements",
  inputSchema: z.object({
    walletAddress: z.string().optional().describe("Specific wallet address to track"),
    minAmount: z.number().optional().default(1000000).describe("Minimum transaction amount to track"),
    timeframe: z.string().optional().default("24h").describe("Time range (1h, 24h, 7d)"),
  }),
  outputSchema: z.object({
    whales: z.array(z.object({
      address: z.string(),
      name: z.string(),
      type: z.string(),
      lastActivity: z.string(),
      recentTransactions: z.array(z.object({
        hash: z.string(),
        amount: z.string(),
        token: z.string(),
        direction: z.string(),
        timestamp: z.string(),
        memeQuote: z.string(),
      })),
    })),
    totalTransactions: z.number(),
    totalVolume: z.string(),
    alertLevel: z.string(),
    summary: z.string(),
  }),
  execute: async ({ context }) => {
    return await trackWhaleActivity(context.walletAddress, context.minAmount, context.timeframe);
  },
});

const trackWhaleActivity = async (walletAddress?: string, minAmount = 1000000, timeframe = "24h") => {
  // Known whale wallets for demo purposes
  const knownWhales: WhaleWallet[] = [
    {
      address: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be6",
      name: "Binance Hot Wallet",
      type: "EXCHANGE",
      lastActivity: new Date(),
    },
    {
      address: "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
      name: "Binance 14",
      type: "EXCHANGE", 
      lastActivity: new Date(),
    },
    {
      address: "0x28c6c06298d514db089934071355e5743bf21d60",
      name: "Binance 2",
      type: "EXCHANGE",
      lastActivity: new Date(),
    },
    {
      address: "0x220866b1a2219f40e72f5c628b65d54268ca3a9d",
      name: "Binance 3",
      type: "EXCHANGE",
      lastActivity: new Date(),
    },
    {
      address: "0x564286362092d8e7936f0549571a803b203aaced",
      name: "Binance 4",
      type: "EXCHANGE",
      lastActivity: new Date(),
    },
    {
      address: "0x0681d8db095565fe8a346fa0277bffde9c0edbbf",
      name: "Binance 5",
      type: "EXCHANGE",
      lastActivity: new Date(),
    }
  ];

  // Filter whales if specific address requested
  const walletsToTrack = walletAddress 
    ? knownWhales.filter(w => w.address.toLowerCase() === walletAddress.toLowerCase())
    : knownWhales;

  // Simulate whale activity (in real implementation, this would query blockchain APIs)
  const simulatedTransactions = generateSimulatedTransactions(walletsToTrack, minAmount);
  
  const whales = walletsToTrack.map(whale => ({
    address: whale.address,
    name: whale.name,
    type: whale.type,
    lastActivity: whale.lastActivity.toISOString(),
    recentTransactions: simulatedTransactions
      .filter(tx => tx.from === whale.address || tx.to === whale.address)
      .slice(0, 5)
      .map(tx => ({
        hash: tx.hash,
        amount: formatAmount(parseFloat(tx.amount)),
        token: tx.token,
        direction: tx.direction,
        timestamp: tx.timestamp.toISOString(),
        memeQuote: generateMemeQuote(tx.direction, parseFloat(tx.amount), whale.type),
      })),
  }));

  const totalTransactions = simulatedTransactions.length;
  const totalVolume = simulatedTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const alertLevel = totalVolume > 50000000 ? "HIGH" : totalVolume > 10000000 ? "MEDIUM" : "LOW";

  return {
    whales,
    totalTransactions,
    totalVolume: formatAmount(totalVolume),
    alertLevel,
    summary: generateSummary(totalTransactions, totalVolume, alertLevel),
  };
};

const generateSimulatedTransactions = (whales: WhaleWallet[], minAmount: number): WhaleTransaction[] => {
  const transactions: WhaleTransaction[] = [];
  const tokens = ["USDC", "USDT", "DAI", "FRAX"];
  
  for (let i = 0; i < Math.min(10, whales.length * 2); i++) {
    const whale = whales[Math.floor(Math.random() * whales.length)];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const amount = (minAmount + Math.random() * 50000000).toString();
    const direction = Math.random() > 0.5 ? "OUT" : "IN";
    
    transactions.push({
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: direction === "OUT" ? whale.address : "0x" + Math.random().toString(16).substr(2, 40),
      to: direction === "IN" ? whale.address : "0x" + Math.random().toString(16).substr(2, 40),
      amount,
      token,
      timestamp: new Date(Date.now() - Math.random() * 86400000), // Last 24 hours
      direction,
    });
  }
  
  return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const formatAmount = (amount: number): string => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(2)}B`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K`;
  }
  return amount.toFixed(2);
};

const generateMemeQuote = (direction: string, amount: number, walletType: string): string => {
  const quotes = {
    IN: [
      `🐸 "Pegg spotted a ${walletType} whale swimming upstream with their catch!"`,
      `🐸 "Big splash incoming! This ${walletType} whale is loading up!"`,
      `🐸 "Pegg sees deep pockets getting deeper..."`,
    ],
    OUT: [
      `🐸 "Pegg watches this ${walletType} whale make waves by diving out!"`,
      `🐸 "There goes a ${walletType} whale, making a big splash exit!"`,
      `🐸 "Pegg noticed someone's cashing out their pond..."`,
    ],
  };
  
  const directionQuotes = quotes[direction as keyof typeof quotes] || quotes.IN;
  return directionQuotes[Math.floor(Math.random() * directionQuotes.length)];
};

const generateSummary = (transactions: number, volume: number, alertLevel: string): string => {
  const formattedVolume = formatAmount(volume);
  
  if (alertLevel === "HIGH") {
    return `🚨 High whale activity detected! ${transactions} transactions worth ${formattedVolume} in the last 24 hours. Pegg is watching closely!`;
  } else if (alertLevel === "MEDIUM") {
    return `📊 Moderate whale activity with ${transactions} transactions totaling ${formattedVolume}. Pegg sees some movement in the waters.`;
  } else {
    return `🌊 Calm waters today with ${transactions} transactions worth ${formattedVolume}. Pegg is enjoying the peaceful pond.`;
  }
};