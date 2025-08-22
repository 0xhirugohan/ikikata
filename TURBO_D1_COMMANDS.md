# Turbo + D1 Commands Reference

This document lists all available Turbo commands for managing the Sleep Tracker API with Cloudflare D1 database.

## 🚀 Development Commands

### Client Development
```bash
# Start client development server
npm run dev:client

# Build client for production
npm run build:client
```

### Server Development

#### Traditional Server (In-Memory Database)
```bash
# Start server with in-memory database
npm run dev:server

# Build traditional server
npm run build:server
```

#### D1 Server (Cloudflare D1 Database)
```bash
# Start server with D1 database (local)
npm run dev:d1

# Build D1 server and validate deployment
npm run build:d1

# Deploy to Cloudflare Workers
npm run deploy
```

### Full Stack Development
```bash
# Start both client and server (traditional)
npm run dev

# Build entire project
npm run build
```

## 🗄️ Database Management Commands

### Database Setup
```bash
# Complete D1 database setup (creates DB, applies schema, updates config)
npm run db:setup
```

### Database Migrations
```bash
# Apply pending migrations to production D1 database
npm run db:migrate

# Apply pending migrations to local D1 database
npm run db:migrate:local

# Check migration status for production database
npm run db:status

# Check migration status for local database
npm run db:status:local
```

### Database Shell Access
```bash
# Execute SQL commands on production database
npm run db:shell "SELECT COUNT(*) FROM accounts"

# Execute SQL commands on local database
npm run db:shell:local "SELECT * FROM sleep_entries LIMIT 5"

# Examples of useful shell commands:
npm run db:shell "SELECT name FROM sqlite_master WHERE type='table'"
npm run db:shell:local "DELETE FROM auth_challenges WHERE expires_at < $(date +%s)000"
```

## 🧪 Testing Commands

```bash
# Run all tests
npm run test

# Test D1 integration (run after starting dev:d1)
cd server && npm run test:d1
```

## 🔧 Code Quality Commands

```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Type check all TypeScript
npm run type-check
```

## 📋 Command Categories

### **Production Deployment Workflow**
```bash
# 1. Setup database (one-time)
npm run db:setup

# 2. Apply migrations
npm run db:migrate

# 3. Build and deploy
npm run build:d1
npm run deploy

# 4. Verify deployment
npm run db:status
```

### **Local Development Workflow**
```bash
# 1. Setup local database (one-time)
npm run db:setup

# 2. Apply local migrations
npm run db:migrate:local

# 3. Start development servers
npm run dev:d1        # Terminal 1: D1 server
npm run dev:client    # Terminal 2: Client

# 4. Test integration
cd server && npm run test:d1
```

### **Database Maintenance**
```bash
# Check database health
npm run db:status
npm run db:status:local

# View database contents
npm run db:shell "SELECT * FROM accounts LIMIT 10"
npm run db:shell "SELECT COUNT(*) as total_entries FROM sleep_entries"

# Clean up expired challenges
npm run db:shell "DELETE FROM auth_challenges WHERE expires_at < $(date +%s)000"

# Backup database (using wrangler directly)
cd server && wrangler d1 export sleep-tracker-db --output backup.sql
```

## 🌐 Environment-Specific Commands

### **Development Environment**
- Uses local D1 database replica
- Fast iteration and testing
- No impact on production data

```bash
npm run dev:d1              # Local server with D1
npm run db:migrate:local    # Local migrations
npm run db:status:local     # Local status
npm run db:shell:local      # Local database access
```

### **Production Environment**
- Uses remote Cloudflare D1 database
- Deployed to Cloudflare Workers
- Global edge distribution

```bash
npm run deploy             # Deploy to production
npm run db:migrate         # Production migrations
npm run db:status          # Production status
npm run db:shell           # Production database access
```

## 🔍 Troubleshooting Commands

### **Check Configuration**
```bash
# Verify turbo configuration
npx turbo dry-run build

# Check workspace dependencies
npm ls --depth=0

# Verify D1 database configuration
cd server && wrangler d1 list
```

### **Reset Development Environment**
```bash
# Reset local database
npm run db:migrate:local --force

# Clean build cache
npx turbo clean
npm run build

# Reinstall dependencies
rm -rf node_modules */node_modules
npm install
```

### **Monitor Production**
```bash
# View real-time logs
cd server && wrangler tail

# Check deployment status
cd server && wrangler deployments list

# View worker analytics
cd server && wrangler analytics
```

## 📊 Usage Examples

### **Daily Development**
```bash
# Start your day
npm run dev:d1              # Start D1 server
npm run dev:client          # Start client (new terminal)

# Make database changes
# 1. Create migration file: server/migrations/0003_new_feature.sql
# 2. Apply locally: npm run db:migrate:local
# 3. Test changes: cd server && npm run test:d1
```

### **Deploying New Features**
```bash
# Pre-deployment checks
npm run lint                # Check code quality
npm run type-check          # Verify TypeScript
npm run build:d1            # Validate build

# Apply database changes
npm run db:migrate          # Apply to production DB

# Deploy application
npm run deploy              # Deploy to Cloudflare

# Post-deployment verification
npm run db:status           # Verify migrations
cd server && wrangler tail  # Monitor logs
```

### **Database Operations**
```bash
# View recent sleep entries
npm run db:shell "
  SELECT date, sleep_quality, morning_energy 
  FROM sleep_entries 
  ORDER BY created_at DESC 
  LIMIT 10
"

# Account statistics
npm run db:shell "
  SELECT 
    COUNT(*) as total_accounts,
    MAX(created_at) as latest_signup
  FROM accounts
"

# Data cleanup
npm run db:shell "
  DELETE FROM auth_challenges 
  WHERE expires_at < $(date -d '1 hour ago' +%s)000
"
```

## 🎯 Command Quick Reference

| Action | Command |
|--------|---------|
| **Setup D1 Database** | `npm run db:setup` |
| **Local D1 Development** | `npm run dev:d1` |
| **Deploy to Production** | `npm run deploy` |
| **Apply Migrations** | `npm run db:migrate` |
| **Check DB Status** | `npm run db:status` |
| **Access DB Shell** | `npm run db:shell "SQL"` |
| **Test Integration** | `cd server && npm run test:d1` |

## 💡 Pro Tips

1. **Always test locally first**: Use `npm run dev:d1` and `npm run db:migrate:local` before production
2. **Monitor deployments**: Use `cd server && wrangler tail` to watch logs in real-time
3. **Backup before migrations**: Export your database before applying new migrations
4. **Use turbo caching**: Turbo caches builds and tests for faster subsequent runs
5. **Environment separation**: Keep local and production databases completely separate

This command structure provides a clean separation between development and production environments while maintaining the convenience of running all commands from the project root.