import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface NetworkStats {
  network: string;
  transactionCount: number;
  totalVolume: number;
  largestTransaction: number;
  averageAmount: number;
  intensity: number;
}

const NETWORK_COLORS = {
  ethereum: "bg-blue-500",
  polygon: "bg-purple-500", 
  arbitrum: "bg-cyan-500",
  optimism: "bg-red-500",
  base: "bg-blue-600",
  solana: "bg-green-500",
  binance: "bg-yellow-500",
  avalanche: "bg-red-600"
};

const NETWORK_ICONS = {
  ethereum: "⟠",
  polygon: "⬟", 
  arbitrum: "◆",
  optimism: "🔴",
  base: "🔵",
  solana: "◎",
  binance: "🟡",
  avalanche: "🔺"
};

export default function NetworkHeatmap() {
  const { data: heatmapData, isLoading } = useQuery<NetworkStats[]>({
    queryKey: ['/api/whales/heatmap'],
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🗺️ Network Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatAmount = (amount: number): string => {
    if (amount >= 1000000000000) return `${(amount / 1000000000000).toFixed(1)}T`;
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return Math.round(amount).toString();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🗺️ Network Activity Heatmap
          <span className="text-sm text-gray-400 font-normal">
            Real-time whale activity across chains
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {heatmapData?.map((network, index) => {
            const colorClass = NETWORK_COLORS[network.network as keyof typeof NETWORK_COLORS] || "bg-gray-500";
            const icon = NETWORK_ICONS[network.network as keyof typeof NETWORK_ICONS] || "⚡";
            const glowIntensity = Math.max(10, network.intensity);
            
            return (
              <motion.div
                key={network.network}
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }}
                className={`relative p-4 rounded-xl ${colorClass} bg-opacity-25 border border-opacity-40 hover:bg-opacity-40 network-card cursor-pointer group`}
                style={{
                  boxShadow: `0 0 ${glowIntensity}px ${glowIntensity / 3}px rgba(var(--neon-cyan-rgb), 0.4)`,
                  background: `linear-gradient(135deg, ${colorClass.replace('bg-', '')}20, ${colorClass.replace('bg-', '')}10)`
                }}
              >
                {/* Network Icon with pulse animation */}
                <div className="text-3xl mb-3 text-center relative">
                  <div className={`absolute inset-0 animate-ping ${colorClass} rounded-full opacity-20 network-pulse`}></div>
                  <span className="relative z-10 drop-shadow-lg">{icon}</span>
                </div>
                
                {/* Network Name */}
                <div className="text-center text-sm font-bold text-white mb-3 capitalize tracking-wide">
                  {network.network}
                </div>
                
                {/* Transaction Count with animated counter */}
                <div className="text-center mb-2">
                  <div className="text-2xl font-bold text-neon-cyan glow-text">
                    {network.transactionCount}
                  </div>
                  <div className="text-xs text-gray-300 font-medium">whale moves</div>
                </div>
                
                {/* Volume Info with better formatting */}
                <div className="text-center">
                  <div className="text-lg font-bold text-white group-hover:text-neon-green transition-colors">
                    ${formatAmount(network.totalVolume)}
                  </div>
                  <div className="text-xs text-gray-300">volume</div>
                </div>
                
                {/* Activity Level Bar */}
                <div className="absolute top-2 right-2">
                  <div className="flex flex-col gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-2 rounded-full ${colorClass} transition-all duration-300 intensity-bar`}
                        style={{ 
                          opacity: network.intensity > (i * 33) ? 0.8 : 0.2,
                          animation: network.intensity > (i * 33) ? 'intensityGlow 2s infinite' : 'none'
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
                
                {/* Whale Status Badges */}
                <div className="absolute -top-2 -left-2 flex gap-1">
                  {network.largestTransaction > 1000000 && (
                    <div className="bg-red-500 text-xs px-2 py-1 rounded-full text-white font-bold animate-bounce">
                      🐋 MEGA
                    </div>
                  )}
                  {network.transactionCount > 20 && (
                    <div className="bg-orange-500 text-xs px-2 py-1 rounded-full text-white font-bold">
                      🔥 HOT
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Enhanced Legend */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30">
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-pulse"></div>
            <span className="text-white font-medium">High Activity</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30">
            <div className="w-3 h-3 bg-neon-cyan rounded-full opacity-50"></div>
            <span className="text-gray-300">Medium Activity</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30">
            <span className="text-xl">🐋</span>
            <span className="text-white font-medium">Mega Whale (&gt;$1M)</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30">
            <span className="text-xl">🔥</span>
            <span className="text-orange-400 font-medium">Hot Network (&gt;20 tx)</span>
          </div>
        </div>
        
        {/* Network Summary */}
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-400">
            Total Networks: <span className="text-neon-cyan font-bold">{heatmapData?.length || 0}</span> | 
            Active Chains: <span className="text-neon-green font-bold">{heatmapData?.filter(n => n.transactionCount > 0).length || 0}</span> |
            Total Volume: <span className="text-yellow-400 font-bold">${formatAmount(heatmapData?.reduce((sum, n) => sum + n.totalVolume, 0) || 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}