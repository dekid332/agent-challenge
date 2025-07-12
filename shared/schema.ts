import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stablecoins = pgTable("stablecoins", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 6 }),
  priceChange24h: decimal("price_change_24h", { precision: 10, scale: 4 }),
  pegStatus: text("peg_status").notNull().default("STABLE"), // STABLE, ALERT, DEPEGGED
  lastUpdated: timestamp("last_updated").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // DEPEG, WHALE, INFO, DIGEST
  coin: text("coin"),
  message: text("message").notNull(),
  severity: text("severity").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  metadata: jsonb("metadata"), // Additional data like price, whale address, etc.
  createdAt: timestamp("created_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

export const whaleWallets = pgTable("whale_wallets", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // EXCHANGE, TREASURY, WHALE, UNKNOWN
  network: text("network").notNull().default("ethereum"), // ethereum, polygon, arbitrum, optimism, base
  balance: jsonb("balance"), // Object with different token balances
  lastActivity: timestamp("last_activity").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const whaleTransactions = pgTable("whale_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => whaleWallets.id),
  txHash: text("tx_hash").notNull(),
  token: text("token").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }),
  direction: text("direction").notNull(), // IN, OUT
  network: text("network").notNull().default("ethereum"), // ethereum, polygon, arbitrum, optimism, base
  timestamp: timestamp("timestamp").defaultNow(),
  blockNumber: integer("block_number"),
});

export const ruggedCoins = pgTable("rugged_coins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  deathDate: timestamp("death_date").notNull(),
  cause: text("cause").notNull(),
  marketCapAtDeath: decimal("market_cap_at_death", { precision: 18, scale: 2 }),
  story: text("story").notNull(),
  memeQuote: text("meme_quote"),
  imageUrl: text("image_url"),
  links: jsonb("links"), // Array of relevant links
});

export const digestEntries = pgTable("digest_entries", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  summary: text("summary").notNull(),
  bestPerformer: text("best_performer"),
  worstPerformer: text("worst_performer"),
  avgPegDeviation: decimal("avg_peg_deviation", { precision: 10, scale: 4 }),
  whaleActivityCount: integer("whale_activity_count").default(0),
  alertCount: integer("alert_count").default(0),
  memeQuote: text("meme_quote"),
  postedToChannels: jsonb("posted_to_channels"), // Array of channels posted to
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 100 }).notNull(),
  message: text("message").notNull(),
  sender: varchar("sender", { length: 10 }).notNull(), // 'user' or 'pegg'
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertStablecoinSchema = createInsertSchema(stablecoins).omit({
  id: true,
  lastUpdated: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertWhaleWalletSchema = createInsertSchema(whaleWallets).omit({
  id: true,
  lastActivity: true,
});

export const insertWhaleTransactionSchema = createInsertSchema(whaleTransactions).omit({
  id: true,
  timestamp: true,
});

export const insertRuggedCoinSchema = createInsertSchema(ruggedCoins).omit({
  id: true,
});

export const insertDigestEntrySchema = createInsertSchema(digestEntries).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

// Types
export type Stablecoin = typeof stablecoins.$inferSelect;
export type InsertStablecoin = z.infer<typeof insertStablecoinSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type WhaleWallet = typeof whaleWallets.$inferSelect;
export type InsertWhaleWallet = z.infer<typeof insertWhaleWalletSchema>;

export type WhaleTransaction = typeof whaleTransactions.$inferSelect;
export type InsertWhaleTransaction = z.infer<typeof insertWhaleTransactionSchema>;

export type RuggedCoin = typeof ruggedCoins.$inferSelect;
export type InsertRuggedCoin = z.infer<typeof insertRuggedCoinSchema>;

export type DigestEntry = typeof digestEntries.$inferSelect;
export type InsertDigestEntry = z.infer<typeof insertDigestEntrySchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
