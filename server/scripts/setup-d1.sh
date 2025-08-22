#!/bin/bash

# Setup script for Cloudflare D1 database
# Run this script to set up your D1 database for the first time

set -e

echo "🗄️  Setting up Cloudflare D1 database for Sleep Tracker..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please login first:"
    echo "   wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI found and user is logged in"

# Create D1 database
echo "📊 Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create sleep-tracker-db 2>&1)

# Extract database ID from output
DB_ID=$(echo "$DB_OUTPUT" | grep -oE 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$DB_ID" ]; then
    echo "❌ Failed to create D1 database. Output:"
    echo "$DB_OUTPUT"
    exit 1
fi

echo "✅ D1 database created with ID: $DB_ID"

# Update wrangler.toml with the database ID
echo "📝 Updating wrangler.toml with database ID..."
sed -i.bak "s/database_id = \"replace-with-your-d1-database-id\"/database_id = \"$DB_ID\"/" wrangler.toml

if [ $? -eq 0 ]; then
    echo "✅ wrangler.toml updated successfully"
    rm wrangler.toml.bak
else
    echo "❌ Failed to update wrangler.toml"
    exit 1
fi

# Apply database schema
echo "🏗️  Applying database schema..."
if wrangler d1 execute sleep-tracker-db --file=./schema.sql; then
    echo "✅ Database schema applied successfully"
else
    echo "❌ Failed to apply database schema"
    exit 1
fi

# Apply schema to local database for development
echo "🏠 Setting up local database for development..."
if wrangler d1 execute sleep-tracker-db --local --file=./schema.sql; then
    echo "✅ Local database schema applied successfully"
else
    echo "⚠️  Local database setup failed (this is okay if you're only deploying to production)"
fi

echo ""
echo "🎉 D1 database setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test locally: wrangler dev --local"
echo "   2. Deploy to Cloudflare: wrangler deploy"
echo "   3. Test production: wrangler tail (then make requests to your deployment)"
echo ""
echo "🔧 Database management commands:"
echo "   • View data: wrangler d1 execute sleep-tracker-db --command=\"SELECT * FROM accounts LIMIT 5\""
echo "   • Local dev: wrangler d1 execute sleep-tracker-db --local --command=\"SELECT COUNT(*) FROM accounts\""
echo "   • Backup: wrangler d1 export sleep-tracker-db --output backup.sql"
echo ""
echo "📖 Database ID for reference: $DB_ID"