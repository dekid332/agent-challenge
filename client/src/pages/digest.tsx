import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DigestEntry } from "@/types";

export default function Digest() {
  const { data: digests, isLoading } = useQuery<DigestEntry[]>({
    queryKey: ["/api/digest"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
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
          <p className="text-gray-400 font-mono">Loading digest data...</p>
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
        className="space-y-6"
      >
        {digests?.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">No Digests Yet</h3>
            <p className="text-gray-400">
              🐸 Pegg is preparing the first daily digest...
            </p>
          </div>
        ) : (
          digests?.map((digest, index) => (
            <motion.div
              key={digest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-neon-green" />
                      Daily Digest
                    </CardTitle>
                    <div className="text-sm text-gray-400 font-mono">
                      {new Date(digest.date).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-lg text-gray-300">
                    {digest.summary}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="font-semibold">Best Performer</span>
                      </div>
                      <div className="text-2xl font-mono text-green-400">
                        {digest.bestPerformer || "N/A"}
                      </div>
                    </div>
                    
                    <div className="glass-card p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        <span className="font-semibold">Worst Performer</span>
                      </div>
                      <div className="text-2xl font-mono text-red-400">
                        {digest.worstPerformer || "N/A"}
                      </div>
                    </div>
                    
                    <div className="glass-card p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-neon-cyan" />
                        <span className="font-semibold">Alert Count</span>
                      </div>
                      <div className="text-2xl font-mono text-neon-cyan">
                        {digest.alertCount || 0}
                      </div>
                    </div>
                  </div>
                  
                  {digest.memeQuote && (
                    <div className="terminal-bg p-4 rounded-lg">
                      <div className="text-neon-green font-mono text-sm">
                        {digest.memeQuote}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
