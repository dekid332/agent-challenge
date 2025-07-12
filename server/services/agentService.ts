import { storage } from "../storage";
import { coinGeckoService } from "./coinGeckoService";
import { etherscanService } from "./etherscanService";
import { websocketService } from "./websocketService";
import { depegDetectorAgent } from "../../agents/depegDetector";
import { digestAgent } from "../../agents/digestAgent";
import { whaleTrailAgent } from "../../agents/whaleTrailAgent";
import { rugMuseumAgent } from "../../agents/rugMuseumAgent";
import { telegramBot } from "../../bots/telegramBot";
import { discordBot } from "../../bots/discordBot";
import { twitterRealPostBot } from "../../bots/twitterRealPostBot";
import { twitterBot } from "../../bots/twitterBot";
import { telegramAutoBot } from "../../bots/telegramAutoBot";
import { solanaWhaleWatcher } from "./solanaWhaleWatcher";

interface AgentStatus {
  name: string;
  status: "online" | "offline" | "error";
  lastRun: Date | null;
  nextRun: Date | null;
  isRunning: boolean;
}

class AgentService {
  private isInitialized = false;

  async startBackgroundServices() {
    if (this.isInitialized) {
      console.log("🤖 Agent services already initialized");
      return;
    }

    console.log("🤖 Starting PEGG WATCH AI agents...");
    
    try {
      // Initialize Rug Museum first (static data)
      await rugMuseumAgent.initialize();
      
      // Initialize bots
      await this.initializeBots();
      
      // Start monitoring agents
      await depegDetectorAgent.start();
      await digestAgent.start();
      await whaleTrailAgent.start();
      
      console.log("🚀 Starting Solana Whale Watcher");
      await solanaWhaleWatcher.start();
      
      await telegramAutoBot.start();
      
      this.isInitialized = true;
      console.log("🤖 All PEGG WATCH agents are now online!");
      
      // Log agent status
      const statuses = this.getAgentStatus();
      statuses.forEach(status => {
        console.log(`🤖 ${status.name}: ${status.status}`);
      });
      console.log(`🚀 ${solanaWhaleWatcher.getStatus().service}: ${solanaWhaleWatcher.getStatus().status}`);
      
    } catch (error) {
      console.error("🤖 Failed to start agent services:", error);
      await this.createSystemAlert("Failed to start agent services", error);
    }
  }

  private async initializeBots() {
    console.log("🤖 Initializing bot services...");
    
    // Initialize bots in parallel
    const results = await Promise.allSettled([
      telegramBot.initialize(),
      discordBot.initialize(), 
      twitterRealPostBot.initialize(),
    ]);

    // Log initialization results
    results.forEach((result, index) => {
      const botNames = ['Telegram', 'Discord', 'Twitter'];
      if (result.status === 'rejected') {
        console.error(`🤖 ${botNames[index]} bot initialization failed:`, result.reason);
      } else {
        console.log(`🤖 ${botNames[index]} bot initialization completed`);
      }
    });

    // Start Twitter scheduled tweets
    await twitterBot.scheduleRegularTweets();
    
    console.log("🤖 Bot services initialized");
  }

  async runDepegDetector(): Promise<void> {
    try {
      console.log("🔍 Manual depeg detection scan triggered");
      await depegDetectorAgent.checkForDepegs?.();
    } catch (error) {
      console.error("🔍 Manual depeg detection failed:", error);
      throw error;
    }
  }

  async runDigestAgent(): Promise<any> {
    try {
      console.log("📊 Manual digest generation triggered");
      return await digestAgent.createDailyDigest();
    } catch (error) {
      console.error("📊 Manual digest generation failed:", error);
      throw error;
    }
  }

  async runWhaleTrailAgent(): Promise<any> {
    try {
      console.log("🐋 Manual whale scan triggered");
      await whaleTrailAgent.scanWhaleActivity?.();
      const recentTransactions = await storage.getWhaleTransactions(10);
      return { 
        message: "Whale scan completed", 
        transactions: recentTransactions.length,
        data: recentTransactions
      };
    } catch (error) {
      console.error("🐋 Manual whale scan failed:", error);
      throw error;
    }
  }

  getAgentStatus(): AgentStatus[] {
    return [
      {
        name: "Depeg Detector",
        status: depegDetectorAgent.getStatus().isRunning ? "online" : "offline",
        lastRun: null,
        nextRun: null,
        isRunning: depegDetectorAgent.getStatus().isRunning,
      },
      {
        name: "Digest Agent",
        status: digestAgent.getStatus().isRunning ? "online" : "offline", 
        lastRun: null,
        nextRun: null,
        isRunning: digestAgent.getStatus().isRunning,
      },
      {
        name: "Whale Trail Agent",
        status: whaleTrailAgent.getStatus().isRunning ? "online" : "offline",
        lastRun: null,
        nextRun: null,
        isRunning: whaleTrailAgent.getStatus().isRunning,
      },
      {
        name: "Rug Museum Agent",
        status: rugMuseumAgent.getStatus().isInitialized ? "online" : "offline",
        lastRun: null,
        nextRun: null,
        isRunning: rugMuseumAgent.getStatus().isInitialized,
      },
      {
        name: "Telegram Auto Bot",
        status: telegramAutoBot.getStatus().isRunning ? "online" : "offline",
        lastRun: telegramAutoBot.getStatus().lastPostTime || null,
        nextRun: null,
        isRunning: telegramAutoBot.getStatus().isRunning,
      },
    ];
  }

  getBotStatus() {
    return [
      telegramBot.getStatus(),
      discordBot.getStatus(),
      twitterBot.getStatus(),
    ];
  }

  getSystemHealth() {
    const agents = this.getAgentStatus();
    const bots = this.getBotStatus();
    const onlineAgents = agents.filter(agent => agent.status === "online").length;
    const onlineBots = bots.filter(bot => bot.isInitialized).length;
    
    return {
      status: this.isInitialized ? "healthy" : "initializing",
      timestamp: new Date().toISOString(),
      agents: {
        total: agents.length,
        online: onlineAgents,
        offline: agents.length - onlineAgents,
        details: agents,
      },
      bots: {
        total: bots.length,
        online: onlineBots,
        offline: bots.length - onlineBots,
        details: bots,
      },
      websocket: {
        connections: websocketService.getConnectionCount(),
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private async createSystemAlert(message: string, error: any) {
    try {
      await storage.createAlert({
        type: "SYSTEM",
        coin: null,
        message: `System Error: ${message}`,
        severity: "HIGH",
        metadata: {
          error: error.message || error,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          memeQuote: "🐸 'Pegg is experiencing technical difficulties...'",
        },
      });
    } catch (alertError) {
      console.error("Failed to create system alert:", alertError);
    }
  }

  async stopAllServices() {
    console.log("🤖 Stopping all PEGG WATCH services...");
    
    try {
      await Promise.allSettled([
        depegDetectorAgent.stop(),
        digestAgent.stop(),
        whaleTrailAgent.stop(),
      ]);
      
      this.isInitialized = false;
      console.log("🤖 All services stopped");
    } catch (error) {
      console.error("🤖 Error stopping services:", error);
    }
  }

  // Method to send alerts to all channels
  async broadcastAlert(alert: any) {
    try {
      // Send to WebSocket clients
      websocketService.broadcast({
        type: "alert",
        data: alert,
      });

      // Send to bots based on severity
      if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
        await Promise.allSettled([
          telegramBot.sendAlert(alert),
          discordBot.sendAlert(alert),
          alert.severity === "CRITICAL" ? twitterRealPostBot.sendAlert(alert) : Promise.resolve(),
        ]);
      }
    } catch (error) {
      console.error("🤖 Error broadcasting alert:", error);
    }
  }

  // Method to send digest to all channels  
  async broadcastDigest(digest: any) {
    try {
      // Send to WebSocket clients
      websocketService.broadcast({
        type: "digest_ready",
        data: digest,
      });

      // Send to all bot channels
      await Promise.allSettled([
        telegramBot.sendDigest(digest),
        discordBot.sendDigest(digest),
        twitterRealPostBot.sendDigest(digest),
      ]);
    } catch (error) {
      console.error("🤖 Error broadcasting digest:", error);
    }
  }
}

export const agentService = new AgentService();
