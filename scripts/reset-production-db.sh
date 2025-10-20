#!/bin/bash

# Reset Production Database Script
# This script will clear all tables and create a single admin user

echo "🚨 WARNING: This will DELETE ALL DATA in your production database!"
echo "Are you sure you want to continue? (yes/no)"
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo "🗑️  Resetting production database..."

# Navigate to the project directory
cd /var/www/www.japaneseinternationalschool.speechanalyser.com

# Run the reset script
npx tsx scripts/reset-database-with-admin.ts

echo "✅ Database reset completed!"
echo ""
echo "You can now log in with:"
echo "📧 Email: admin@school-ai.com"
echo "👤 Username: admin"
echo "🔑 Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change the admin password immediately!"
