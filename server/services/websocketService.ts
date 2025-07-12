import { WebSocketServer, WebSocket } from "ws";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(wss: WebSocketServer) {
    this.wss = wss;
    
    wss.on("connection", (ws: WebSocket) => {
      console.log("🔌 New WebSocket connection");
      this.clients.add(ws);
      
      // Send welcome message
      this.sendToClient(ws, {
        type: "welcome",
        data: {
          message: "🐸 Welcome to PEGG WATCH! Real-time monitoring active.",
          timestamp: Date.now(),
        },
      });
      
      ws.on("message", (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
        }
      });
      
      ws.on("close", () => {
        console.log("🔌 WebSocket connection closed");
        this.clients.delete(ws);
      });
      
      ws.on("error", (error: Error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(ws);
      });
    });
  }

  private handleClientMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "ping":
        this.sendToClient(ws, {
          type: "pong",
          data: { timestamp: Date.now() },
        });
        break;
      
      case "subscribe":
        // Handle subscription to specific event types
        this.sendToClient(ws, {
          type: "subscribed",
          data: { 
            events: message.data?.events || ["all"],
            message: "🐸 Pegg is watching for you!",
          },
        });
        break;
      
      default:
        console.log("Unknown WebSocket message type:", message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }));
    }
  }

  broadcast(message: WebSocketMessage) {
    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };
    
    const messageString = JSON.stringify(messageWithTimestamp);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      } else {
        // Remove dead connections
        this.clients.delete(client);
      }
    });
    
    console.log(`📡 Broadcast to ${this.clients.size} clients:`, message.type);
  }

  getConnectionCount(): number {
    return this.clients.size;
  }

  // Send alerts to all connected clients
  sendAlert(alert: any) {
    this.broadcast({
      type: "alert",
      data: alert,
    });
  }

  // Send price updates to all connected clients
  sendPriceUpdate(priceData: any) {
    this.broadcast({
      type: "price_update",
      data: priceData,
    });
  }

  // Send whale activity to all connected clients
  sendWhaleActivity(whaleData: any) {
    this.broadcast({
      type: "whale_activity",
      data: whaleData,
    });
  }

  // Send system status updates
  sendSystemStatus(status: any) {
    this.broadcast({
      type: "system_status",
      data: status,
    });
  }
}

export const websocketService = new WebSocketService();
