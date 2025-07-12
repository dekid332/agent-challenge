import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  last_updated: string;
}

export const depegDetectorTool = createTool({
  id: "detect-stablecoin-depegs",
  description: "Monitor stablecoin prices and detect depegs from $1 peg",
  inputSchema: z.object({
    threshold: z.number().optional().default(0.01).describe("Deviation threshold (default 1%)"),
    symbols: z.array(z.string()).optional().describe("Specific stablecoin symbols to check"),
  }),
  outputSchema: z.object({
    stablecoins: z.array(z.object({
      symbol: z.string(),
      name: z.string(),
      currentPrice: z.number(),
      priceChange24h: z.number(),
      pegDeviation: z.number(),
      pegStatus: z.string(),
      severity: z.string(),
      memeQuote: z.string(),
    })),
    totalChecked: z.number(),
    depegsDetected: z.number(),
  }),
  execute: async ({ context }) => {
    return await detectStablecoinDepegs(context.threshold, context.symbols);
  },
});

const detectStablecoinDepegs = async (threshold: number = 0.01, symbols?: string[]) => {
  const stablecoinIds = [
    "usd-coin", "tether", "dai", "true-usd", "pax-dollar", "gemini-dollar", "origin-dollar",
    "frax", "magic-internet-money", "terrausd", "neutrino", "usdd", "fei-usd", "liquity-usd"
  ];

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${stablecoinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const stablecoins = [];
    let depegsDetected = 0;

    for (const [id, priceData] of Object.entries(data)) {
      const coinData = priceData as { usd: number; usd_24h_change: number; usd_market_cap: number };
      const price = coinData.usd;
      const change24h = coinData.usd_24h_change || 0;
      const deviation = Math.abs(price - 1);
      
      // Skip if specific symbols requested and this isn't one of them
      if (symbols && symbols.length > 0) {
        const symbol = getSymbolFromId(id);
        if (!symbols.includes(symbol.toUpperCase())) continue;
      }

      let pegStatus = "STABLE";
      let severity = "LOW";
      
      if (deviation > threshold) {
        pegStatus = price < 1 ? "DEPEG_DOWN" : "DEPEG_UP";
        severity = deviation > 0.05 ? "CRITICAL" : "HIGH";
        depegsDetected++;
      }

      stablecoins.push({
        symbol: getSymbolFromId(id),
        name: getNameFromId(id),
        currentPrice: price,
        priceChange24h: change24h,
        pegDeviation: deviation,
        pegStatus,
        severity,
        memeQuote: generateMemeQuote(pegStatus, getSymbolFromId(id)),
      });
    }

    return {
      stablecoins,
      totalChecked: stablecoins.length,
      depegsDetected,
    };
  } catch (error) {
    throw new Error(`Failed to fetch stablecoin prices: ${error.message}`);
  }
};

const getSymbolFromId = (id: string): string => {
  const mapping: Record<string, string> = {
    "usd-coin": "USDC",
    "tether": "USDT",
    "dai": "DAI",
    "true-usd": "TUSD",
    "pax-dollar": "USDP",
    "gemini-dollar": "GUSD",
    "origin-dollar": "OUSD",
    "frax": "FRAX",
    "magic-internet-money": "MIM",
    "terrausd": "USTC",
    "neutrino": "USDN",
    "usdd": "USDD",
    "fei-usd": "FEI",
    "liquity-usd": "LUSD",
  };
  return mapping[id] || id.toUpperCase();
};

const getNameFromId = (id: string): string => {
  const mapping: Record<string, string> = {
    "usd-coin": "USD Coin",
    "tether": "Tether",
    "dai": "Dai",
    "true-usd": "TrueUSD",
    "pax-dollar": "Pax Dollar",
    "gemini-dollar": "Gemini Dollar",
    "origin-dollar": "Origin Dollar",
    "frax": "Frax",
    "magic-internet-money": "Magic Internet Money",
    "terrausd": "TerraClassicUSD",
    "neutrino": "Neutrino USD",
    "usdd": "USDD",
    "fei-usd": "Fei USD",
    "liquity-usd": "Liquity USD",
  };
  return mapping[id] || id;
};

const generateMemeQuote = (pegStatus: string, symbol: string): string => {
  const quotes = {
    STABLE: [
      `🐸 "${symbol} is holding strong like Pegg's grip on lily pads!"`,
      `🐸 "Pegg approves of ${symbol}'s stability - no drama here!"`,
      `🐸 "Boring is beautiful when it comes to ${symbol}'s peg!"`,
    ],
    DEPEG_DOWN: [
      `🐸 "${symbol} is diving deeper than Pegg in a pond!"`,
      `🐸 "Pegg sees ${symbol} taking a swim below the dollar..."`,
      `🐸 "${symbol} went on a discount shopping spree!"`,
    ],
    DEPEG_UP: [
      `🐸 "${symbol} is jumping higher than Pegg on a hot lily pad!"`,
      `🐸 "Pegg watches ${symbol} trying to be fancy above $1..."`,
      `🐸 "${symbol} got a little too excited about that dollar!"`,
    ],
  };
  
  const categoryQuotes = quotes[pegStatus as keyof typeof quotes] || quotes.STABLE;
  return categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];
};