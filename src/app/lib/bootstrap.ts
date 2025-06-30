import { bootstrapScheduledTasks } from '@/lib/scheduled-tasks'
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

    // Start scheduled tasks
    console.log('⏰ Starting scheduled tasks...')
    await bootstrapScheduledTasks()
    
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
    const [dbHealth, tasksHealth] = await Promise.all([
      checkDatabaseConnection(),
      import('@/lib/scheduled-tasks').then(module => module.getScheduledTasksHealth()),
    ])

    const isHealthy = dbHealth && tasksHealth.status === 'healthy'

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth,
        status: dbHealth ? 'healthy' : 'unhealthy',
      },
      scheduledTasks: tasksHealth,
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