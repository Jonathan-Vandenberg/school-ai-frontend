import { NextRequest, NextResponse } from 'next/server'
import { 
  getScheduledTasksHealth, 
  taskManager,
} from '@/lib/scheduled-tasks'
import { 
  activateMissedAssignments, 
  getScheduledAssignments 
} from '@/lib/scheduled-tasks/publish-scheduled-assignments'
import { 
  createManualSnapshot, 
  getRecentSnapshots 
} from '@/lib/scheduled-tasks/dashboard-snapshot'

// GET /api/admin/scheduled-tasks - Get scheduled tasks status and health
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'health':
        const health = getScheduledTasksHealth()
        return NextResponse.json({ health })

      case 'scheduled-assignments':
        const scheduledAssignments = await getScheduledAssignments()
        return NextResponse.json({ scheduledAssignments })

      case 'recent-snapshots':
        const limit = parseInt(searchParams.get('limit') || '10')
        const snapshots = await getRecentSnapshots(limit)
        return NextResponse.json({ snapshots })

      default:
        // Return general status
        const taskHealth = getScheduledTasksHealth()
        const [upcomingAssignments, recentSnapshots] = await Promise.all([
          getScheduledAssignments(),
          getRecentSnapshots(5),
        ])

        return NextResponse.json({
          health: taskHealth,
          upcomingAssignments: upcomingAssignments.slice(0, 5), // Next 5 scheduled
          recentSnapshots,
          timestamp: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error in scheduled tasks API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled tasks status' },
      { status: 500 }
    )
  }
}

// POST /api/admin/scheduled-tasks - Perform scheduled task operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, taskKey, snapshotType } = body

    switch (action) {
      case 'restart-task':
        if (!taskKey) {
          return NextResponse.json({ error: 'taskKey is required' }, { status: 400 })
        }
        
        const restartResult = await taskManager.restartTask(taskKey)
        return NextResponse.json({ 
          success: restartResult,
          message: restartResult ? `Task ${taskKey} restarted successfully` : `Failed to restart task ${taskKey}`
        })

      case 'stop-task':
        if (!taskKey) {
          return NextResponse.json({ error: 'taskKey is required' }, { status: 400 })
        }
        
        const stopResult = taskManager.stopTask(taskKey)
        return NextResponse.json({ 
          success: stopResult,
          message: stopResult ? `Task ${taskKey} stopped successfully` : `Failed to stop task ${taskKey}`
        })

      case 'activate-missed-assignments':
        const missedResult = await activateMissedAssignments()
        return NextResponse.json({
          success: true,
          activated: missedResult.activated,
          errors: missedResult.errors,
          message: `Activated ${missedResult.activated} missed assignments`
        })

      case 'create-snapshot':
        const type = snapshotType || 'daily'
        if (!['daily', 'weekly', 'monthly'].includes(type)) {
          return NextResponse.json({ error: 'Invalid snapshot type' }, { status: 400 })
        }
        
        const snapshot = await createManualSnapshot(type as 'daily' | 'weekly' | 'monthly')
        return NextResponse.json({
          success: true,
          snapshot,
          message: `${type} snapshot created successfully`
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error performing scheduled task operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform operation' },
      { status: 500 }
    )
  }
} 