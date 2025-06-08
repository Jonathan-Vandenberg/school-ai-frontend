# Docker Database Setup for School AI

This guide will help you set up a complete database environment using Docker for the School AI application.

## 🗂️ What's Included

- **PostgreSQL 15**: Main database with proper configuration
- **pgAdmin 4**: Web-based database administration tool
- **Redis 7**: Caching layer (for future use)
- **Automated Setup**: Scripts for easy environment configuration

## 🚀 Quick Start

### 1. Setup Environment Variables

Run the setup script to generate your `.env.local` file:

```bash
./scripts/setup-env.sh
```

This will create a `.env.local` file with:
- Database connection string
- Generated NextAuth secret
- Redis configuration
- Placeholder for other services

### 2. Start the Database

Start all database services with Docker Compose:

```bash
# Start all services in the background
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### 3. Initialize the Database Schema

Once the database is running, initialize the Prisma schema:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Start the Application

```bash
npm run dev
```

## 🎛️ Database Administration

### pgAdmin Access

- **URL**: http://localhost:5050
- **Email**: admin@schoolai.local
- **Password**: admin_password

The PostgreSQL server will be automatically configured in pgAdmin.

### Direct Database Connection

- **Host**: localhost
- **Port**: 5432
- **Database**: school_ai
- **Username**: school_ai_user
- **Password**: school_ai_password

## 🔧 Docker Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
```

### Database Management

```bash
# Backup database
docker exec school-ai-postgres pg_dump -U school_ai_user school_ai > backup.sql

# Restore database
docker exec -i school-ai-postgres psql -U school_ai_user school_ai < backup.sql

# Access PostgreSQL shell
docker exec -it school-ai-postgres psql -U school_ai_user -d school_ai

# Access Redis CLI
docker exec -it school-ai-redis redis-cli -a redis_password
```

### Volume Management

```bash
# List volumes
docker volume ls

# Remove all data (⚠️ DESTRUCTIVE)
docker-compose down -v

# Backup volume data
docker run --rm -v school-ai_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │────│   PostgreSQL    │    │     pgAdmin     │
│   Port: 3000    │    │   Port: 5432    │    │   Port: 5050    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌─────────────────┐
                       │      Redis      │
                       │   Port: 6379    │
                       └─────────────────┘
```

## 🐳 Services Overview

### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Container**: school-ai-postgres
- **Port**: 5432 (host) → 5432 (container)
- **Volume**: postgres_data (persistent storage)
- **Features**: 
  - Health checks
  - Automatic extension installation (uuid-ossp, pgcrypto)
  - Timezone set to UTC

### pgAdmin
- **Image**: dpage/pgadmin4:latest
- **Container**: school-ai-pgadmin
- **Port**: 5050 (host) → 80 (container)
- **Volume**: pgadmin_data (persistent settings)
- **Features**: 
  - Pre-configured server connection
  - No master password required
  - Automatic PostgreSQL server registration

### Redis
- **Image**: redis:7-alpine
- **Container**: school-ai-redis
- **Port**: 6379 (host) → 6379 (container)
- **Volume**: redis_data (persistent cache)
- **Features**: 
  - Password protected
  - Append-only file persistence
  - Ready for caching and session storage

## 🔍 Troubleshooting

### Database Connection Issues

1. **Check if containers are running**:
   ```bash
   docker-compose ps
   ```

2. **Check database health**:
   ```bash
   docker-compose exec postgres pg_isready -U school_ai_user -d school_ai
   ```

3. **View database logs**:
   ```bash
   docker-compose logs postgres
   ```

### Reset Everything

If you need to start fresh:

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove downloaded images (optional)
docker-compose down --rmi all

# Restart setup
./scripts/setup-env.sh
docker-compose up -d
npx prisma db push
```

### Common Issues

1. **Port 5432 already in use**: 
   - Stop local PostgreSQL: `brew services stop postgresql`
   - Or change port in docker-compose.yml

2. **Permission denied on scripts**:
   ```bash
   chmod +x scripts/setup-env.sh
   ```

3. **Database schema out of sync**:
   ```bash
   npx prisma db push --force-reset
   ```

## 🔐 Security Notes

- Default passwords are for development only
- Change passwords in production environments
- Database is accessible on localhost only
- Consider using environment-specific configuration files

## 📊 Monitoring

The setup includes health checks for PostgreSQL. You can monitor the health with:

```bash
# Check health status
docker-compose ps

# View health check logs
docker inspect school-ai-postgres --format="{{json .State.Health}}"
```

## 🚀 Production Considerations

For production deployment:

1. **Use strong passwords**
2. **Enable SSL/TLS connections**
3. **Configure proper backup strategies**
4. **Use external volumes for data persistence**
5. **Monitor resource usage and performance**
6. **Implement proper networking and security groups**

---

## 🎯 Next Steps

Once your database is running:

1. Create some test users and data
2. Test the scheduled tasks system
3. Set up your frontend components
4. Configure authentication providers
5. Add file upload capabilities

Happy coding! 🚀 