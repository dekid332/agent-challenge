import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface UseWebSocketReturn {
  lastMessage: WebSocketMessage | null;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  sendMessage: (message: any) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const ws = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      setConnectionStatus("connecting");
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setConnectionStatus("connected");
        console.log("🔌 WebSocket connected");
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case "alert":
              toast({
                title: "🐸 New Alert!",
                description: message.data.message,
                variant: message.data.severity === "CRITICAL" ? "destructive" : "default",
              });
              break;
            
            case "depeg_alert":
              toast({
                title: "🚨 Depeg Alert!",
                description: `${message.data.coin} is at $${message.data.price.toFixed(4)}`,
                variant: "destructive",
              });
              break;
            
            case "whale_activity":
              toast({
                title: "🐋 Whale Movement!",
                description: "Large transaction detected",
              });
              break;
            
            case "digest_ready":
              toast({
                title: "📊 Daily Digest Ready!",
                description: "Check the latest market summary",
              });
              break;
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.current.onclose = () => {
        setConnectionStatus("disconnected");
        console.log("🔌 WebSocket disconnected");
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        setConnectionStatus("error");
        console.error("WebSocket error:", error);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [toast]);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return {
    lastMessage,
    connectionStatus,
    sendMessage,
  };
}
