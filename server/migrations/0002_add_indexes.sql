-- Migration: 0002_add_indexes
-- Description: Add performance indexes for sleep tracking queries
-- Created: 2025-08-22

-- Index for sleep entries by account and date (most common query pattern)
CREATE INDEX idx_sleep_entries_account_date ON sleep_entries(account_id, date DESC);

-- Index for sleep entries by account and creation time (for analytics)
CREATE INDEX idx_sleep_entries_account_created ON sleep_entries(account_id, created_at DESC);

-- Index for expired challenge cleanup
CREATE INDEX idx_auth_challenges_expires ON auth_challenges(expires_at);

-- Index for account creation analytics
CREATE INDEX idx_accounts_created ON accounts(created_at DESC);

-- Composite index for sleep quality trends
CREATE INDEX idx_sleep_quality_trends ON sleep_entries(account_id, sleep_quality, date DESC);

-- Index for morning energy analysis
CREATE INDEX idx_morning_energy_analysis ON sleep_entries(account_id, morning_energy, date DESC);