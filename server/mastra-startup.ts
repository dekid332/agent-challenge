import { mastra } from "../src/mastra";
import { agentService } from "./services/agentService";

// Initialize Mastra agents on server startup
export async function initializeMastraAgents() {
  console.log("🤖 Initializing Mastra agents...");
  
  try {
    // Start the legacy agent service for web dashboard
    await agentService.startAgents();
    
    // Ensure Mastra agents are registered and available
    console.log("✅ Mastra agents initialized:", Object.keys(mastra.agents));
    
    // Test the main PEGG WATCH agent
    const testResponse = await mastra.agents.peggWatchAgent.generate([
      { role: "user", content: "Hello, are you ready to monitor stablecoins?" }
    ]);
    
    console.log("🐸 PEGG WATCH Agent test response:", testResponse.text);
    
  } catch (error) {
    console.error("❌ Error initializing Mastra agents:", error);
    throw error;
  }
}

// Export for use in main server
export { mastra };