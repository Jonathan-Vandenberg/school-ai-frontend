import { createPublishScheduledAssignmentsTask } from './publish-scheduled-assignments'
import { createDashboardSnapshotTask } from './dashboard-snapshot'
import { createStudentsNeedingHelpTask } from './update-students-needing-help'

interface ScheduledTask {
  name: string
  task: any // cron task instance
  isActive: boolean
}

class ScheduledTaskManager {
  private tasks: Map<string, ScheduledTask> = new Map()

  /**
   * Initialize and start all scheduled tasks
   */
  public async startAllTasks(): Promise<void> {
    console.log('🕐 Starting scheduled tasks...')

    try {
      // Start assignment publishing task (runs every minute)
      const assignmentTask = createPublishScheduledAssignmentsTask()
      this.tasks.set('publish-assignments', {
        name: 'Publish Scheduled Assignments',
        task: assignmentTask,
        isActive: true,
      })

      // Start dashboard snapshot task (runs daily at 6 AM)
      const snapshotTask = createDashboardSnapshotTask()
      this.tasks.set('dashboard-snapshot', {
        name: 'Dashboard Snapshot',
        task: snapshotTask,
        isActive: true,
      })

      // Start students needing help analysis task (runs every hour)
      const studentsHelpTask = createStudentsNeedingHelpTask()
      this.tasks.set('students-needing-help', {
        name: 'Students Needing Help Analysis',
        task: studentsHelpTask,
        isActive: true,
      })

      console.log(`✅ Started ${this.tasks.size} scheduled tasks:`)
      this.tasks.forEach((taskInfo, key) => {
        console.log(`   - ${taskInfo.name} (${key})`)
      })
    } catch (error) {
      console.error('❌ Failed to start scheduled tasks:', error)
      throw error
    }
  }

  /**
   * Stop all scheduled tasks
   */
  public stopAllTasks(): void {
    console.log('🛑 Stopping scheduled tasks...')

    this.tasks.forEach((taskInfo, key) => {
      try {
        if (taskInfo.task && typeof taskInfo.task.destroy === 'function') {
          taskInfo.task.destroy()
          taskInfo.isActive = false
          console.log(`   - Stopped ${taskInfo.name}`)
        }
      } catch (error) {
        console.error(`   - Failed to stop ${taskInfo.name}:`, error)
      }
    })

    this.tasks.clear()
    console.log('✅ All scheduled tasks stopped')
  }

  /**
   * Get status of all tasks
   */
  public getTaskStatus(): Array<{
    key: string
    name: string
    isActive: boolean
  }> {
    return Array.from(this.tasks.entries()).map(([key, taskInfo]) => ({
      key,
      name: taskInfo.name,
      isActive: taskInfo.isActive,
    }))
  }

  /**
   * Stop a specific task
   */
  public stopTask(taskKey: string): boolean {
    const taskInfo = this.tasks.get(taskKey)
    if (!taskInfo) {
      console.warn(`Task ${taskKey} not found`)
      return false
    }

    try {
      if (taskInfo.task && typeof taskInfo.task.destroy === 'function') {
        taskInfo.task.destroy()
        taskInfo.isActive = false
        console.log(`Stopped task: ${taskInfo.name}`)
        return true
      }
    } catch (error) {
      console.error(`Failed to stop task ${taskKey}:`, error)
    }

    return false
  }

  /**
   * Restart a specific task
   */
  public async restartTask(taskKey: string): Promise<boolean> {
    const taskInfo = this.tasks.get(taskKey)
    if (!taskInfo) {
      console.warn(`Task ${taskKey} not found`)
      return false
    }

    try {
      // Stop the task first
      this.stopTask(taskKey)

      // Restart based on task type
      let newTask
      switch (taskKey) {
        case 'publish-assignments':
          newTask = createPublishScheduledAssignmentsTask()
          break
        case 'dashboard-snapshot':
          newTask = createDashboardSnapshotTask()
          break
        case 'students-needing-help':
          newTask = createStudentsNeedingHelpTask()
          break
        default:
          console.error(`Unknown task key: ${taskKey}`)
          return false
      }

      // Update the task
      this.tasks.set(taskKey, {
        ...taskInfo,
        task: newTask,
        isActive: true,
      })

      console.log(`Restarted task: ${taskInfo.name}`)
      return true
    } catch (error) {
      console.error(`Failed to restart task ${taskKey}:`, error)
      return false
    }
  }
}

// Create a singleton instance
export const scheduledTaskManager = new ScheduledTaskManager()

/**
 * Bootstrap function to start all scheduled tasks
 * Call this in your main application startup
 */
export async function bootstrapScheduledTasks(): Promise<void> {
  try {
    await scheduledTaskManager.startAllTasks()
    
    // Graceful shutdown handling
    const shutdownHandler = () => {
      console.log('\n📋 Received shutdown signal, cleaning up scheduled tasks...')
      scheduledTaskManager.stopAllTasks()
      process.exit(0)
    }

    process.on('SIGINT', shutdownHandler)
    process.on('SIGTERM', shutdownHandler)
    process.on('SIGUSR2', shutdownHandler) // For nodemon

  } catch (error) {
    console.error('Failed to bootstrap scheduled tasks:', error)
    throw error
  }
}

/**
 * Health check for scheduled tasks
 */
export function getScheduledTasksHealth() {
  const tasks = scheduledTaskManager.getTaskStatus()
  const activeTasks = tasks.filter(t => t.isActive).length
  const totalTasks = tasks.length

  return {
    status: activeTasks === totalTasks ? 'healthy' : 'degraded',
    activeTasks,
    totalTasks,
    tasks,
    lastCheck: new Date().toISOString(),
  }
}

// Export manager for direct access if needed
export { scheduledTaskManager as taskManager } 