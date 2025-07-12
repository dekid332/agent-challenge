-- PEGG WATCH Database Migration Script
-- Run this AFTER the main database.sql has been executed successfully
-- This adds upsert functionality with ON CONFLICT clauses

-- Add upsert capability for stablecoins (run after initial setup)
-- This can be used for updating existing records without duplicates

-- Example upsert query for stablecoins:
-- INSERT INTO stablecoins (symbol, name, market_cap, volume_24h) VALUES
-- ('USDC', 'USD Coin', 45000000000, 5000000000)
-- ON CONFLICT (symbol) DO UPDATE SET
--     name = EXCLUDED.name,
--     market_cap = EXCLUDED.market_cap,
--     volume_24h = EXCLUDED.volume_24h,
--     updated_at = CURRENT_TIMESTAMP;

-- Example upsert query for whale wallets:
-- INSERT INTO whale_wallets (address, name, type, network, balance) VALUES
-- ('0x3f5CE5FBFe3E9af3971dd833D26bA9b5C936f0bE', 'Binance Hot Wallet', 'EXCHANGE', 'ethereum', 150000000)
-- ON CONFLICT (address) DO UPDATE SET
--     name = EXCLUDED.name,
--     type = EXCLUDED.type,
--     network = EXCLUDED.network,
--     balance = EXCLUDED.balance,
--     updated_at = CURRENT_TIMESTAMP;

-- Note: These queries can be used in application code after the database is set up
-- The main database.sql file now works without constraint errors