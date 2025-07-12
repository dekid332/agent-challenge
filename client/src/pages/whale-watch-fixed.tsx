import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ExternalLink, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import NetworkHeatmap from "@/components/NetworkHeatmap";
import { SolanaWhaleStatus } from "../components/SolanaWhaleStatus";

// Network configuration for proper explorer URLs
const NETWORK_CONFIG = {
  ethereum: {
    name: "Ethereum",
    icon: "⟠",
    color: "border-blue-500 text-blue-400",
    explorer: "https://etherscan.io/tx/"
  },
  polygon: {
    name: "Polygon",
    icon: "⬟",
    color: "border-purple-500 text-purple-400",
    explorer: "https://polygonscan.com/tx/"
  },
  arbitrum: {
    name: "Arbitrum",
    icon: "🔵",
    color: "border-blue-600 text-blue-500",
    explorer: "https://arbiscan.io/tx/"
  },
  base: {
    name: "Base",
    icon: "🔷",
    color: "border-blue-400 text-blue-300",
    explorer: "https://basescan.org/tx/"
  },
  optimism: {
    name: "Optimism",
    icon: "🔴",
    color: "border-red-500 text-red-400",
    explorer: "https://optimistic.etherscan.io/tx/"
  },
  solana: {
    name: "Solana",
    icon: "◉",
    color: "border-green-500 text-green-400",
    explorer: "https://solscan.io/tx/"
  },
  bnb: {
    name: "BNB Chain",
    icon: "💛",
    color: "border-yellow-500 text-yellow-400",
    explorer: "https://bscscan.com/tx/"
  },
  avalanche: {
    name: "Avalanche",
    icon: "🔺",
    color: "border-red-600 text-red-500",
    explorer: "https://snowtrace.io/tx/"
  }
};

interface WhaleTransaction {
  id: number;
  txHash: string;
  amount: number;
  tokenSymbol: string;
  direction: "in" | "out";
  timestamp: string;
  network: string;
  explorerUrl?: string;
  walletName?: string;
}

interface WhaleWallet {
  id: number;
  address: string;
  name: string;
  type: string;
  network?: string;
  balance?: number;
  lastActivity?: string;
}

export default function WhaleWatchFixed() {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");

  // Fetch whale transactions
  const { data: transactions, isLoading: loadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/whales/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/whales/transactions?limit=50");
      return response.json() as Promise<WhaleTransaction[]>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch whale wallets
  const { data: whales, isLoading: loadingWhales } = useQuery({
    queryKey: ["/api/whales"],
    queryFn: async () => {
      const response = await fetch("/api/whales");
      return response.json() as Promise<WhaleWallet[]>;
    },
  });

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + "B";
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toFixed(2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  const getNetworkConfig = (network: string) => {
    if (!network || typeof network !== 'string') return NETWORK_CONFIG.ethereum;
    const normalizedNetwork = network.toLowerCase().replace(/\s+/g, '');
    return NETWORK_CONFIG[normalizedNetwork as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG.ethereum;
  };

  const openTransaction = (transaction: WhaleTransaction) => {
    const networkConfig = getNetworkConfig(transaction.network);
    const explorerUrl = transaction.explorerUrl || `${networkConfig.explorer}${transaction.txHash}`;
    
    console.log('Opening transaction:', {
      txHash: transaction.txHash,
      network: transaction.network,
      explorerUrl
    });

    if (explorerUrl && explorerUrl !== 'undefined') {
      window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.error('Invalid explorer URL:', explorerUrl);
    }
  };

  // Filter transactions by network
  const filteredTransactions = transactions?.filter(tx => 
    selectedNetwork === "all" || (tx.network && tx.network.toLowerCase() === selectedNetwork)
  ) || [];

  // Get unique networks for filter
  const availableNetworks = Array.from(new Set(transactions?.map(tx => tx.network?.toLowerCase()).filter(Boolean) || []));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-cyan to-neon-green bg-clip-text text-transparent mb-2">
          🐋 Whale Watch
        </h1>
        <p className="text-gray-400">Monitor large whale movements across multiple blockchains</p>
      </motion.div>

      {/* Network Heatmap */}
      <NetworkHeatmap />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracked Whales */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-neon-cyan">🐋</span>
              Tracked Whales ({whales?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingWhales ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {whales?.map((whale) => {
                  const networkConfig = getNetworkConfig(whale.network || 'ethereum');
                  return (
                    <motion.div
                      key={whale.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-card p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center">
                          <span className="text-lg">{networkConfig.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{whale.name}</h4>
                          </div>
                          <p className="text-xs text-gray-400 font-mono">
                            {formatAddress(whale.address)}
                          </p>
                          <Badge variant="secondary" className={`text-xs mt-1 ${networkConfig.color}`}>
                            {networkConfig.name}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Type:</span>
                        <span className="font-mono">{whale.type}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-400">Last Activity:</span>
                        <span className="font-mono">
                          {whale.lastActivity ? getTimeAgo(whale.lastActivity) : "Unknown"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-neon-green" />
                Recent Whale Transactions ({filteredTransactions.length})
              </CardTitle>
              <div className="flex gap-2">
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="bg-black/30 border border-gray-600 rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Networks</option>
                  {availableNetworks.map(network => {
                    const config = getNetworkConfig(network);
                    return (
                      <option key={network} value={network}>
                        {config.name}
                      </option>
                    );
                  })}
                </select>
                <Button
                  onClick={async () => {
                    // Trigger real whale scan
                    try {
                      await fetch('/api/whales/scan', { method: 'POST' });
                    } catch (error) {
                      console.log('Real scan failed, using demo data');
                      await fetch('/api/demo/whale-transactions', { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ count: 20 })
                      });
                    }
                    refetchTransactions();
                  }}
                  variant="outline"
                  size="sm"
                  className="glass-button"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-700 rounded mb-2"></div>
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🐋</div>
                <p className="text-gray-400">No whale transactions found</p>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedNetwork !== "all" ? `Try changing the network filter` : "Waiting for whale movements..."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTransactions.map((transaction, index) => {
                  const networkConfig = getNetworkConfig(transaction.network);
                  return (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors group"
                      onClick={() => openTransaction(transaction)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neon-cyan/20 rounded-full flex items-center justify-center">
                          {transaction.direction === "in" ? (
                            <TrendingUp className="h-5 w-5 text-green-400" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {transaction.direction === "in" ? "Inflow" : "Outflow"}
                            </span>
                            <span className="text-lg">{networkConfig.icon}</span>
                            <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {formatAddress(transaction.txHash)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${networkConfig.color}`}>
                              {networkConfig.name}
                            </Badge>
                            {transaction.walletName && (
                              <Badge variant="secondary" className="text-xs">
                                {transaction.walletName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-semibold ${
                          transaction.direction === "in" ? "text-green-400" : "text-red-400"
                        }`}>
                          {transaction.direction === "in" ? "+" : "-"}
                          {formatAmount(transaction.amount)} {transaction.tokenSymbol}
                        </div>
                        <div className="text-xs text-gray-400">
                          {getTimeAgo(transaction.timestamp)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}