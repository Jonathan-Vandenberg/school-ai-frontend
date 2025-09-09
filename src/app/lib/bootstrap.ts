import { checkDatabaseConnection } from '@/lib/db'

/**
 * Bootstrap function for the application
 * This should be called when the application starts
 */
export async function bootstrap(): Promise<void> {
  console.log('🚀 Bootstrapping School AI application...')

  try {
    // Check database connection
    console.log('🔍 Checking database connection...')
    const dbConnected = await checkDatabaseConnection()
    
    if (!dbConnected) {
      throw new Error('Database connection failed')
    }
    console.log('✅ Database connection established')

    // Note: Scheduled tasks are handled by the dedicated cron process (startup.js)
    // No need to initialize them here to avoid duplicates
    
    console.log('🎉 Application bootstrap completed successfully!')
    
  } catch (error) {
    console.error('❌ Application bootstrap failed:', error)
    
    // Note: process.exit() removed for Edge Runtime compatibility
    // In production, the deployment platform handles process management
    
    throw error
  }
}

/**
 * Health check for the entire application
 */
export async function getApplicationHealth() {
  try {
    const dbHealth = await checkDatabaseConnection()

    return {
      status: dbHealth ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth,
        status: dbHealth ? 'healthy' : 'unhealthy',
      },
      environment: process.env.NODE_ENV || 'development',
    }
  } catch (error) {
    console.error('Health check failed:', error)
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      environment: process.env.NODE_ENV || 'development',
    }
  }
} 