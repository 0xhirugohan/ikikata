# Cloudflare D1 Migration Guide

This guide covers the complete migration from in-memory database to Cloudflare D1 for the Sleep Tracker API.

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Database Setup

```bash
# Run the automated setup script
npm run db:setup

# This will:
# - Create D1 database
# - Update wrangler.toml with database ID
# - Apply initial schema
# - Set up local development database
```

### 3. Development

```bash
# Local development with D1
npm run dev:d1

# Check migration status
npm run db:status:local

# Apply new migrations locally
npm run db:migrate:local
```

### 4. Deployment

```bash
# Apply migrations to production
npm run db:migrate

# Deploy to Cloudflare Workers
npm run deploy

# Check production migration status
npm run db:status
```

## 📁 File Structure

```
server/
├── src/
│   ├── index-d1.ts              # D1-enabled server entry point
│   ├── database-d1.ts           # D1 database adapter
│   ├── auth-d1.ts               # D1 authentication middleware
│   └── routes/
│       ├── auth-d1.ts           # D1 auth routes
│       ├── sleep-d1.ts          # D1 sleep data routes
│       └── health-d1.ts         # D1 health check routes
├── migrations/
│   ├── 0001_initial_schema.sql  # Initial database schema
│   └── 0002_add_indexes.sql     # Performance indexes
├── scripts/
│   ├── setup-d1.js              # Database setup automation
│   └── migrate.js               # Migration runner
├── schema.sql                   # Complete schema file
├── wrangler.toml                # Cloudflare Workers config
└── D1_MIGRATION.md              # This guide
```

## 🗃️ Database Schema

### Tables

**accounts**
- `account_id` (TEXT, PRIMARY KEY) - ECDSA public key hash
- `public_key` (TEXT, UNIQUE) - Base64 encoded SPKI public key
- `created_at` (DATETIME) - Account creation timestamp

**auth_challenges** 
- `challenge` (TEXT, PRIMARY KEY) - Random challenge string
- `account_id` (TEXT) - Associated account
- `expires_at` (INTEGER) - Expiration timestamp
- `created_at` (DATETIME) - Challenge creation time

**sleep_entries**
- `id` (TEXT, PRIMARY KEY) - Unique entry identifier
- `account_id` (TEXT) - Account owner
- `date` (TEXT) - Entry date (YYYY-MM-DD)
- `sleep_quality` (TEXT) - good, fair, poor
- `morning_energy` (TEXT) - energized, alert, tired, exhausted
- `time_to_fall_asleep` (TEXT) - under-10, 10-20, 20-30, 30-60, over-60
- `afternoon_energy` (TEXT) - energized, alert, tired, exhausted
- `notes` (TEXT) - Optional user notes
- `stress_level` (INTEGER) - 1-10 scale
- `screen_time` (REAL) - Hours before bed
- `room_temp` (REAL) - Room temperature
- `caffeine_time` (TEXT) - Last caffeine time
- `exercise_time` (TEXT) - Exercise time
- `pre_bedtime_activities` (TEXT) - Activities before bed
- `anxiety_level` (INTEGER) - 1-10 scale
- `created_at` (DATETIME) - Entry creation time

### Indexes

- `idx_sleep_entries_account_date` - Fast queries by account and date
- `idx_sleep_entries_account_created` - Analytics by creation time
- `idx_auth_challenges_expires` - Efficient challenge cleanup
- `idx_accounts_created` - Account creation analytics
- `idx_sleep_quality_trends` - Sleep quality trend analysis
- `idx_morning_energy_analysis` - Energy level analysis

## 🔧 Available Scripts

### Database Management

```bash
# Setup and initialization
npm run db:setup                 # Complete database setup

# Migration management
npm run db:migrate               # Apply pending migrations (production)
npm run db:migrate:local         # Apply pending migrations (local)
npm run db:status                # Show migration status (production)
npm run db:status:local          # Show migration status (local)

# Direct database access
npm run db:shell "SELECT COUNT(*) FROM accounts"
npm run db:shell:local "SELECT * FROM sleep_entries LIMIT 5"
```

### Development and Deployment

```bash
# Local development
npm run dev:d1                   # Start local server with D1
npm run build:d1                 # Build and validate for deployment

# Production deployment
npm run deploy                   # Deploy to Cloudflare Workers
```

## 📊 Migration Process

### From In-Memory to D1

1. **Database Creation**
   ```bash
   wrangler d1 create sleep-tracker-db
   ```

2. **Schema Application**
   ```bash
   wrangler d1 execute sleep-tracker-db --file=./schema.sql
   ```

3. **Local Setup**
   ```bash
   wrangler d1 execute sleep-tracker-db --local --file=./schema.sql
   ```

4. **Migration Tracking**
   - Migrations are tracked in the `migrations` table
   - Each migration file is applied once
   - Use `--force` to reapply all migrations

### Adding New Migrations

1. **Create Migration File**
   ```sql
   -- migrations/0003_add_email_column.sql
   -- Description: Add email column for future email binding feature
   
   ALTER TABLE accounts ADD COLUMN email TEXT UNIQUE;
   CREATE INDEX idx_accounts_email ON accounts(email);
   ```

2. **Apply Migration**
   ```bash
   npm run db:migrate:local    # Test locally first
   npm run db:migrate          # Apply to production
   ```

## 🔒 Security Features

### Data Protection
- ✅ **ACID Transactions** - Guaranteed data consistency
- ✅ **Foreign Key Constraints** - Referential integrity
- ✅ **Check Constraints** - Data validation at database level
- ✅ **Unique Constraints** - Prevent duplicate entries

### Authentication
- ✅ **Challenge Expiration** - Automatic cleanup of expired tokens
- ✅ **Single-Use Challenges** - Prevents replay attacks
- ✅ **Account Isolation** - Users can only access their own data

## 📈 Performance Optimizations

### Query Optimization
- **Indexed Queries** - All common access patterns are indexed
- **Date-Based Partitioning** - Efficient date range queries
- **Composite Indexes** - Multi-column queries optimized

### Analytics Queries
```sql
-- Weekly sleep quality trends
SELECT 
  strftime('%Y-%W', date) as week,
  AVG(CASE sleep_quality 
    WHEN 'good' THEN 3 
    WHEN 'fair' THEN 2 
    WHEN 'poor' THEN 1 
  END) as avg_quality
FROM sleep_entries 
WHERE account_id = ? AND date >= date('now', '-12 weeks')
GROUP BY week
ORDER BY week;

-- Sleep onset distribution
SELECT 
  time_to_fall_asleep,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM sleep_entries 
WHERE account_id = ?
GROUP BY time_to_fall_asleep;
```

## 🚨 Troubleshooting

### Common Issues

**Database ID Not Found**
```bash
# Check if database exists
wrangler d1 list

# Recreate if missing
npm run db:setup
```

**Schema Out of Sync**
```bash
# Check migration status
npm run db:status

# Force reapply all migrations
node scripts/migrate.js --force
```

**Local Development Issues**
```bash
# Reset local database
wrangler d1 execute sleep-tracker-db --local --file=./schema.sql

# Check local database status
npm run db:status:local
```

**Deployment Failures**
```bash
# Validate build
npm run build:d1

# Check wrangler configuration
wrangler deploy --dry-run

# View deployment logs
wrangler tail
```

### Useful Commands

```bash
# Backup database
wrangler d1 export sleep-tracker-db --output backup.sql

# View recent entries
wrangler d1 execute sleep-tracker-db --command="SELECT * FROM sleep_entries ORDER BY created_at DESC LIMIT 10"

# Check database size
wrangler d1 execute sleep-tracker-db --command="SELECT COUNT(*) as total_entries FROM sleep_entries"

# Monitor in real-time
wrangler tail --format=pretty
```

## 🔄 Rollback Strategy

If you need to rollback to the in-memory database:

1. **Switch Entry Point**
   ```toml
   # In wrangler.toml, change:
   main = "src/index.ts"  # Instead of index-d1.ts
   ```

2. **Remove D1 Binding**
   ```toml
   # Comment out in wrangler.toml:
   # [[d1_databases]]
   # binding = "DB"
   # database_name = "sleep-tracker-db"
   # database_id = "your-id"
   ```

3. **Redeploy**
   ```bash
   npm run deploy
   ```

## 📚 Additional Resources

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Limits and Pricing](https://developers.cloudflare.com/d1/platform/limits/)
- [SQL Reference for D1](https://developers.cloudflare.com/d1/platform/sql-api/)