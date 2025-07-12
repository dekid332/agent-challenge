import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, MessageCircle, Eye, Plus, Trash2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminSession {
  isAuthenticated: boolean;
  username?: string;
}

interface OnlineUser {
  id: string;
  lastSeen: Date;
  chatting: boolean;
  messageCount: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AdminSession>({ isAuthenticated: false });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [newWhale, setNewWhale] = useState({ address: "", name: "", type: "WHALE", network: "ethereum" });

  // Check authentication status
  const { data: authStatus } = useQuery({
    queryKey: ["/api/admin/auth"],
    enabled: session.isAuthenticated,
    retry: false,
  });

  // Get online users
  const { data: onlineUsers = [] } = useQuery<OnlineUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: session.isAuthenticated,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get Telegram bot activity
  const { data: telegramActivity = [] } = useQuery({
    queryKey: ["/api/admin/telegram-activity"],
    enabled: session.isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Get chat activity
  const { data: chatActivity = [] } = useQuery({
    queryKey: ["/api/admin/chat"],
    enabled: session.isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Get whale wallets
  const { data: whales = [] } = useQuery({
    queryKey: ["/api/whales"],
    enabled: session.isAuthenticated,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        throw new Error("Invalid credentials");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setSession({ isAuthenticated: true, username: data.username });
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.username}!`,
      });
    },
    onError: () => {
      toast({
        title: "Login Failed", 
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  // Add whale mutation
  const addWhaleMutation = useMutation({
    mutationFn: async (whale: typeof newWhale) => {
      const response = await fetch("/api/whales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(whale),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add whale");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whales"] });
      setNewWhale({ address: "", name: "", type: "WHALE", network: "ethereum" });
      toast({
        title: "Whale Added",
        description: "New whale wallet added to tracking list",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add whale wallet",
        variant: "destructive",
      });
    },
  });

  // Remove whale mutation
  const removeWhaleMutation = useMutation({
    mutationFn: async (whaleId: number) => {
      const response = await fetch(`/api/whales/${whaleId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to remove whale");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whales"] });
      toast({
        title: "Whale Removed",
        description: "Whale wallet removed from tracking",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleAddWhale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhale.address || !newWhale.name) {
      toast({
        title: "Validation Error",
        description: "Address and name are required",
        variant: "destructive",
      });
      return;
    }
    addWhaleMutation.mutate(newWhale);
  };

  const getNetworkIcon = (network: string) => {
    const icons = { ethereum: "🔷", polygon: "🟪", arbitrum: "🔵", optimism: "🔴", base: "⚫" };
    return icons[network as keyof typeof icons] || "🌐";
  };

  if (!session.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="glass-card">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Shield className="h-6 w-6 text-neon-cyan" />
                Admin Access
              </CardTitle>
              <CardDescription>
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    className="glass-input"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    className="glass-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-neon-cyan hover:bg-neon-cyan/80 text-black"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Authenticating..." : "Login"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto scrollbar-thin h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Welcome back, {session.username}</p>
          </div>
          <Badge variant="outline" className="text-neon-cyan border-neon-cyan">
            <Activity className="h-3 w-3 mr-1" />
            System Online
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{onlineUsers.length}</p>
                  <p className="text-xs text-gray-400">Online Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{onlineUsers.filter(u => u.chatting).length}</p>
                  <p className="text-xs text-gray-400">Active Chats</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold">{whales.length}</p>
                  <p className="text-xs text-gray-400">Tracked Whales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold">{chatActivity.length}</p>
                  <p className="text-xs text-gray-400">Chat Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Online Users */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Online Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {onlineUsers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No users online</p>
                ) : (
                  <div className="space-y-2">
                    {onlineUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-black/20 rounded">
                        <div>
                          <p className="font-medium">User {user.id}</p>
                          <p className="text-xs text-gray-400">
                            Last seen: {new Date(user.lastSeen).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {user.chatting && (
                            <Badge variant="outline" className="text-green-400 border-green-400">
                              Chatting
                            </Badge>
                          )}
                          <Badge variant="secondary">{user.messageCount} msgs</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Add Whale Wallet */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-400" />
                Add Whale Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddWhale} className="space-y-4">
                <div>
                  <Label htmlFor="whale-address">Wallet Address</Label>
                  <Input
                    id="whale-address"
                    value={newWhale.address}
                    onChange={(e) => setNewWhale(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="0x..."
                    className="glass-input font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="whale-name">Name</Label>
                  <Input
                    id="whale-name"
                    value={newWhale.name}
                    onChange={(e) => setNewWhale(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Whale name or exchange"
                    className="glass-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="whale-type">Type</Label>
                    <select
                      id="whale-type"
                      value={newWhale.type}
                      onChange={(e) => setNewWhale(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full glass-input"
                    >
                      <option value="WHALE">Whale</option>
                      <option value="EXCHANGE">Exchange</option>
                      <option value="TREASURY">Treasury</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="whale-network">Network</Label>
                    <select
                      id="whale-network"
                      value={newWhale.network}
                      onChange={(e) => setNewWhale(prev => ({ ...prev, network: e.target.value }))}
                      className="w-full glass-input"
                    >
                      <option value="ethereum">Ethereum</option>
                      <option value="polygon">Polygon</option>
                      <option value="arbitrum">Arbitrum</option>
                      <option value="optimism">Optimism</option>
                      <option value="base">Base</option>
                    </select>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={addWhaleMutation.isPending}
                >
                  {addWhaleMutation.isPending ? "Adding..." : "Add Whale"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Tracked Whales */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-400" />
              Tracked Whale Wallets ({whales.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {whales.map((whale: any) => (
                  <div key={whale.id} className="flex items-center justify-between p-3 bg-black/20 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getNetworkIcon(whale.network || 'ethereum')}</span>
                      <div>
                        <p className="font-medium">{whale.name}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {whale.address?.slice(0, 10)}...{whale.address?.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {whale.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {(whale.network || 'ethereum').toUpperCase()}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWhaleMutation.mutate(whale.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}