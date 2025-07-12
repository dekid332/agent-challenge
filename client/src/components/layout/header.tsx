import { useLocation } from "wouter";
import { Bell, Moon, Sun, Zap, RefreshCw, Send, MessageCircle, BarChart3, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { motion } from "framer-motion";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const pageNames = {
  "/": "Dashboard",
  "/digest": "Daily Digest",
  "/whale-watch": "Whale Watch",
  "/rug-museum": "Rug Museum",
  "/chat": "Chat with Pegg",
};

const pageDescriptions = {
  "/": "Real-time stablecoin monitoring & alert system",
  "/digest": "Daily summaries and AI-powered insights",
  "/whale-watch": "Tracking large wallet movements and transactions",
  "/rug-museum": "Historical archive of failed stablecoins",
  "/chat": "AI-powered crypto companion with real-time data",
};

export default function Header() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const pageName = pageNames[location as keyof typeof pageNames] || "Dashboard";
  const pageDescription = pageDescriptions[location as keyof typeof pageDescriptions] || "";



  const testTelegramBot = async () => {
    try {
      // First try to send a test message via API
      const response = await fetch('/api/bots/telegram/test', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Telegram Bot Test",
          description: "Test message sent successfully to Telegram!"
        });
      } else {
        // If API test fails, open the bot in browser
        window.open('https://t.me/PegWatch_bot', '_blank');
        toast({
          title: "Telegram Bot",
          description: data.message || "Opening bot in browser - start a chat first!"
        });
      }
    } catch (error) {
      // Fallback to opening the bot
      window.open('https://t.me/PegWatch_bot', '_blank');
      toast({
        title: "Telegram Bot",
        description: "Opening Telegram bot in new window"
      });
    }
  };

  const testXAccount = () => {
    window.open('https://x.com/Peg_watch', '_blank');
    toast({
      title: "X Account",
      description: "Opening @Peg_watch X account in new window"
    });
  };

  const testTelegramAPI = async () => {
    try {
      const response = await fetch('/api/bots/telegram/test', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Telegram API Test",
          description: data.message || "Test message sent successfully!"
        });
      } else {
        toast({
          title: "Telegram API Test",
          description: data.message || "Test failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Telegram API Error",
        description: "Error testing Telegram API",
        variant: "destructive"
      });
    }
  };

  const testDigest = async () => {
    try {
      const response = await fetch('/api/digest/test', { method: 'POST' });
      if (response.ok) {
        queryClient.invalidateQueries();
        toast({
          title: "Daily Digest Test",
          description: "Test digest created successfully!"
        });
      } else {
        toast({
          title: "Digest Test Failed",
          description: "Failed to create test digest",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Digest Test Error",
        description: "Error creating test digest",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="glass-card rounded-none border-b border-white/10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1">{pageName}</h2>
          <p className="text-gray-400 font-mono text-sm">{pageDescription}</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={testTelegramBot}
              className="glass-card hover:bg-white/10"
              title="Test Telegram Bot"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={testXAccount}
              className="glass-card hover:bg-white/10"
              title="Check X Account @Peg_watch"
            >
              <Twitter className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={testDigest}
              className="glass-card hover:bg-white/10"
              title="Test Daily Digest"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries();
                queryClient.refetchQueries();
                toast({
                  title: "Dashboard Refreshed",
                  description: "Prices and data updated from live sources"
                });
              }}
              className="glass-card hover:bg-white/10"
              title="Refresh Dashboard"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="glass-card hover:bg-white/10"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="glass-card hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
            </Button>
          </motion.div>
          
          <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-lg">
            <motion.div 
              className="w-2 h-2 bg-neon-green rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm font-mono">LIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
