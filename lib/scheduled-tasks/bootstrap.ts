#!/usr/bin/env tsx

// Bootstrap script for scheduled tasks
// This is called by the startup.js script to initialize cron jobs

// Load environment variables first
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { bootstrapScheduledTasks } from './index'

async function bootstrap() {
  try {
    console.log('🕐 [BOOTSTRAP] Starting scheduled tasks...')
    
    await bootstrapScheduledTasks()
    
    console.log('✅ [BOOTSTRAP] All scheduled tasks started successfully!')
    
    // Keep the process alive for the cron jobs
    console.log('📋 [BOOTSTRAP] Scheduled tasks running in background...')
    
    // Don't exit - let the cron jobs continue running
    setInterval(() => {
      // Keep alive
    }, 60000) // Check every minute
    
  } catch (error) {
    console.error('❌ [BOOTSTRAP] Failed to start scheduled tasks:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [BOOTSTRAP] Shutting down scheduled tasks...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 [BOOTSTRAP] Shutting down scheduled tasks...')
  process.exit(0)
})

// Start bootstrap
bootstrap().catch((error) => {
  console.error('❌ [BOOTSTRAP] Bootstrap failed:', error)
  process.exit(1)
}) 