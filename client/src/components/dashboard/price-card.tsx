import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Stablecoin } from "@/types";

interface PriceCardProps {
  coin: Stablecoin;
}

const getStablecoinLogo = (symbol: string) => {
  const logos: Record<string, string> = {
    'USDC': '🔵',
    'USDT': '🟢', 
    'DAI': '🟡',
    'BUSD': '🟡',
    'FRAX': '🔷',
    'LUSD': '🔶',
    'TUSD': '🔵',
    'PYUSD': '🟣',
    'USDD': '🔴',
    'USTC': '🌙',
    'HUSD': '🟧',
    'GUSD': '🟦',
    'USDP': '🟩',
  };
  return logos[symbol] || '💰';
};

export default function PriceCard({ coin }: PriceCardProps) {
  const price = parseFloat(coin.currentPrice || "1.0");
  const change = parseFloat(coin.priceChange24h || "0");
  const isPositive = change >= 0;
  const isAlert = coin.pegStatus === "ALERT";
  const isDepegged = coin.pegStatus === "DEPEGGED";

  const getStatusColor = () => {
    if (isDepegged) return "from-red-400 to-red-500";
    if (isAlert) return "from-yellow-400 to-orange-400";
    return "from-blue-300 to-cyan-300";
  };

  const getStatusText = () => {
    if (isDepegged) return "DEPEGGED";
    if (isAlert) return "ALERT";
    return "STABLE";
  };

  const getStatusIcon = () => {
    if (isDepegged || isAlert) return <AlertTriangle className="h-4 w-4" />;
    return <div className="w-2 h-2 bg-neon-green rounded-full" />;
  };

  // Calculate peg deviation and stability percentage for progress bar
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  const pegDeviation = Math.abs(numericPrice - 1.0);
  
  // Progress bar shows stability level (100% = perfect peg, 0% = heavily depegged)
  let pegStabilityPercent;
  if (pegDeviation <= 0.001) {
    pegStabilityPercent = 100; // Perfect or near-perfect peg
  } else if (pegDeviation <= 0.01) {
    pegStabilityPercent = Math.max(85 - (pegDeviation * 1000), 60); // 60-85% for small deviations
  } else if (pegDeviation <= 0.05) {
    pegStabilityPercent = Math.max(60 - (pegDeviation * 500), 10); // 10-60% for medium deviations  
  } else {
    pegStabilityPercent = Math.max(10 - (pegDeviation * 100), 0); // 0-10% for large deviations
  }
  
  // Ensure we have a valid percentage
  pegStabilityPercent = Math.max(0, Math.min(100, pegStabilityPercent));

  return (
    <motion.div
      className="price-card p-6 rounded-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-xl",
            "bg-gradient-to-br border-2 border-white/10",
            getStatusColor()
          )}>
            {getStablecoinLogo(coin.symbol)}
          </div>
          <div>
            <h3 className="font-semibold">{coin.name}</h3>
            <p className="text-sm text-gray-400">{coin.symbol}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold">
            ${price.toFixed(4)}
          </div>
          <div className={cn(
            "text-sm font-mono flex items-center gap-1",
            isPositive ? "text-neon-green" : "text-red-400"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? "+" : ""}{change.toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={cn(
            "text-sm font-mono",
            isDepegged ? "text-red-400" : isAlert ? "text-orange-400" : "text-gray-400"
          )}>
            Peg Status: {getStatusText()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-mono",
            isDepegged ? "text-red-400" : isAlert ? "text-orange-400" : "text-gray-400"
          )}>
            {pegDeviation < 0.001 ? "±0.00%" : `±${(pegDeviation * 100).toFixed(2)}%`}
          </span>
          <span className={cn(
            "text-xs font-mono font-bold",
            isDepegged ? "text-red-400" : isAlert ? "text-orange-400" : "text-neon-green"
          )}>
            {pegStabilityPercent.toFixed(0)}% stable
          </span>
        </div>
      </div>
      
      <div className="h-3 bg-gray-900/80 rounded-full overflow-hidden border border-gray-600/50 shadow-inner">
        <motion.div
          className={cn(
            "h-full bg-gradient-to-r shadow-lg",
            getStatusColor()
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pegStabilityPercent}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ 
            width: `${pegStabilityPercent}%`,
            minWidth: pegStabilityPercent > 0 ? "4px" : "0px",
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)"
          }}
        />
      </div>
    </motion.div>
  );
}
