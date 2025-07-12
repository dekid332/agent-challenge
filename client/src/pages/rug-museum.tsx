import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Skull, Calendar, DollarSign, ExternalLink, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { RuggedCoin } from "@/types";

export default function RugMuseum() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: ruggedCoins, isLoading } = useQuery<RuggedCoin[]>({
    queryKey: ["/api/rugs"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const filteredCoins = ruggedCoins?.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.cause.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCauseColor = (cause: string) => {
    const lowerCause = cause.toLowerCase();
    if (lowerCause.includes("algorithmic")) return "bg-red-500/20 text-red-400 border-red-500/50";
    if (lowerCause.includes("depeg")) return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    if (lowerCause.includes("hack")) return "bg-purple-500/20 text-purple-400 border-purple-500/50";
    if (lowerCause.includes("rug")) return "bg-pink-500/20 text-pink-400 border-pink-500/50";
    return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  };

  const formatMarketCap = (marketCap: string) => {
    const num = parseFloat(marketCap);
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            💀
          </motion.div>
          <p className="text-gray-400 font-mono">Excavating the rug graveyard...</p>
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
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skull className="h-8 w-8 text-neon-pink" />
              <div>
                <h1 className="text-2xl font-display font-bold text-neon-pink">
                  The Rug Museum
                </h1>
                <p className="text-gray-400 font-mono">
                  Hall of Shame: {ruggedCoins?.length || 0} fallen stablecoins
                </p>
              </div>
            </div>
            <div className="text-4xl animate-float">🐸</div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, symbol, or cause of death..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-card border-neon-pink/20"
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-neon-pink to-purple-500"></div>
          
          <div className="space-y-8">
            {filteredCoins?.length === 0 ? (
              <div className="text-center py-20">
                <Skull className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-semibold mb-2">No rugs found</h3>
                <p className="text-gray-400">
                  {searchTerm ? "Try adjusting your search terms" : "🐸 Pegg is still cataloging the carnage..."}
                </p>
              </div>
            ) : (
              filteredCoins?.map((coin, index) => (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 w-4 h-4 bg-neon-pink rounded-full border-4 border-background z-10"></div>
                  
                  {/* Card */}
                  <div className="ml-16">
                    <Card className="glass-card border-neon-pink/20 hover:border-neon-pink/40 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                              <Skull className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-xl text-neon-pink">
                                {coin.name} ({coin.symbol})
                              </CardTitle>
                              <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-1 text-gray-400">
                                  <Calendar className="h-4 w-4" />
                                  <span className="font-mono text-sm">
                                    {formatDate(coin.deathDate)}
                                  </span>
                                </div>
                                {coin.marketCapAtDeath && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-mono text-sm">
                                      {formatMarketCap(coin.marketCapAtDeath)} lost
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge className={getCauseColor(coin.cause)}>
                            {coin.cause}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-gray-300 leading-relaxed">
                          {coin.story}
                        </p>
                        
                        {coin.memeQuote && (
                          <div className="terminal-bg p-4 rounded-lg">
                            <div className="text-neon-green font-mono text-sm">
                              {coin.memeQuote}
                            </div>
                          </div>
                        )}
                        
                        {coin.links && Array.isArray(coin.links) && coin.links.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {coin.links.map((link: any, linkIndex: number) => (
                              <Button
                                key={linkIndex}
                                variant="outline"
                                size="sm"
                                className="glass-card border-neon-pink/20 hover:border-neon-pink/40"
                                onClick={() => window.open(link.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {link.title}
                              </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
