import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ChainActivity {
  id: number;
  name: string;
  symbol: string;
  explorerUrl: string;
  transactionCount: number;
  totalVolume?: number;
  supported: boolean;
  lastUpdated: string;
}

export function WhaleHeatmap() {
  const { data: chainActivity, isLoading, error } = useQuery<ChainActivity[]>({
    queryKey: ['/api/chains/activity'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Multi-Chain Activity...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Chain Activity</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Sort chains by transaction count
  const sortedChains = chainActivity?.sort((a, b) => b.transactionCount - a.transactionCount) || [];
  const maxTransactions = Math.max(...sortedChains.map(chain => chain.transactionCount), 1);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800";
    const intensity = Math.min(count / maxTransactions, 1);
    if (intensity > 0.7) return "bg-red-500";
    if (intensity > 0.4) return "bg-orange-500";
    if (intensity > 0.2) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getTextColor = (count: number) => {
    const intensity = count / maxTransactions;
    return intensity > 0.3 ? "text-white" : "text-gray-900 dark:text-gray-100";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Multi-Chain Whale Activity Heatmap
          <Badge variant="outline">
            {sortedChains.reduce((sum, chain) => sum + chain.transactionCount, 0)} Total Transactions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedChains.map((chain) => (
            <div
              key={chain.id}
              className={`
                relative p-4 rounded-lg border transition-all duration-200 hover:scale-105 cursor-pointer
                ${getHeatmapColor(chain.transactionCount)}
                ${getTextColor(chain.transactionCount)}
              `}
              onClick={() => window.open(chain.explorerUrl, '_blank')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="font-bold text-sm">{chain.name}</div>
                <div className="text-xs opacity-80 mb-2">{chain.symbol}</div>
                <div className="text-lg font-bold">
                  {chain.transactionCount}
                </div>
                <div className="text-xs opacity-80">
                  {chain.transactionCount === 1 ? 'transaction' : 'transactions'}
                </div>
                {chain.totalVolume && (
                  <div className="text-xs mt-1 opacity-80">
                    ${(chain.totalVolume / 1000000).toFixed(1)}M volume
                  </div>
                )}
                {!chain.supported && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    API Required
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          Click any chain to view explorer • Updates every 30 seconds • Colors indicate transaction volume
        </div>
      </CardContent>
    </Card>
  );
}