import { NextRequest, NextResponse } from 'next/server';
import { getScheduledTasksHealth } from '@/lib/scheduled-tasks';

/**
 * GET /api/health
 * Health check endpoint that includes cron job status
 */
export async function GET(request: NextRequest) {
  try {
    // Get scheduled tasks health
    const tasksHealth = getScheduledTasksHealth();
    
    // Basic health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      scheduledTasks: tasksHealth,
      version: process.env.npm_package_version || '1.0.0'
    };

    // Determine overall health status
    const overallStatus = tasksHealth.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(health, { 
      status: overallStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  }
}
