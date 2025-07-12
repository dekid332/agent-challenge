import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import PriceCard from "@/components/dashboard/price-card";
import AlertTerminal from "@/components/dashboard/alert-terminal";
import WhaleActivity from "@/components/dashboard/whale-activity";
import RugMuseumPreview from "@/components/dashboard/rug-museum-preview";
import { useWebSocket } from "@/hooks/use-websocket";
import { Stablecoin, Alert, WhaleTransaction } from "@/types";

export default function Dashboard() {
  // Fetch stablecoins data
  const { data: stablecoins, isLoading: loadingStablecoins } = useQuery<Stablecoin[]>({
    queryKey: ["/api/stablecoins"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch alerts data
  const { data: alerts, isLoading: loadingAlerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch whale transactions
  const { data: whaleTransactions } = useQuery<WhaleTransaction[]>({
    queryKey: ["/api/whales/transactions"],
    refetchInterval: 60000, // Refetch every minute
  });

  // WebSocket for real-time updates
  const { lastMessage, connectionStatus } = useWebSocket();

  if (loadingStablecoins || loadingAlerts) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            🐸
          </motion.div>
          <p className="text-gray-400 font-mono">Loading PEGG data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto scrollbar-thin h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Price Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {stablecoins?.map((coin, index) => (
            <motion.div
              key={coin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PriceCard coin={coin} />
            </motion.div>
          ))}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Alert Terminal */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <AlertTerminal alerts={alerts || []} />
          </motion.div>

          {/* Whale Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <WhaleActivity transactions={whaleTransactions || []} />
          </motion.div>
        </div>

        {/* Rug Museum Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6"
        >
          <RugMuseumPreview />
        </motion.div>
      </motion.div>
    </div>
  );
}
