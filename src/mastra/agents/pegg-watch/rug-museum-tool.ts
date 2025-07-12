import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface RuggedCoin {
  name: string;
  symbol: string;
  deathDate: Date;
  cause: string;
  marketCapAtDeath: string;
  story: string;
  memeQuote: string;
  imageUrl?: string;
  links?: any[];
}

export const rugMuseumTool = createTool({
  id: "explore-rug-museum",
  description: "Explore the Rug Museum - a collection of failed stablecoins and their stories",
  inputSchema: z.object({
    query: z.string().optional().describe("Search query for specific rugged coins"),
    symbol: z.string().optional().describe("Specific coin symbol to look up"),
    limit: z.number().optional().default(5).describe("Maximum number of results to return"),
  }),
  outputSchema: z.object({
    ruggedCoins: z.array(z.object({
      name: z.string(),
      symbol: z.string(),
      deathDate: z.string(),
      cause: z.string(),
      marketCapAtDeath: z.string(),
      story: z.string(),
      memeQuote: z.string(),
      daysDeadFor: z.number(),
      riskLevel: z.string(),
    })),
    totalInMuseum: z.number(),
    totalMarketCapLost: z.string(),
    museumQuote: z.string(),
    searchSummary: z.string(),
  }),
  execute: async ({ context }) => {
    return await exploreRugMuseum(context.query, context.symbol, context.limit);
  },
});

const exploreRugMuseum = async (query?: string, symbol?: string, limit = 5) => {
  // Historical failed stablecoins data
  const ruggedCoins: RuggedCoin[] = [
    {
      name: "TerraUSD",
      symbol: "UST",
      deathDate: new Date("2022-05-12"),
      cause: "Algorithmic stablecoin failure",
      marketCapAtDeath: "60000000000",
      story: "The algorithmic stablecoin that was supposed to maintain its peg through market mechanisms and the Luna token. When large redemptions began, the death spiral started - UST lost its peg, Luna hyperinflated, and an entire $60 billion ecosystem collapsed in days.",
      memeQuote: "🐸 \"Even Pegg couldn't save this algorithmic nightmare...\"",
    },
    {
      name: "Iron Finance TITAN",
      symbol: "TITAN",
      deathDate: new Date("2021-06-16"),
      cause: "Bank run and depeg spiral",
      marketCapAtDeath: "2000000000",
      story: "Iron Finance's partially collateralized stablecoin IRON was backed by USDC and TITAN tokens. When confidence waned, users rushed to redeem IRON for USDC, causing TITAN to be minted and sold, crashing its price. Mark Cuban was a notable victim.",
      memeQuote: "🐸 \"Pegg saw this coming from a mile away...\"",
    },
    {
      name: "Empty Set Dollar",
      symbol: "ESD",
      deathDate: new Date("2021-03-15"),
      cause: "Rebase mechanism failure",
      marketCapAtDeath: "500000000",
      story: "An algorithmic stablecoin that used a rebase mechanism to maintain its peg. The mechanism failed spectacularly as the token entered a death spiral, rebasing itself essentially to zero.",
      memeQuote: "🐸 \"Pegg watched it rebase itself into oblivion...\"",
    },
    {
      name: "Basis Cash",
      symbol: "BAC",
      deathDate: new Date("2021-02-28"),
      cause: "Three-token model collapse",
      marketCapAtDeath: "300000000",
      story: "Basis Cash attempted to recreate the failed Basis protocol with three tokens: BAC (stablecoin), BAB (bonds), and BAS (shares). The complex mechanism couldn't maintain BAC's peg and the tokens became worthless.",
      memeQuote: "🐸 \"Three tokens, zero stability. Pegg knew math better than this...\"",
    },
    {
      name: "Neutrino USD",
      symbol: "USDN",
      deathDate: new Date("2022-04-04"),
      cause: "Waves ecosystem collapse",
      marketCapAtDeath: "800000000",
      story: "USDN was an algorithmic stablecoin backed by WAVES tokens. When the Waves ecosystem came under pressure and WAVES price fell dramatically, USDN lost its peg and couldn't recover.",
      memeQuote: "🐸 \"Waves made, waves crashed, USDN drowned. Pegg saw the tsunami coming...\"",
    },
    {
      name: "USDD",
      symbol: "USDD",
      deathDate: new Date("2022-06-13"),
      cause: "Tron-based algorithmic failure",
      marketCapAtDeath: "900000000",
      story: "USDD was Justin Sun's attempt at creating an algorithmic stablecoin on the Tron network, heavily inspired by Terra's UST. Despite claims of over-collateralization, USDD lost its peg during market stress.",
      memeQuote: "🐸 \"Copy-paste code, copy-paste failure. Pegg learned that innovation can't be cloned...\"",
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      deathDate: new Date("2022-01-26"),
      cause: "Abracadabra protocol issues",
      marketCapAtDeath: "150000000",
      story: "MIM was a stablecoin created by the Abracadabra protocol that allowed users to mint stablecoins against various collateral types. The protocol faced issues with its exposure to risky assets.",
      memeQuote: "🐸 \"Magic went wrong, abracadabra became abracadaver. Pegg knows real magic requires real collateral...\"",
    },
    {
      name: "DefiDollar",
      symbol: "DUSD",
      deathDate: new Date("2021-11-30"),
      cause: "Low adoption and mechanism failure",
      marketCapAtDeath: "50000000",
      story: "DefiDollar aimed to create a stablecoin backed by a basket of other stablecoins, but the protocol failed to gain significant adoption. The complex mechanism couldn't maintain the peg during market stress.",
      memeQuote: "🐸 \"A basket of stablecoins that couldn't stay stable. Pegg learned that complexity isn't always better...\"",
    },
  ];

  // Filter coins based on query or symbol
  let filteredCoins = ruggedCoins;
  
  if (symbol) {
    filteredCoins = ruggedCoins.filter(coin => 
      coin.symbol.toLowerCase() === symbol.toLowerCase()
    );
  } else if (query) {
    filteredCoins = ruggedCoins.filter(coin => 
      coin.name.toLowerCase().includes(query.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(query.toLowerCase()) ||
      coin.cause.toLowerCase().includes(query.toLowerCase()) ||
      coin.story.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Sort by death date (most recent first) and limit results
  filteredCoins = filteredCoins
    .sort((a, b) => b.deathDate.getTime() - a.deathDate.getTime())
    .slice(0, limit);

  const processedCoins = filteredCoins.map(coin => ({
    name: coin.name,
    symbol: coin.symbol,
    deathDate: coin.deathDate.toISOString().split('T')[0],
    cause: coin.cause,
    marketCapAtDeath: formatMarketCap(coin.marketCapAtDeath),
    story: coin.story,
    memeQuote: coin.memeQuote,
    daysDeadFor: Math.floor((Date.now() - coin.deathDate.getTime()) / (1000 * 60 * 60 * 24)),
    riskLevel: calculateRiskLevel(coin.marketCapAtDeath),
  }));

  const totalMarketCapLost = ruggedCoins.reduce((sum, coin) => 
    sum + parseInt(coin.marketCapAtDeath), 0
  );

  const searchSummary = generateSearchSummary(query, symbol, processedCoins.length, ruggedCoins.length);

  return {
    ruggedCoins: processedCoins,
    totalInMuseum: ruggedCoins.length,
    totalMarketCapLost: formatMarketCap(totalMarketCapLost.toString()),
    museumQuote: generateMuseumQuote(processedCoins.length),
    searchSummary,
  };
};

const formatMarketCap = (marketCap: string): string => {
  const cap = parseInt(marketCap);
  if (cap >= 1000000000) {
    return `$${(cap / 1000000000).toFixed(1)}B`;
  } else if (cap >= 1000000) {
    return `$${(cap / 1000000).toFixed(1)}M`;
  } else if (cap >= 1000) {
    return `$${(cap / 1000).toFixed(1)}K`;
  }
  return `$${cap}`;
};

const calculateRiskLevel = (marketCap: string): string => {
  const cap = parseInt(marketCap);
  if (cap >= 10000000000) return "CATASTROPHIC";
  if (cap >= 1000000000) return "CRITICAL";
  if (cap >= 100000000) return "HIGH";
  if (cap >= 10000000) return "MEDIUM";
  return "LOW";
};

const generateMuseumQuote = (resultCount: number): string => {
  const quotes = [
    `🐸 "Welcome to Pegg's Museum of Broken Dreams - where stablecoins come to rest in peace..."`,
    `🐸 "Pegg has seen many rise and fall. This museum preserves their stories."`,
    `🐸 "Every coin here taught Pegg a lesson about what NOT to do with stability..."`,
    `🐸 "Pegg's collection of cautionary tales grows with each algorithmic failure."`,
    `🐸 "In this museum, Pegg honors the fallen - may their failures teach us wisdom."`,
  ];
  
  return quotes[Math.floor(Math.random() * quotes.length)];
};

const generateSearchSummary = (query?: string, symbol?: string, foundCount = 0, totalCount = 0): string => {
  if (symbol) {
    return foundCount > 0 
      ? `Found ${foundCount} entry for ${symbol} in Pegg's Museum`
      : `No entries found for ${symbol} in Pegg's Museum`;
  }
  
  if (query) {
    return foundCount > 0
      ? `Found ${foundCount} entries matching "${query}" out of ${totalCount} total exhibits`
      : `No entries found matching "${query}" in Pegg's Museum`;
  }
  
  return `Showing ${foundCount} exhibits from Pegg's Museum of ${totalCount} total failed stablecoins`;
};