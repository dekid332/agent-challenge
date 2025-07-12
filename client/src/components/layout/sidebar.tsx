import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  BarChart3, 
  Eye, 
  Skull, 
  Settings, 
  Zap,
  MessageCircle
} from "lucide-react";
import { motion } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/", icon: Activity },
  { name: "Daily Digest", href: "/digest", icon: BarChart3 },
  { name: "Whale Watch", href: "/whale-watch", icon: Eye },
  { name: "Rug Museum", href: "/rug-museum", icon: Skull },
  { name: "Chat with Pegg", href: "/chat", icon: MessageCircle },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 glass-card rounded-none border-r border-neon-green/20 p-6 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <motion.div 
            className="text-4xl pegg-mascot"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0] 
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          >
            🐸
          </motion.div>
          <div>
            <h1 className="text-xl font-display font-bold neon-text text-neon-green">
              PEGG WATCH
            </h1>
            <p className="text-xs text-gray-400 font-mono">v1.0.0</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 font-mono">
          Meme-powered AI agents monitoring the stablecoin multiverse
        </p>
      </div>
      
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors nav-glow",
                  isActive 
                    ? "bg-neon-green/10 border border-neon-green/30 text-neon-green" 
                    : "hover:bg-white/5"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <motion.div 
            className="w-2 h-2 bg-neon-green rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-sm font-mono text-gray-400">
            4 agents online
          </span>
        </div>
        <motion.button 
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Settings className="h-5 w-5" />
          <span className="font-medium">Settings</span>
        </motion.button>
      </div>
    </div>
  );
}
