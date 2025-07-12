import { Pool } from 'pg';
import type { 
  Stablecoin, Alert, WhaleWallet, WhaleTransaction, RuggedCoin, DigestEntry,
  InsertStablecoin, InsertAlert, InsertWhaleWallet, InsertWhaleTransaction, InsertRuggedCoin, InsertDigestEntry
} from "../../shared/schema";

export class PostgreSQLStorage {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres:lolilolkoiA1!@@db.uctvyjsxmfxxyusdkkgd.supabase.co:5432/postgres",
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ Connected to PostgreSQL database');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      return false;
    }
  }

  // Stablecoins
  async getStablecoins(): Promise<Stablecoin[]> {
    const result = await this.pool.query('SELECT * FROM stablecoins ORDER BY symbol');
    return result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      currentPrice: parseFloat(row.current_price || '0'),
      pegPrice: parseFloat(row.peg_price || '1'),
      deviation: parseFloat(row.deviation || '0'),
      status: row.status,
      lastUpdated: row.last_updated
    }));
  }

  async updateStablecoin(symbol: string, data: Partial<InsertStablecoin>): Promise<Stablecoin> {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (data.currentPrice !== undefined) {
      updateFields.push(`current_price = $${paramIndex++}`);
      values.push(data.currentPrice);
    }
    if (data.deviation !== undefined) {
      updateFields.push(`deviation = $${paramIndex++}`);
      values.push(data.deviation);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    updateFields.push(`last_updated = NOW()`);
    values.push(symbol);

    const query = `
      UPDATE stablecoins 
      SET ${updateFields.join(', ')} 
      WHERE symbol = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    return {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      currentPrice: parseFloat(row.current_price || '0'),
      pegPrice: parseFloat(row.peg_price || '1'),
      deviation: parseFloat(row.deviation || '0'),
      status: row.status,
      lastUpdated: row.last_updated
    };
  }

  // Alerts
  async getAlerts(limit = 50): Promise<Alert[]> {
    const result = await this.pool.query(
      'SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      coin: row.coin,
      message: row.message,
      severity: row.severity,
      isRead: row.is_read,
      createdAt: row.created_at
    }));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await this.pool.query(
      `INSERT INTO alerts (type, coin, message, severity, is_read) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [alert.type, alert.coin, alert.message, alert.severity || 'INFO', alert.isRead || false]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      coin: row.coin,
      message: row.message,
      severity: row.severity,
      isRead: row.is_read,
      createdAt: row.created_at
    };
  }

  async markAlertAsRead(id: number): Promise<Alert> {
    const result = await this.pool.query(
      'UPDATE alerts SET is_read = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      coin: row.coin,
      message: row.message,
      severity: row.severity,
      isRead: row.is_read,
      createdAt: row.created_at
    };
  }

  // Whale Wallets
  async getWhaleWallets(): Promise<WhaleWallet[]> {
    const result = await this.pool.query('SELECT * FROM whale_wallets ORDER BY created_at DESC');
    return result.rows.map(row => ({
      id: row.id,
      address: row.address,
      name: row.name,
      type: row.type,
      network: row.network,
      balance: parseFloat(row.balance || '0'),
      lastActivity: row.last_activity,
      createdAt: row.created_at
    }));
  }

  async createWhaleWallet(wallet: InsertWhaleWallet): Promise<WhaleWallet> {
    const result = await this.pool.query(
      `INSERT INTO whale_wallets (address, name, type, network, balance) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [wallet.address, wallet.name, wallet.type || 'WHALE', wallet.network || 'ethereum', wallet.balance || 0]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      address: row.address,
      name: row.name,
      type: row.type,
      network: row.network,
      balance: parseFloat(row.balance || '0'),
      lastActivity: row.last_activity,
      createdAt: row.created_at
    };
  }

  // Whale Transactions
  async getWhaleTransactions(limit = 100): Promise<WhaleTransaction[]> {
    const result = await this.pool.query(`
      SELECT 
        wt.*,
        ww.name as wallet_name
      FROM whale_transactions wt
      LEFT JOIN whale_wallets ww ON wt.wallet_id = ww.id
      ORDER BY wt.timestamp DESC 
      LIMIT $1
    `, [limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      walletId: row.wallet_id,
      txHash: row.tx_hash,
      amount: parseInt(row.amount),
      tokenSymbol: row.token_symbol,
      direction: row.direction,
      timestamp: row.timestamp,
      network: row.network,
      explorerUrl: row.explorer_url,
      walletName: row.wallet_name
    }));
  }

  async createWhaleTransaction(transaction: InsertWhaleTransaction): Promise<WhaleTransaction> {
    // Check if transaction already exists to prevent duplicates
    const existingTx = await this.pool.query(
      'SELECT id FROM whale_transactions WHERE tx_hash = $1 AND network = $2',
      [transaction.txHash, transaction.network || 'ethereum']
    );
    
    if (existingTx.rows.length > 0) {
      // Return existing transaction instead of creating duplicate
      const existing = await this.pool.query(
        'SELECT * FROM whale_transactions WHERE id = $1',
        [existingTx.rows[0].id]
      );
      const row = existing.rows[0];
      return {
        id: row.id,
        walletId: row.wallet_id,
        txHash: row.tx_hash,
        amount: parseInt(row.amount),
        tokenSymbol: row.token_symbol,
        direction: row.direction,
        timestamp: row.timestamp,
        network: row.network,
        explorerUrl: row.explorer_url,
        walletName: row.wallet_name
      };
    }
    
    const result = await this.pool.query(
      `INSERT INTO whale_transactions (wallet_id, tx_hash, amount, token_symbol, direction, timestamp, network, explorer_url, wallet_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        transaction.walletId,
        transaction.txHash,
        transaction.amount,
        transaction.tokenSymbol,
        transaction.direction,
        transaction.timestamp || new Date(),
        transaction.network || 'ethereum',
        transaction.explorerUrl,
        transaction.walletName
      ]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      walletId: row.wallet_id,
      txHash: row.tx_hash,
      amount: parseInt(row.amount),
      tokenSymbol: row.token_symbol,
      direction: row.direction,
      timestamp: row.timestamp,
      network: row.network,
      explorerUrl: row.explorer_url,
      walletName: row.wallet_name
    };
  }

  // Rugged Coins
  async getRuggedCoins(): Promise<RuggedCoin[]> {
    const result = await this.pool.query(
      'SELECT * FROM rugged_coins ORDER BY death_date DESC'
    );
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      deathDate: row.death_date,
      cause: row.cause,
      marketCapAtDeath: row.market_cap_at_death ? parseFloat(row.market_cap_at_death) : null,
      story: row.story,
      memeQuote: row.meme_quote,
      imageUrl: row.image_url,
      links: row.links
    }));
  }

  async getRuggedCoinBySymbol(symbol: string): Promise<RuggedCoin | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM rugged_coins WHERE symbol = $1 LIMIT 1',
      [symbol]
    );
    if (result.rows.length === 0) return undefined;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      deathDate: row.death_date,
      cause: row.cause,
      marketCapAtDeath: row.market_cap_at_death ? parseFloat(row.market_cap_at_death) : null,
      story: row.story,
      memeQuote: row.meme_quote,
      imageUrl: row.image_url,
      links: row.links
    };
  }

  // Digest Entries
  async getDigestEntries(limit = 30): Promise<DigestEntry[]> {
    const result = await this.pool.query(
      'SELECT * FROM digest_entries ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows.map(row => ({
      id: row.id,
      date: row.date,
      summary: row.summary,
      bestPerformer: row.best_performer,
      worstPerformer: row.worst_performer,
      avgPegDeviation: row.avg_peg_deviation ? parseFloat(row.avg_peg_deviation) : null,
      whaleActivityCount: row.whale_activity_count || 0,
      alertCount: row.alert_count || 0,
      memeQuote: row.meme_quote,
      postedToChannels: row.posted_to_channels,
      createdAt: row.created_at
    }));
  }

  async createDigestEntry(digest: InsertDigestEntry): Promise<DigestEntry> {
    const result = await this.pool.query(
      `INSERT INTO digest_entries (date, summary, best_performer, worst_performer, avg_peg_deviation, whale_activity_count, alert_count, meme_quote, posted_to_channels) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        digest.date,
        digest.summary,
        digest.bestPerformer,
        digest.worstPerformer,
        digest.avgPegDeviation,
        digest.whaleActivityCount || 0,
        digest.alertCount || 0,
        digest.memeQuote,
        digest.postedToChannels
      ]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      date: row.date,
      summary: row.summary,
      bestPerformer: row.best_performer,
      worstPerformer: row.worst_performer,
      avgPegDeviation: row.avg_peg_deviation ? parseFloat(row.avg_peg_deviation) : null,
      whaleActivityCount: row.whale_activity_count || 0,
      alertCount: row.alert_count || 0,
      memeQuote: row.meme_quote,
      postedToChannels: row.posted_to_channels,
      createdAt: row.created_at
    };
  }

  async getLatestDigest(): Promise<DigestEntry | undefined> {
    const entries = await this.getDigestEntries(1);
    return entries[0];
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}