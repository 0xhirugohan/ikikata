-- Migration: 0001_initial_schema
-- Description: Create initial tables for sleep tracker with ECDSA authentication
-- Created: 2025-08-22

-- Accounts table for storing public keys and account metadata
CREATE TABLE accounts (
    account_id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Authentication challenges table for temporary auth tokens
CREATE TABLE auth_challenges (
    challenge TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Sleep entries table for daily sleep tracking data
CREATE TABLE sleep_entries (
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
    UNIQUE(account_id, date)
);