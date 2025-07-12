import { storage } from "../server/storage";

export async function initializeRugMuseum() {
  console.log("🪦 Initializing Rug Museum with historical data...");
  
  const ruggedCoins = [
    {
      name: "TerraUSD",
      symbol: "UST",
      deathDate: new Date("2022-05-12"),
      cause: "Algorithmic stablecoin failure",
      marketCapAtDeath: "60000000000",
      story: "The algorithmic stablecoin that was supposed to maintain its peg through market mechanisms and the Luna token. When large redemptions began, the death spiral started - UST lost its peg, Luna hyperinflated, and an entire $60 billion ecosystem collapsed in days. The Terra ecosystem crash became one of the largest crypto disasters in history.",
      memeQuote: "🐸 \"Even Pegg couldn't save this algorithmic nightmare...\"",
      imageUrl: null,
      links: [
        {
          title: "CoinDesk Coverage",
          url: "https://www.coindesk.com/markets/2022/05/11/terras-ust-stablecoin-slides-below-dollar-peg-amid-market-volatility/"
        },
        {
          title: "Post-mortem Analysis", 
          url: "https://research.binance.com/en/analysis/ust-depeg-incident"
        }
      ]
    },
    {
      name: "Iron Finance TITAN",
      symbol: "TITAN",
      deathDate: new Date("2021-06-16"),
      cause: "Bank run and depeg spiral",
      marketCapAtDeath: "2000000000",
      story: "Iron Finance's partially collateralized stablecoin IRON was backed by USDC and TITAN tokens. When confidence waned, users rushed to redeem IRON for USDC, causing TITAN to be minted and sold, crashing its price. Mark Cuban was a notable victim, losing millions in what he called a 'bank run' scenario.",
      memeQuote: "🐸 \"Pegg saw this coming from a mile away...\"",
      imageUrl: null,
      links: [
        {
          title: "Mark Cuban's Statement",
          url: "https://blog.markcuban.com/2021/06/16/the-iron-finance-titan-fiasco/"
        }
      ]
    },
    {
      name: "Empty Set Dollar",
      symbol: "ESD",
      deathDate: new Date("2021-03-15"),
      cause: "Rebase mechanism failure",
      marketCapAtDeath: "500000000",
      story: "An algorithmic stablecoin that used a rebase mechanism to maintain its peg. When the token traded below $1, the supply would contract, and when above $1, it would expand. The mechanism failed spectacularly as the token entered a death spiral, rebasing itself essentially to zero as confidence evaporated.",
      memeQuote: "🐸 \"Pegg watched it rebase itself into oblivion...\"",
      imageUrl: null,
      links: [
        {
          title: "ESD Documentation",
          url: "https://docs.emptyset.finance/"
        }
      ]
    },
    {
      name: "Basis Cash",
      symbol: "BAC",
      deathDate: new Date("2021-02-28"),
      cause: "Three-token model collapse",
      marketCapAtDeath: "300000000",
      story: "Basis Cash attempted to recreate the failed Basis protocol with three tokens: BAC (stablecoin), BAB (bonds), and BAS (shares). The complex mechanism was supposed to maintain BAC's peg through bond purchases and share distributions. However, the system couldn't maintain its peg and the tokens became worthless.",
      memeQuote: "🐸 \"Three tokens, zero stability. Pegg knew math better than this...\"",
      imageUrl: null,
      links: [
        {
          title: "Basis Cash Analysis",
          url: "https://medium.com/basis-cash/basis-cash-a-algorithmic-stablecoin-6f2e8d6e7a8f"
        }
      ]
    },
    {
      name: "Neutrino USD",
      symbol: "USDN", 
      deathDate: new Date("2022-04-04"),
      cause: "Waves ecosystem collapse",
      marketCapAtDeath: "800000000",
      story: "USDN was an algorithmic stablecoin backed by WAVES tokens on the Waves blockchain. When the Waves ecosystem came under pressure and WAVES price fell dramatically, USDN lost its peg and couldn't recover. The stablecoin's value plummeted as confidence in the backing mechanism evaporated.",
      memeQuote: "🐸 \"Waves made, waves crashed, USDN drowned. Pegg saw the tsunami coming...\"",
      imageUrl: null,
      links: [
        {
          title: "Neutrino Protocol",
          url: "https://neutrino.at/"
        }
      ]
    },
    {
      name: "USDD",
      symbol: "USDD",
      deathDate: new Date("2022-06-13"),
      cause: "Tron-based algorithmic failure", 
      marketCapAtDeath: "900000000",
      story: "USDD was Justin Sun's attempt at creating an algorithmic stablecoin on the Tron network, heavily inspired by Terra's UST. Despite claims of over-collateralization, USDD lost its peg during market stress and never fully recovered, trading significantly below $1 for extended periods.",
      memeQuote: "🐸 \"Copy-paste code, copy-paste failure. Pegg learned that innovation can't be cloned...\"",
      imageUrl: null,
      links: [
        {
          title: "USDD Protocol",
          url: "https://usdd.io/"
        }
      ]
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      deathDate: new Date("2022-01-26"),
      cause: "Abracadabra protocol issues",
      marketCapAtDeath: "150000000", 
      story: "MIM was a stablecoin created by the Abracadabra protocol that allowed users to mint stablecoins against various collateral types. The protocol faced issues with its exposure to risky assets and the broader DeFi 2.0 token collapse, causing MIM to lose its peg and face redemption pressure.",
      memeQuote: "🐸 \"Magic went wrong, abracadabra became abracadaver. Pegg knows real magic requires real collateral...\"",
      imageUrl: null,
      links: [
        {
          title: "Abracadabra Protocol",
          url: "https://abracadabra.money/"
        }
      ]
    },
    {
      name: "DefiDollar",
      symbol: "DUSD",
      deathDate: new Date("2021-11-30"),
      cause: "Low adoption and mechanism failure",
      marketCapAtDeath: "50000000",
      story: "DefiDollar aimed to create a stablecoin backed by a basket of other stablecoins, but the protocol failed to gain significant adoption. The complex mechanism couldn't maintain the peg during market stress, and the protocol was eventually abandoned as users lost confidence in the system.",
      memeQuote: "🐸 \"A basket of stablecoins that couldn't stay stable. Pegg learned that complexity isn't always better...\"",
      imageUrl: null,
      links: [
        {
          title: "DefiDollar Documentation",
          url: "https://docs.defidollar.com/"
        }
      ]
    }
  ];

  for (const rugData of ruggedCoins) {
    try {
      const existing = await storage.getRuggedCoinBySymbol(rugData.symbol);
      if (!existing) {
        await storage.createRuggedCoin(rugData);
        console.log(`🪦 Added ${rugData.symbol} to the Rug Museum`);
      }
    } catch (error) {
      console.error(`🪦 Failed to add ${rugData.symbol} to museum:`, error);
    }
  }

  console.log(`🪦 Rug Museum initialization complete`);
}
