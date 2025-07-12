import { motion } from "framer-motion";
import { Eye, Building, Circle, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhaleTransaction } from "@/types";

interface WhaleActivityProps {
  transactions: WhaleTransaction[];
}

export default function WhaleActivity({ transactions }: WhaleActivityProps) {
  const getWalletIcon = (walletName: string) => {
    if (walletName.includes("Binance")) return <Building className="h-4 w-4" />;
    if (walletName.includes("Circle")) return <Circle className="h-4 w-4" />;
    return <Eye className="h-4 w-4" />;
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
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  const openEtherscan = (txHash: string) => {
    const url = `https://etherscan.io/tx/${txHash}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5 text-neon-cyan" />
          Whale Activity
        </h3>
        <div className="text-sm text-gray-400 font-mono">Last 24h</div>
      </div>
      
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No whale activity detected</p>
            <p className="text-xs mt-1">🐸 The whales are sleeping...</p>
          </div>
        ) : (
          transactions.slice(0, 5).map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors group"
              onClick={() => window.open(transaction.explorerUrl, '_blank')}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center text-neon-cyan">
                  {getWalletIcon("Whale")}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    Whale Wallet
                  </div>
                  <div className="text-xs text-gray-400 font-mono flex items-center gap-1">
                    {formatAddress(transaction.txHash)}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono text-sm flex items-center gap-1 ${
                  transaction.direction === "IN" ? "text-green-400" : "text-red-400"
                }`}>
                  {transaction.direction === "IN" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {transaction.direction === "IN" ? "+" : "-"}
                  {formatAmount(transaction.amount || "0")} {transaction.token}
                </div>
                <div className="text-xs text-gray-400">
                  {transaction.timestamp ? getTimeAgo(transaction.timestamp) : "Unknown"}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      <Button 
        className="w-full mt-4 glass-card hover:bg-white/10 transition-colors"
        variant="ghost"
      >
        View All Whale Activity
      </Button>
    </div>
  );
}
