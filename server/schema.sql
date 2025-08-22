-- Cloudflare D1 Database Schema for Sleep Tracker
-- Run with: wrangler d1 execute sleep-tracker-db --file=./schema.sql

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- TODO: Add email column when email binding is implemented
    -- email TEXT UNIQUE
);

-- Authentication challenges table
CREATE TABLE IF NOT EXISTS auth_challenges (
    challenge TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Sleep entries table
CREATE TABLE IF NOT EXISTS sleep_entries (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    date TEXT NOT NULL,
    sleep_quality TEXT NOT NULL CHECK (sleep_quality IN ('good', 'fair', 'poor')),
    morning_energy TEXT NOT NULL CHECK (morning_energy IN ('energized', 'alert', 'tired', 'exhausted')),
    time_to_fall_asleep TEXT NOT NULL CHECK (time_to_fall_asleep IN ('under-10', '10-20', '20-30', '30-60', 'over-60')),
    afternoon_energy TEXT NOT NULL CHECK (afternoon_energy IN ('energized', 'alert', 'tired', 'exhausted')),
    notes TEXT DEFAULT '',
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    screen_time REAL,
    room_temp REAL,
    caffeine_time TEXT,
    exercise_time TEXT,
    pre_bedtime_activities TEXT,
    anxiety_level INTEGER CHECK (anxiety_level BETWEEN 1 AND 10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id),
    UNIQUE(account_id, date) -- One entry per day per user
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sleep_entries_account_date ON sleep_entries(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_account_created ON sleep_entries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_expires ON auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(created_at DESC);