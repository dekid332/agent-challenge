import dotenv from 'dotenv';
dotenv.config();

// Network configurations
export const NETWORKS = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://etherscan.io',
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken',
    nativeToken: 'ETH',
    stablecoins: ['USDC', 'USDT', 'DAI', 'FRAX']
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://polygonscan.com',
    apiUrl: 'https://api.polygonscan.com/api',
    apiKey: process.env.POLYGONSCAN_API_KEY || 'YourApiKeyToken',
    nativeToken: 'MATIC',
    stablecoins: ['USDC', 'USDT', 'DAI']
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://arbiscan.io',
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: process.env.ARBISCAN_API_KEY || 'YourApiKeyToken',
    nativeToken: 'ETH',
    stablecoins: ['USDC', 'USDT', 'DAI']
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://optimistic.etherscan.io',
    apiUrl: 'https://api-optimistic.etherscan.io/api',
    apiKey: process.env.OPTIMISM_API_KEY || 'YourApiKeyToken',
    nativeToken: 'ETH',
    stablecoins: ['USDC', 'USDT', 'DAI']
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://basescan.org',
    apiUrl: 'https://api.basescan.org/api',
    apiKey: process.env.BASESCAN_API_KEY || 'YourApiKeyToken',
    nativeToken: 'ETH',
    stablecoins: ['USDC', 'USDbC']
  }
};

export type NetworkName = keyof typeof NETWORKS;

export class MultiChainService {
  async getTransactions(network: NetworkName, address: string, page: number = 1): Promise<any[]> {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    try {
      const url = `${networkConfig.apiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=10&sort=desc&apikey=${networkConfig.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        return data.result.map((tx: any) => ({
          ...tx,
          network,
          explorerUrl: `${networkConfig.explorerUrl}/tx/${tx.hash}`
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching transactions for ${network}:`, error);
      return [];
    }
  }

  async getTokenTransactions(network: NetworkName, address: string, contractAddress?: string): Promise<any[]> {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    try {
      let url = `${networkConfig.apiUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${networkConfig.apiKey}`;
      
      if (contractAddress) {
        url += `&contractaddress=${contractAddress}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        return data.result.map((tx: any) => ({
          ...tx,
          network,
          explorerUrl: `${networkConfig.explorerUrl}/tx/${tx.hash}`,
          isStablecoin: networkConfig.stablecoins.includes(tx.tokenSymbol)
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching token transactions for ${network}:`, error);
      return [];
    }
  }

  async getBalance(network: NetworkName, address: string): Promise<string> {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    try {
      const url = `${networkConfig.apiUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${networkConfig.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1') {
        return data.result;
      }
      
      return '0';
    } catch (error) {
      console.error(`Error fetching balance for ${network}:`, error);
      return '0';
    }
  }

  getExplorerUrl(network: NetworkName, type: 'tx' | 'address', hash: string): string {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      return '';
    }

    return `${networkConfig.explorerUrl}/${type}/${hash}`;
  }

  getAllNetworks(): NetworkName[] {
    return Object.keys(NETWORKS) as NetworkName[];
  }

  getNetworkInfo(network: NetworkName) {
    return NETWORKS[network];
  }

  isStablecoinTransaction(network: NetworkName, tokenSymbol: string): boolean {
    const networkConfig = NETWORKS[network];
    return networkConfig?.stablecoins.includes(tokenSymbol) || false;
  }
}

export const multiChainService = new MultiChainService();