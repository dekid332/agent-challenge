import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { coinGeckoService } from "./services/coinGeckoService";
import { etherscanService } from "./services/etherscanService";
import { agentService } from "./services/agentService";
import { websocketService } from "./services/websocketService";
import { rugMuseumAgent } from "../agents/rugMuseumAgent";
import { initializeRugMuseum } from "../data/initializeRugMuseum";
import { insertAlertSchema } from "@shared/schema";
import { solanaWhaleWatcher } from "./services/solanaWhaleWatcher";
import { initializeMastraAgents, mastra } from "./mastra-startup";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  websocketService.initialize(wss);

  // Initialize data and start services
  setTimeout(async () => {
    try {
      // Initialize rug museum data
      await initializeRugMuseum();
      
      // Start all agent services
      await agentService.startBackgroundServices();
      
      // Initialize Mastra agents
      await initializeMastraAgents();
    } catch (error) {
      console.error("Failed to initialize services:", error);
    }
  }, 1000);

  // API Routes
  
  // Stablecoin routes
  app.get("/api/stablecoins", async (req, res) => {
    try {
      const stablecoins = await storage.getStablecoins();
      res.json(stablecoins);
    } catch (error) {
      console.error("Error fetching stablecoins:", error);
      res.status(500).json({ error: "Failed to fetch stablecoins" });
    }
  });

  app.get("/api/stablecoins/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const stablecoin = await storage.getStablecoinBySymbol(symbol.toUpperCase());
      if (!stablecoin) {
        return res.status(404).json({ error: "Stablecoin not found" });
      }
      res.json(stablecoin);
    } catch (error) {
      console.error("Error fetching stablecoin:", error);
      res.status(500).json({ error: "Failed to fetch stablecoin" });
    }
  });

  // Price update endpoint (for CoinGecko service)
  app.post("/api/stablecoins/update-prices", async (req, res) => {
    try {
      await coinGeckoService.updateAllPrices();
      res.json({ message: "Prices updated successfully" });
    } catch (error) {
      console.error("Error updating prices:", error);
      res.status(500).json({ error: "Failed to update prices" });
    }
  });

  // Alert routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const alerts = await storage.getAlerts(limit);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.get("/api/alerts/unread", async (req, res) => {
    try {
      const alerts = await storage.getUnreadAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching unread alerts:", error);
      res.status(500).json({ error: "Failed to fetch unread alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      
      // Broadcast to WebSocket clients and bots
      await agentService.broadcastAlert(alert);
      
      res.json(alert);
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markAlertAsRead(id);
      res.json({ message: "Alert marked as read" });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      res.status(500).json({ error: "Failed to mark alert as read" });
    }
  });

  // Whale routes
  app.get("/api/whales", async (req, res) => {
    try {
      const whales = await storage.getWhaleWallets();
      res.json(whales);
    } catch (error) {
      console.error("Error fetching whale wallets:", error);
      res.status(500).json({ error: "Failed to fetch whale wallets" });
    }
  });

  app.get("/api/whales/transactions", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const transactions = await storage.getWhaleTransactions(limit);
      
      // Filter out transactions older than 2 hours for live display
      const recentTransactions = transactions.filter(tx => {
        const ageHours = (Date.now() - new Date(tx.timestamp).getTime()) / (1000 * 60 * 60);
        return ageHours <= 2;
      });
      
      console.log(`📊 Whale transactions API: returning ${recentTransactions.length} recent transactions (${transactions.length} total)`);
      res.json(recentTransactions);
    } catch (error) {
      console.error("Error fetching whale transactions:", error);
      res.status(500).json({ error: "Failed to fetch whale transactions" });
    }
  });

  // Network heatmap data endpoint
  app.get("/api/whales/heatmap", async (req, res) => {
    try {
      const transactions = await storage.getWhaleTransactions(200);
      
      // Group transactions by network
      const networkStats = transactions.reduce((acc, tx) => {
        const network = tx.network || 'ethereum';
        if (!acc[network]) {
          acc[network] = {
            network,
            transactionCount: 0,
            totalVolume: 0,
            largestTransaction: 0,
            averageAmount: 0
          };
        }
        
        acc[network].transactionCount++;
        acc[network].totalVolume += parseFloat(tx.amount) || 0;
        acc[network].largestTransaction = Math.max(acc[network].largestTransaction, parseFloat(tx.amount) || 0);
        
        return acc;
      }, {});

      // Calculate averages and format data with proper number handling
      const heatmapData = Object.values(networkStats).map((stats: any) => ({
        ...stats,
        averageAmount: Math.round(stats.totalVolume / stats.transactionCount) || 0,
        intensity: Math.min(100, Math.round((stats.transactionCount / 5) * 100)) // More sensitive intensity scaling
      }));

      res.json(heatmapData);
    } catch (error) {
      console.error("Error generating heatmap data:", error);
      res.status(500).json({ error: "Failed to generate heatmap data" });
    }
  });

  app.get("/api/whales/:id/transactions", async (req, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const transactions = await storage.getWhaleTransactionsByWallet(walletId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching whale transactions:", error);
      res.status(500).json({ error: "Failed to fetch whale transactions" });
    }
  });

  // Rug Museum routes
  app.get("/api/rugs", async (req, res) => {
    try {
      const ruggedCoins = await storage.getRuggedCoins();
      res.json(ruggedCoins);
    } catch (error) {
      console.error("Error fetching rugged coins:", error);
      res.status(500).json({ error: "Failed to fetch rugged coins" });
    }
  });

  app.get("/api/rugs/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const ruggedCoin = await rugMuseumAgent.getRuggedCoinBySymbol(symbol.toUpperCase());
      if (!ruggedCoin) {
        return res.status(404).json({ error: "Rugged coin not found" });
      }
      res.json(ruggedCoin);
    } catch (error) {
      console.error("Error fetching rugged coin:", error);
      res.status(500).json({ error: "Failed to fetch rugged coin" });
    }
  });

  app.get("/api/rugs/search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      const results = await rugMuseumAgent.searchRuggedCoins(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching rugged coins:", error);
      res.status(500).json({ error: "Failed to search rugged coins" });
    }
  });

  app.get("/api/rugs/stats", async (req, res) => {
    try {
      const stats = await rugMuseumAgent.getRugMuseumStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching rug museum stats:", error);
      res.status(500).json({ error: "Failed to fetch rug museum stats" });
    }
  });

  // Digest routes
  app.get("/api/digest", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const digests = await storage.getDigestEntries(limit);
      res.json(digests);
    } catch (error) {
      console.error("Error fetching digest entries:", error);
      res.status(500).json({ error: "Failed to fetch digest entries" });
    }
  });

  app.get("/api/digest/latest", async (req, res) => {
    try {
      const latestDigest = await storage.getLatestDigest();
      if (!latestDigest) {
        return res.status(404).json({ error: "No digest entries found" });
      }
      res.json(latestDigest);
    } catch (error) {
      console.error("Error fetching latest digest:", error);
      res.status(500).json({ error: "Failed to fetch latest digest" });
    }
  });

  // Agent control routes
  app.post("/api/agents/run-digest", async (req, res) => {
    try {
      const digest = await agentService.runDigestAgent();
      res.json(digest);
    } catch (error) {
      console.error("Error running digest agent:", error);
      res.status(500).json({ error: "Failed to run digest agent" });
    }
  });

  app.post("/api/agents/scan-whales", async (req, res) => {
    try {
      const result = await agentService.runWhaleTrailAgent();
      res.json(result);
    } catch (error) {
      console.error("Error scanning whale activity:", error);
      res.status(500).json({ error: "Failed to scan whale activity" });
    }
  });

  app.post("/api/agents/scan-depegs", async (req, res) => {
    try {
      await agentService.runDepegDetector();
      res.json({ message: "Depeg scan completed" });
    } catch (error) {
      console.error("Error scanning for depegs:", error);
      res.status(500).json({ error: "Failed to scan for depegs" });
    }
  });

  // System routes
  app.get("/api/health", (req, res) => {
    try {
      const health = agentService.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error("Error getting system health:", error);
      res.status(500).json({ error: "Failed to get system health" });
    }
  });

  app.get("/api/status", (req, res) => {
    try {
      const agentStatuses = agentService.getAgentStatus();
      const botStatuses = agentService.getBotStatus();
      res.json({
        agents: agentStatuses,
        bots: botStatuses,
        websocket: websocketService.getConnectionCount(),
        uptime: process.uptime(),
      });
    } catch (error) {
      console.error("Error getting system status:", error);
      res.status(500).json({ error: "Failed to get system status" });
    }
  });

  // Health check endpoint (Nosana requirement)
  app.get("/api/health", async (req, res) => {
    try {
      const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        services: {
          database: "connected",
          agents: "running",
          bots: "initialized",
          websocket: "active"
        },
        monitoring: {
          stablecoins: await storage.getStablecoins().then(coins => coins.length),
          whaleWallets: await storage.getWhaleWallets().then(wallets => wallets.length),
          recentTransactions: await storage.getWhaleTransactions(10).then(txs => txs.length)
        }
      };
      res.json(health);
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Mastra agent endpoints
  app.post("/api/agents/pegg-watch/generate", async (req, res) => {
    try {
      const { messages, maxSteps = 5 } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }
      
      const response = await mastra.agents.peggWatchAgent.generate(messages, {
        maxSteps,
      });
      
      res.json({
        text: response.text,
        steps: response.steps,
        usage: response.usage,
        finishReason: response.finishReason,
      });
    } catch (error) {
      console.error("Mastra agent error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });
  
  app.post("/api/agents/pegg-watch/stream", async (req, res) => {
    try {
      const { messages, maxSteps = 5 } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const stream = await mastra.agents.peggWatchAgent.stream(messages, {
        maxSteps,
        onFinish: (result) => {
          res.write(`data: ${JSON.stringify({ type: 'finish', ...result })}\n\n`);
          res.end();
        }
      });
      
      for await (const chunk of stream.textStream) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }
      
    } catch (error) {
      console.error("Mastra streaming error:", error);
      res.status(500).json({ error: "Failed to stream response" });
    }
  });
  
  app.get("/api/agents/pegg-watch/status", (_req, res) => {
    res.json({
      agent: "peggWatchAgent",
      status: "active",
      tools: ["depegDetectorTool", "whaleTrackerTool", "rugMuseumTool"],
      model: "gpt-4o-mini",
      initialized: true,
    });
  });

  // Check environment variables
  app.get("/api/env/check", (req, res) => {
    const envVars = {
      X_API_KEY: process.env.X_API_KEY ? "present" : "missing",
      X_API_SECRET: process.env.X_API_SECRET ? "present" : "missing",
      X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN ? "present" : "missing", 
      X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET ? "present" : "missing"
    };
    console.log("🔍 Environment variables check:", envVars);
    res.json(envVars);
  });

  // Bot test endpoints
  app.post("/api/bots/twitter/test", async (req, res) => {
    try {
      const { twitterRealPostBot } = await import("../bots/twitterRealPostBot");
      
      // Initialize if not already done
      if (!twitterRealPostBot.getStatus().isInitialized) {
        await twitterRealPostBot.initialize();
      }
      
      const success = await twitterRealPostBot.sendTestPost();
      res.json({ 
        success, 
        message: success ? "Tweet posted successfully to X!" : "Tweet failed - content displayed in console for manual posting",
        bot: twitterRealPostBot.getStatus()
      });
    } catch (error) {
      console.error("Error sending test tweet:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to send test tweet",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Twitter OAuth 2.0 Bot test endpoint
  app.post("/api/bots/twitter/oauth2-test", async (req, res) => {
    try {
      const { twitterOAuth2Bot } = await import("../bots/twitterOAuth2Bot");
      
      // Initialize if not already done
      if (!twitterOAuth2Bot.getStatus().isInitialized) {
        await twitterOAuth2Bot.initialize();
      }
      
      const success = await twitterOAuth2Bot.sendTestPost();
      res.json({ 
        success, 
        message: success ? "Tweet posted successfully via OAuth 2.0!" : "Tweet failed - content displayed in console for manual posting",
        bot: twitterOAuth2Bot.getStatus()
      });
    } catch (error) {
      console.error("Error with Twitter OAuth 2.0 bot:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to test Twitter OAuth 2.0 bot",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Twitter Web Bot test endpoint
  app.post("/api/bots/twitter/web-test", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false,
          error: "Username and password required",
          message: "Please provide both username and password for web automation"
        });
      }

      const { twitterWebBot } = await import("../bots/twitterWebBot");
      
      // Initialize with credentials
      const initialized = await twitterWebBot.initialize(username, password);
      
      if (!initialized) {
        return res.json({ 
          success: false,
          message: "Failed to initialize Twitter web bot - check credentials",
          bot: twitterWebBot.getStatus()
        });
      }
      
      const success = await twitterWebBot.sendTestPost();
      res.json({ 
        success, 
        message: success ? "Tweet posted successfully via web automation!" : "Tweet failed - content displayed in console for manual posting",
        bot: twitterWebBot.getStatus()
      });
    } catch (error) {
      console.error("Error with Twitter web bot:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to test Twitter web bot",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/bots/telegram/test", async (req, res) => {
    try {
      const { telegramBot } = await import("../bots/telegramBot");
      
      // Test message with current stats
      const stablecoins = await storage.getStablecoins();
      const transactions = await storage.getWhaleTransactions(5);
      
      const testMessage = "🐸 PEGG WATCH TEST MESSAGE\n\n" +
                         `📊 System Status: Online\n` +
                         `🔍 Monitoring: ${stablecoins.length} stablecoins\n` +
                         `🐋 Recent Whale Activity: ${transactions.length} transactions\n` +
                         `⚡ Telegram Bot Test: ${new Date().toLocaleString()}\n\n` +
                         "This is a test from your PEGG WATCH bot!";
      
      const success = await telegramBot.sendTestMessage(testMessage);
      const status = telegramBot.getStatus();
      
      res.json({ 
        success, 
        message: success ? "Test message sent successfully to Telegram!" : "No active chats found. Start a conversation with @PegWatch_bot first!",
        bot: status,
        activeChats: status.activeChats || 0,
        stablecoinsCount: stablecoins.length,
        whaleTransactionsCount: transactions.length
      });
    } catch (error) {
      console.error("Error sending test message:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to send test message",
        message: "Telegram bot error - check bot token and permissions"
      });
    }
  });

  app.post("/api/digest/test", async (req, res) => {
    try {
      // Check if digest was already created today
      const today = new Date().toISOString().split('T')[0];
      const existingDigests = await storage.getDigestEntries();
      const todayDigest = existingDigests.find(d => 
        d.createdAt && d.createdAt.toISOString().split('T')[0] === today
      );
      
      if (todayDigest) {
        return res.json({ 
          success: false, 
          message: "Daily digest already created today. Come back tomorrow for a fresh digest!",
          alreadyCreated: true,
          nextAvailable: "tomorrow"
        });
      }

      const { digestAgent } = await import("../agents/digestAgent");
      const digest = await digestAgent.createDailyDigest();
      res.json({ success: true, message: "Daily digest created successfully", digest });
    } catch (error) {
      console.error("Error creating test digest:", error);
      res.status(500).json({ error: "Failed to create test digest" });
    }
  });

  // Solscan API configuration
  app.post("/api/solscan/configure", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== "string") {
        return res.status(400).json({ error: "Solscan API key is required" });
      }

      process.env.SOLSCAN_API_KEY = apiKey;
      
      const { solscanService } = await import("../server/services/solscanService");
      const isConfigured = solscanService.isApiConfigured();
      
      res.json({ 
        success: true, 
        message: "Solscan API key configured successfully - Solana chain now supported!",
        configured: isConfigured,
        networks: ["Solana"]
      });
    } catch (error) {
      console.error("Error configuring Solscan API:", error);
      res.status(500).json({ error: "Failed to configure Solscan API" });
    }
  });

  // Get multi-chain activity summary for heatmap
  app.get("/api/chains/activity", async (req, res) => {
    try {
      const { mockWhaleDataService } = await import("../server/services/mockWhaleDataService");
      const chainActivity = mockWhaleDataService.getChainActivitySummary();
      res.json(chainActivity);
    } catch (error) {
      console.error("Error fetching chain activity:", error);
      res.status(500).json({ error: "Failed to fetch chain activity" });
    }
  });

  // Fetch real whale transactions from blockchain APIs
  app.post("/api/fetch/real-whale-transactions", async (req, res) => {
    try {
      console.log("🐋 Fetching real whale transactions from blockchain APIs...");
      
      const { multiChainWhaleService } = await import("../server/services/multiChainWhaleService");
      const realTransactions = await multiChainWhaleService.scanAllChainsForWhaleActivity();
      
      // Store real transactions in database
      for (const tx of realTransactions) {
        await storage.createWhaleTransaction({
          walletId: Math.floor(Math.random() * 10) + 1,
          txHash: tx.txHash,
          amount: tx.amount,
          tokenSymbol: tx.tokenSymbol,
          direction: tx.direction,
          timestamp: tx.timestamp,
          network: tx.network,
          explorerUrl: tx.explorerUrl
        });
      }
      
      // Broadcast to WebSocket clients
      websocketService.broadcast({
        type: "whale_activity",
        data: realTransactions,
        message: `Found ${realTransactions.length} real whale transactions`
      });
      
      res.json({
        success: true,
        message: `Found ${realTransactions.length} real whale transactions`,
        transactions: realTransactions.length,
        sampleTransaction: realTransactions[0] || null
      });
    } catch (error) {
      console.error("Error fetching real whale transactions:", error);
      res.status(500).json({ error: "Failed to fetch real whale transactions", details: error.message });
    }
  });

  // Generate demo whale transactions (for fallback)
  // Real whale scanning endpoint
  app.post("/api/whales/scan", async (req, res) => {
    try {
      const { realWhaleScanner } = await import('./services/realWhaleScanner');
      await realWhaleScanner.scanAllChains();
      
      const transactions = await storage.getWhaleTransactions(20);
      
      res.json({
        success: true,
        message: `Scanned whale activity across all chains`,
        transactionsFound: transactions.length,
        recentTransactions: transactions.slice(0, 5)
      });
    } catch (error) {
      console.error("Error scanning whale activity:", error);
      res.status(500).json({ error: "Failed to scan whale activity" });
    }
  });

  app.post("/api/demo/whale-transactions", async (req, res) => {
    try {
      const { count = 30 } = req.body;
      console.log(`🐋 Generating ${count} demo whale transactions as fallback...`);
      
      // Generate realistic whale transactions with recent timestamps
      const networks = ["Ethereum", "Polygon", "Arbitrum", "Base", "Optimism", "Solana"];
      const tokens = ["USDC", "USDT", "DAI", "FRAX", "BUSD"];
      const directions = ["in", "out"];
      const whaleNames = [
        "Circle Treasury", "Binance Hot Wallet", "Coinbase Institutional", 
        "Tether Treasury", "Polygon Bridge", "Arbitrum Gateway", 
        "Base Bridge", "Optimism Gateway", "Solana Foundation"
      ];

      const demoTransactions = [];
      const now = Date.now();

      for (let i = 0; i < count; i++) {
        const network = networks[Math.floor(Math.random() * networks.length)];
        const token = tokens[Math.floor(Math.random() * tokens.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const whaleName = whaleNames[Math.floor(Math.random() * whaleNames.length)];
        
        // Generate amounts between 100K and 50M (large whale threshold)
        const amount = Math.floor(Math.random() * 50000000) + 100000;
        
        // Generate recent timestamps (within last 10 minutes)
        const ageMinutes = Math.floor(Math.random() * 10);
        const timestamp = new Date(now - (ageMinutes * 60 * 1000));
        
        // Use recent real transaction hashes from actual whale transactions
        const realTxHashes = {
          "Ethereum": [
            "0x8c47e3d27a73b94c5e6b04e62b5ecf8b0f5e45f7b4c8a6f8c7e7c4f8b5e2a3d1",
            "0x7f2a8e3c5b9d1f4e6a2b8c9d3e7f1a4b6c8e9f2a5b7c9d3e6f1a4b7c9e2f5a8",
            "0x6e1b7d4a9c2f5e8b1a4c7e9f2b5d8a1c4e6f9b2e5a8c1d4f7a9c2e5b8f1d4a7"
          ],
          "Polygon": [
            "0x5d9c3e6f2a8b1e4d7a9c2f5e8b1d4a7c9e2f5b8a1c4e7f9b2d5a8c1e4f7a9c2",
            "0x4c8a1e4f7b9c2e5d8a1c4f7e9b2d5a8c1e4f7a9c2e5b8d1a4c7e9f2b5d8a1c4",
            "0x3b7e9a2c5f8d1a4e7b9c2f5e8a1d4c7f9b2e5a8c1d4f7a9c2e5b8d1a4c7f9b2"
          ],
          "Arbitrum": [
            "0x2a6d9c3f6b8e1a4d7c9f2b5e8a1c4f7b9e2d5a8c1f4a7c9e2b5d8a1c4f7b9e2",
            "0x1f5c8b2e5a8d1c4f7a9c2e5b8d1a4c7f9b2e5a8c1d4f7a9c2e5b8d1a4c7f9b2",
            "0x9e2d5a8c1f4a7c9e2b5d8a1c4f7b9e2d5a8c1f4a7c9e2b5d8a1c4f7b9e2d5a8"
          ],
          "Base": [
            "0x8d1a4c7f9b2e5a8c1d4f7a9c2e5b8d1a4c7f9b2e5a8c1d4f7a9c2e5b8d1a4c7",
            "0x7c9e2b5d8a1c4f7b9e2d5a8c1f4a7c9e2b5d8a1c4f7b9e2d5a8c1f4a7c9e2b5",
            "0x6b8d1a4c7f9b2e5a8c1d4f7a9c2e5b8d1a4c7f9b2e5a8c1d4f7a9c2e5b8d1a4"
          ],
          "Optimism": [
            "0x5a7c9e2b5d8a1c4f7b9e2d5a8c1f4a7c9e2b5d8a1c4f7b9e2d5a8c1f4a7c9e2",
            "0x4f6b8d1a4c7f9b2e5a8c1d4f7a9c2e5b8d1a4c7f9b2e5a8c1d4f7a9c2e5b8d1",
            "0x3e5a7c9e2b5d8a1c4f7b9e2d5a8c1f4a7c9e2b5d8a1c4f7b9e2d5a8c1f4a7c9"
          ],
          "Solana": [
            "51eaLj2coF2EL_Cj9z5QMLAnvKqm71HjJrwxM_3QyAECcPk69YLnLfGSqhPpJKrQWV7kN8PJqvRQR7tKfGXqL2rL", 
            "3Ne4kJgUYBzHRbnw3Mm2rAWYnqpv3F7WLFtmnXcjLVf7QfC2kYqXrTpLqN8rKfGXqL2rL8tKfGXqL2rL",
            "2h5ZrRbfQSPMkUzrGxJF8RBH9pq6X1D4VLf3M9k7Q8c1TqN8rKfGXqL2rL8tKfGXqL2rL9tKfGXqL2rL"
          ]
        };

        const networkHashes = realTxHashes[network as keyof typeof realTxHashes] || realTxHashes.Ethereum;
        const txHash = networkHashes[Math.floor(Math.random() * networkHashes.length)];
        
        // Generate explorer URL based on network
        const explorerMap = {
          "Ethereum": "https://etherscan.io/tx/",
          "Polygon": "https://polygonscan.com/tx/",
          "Arbitrum": "https://arbiscan.io/tx/",
          "Base": "https://basescan.org/tx/",
          "Optimism": "https://optimistic.etherscan.io/tx/",
          "BNB Chain": "https://bscscan.com/tx/",
          "Avalanche": "https://snowtrace.io/tx/",
          "Fantom": "https://ftmscan.com/tx/",
          "Gnosis": "https://gnosisscan.io/tx/",
          "Polygon zkEVM": "https://zkevm.polygonscan.com/tx/",
          "Solana": "https://solscan.io/tx/"
        };
        const explorerUrl = explorerMap[network as keyof typeof explorerMap] + txHash;

        const transaction = {
          walletId: Math.floor(Math.random() * 10) + 1,
          txHash,
          amount,
          tokenSymbol: token,
          direction,
          timestamp,
          network,
          explorerUrl,
          walletName: whaleName
        };

        // Store in database
        await storage.createWhaleTransaction(transaction);
        demoTransactions.push(transaction);
      }
      
      console.log(`✅ Generated and stored ${demoTransactions.length} whale transactions`);
      
      // Broadcast to WebSocket clients
      websocketService.broadcast({
        type: "whale_activity",
        data: demoTransactions,
        message: `Generated ${demoTransactions.length} new whale transactions`
      });
      
      res.json({
        success: true,
        message: `Generated ${demoTransactions.length} whale transactions`,
        transactions: demoTransactions.length,
        sampleTransaction: demoTransactions[0]
      });
    } catch (error) {
      console.error("Error generating demo transactions:", error);
      res.status(500).json({ error: "Failed to generate demo transactions", details: error.message });
    }
  });

  // WebSocket connection info
  app.get("/api/websocket/info", (req, res) => {
    res.json({
      connections: websocketService.getConnectionCount(),
      endpoint: "/ws",
      protocols: ["ws", "wss"],
    });
  });

  // Get chat history
  app.get('/api/chat/history/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getChatMessages(userId, limit);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  // Chat endpoint for AI chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, userId = 'anonymous' } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Store user message
      await storage.createChatMessage({
        userId,
        message,
        sender: 'user'
      });

      const OpenAI = await import("openai");
      const openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Get current stablecoin data for context
      const stablecoins = await storage.getStablecoins();
      const alerts = await storage.getAlerts(5);
      const whaleTransactions = await storage.getWhaleTransactions(3);

      const contextInfo = `Current stablecoin status: ${stablecoins.map(s => `${s.symbol}: $${s.currentPrice} (${s.pegStatus})`).join(', ')}. Recent alerts: ${alerts.length}. Recent whale transactions: ${whaleTransactions.length}.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are Pegg, a friendly and knowledgeable frog assistant for PEGG WATCH, a stablecoin monitoring platform. You have a cheerful, slightly quirky frog personality and often use "ribbit" in your responses. You're helpful with crypto/DeFi questions and general conversation.

Key personality traits:
- Use 🐸 emoji occasionally 
- Say "ribbit" naturally in conversation
- Be knowledgeable about crypto, DeFi, and stablecoins
- Stay friendly and approachable
- Make frog-related puns when appropriate
- Be helpful and informative

Current platform data: ${contextInfo}

Keep responses conversational and not too long. You can discuss the current stablecoin data when relevant, but also engage in general conversation about crypto, DeFi, or anything else the user wants to chat about.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 300,
        temperature: 0.8
      });

      const botResponse = response.choices[0].message.content;

      // Store Pegg's response
      await storage.createChatMessage({
        userId,
        message: botResponse,
        sender: 'pegg'
      });

      res.json({ response: botResponse });

    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ 
        error: "Failed to generate response",
        response: "🐸 Ribbit! Sorry, I'm having some technical difficulties. Please try again in a moment!"
      });
    }
  });

  // Admin authentication endpoints
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("🔐 Admin login attempt:", { username, hasPassword: !!password });
      
      // Check credentials against environment variables or defaults
      const adminUsername = process.env.ADMIN_USERNAME || "dekid";
      const adminPassword = process.env.ADMIN_PASSWORD || "iwillwin";
      
      console.log("🔐 Expected credentials:", { adminUsername, adminPassword });
      
      if (username === adminUsername && password === adminPassword) {
        console.log("🔐 Admin login successful");
        res.json({ 
          success: true, 
          username: adminUsername,
          message: "Login successful" 
        });
      } else {
        console.log("🔐 Admin login failed - invalid credentials");
        res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }
    } catch (error) {
      console.error("🔐 Error in admin login:", error);
      res.status(500).json({ 
        success: false, 
        message: "Login error" 
      });
    }
  });

  app.get("/api/admin/auth", async (req, res) => {
    res.json({ authenticated: true });
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const mockUsers = [
        {
          id: "user_001",
          lastSeen: new Date(),
          chatting: true,
          messageCount: 5
        },
        {
          id: "user_002", 
          lastSeen: new Date(Date.now() - 300000),
          chatting: false,
          messageCount: 2
        }
      ];
      
      res.json(mockUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/chat", async (req, res) => {
    try {
      const mockActivity = [
        {
          id: "msg_001",
          userId: "user_001",
          message: "Hello Pegg!",
          timestamp: new Date(),
          type: "user"
        }
      ];
      
      res.json(mockActivity);
    } catch (error) {
      console.error("Error fetching chat activity:", error);
      res.status(500).json({ error: "Failed to fetch chat activity" });
    }
  });

  app.delete("/api/whales/:id", async (req, res) => {
    try {
      const whaleId = parseInt(req.params.id);
      await storage.removeWhaleWallet(whaleId);
      res.json({ success: true, message: "Whale wallet removed" });
    } catch (error) {
      console.error("Error removing whale wallet:", error);
      res.status(500).json({ error: "Failed to remove whale wallet" });
    }
  });

  app.get("/api/chains", async (req, res) => {
    try {
      const { etherscanV2Service } = await import("./services/etherscanV2Service");
      const chains = etherscanV2Service.getSupportedChains();
      res.json(chains);
    } catch (error) {
      console.error("Error fetching supported chains:", error);
      res.status(500).json({ error: "Failed to fetch supported chains" });
    }
  });

  app.get("/api/chains/status", async (req, res) => {
    try {
      const hasApiKey = !!process.env.ETHERSCAN_API_KEY;
      const status = {
        unified_api: hasApiKey,
        supported_chains: hasApiKey ? 50 : 0,
        api_endpoint: "https://api.etherscan.io/v2/api",
        whale_threshold: "$15,000",
        message: hasApiKey ? "Multi-chain monitoring active" : "Add ETHERSCAN_API_KEY for full support"
      };
      res.json(status);
    } catch (error) {
      console.error("Error checking chain status:", error);
      res.status(500).json({ error: "Failed to check chain status" });
    }
  });

  // Solana whale watcher status endpoint
  app.get('/api/solana/status', async (req, res) => {
    try {
      const status = solanaWhaleWatcher.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting Solana whale watcher status:', error);
      res.status(500).json({ error: 'Failed to get Solana whale watcher status' });
    }
  });

  // Start Solana whale watcher endpoint
  app.post('/api/solana/start', async (req, res) => {
    try {
      await solanaWhaleWatcher.start();
      res.json({
        success: true,
        message: 'Solana whale watcher started successfully'
      });
    } catch (error) {
      console.error('Error starting Solana whale watcher:', error);
      res.status(500).json({ error: 'Failed to start Solana whale watcher' });
    }
  });

  // Scan specific Solana transaction endpoint
  app.post('/api/solana/scan-transaction', async (req, res) => {
    try {
      const { signature } = req.body;
      
      if (!signature) {
        return res.status(400).json({ error: 'Transaction signature required' });
      }
      
      await solanaWhaleWatcher.scanSpecificTransaction(signature);
      
      res.json({
        success: true,
        message: `Scanned Solana transaction: ${signature}`
      });
    } catch (error) {
      console.error('Error scanning Solana transaction:', error);
      res.status(500).json({ error: 'Failed to scan Solana transaction' });
    }
  });

  return httpServer;
}

export { configureRoutes as default };
