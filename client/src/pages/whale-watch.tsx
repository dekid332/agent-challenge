import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, Building, Circle, TrendingUp, TrendingDown, Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhaleHeatmap } from "@/components/whale-heatmap";
import { WhaleWallet, WhaleTransaction } from "@/types";

export default function WhaleWatch() {
  const { data: whales, isLoading: loadingWhales } = useQuery<WhaleWallet[]>({
    queryKey: ["/api/whales"],
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: transactions, isLoading: loadingTransactions } = useQuery<WhaleTransaction[]>({
    queryKey: ["/api/whales/transactions"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (loadingWhales || loadingTransactions) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            🐋
          </motion.div>
          <p className="text-gray-400 font-mono">Scanning whale movements...</p>
        </div>
      </div>
    );
  }

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "EXCHANGE":
        return <Building className="h-5 w-5 text-neon-cyan" />;
      case "TREASURY":
        return <Circle className="h-5 w-5 text-neon-purple" />;
      default:
        return <Eye className="h-5 w-5 text-orange-500" />;
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
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

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ago`;
    }
    return `${minutes}m ago`;
  };

  const getNetworkIcon = (network: string) => {
    const networkIcons = {
      ethereum: "🔷",
      polygon: "🟪", 
      arbitrum: "🔵",
      optimism: "🔴",
      base: "⚫",
      solana: "🟢",
      bsc: "🟡",
      avalanche: "❄️",
    };
    return networkIcons[network as keyof typeof networkIcons] || "🌐";
  };

  const getNetworkColor = (network: string) => {
    const networkColors = {
      ethereum: "text-blue-400",
      polygon: "text-purple-400", 
      arbitrum: "text-blue-300",
      optimism: "text-red-400",
      base: "text-gray-400",
      solana: "text-green-400",
      bsc: "text-yellow-400",
      avalanche: "text-cyan-400",
    };
    return networkColors[network as keyof typeof networkColors] || "text-gray-400";
  };

  const getExplorerUrl = (network: string, txHash: string) => {
    const explorers = {
      ethereum: "https://etherscan.io",
      polygon: "https://polygonscan.com",
      arbitrum: "https://arbiscan.io", 
      optimism: "https://optimistic.etherscan.io",
      base: "https://basescan.org",
      solana: "https://solscan.io",
      bsc: "https://bscscan.com",
      avalanche: "https://snowtrace.io",
    };
    return `${explorers[network as keyof typeof explorers] || "https://etherscan.io"}/tx/${txHash}`;
  };

  return (
    <div className="p-6 overflow-y-auto scrollbar-thin h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Real-time Whale Activity Heatmap */}
        <WhaleHeatmap transactions={transactions || []} />

        {/* Network Statistics */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-neon-purple" />
              Multi-Chain Network Overview
            </CardTitle>
            <CardDescription>Cross-chain whale tracking across {Object.keys({ethereum: 1, polygon: 1, arbitrum: 1, optimism: 1, base: 1, solana: 1}).length} networks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'solana'].map((network) => {
                const networkWhales = whales?.filter(w => (w.network || 'ethereum') === network).length || 0;
                const networkTxs = transactions?.filter(t => (t.network || 'ethereum') === network).length || 0;
                return (
                  <motion.div
                    key={network}
                    whileHover={{ scale: 1.05 }}
                    className="glass-card p-3 text-center cursor-pointer"
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="text-2xl mb-2">{getNetworkIcon(network)}</div>
                    <div className={`text-sm font-semibold ${getNetworkColor(network)}`}>
                      {network.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {networkWhales} whales • {networkTxs} txs
                    </div>
                    <Badge variant="outline" className={`text-xs mt-2 ${getNetworkColor(network)}`}>
                      Active
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Whale Wallets */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-neon-cyan" />
              Tracked Whale Wallets ({whales?.length || 0} across all networks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {whales?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No whale wallets being tracked</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900 pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whales?.map((whale, index) => (
                  <motion.div
                    key={whale.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="glass-card p-4 rounded-lg"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center">
                        {getWalletIcon(whale.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{whale.name}</h4>
                          <span className="text-lg">{getNetworkIcon(whale.network || 'ethereum')}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">
                          {formatAddress(whale.address)}
                        </p>
                        <Badge variant="secondary" className={`text-xs mt-1 ${getNetworkColor(whale.network || 'ethereum')}`}>
                          {(whale.network || 'ethereum').toUpperCase()}
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
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-neon-green" />
              Recent Whale Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent transactions</p>
                <p className="text-xs mt-1">🐸 The whales are sleeping...</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900 space-y-3 pr-2">
                {transactions?.map((transaction, index) => (
                  <motion.div
                    key={`${transaction.txHash}-${transaction.timestamp}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors hover:shadow-lg border-l-4 border-l-transparent hover:border-l-neon-cyan"
                    onClick={() => {
                      console.log('Opening explorer URL:', transaction.explorerUrl);
                      if (transaction.explorerUrl && transaction.explorerUrl !== 'undefined') {
                        window.open(transaction.explorerUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neon-cyan/20 rounded-full flex items-center justify-center">
                        {transaction.direction === "IN" ? (
                          <TrendingUp className="h-5 w-5 text-green-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {transaction.direction === "IN" ? "Inflow" : "Outflow"}
                          </span>
                          <span className="text-sm">{getNetworkIcon(transaction.network || 'ethereum')}</span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {formatAddress(transaction.txHash)}
                        </div>
                        <Badge variant="outline" className={`text-xs mt-1 ${getNetworkColor(transaction.network || 'ethereum')}`}>
                          {(transaction.network || 'ethereum').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-semibold ${
                        transaction.direction === "IN" ? "text-green-400" : "text-red-400"
                      }`}>
                        {transaction.direction === "IN" ? "+" : "-"}
                        {formatAmount(transaction.amount || "0")} {transaction.token}
                      </div>
                      <div className="text-xs text-gray-400">
                        {transaction.timestamp ? getTimeAgo(transaction.timestamp) : "Unknown"}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
