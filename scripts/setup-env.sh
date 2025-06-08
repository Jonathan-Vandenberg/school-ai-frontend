#!/bin/bash

# School AI Environment Setup Script
# This script creates the .env.local file with the correct database configuration

echo "🚀 Setting up School AI environment..."

# Generate a random secret for NextAuth
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-fallback-secret-$(date +%s)")

# Create .env.local file
cat > .env.local << EOF
# Database Configuration (Docker)
DATABASE_URL="postgresql://school_ai_user:school_ai_password@localhost:5432/school_ai"

# NextAuth Configuration
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="http://localhost:3000"

# App Configuration
NODE_ENV="development"

# Redis Configuration (optional)
REDIS_URL="redis://:redis_password@localhost:6379"

# File Upload Configuration (for future use)
UPLOADTHING_SECRET=""
UPLOADTHING_APP_ID=""

# AI Services Configuration (for future integration)
OPENAI_API_KEY=""

# Email Configuration (for password reset, etc.)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""

# Development Database Admin
# pgAdmin: http://localhost:5050
# Email: admin@schoolai.local
# Password: admin_password
EOF

echo "✅ .env.local file created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the database: docker-compose up -d"
echo "2. Run database migrations: npx prisma db push"
echo "3. Start the application: npm run dev"
echo ""
echo "🔧 Database Admin Access:"
echo "   pgAdmin: http://localhost:5050"
echo "   Email: admin@schoolai.local"
echo "   Password: admin_password"
echo ""
echo "💾 Database Connection:"
echo "   Host: localhost:5432"
echo "   Database: school_ai"
echo "   Username: school_ai_user"
echo "   Password: school_ai_password" 