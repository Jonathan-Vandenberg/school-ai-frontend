-- Database initialization script for School AI
-- This script runs when the PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional user for read-only access (optional)
-- CREATE USER school_ai_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE school_ai TO school_ai_readonly;
-- GRANT USAGE ON SCHEMA public TO school_ai_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO school_ai_readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO school_ai_readonly;

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
SELECT 'School AI database initialized successfully' AS message; 