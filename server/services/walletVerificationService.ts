import { etherscanV2Service } from "./etherscanV2Service";
import { solscanService } from "./solscanService";

export class WalletVerificationService {
  private readonly minBalance = 15000; // $15,000 USD minimum

  async verifyWalletBalance(address: string, network: string) {
    try {
      console.log(`🔍 Verifying wallet ${address} on ${network}...`);
      
      let totalBalance = 0;
      const chainBalances: any = {};

      if (network === "Solana") {
        // Verify Solana wallet
        const solanaBalance = await solscanService.getWalletBalance(address);
        chainBalances["Solana"] = solanaBalance;
        totalBalance = solanaBalance;
      } else {
        // Verify EVM chains
        const chains = [1, 137, 42161, 10, 8453]; // Ethereum, Polygon, Arbitrum, Optimism, Base
        
        for (const chainId of chains) {
          try {
            const balance = await etherscanV2Service.getWalletBalance(address, chainId);
            const chainName = this.getChainName(chainId);
            chainBalances[chainName] = balance;
            totalBalance += balance;
          } catch (error) {
            console.warn(`⚠️ Could not verify balance on chain ${chainId}:`, error);
          }
        }
      }

      const isEligible = totalBalance >= this.minBalance;
      const message = isEligible 
        ? `✅ Wallet verified with $${totalBalance.toLocaleString()} total balance across chains`
        : `❌ Wallet below minimum: $${totalBalance.toLocaleString()} (need $${this.minBalance.toLocaleString()})`;

      return {
        isEligible,
        totalBalance,
        chainBalances,
        message,
        network
      };
    } catch (error) {
      console.error(`❌ Error verifying wallet ${address}:`, error);
      return {
        isEligible: false,
        totalBalance: 0,
        chainBalances: {},
        message: `❌ Could not verify wallet: ${error.message}`,
        network
      };
    }
  }

  private getChainName(chainId: number): string {
    const chainNames: { [key: number]: string } = {
      1: "Ethereum",
      137: "Polygon", 
      42161: "Arbitrum",
      10: "Optimism",
      8453: "Base",
      56: "BNB Chain",
      43114: "Avalanche",
      250: "Fantom",
      100: "Gnosis",
      1101: "Polygon zkEVM"
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }
}

export const walletVerificationService = new WalletVerificationService();