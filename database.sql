-- PEGG WATCH Database Schema
-- PostgreSQL Database Creation Script

-- Create the database tables for PEGG WATCH

-- Stablecoins table
CREATE TABLE IF NOT EXISTS stablecoins (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    current_price DECIMAL(20, 10) DEFAULT 1.0,
    price_change_24h DECIMAL(10, 6) DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    peg_status VARCHAR(20) DEFAULT 'STABLE',
    market_cap BIGINT DEFAULT 0,
    volume_24h BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    coin VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'INFO',
    price DECIMAL(20, 10),
    deviation DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP
);

-- Whale wallets table
CREATE TABLE IF NOT EXISTS whale_wallets (
    id SERIAL PRIMARY KEY,
    address VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'WHALE',
    network VARCHAR(50) DEFAULT 'ethereum',
    balance DECIMAL(30, 10) DEFAULT 0,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Whale transactions table
CREATE TABLE IF NOT EXISTS whale_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES whale_wallets(id),
    tx_hash VARCHAR(100) NOT NULL,
    amount DECIMAL(30, 10) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    network VARCHAR(50) DEFAULT 'ethereum',
    explorer_url TEXT,
    wallet_name VARCHAR(100),
    age_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_hash, network) -- Add unique constraint for duplicate prevention
);

-- Rugged coins table
CREATE TABLE IF NOT EXISTS rugged_coins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    death_date DATE NOT NULL,
    cause VARCHAR(100) NOT NULL,
    market_cap VARCHAR(50),
    peak_price DECIMAL(20, 10),
    description TEXT,
    lesson TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Digest entries table
CREATE TABLE IF NOT EXISTS digest_entries (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    market_health INTEGER DEFAULT 0,
    stable_coins_count INTEGER DEFAULT 0,
    alerts_count INTEGER DEFAULT 0,
    whale_activity_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default stablecoins
INSERT INTO stablecoins (symbol, name, market_cap, volume_24h) VALUES
('USDC', 'USD Coin', 45000000000, 5000000000),
('USDT', 'Tether', 120000000000, 15000000000),
('DAI', 'Dai Stablecoin', 8000000000, 200000000),
('FRAX', 'Frax', 1000000000, 50000000),
('TUSD', 'TrueUSD', 500000000, 25000000),
('BUSD', 'Binance USD', 2000000000, 100000000),
('USDD', 'USDD', 800000000, 40000000),
('USTC', 'TerraClassicUSD', 100000000, 5000000),
('LUSD', 'Liquity USD', 300000000, 15000000),
('USDP', 'Pax Dollar', 200000000, 10000000);

-- Insert default whale wallets
INSERT INTO whale_wallets (address, name, type, network, balance) VALUES
('0x3f5CE5FBFe3E9af3971dd833D26bA9b5C936f0bE', 'Binance Hot Wallet', 'EXCHANGE', 'ethereum', 150000000),
('0x28C6c06298d514Db089934071355E5743bf21d60', 'Binance Cold Storage', 'EXCHANGE', 'ethereum', 800000000),
('0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549', 'Binance Wallet 2', 'EXCHANGE', 'ethereum', 500000000),
('0x5754284f345afc66a98fbb0a0afe71e0f007b949', 'Polygon Ecosystem Growth', 'INSTITUTIONAL', 'polygon', 250000000),
('0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf', 'Arbitrum Whale', 'WHALE', 'arbitrum', 100000000),
('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', 'Uniswap Router', 'DEFI', 'base', 300000000),
('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', 'Solana Foundation', 'INSTITUTIONAL', 'solana', 50000000),
('H2WSS2ggcKP7a3eH7qLjayABrHPJNGSTNw9qXNGztTj9', 'Phantom Treasury', 'DEFI', 'solana', 75000000),
('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'Raydium Liquidity', 'DEFI', 'solana', 60000000),
('GThUX1Atko4tqhN2NaiTazWSeFWMuiUiswPiHKtaW7A', 'Serum DEX', 'DEFI', 'solana', 45000000);

-- Insert default rugged coins
INSERT INTO rugged_coins (name, symbol, death_date, cause, market_cap, peak_price, description, lesson) VALUES
('TerraUSD', 'UST', '2022-05-12', 'Algorithmic failure', '$18.7B', 1.00, 'Algorithmic stablecoin that lost its peg catastrophically', 'Never trust algorithmic pegs without proper collateral'),
('TITAN', 'TITAN', '2021-06-16', 'Death spiral', '$60M', 65.00, 'Partially collateralized stablecoin that experienced a death spiral', 'Partial collateralization is not enough during market stress'),
('Empty Set Dollar', 'ESD', '2021-01-01', 'Governance failure', '$500M', 1.50, 'Algorithmic stablecoin with complex rebasing mechanism', 'Complexity breeds failure in DeFi protocols'),
('Basis Cash', 'BAC', '2021-02-01', 'Algorithmic failure', '$100M', 1.20, 'Multi-token algorithmic stablecoin system', 'Multi-token systems create additional attack vectors'),
('Neutrino USD', 'USDN', '2022-04-01', 'Backing failure', '$800M', 1.00, 'Waves-backed algorithmic stablecoin', 'Backing assets must be truly decentralized'),
('USDD', 'USDD', '2022-06-15', 'Centralization risk', '$3.2B', 1.00, 'Tron-based algorithmic stablecoin', 'Centralized control defeats the purpose of DeFi'),
('Magic Internet Money', 'MIM', '2022-01-15', 'Liquidation cascade', '$2.6B', 1.02, 'Collateralized stablecoin with risky backing', 'Exotic collateral creates systemic risk'),
('Deus Finance USD', 'DUSD', '2022-03-01', 'Oracle manipulation', '$50M', 1.10, 'Synthetic stablecoin with oracle dependencies', 'Oracle manipulation can destroy any protocol');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stablecoins_symbol ON stablecoins(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_whale_wallets_address ON whale_wallets(address);
CREATE INDEX IF NOT EXISTS idx_whale_transactions_wallet_id ON whale_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_whale_transactions_timestamp ON whale_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_rugged_coins_symbol ON rugged_coins(symbol);
CREATE INDEX IF NOT EXISTS idx_digest_entries_date ON digest_entries(date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_stablecoins_updated_at BEFORE UPDATE ON stablecoins FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_whale_wallets_updated_at BEFORE UPDATE ON whale_wallets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();