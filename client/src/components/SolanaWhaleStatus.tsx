import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface SolanaStatus {
  service: string;
  status: 'online' | 'offline';
  lastProcessedSlot: number;
  scanInterval: number;
  thresholds: {
    USDC: number;
    USDT: number;
    SOL: number;
    WSOL: number;
  };
}

export function SolanaWhaleStatus() {
  const { toast } = useToast();
  
  const { data: status, isLoading, refetch } = useQuery<SolanaStatus>({
    queryKey: ['/api/solana/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const testSolanaTransaction = async () => {
    try {
      const response = await fetch('/api/solana/scan-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: '4xaT7PK7rjvADfBLtyeHVwfFVFfvvFvjrVXhXFvjXjQrXFvgXdXjXvXfrXvX' // Test signature
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Solana Transaction Scan",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scan Solana transaction",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Solana Whale Watcher</CardTitle>
          <CardDescription>Loading status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Solana Whale Watcher
          <Badge variant={status?.status === 'online' ? 'default' : 'secondary'}>
            {status?.status}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time Solana blockchain monitoring for whale transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Last Processed Slot</p>
            <p className="font-mono text-lg">{status?.lastProcessedSlot || 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Scan Interval</p>
            <p className="font-mono text-lg">{status?.scanInterval}ms</p>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-2">Whale Thresholds</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span>USDC:</span>
              <span className="font-mono">{status?.thresholds.USDC.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>USDT:</span>
              <span className="font-mono">{status?.thresholds.USDT.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>SOL:</span>
              <span className="font-mono">{status?.thresholds.SOL.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>WSOL:</span>
              <span className="font-mono">{status?.thresholds.WSOL.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
          >
            Refresh Status
          </Button>
          <Button 
            onClick={testSolanaTransaction} 
            variant="outline" 
            size="sm"
          >
            Test Scanner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}