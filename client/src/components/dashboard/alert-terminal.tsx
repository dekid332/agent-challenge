import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Activity } from "lucide-react";
import { Alert } from "@/types";

interface AlertTerminalProps {
  alerts: Alert[];
}

export default function AlertTerminal({ alerts }: AlertTerminalProps) {
  const getAlertColor = (type: string, severity: string) => {
    if (severity === "CRITICAL") return "border-l-red-500";
    if (type === "DEPEG") return "border-l-orange-500";
    if (type === "WHALE") return "border-l-blue-500";
    return "border-l-green-500";
  };

  const getAlertBadgeColor = (type: string, severity: string) => {
    if (severity === "CRITICAL") return "text-red-400";
    if (type === "DEPEG") return "text-orange-400";
    if (type === "WHALE") return "text-blue-400";
    return "text-green-400";
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(date));
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Terminal className="h-5 w-5 text-neon-green" />
          Live Alerts
        </h3>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 bg-neon-green rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-sm font-mono text-gray-400">
            {alerts.length} active
          </span>
        </div>
      </div>
      
      <div className="terminal-bg rounded-lg p-4 h-64 overflow-y-auto scrollbar-thin font-mono text-sm">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-gray-500"
            >
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No alerts yet...</p>
                <p className="text-xs mt-1">🐸 Pegg is keeping watch!</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 10).map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`alert-item ${getAlertColor(alert.type, alert.severity)} pl-3 py-2`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={getAlertBadgeColor(alert.type, alert.severity)}>
                      [{alert.type}]
                    </span>
                    <span className="text-gray-400">
                      {alert.createdAt ? formatTimestamp(alert.createdAt) : "Unknown"}
                    </span>
                  </div>
                  <div className="text-white">{alert.message}</div>
                  {alert.metadata?.memeQuote && (
                    <div className="text-neon-green text-xs mt-1">
                      {alert.metadata.memeQuote}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
