import cron from 'node-cron'
import { prisma, withTransaction, DatabaseError } from '../db'
import { StatisticsService } from '../services/statistics.service'

/**
 * Dashboard snapshot scheduled task
 * Creates snapshots of dashboard metrics every hour using pre-calculated statistics
 * Optimized to use existing statistics instead of heavy real-time calculations
 */
export function createDashboardSnapshotTask() {
  console.log('Registering dashboard snapshot task...')
  
  // Schedule the task to run every hour (more reasonable than every minute)
  const task = cron.schedule('0 * * * *', async () => {
    const now = new Date()
    const timestamp = now.toISOString()
    console.log(`\n📸 [${timestamp}] CRON: Starting hourly dashboard snapshot...`)
    
    try {
      await withTransaction(async (tx) => {
        // Use pre-calculated school statistics instead of heavy calculations
        const schoolStats = await StatisticsService.getSchoolStatistics()
        
        // Get basic counts efficiently
        const [totalClasses, totalTeachers, totalStudents, totalAssignments] = await Promise.all([
          tx.class.count(),
          tx.user.count({ where: { customRole: 'TEACHER' } }),
          tx.user.count({ where: { customRole: 'STUDENT' } }),
          tx.assignment.count({ where: { publishedAt: { not: null } } }),
        ])
        
        console.log(`📈 [${timestamp}] Dashboard metrics: ${totalStudents} students, ${totalTeachers} teachers, ${totalClasses} classes, ${totalAssignments} assignments`)
        
        // Get assignment type breakdown
        const [classAssignments, individualAssignments] = await Promise.all([
          tx.assignment.count({ 
            where: { 
              publishedAt: { not: null },
              type: 'CLASS',
            }
          }),
          tx.assignment.count({ 
            where: { 
              publishedAt: { not: null },
              type: 'INDIVIDUAL',
            }
          }),
        ])
        
        // Get students needing help count (already calculated by the help task)
        const studentsNeedingAttention = await tx.studentsNeedingHelp.count({
          where: { isResolved: false }
        })
        
        console.log(`🚨 [${timestamp}] Students needing attention: ${studentsNeedingAttention}`)
        
        // Count recent activities (last 24 hours)
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        
        const recentActivities = await tx.activityLog.count({
          where: {
            createdAt: {
              gte: oneDayAgo,
            },
            publishedAt: {
              not: null,
            },
          },
        })
        
        // Use pre-calculated statistics for completion and success rates
        const averageCompletionRate = schoolStats?.averageCompletionRate || 0
        const averageSuccessRate = schoolStats?.averageScore || 0
        
        // Create the snapshot
        const snapshot = await tx.dashboardSnapshot.create({
          data: {
            timestamp: new Date(),
            snapshotType: 'daily', // Keep as daily since that's the valid enum value
            totalClasses,
            totalTeachers,
            totalStudents,
            totalAssignments,
            classAssignments,
            individualAssignments,
            averageCompletionRate: Math.round(averageCompletionRate),
            averageSuccessRate: Math.round(averageSuccessRate),
            studentsNeedingAttention,
            recentActivities,
            publishedAt: new Date(),
          },
        })
        
        console.log(`📸 [${timestamp}] Created dashboard snapshot: ${snapshot.id}`)
        
        // Clean up old snapshots (keep last 30 days for hourly snapshots)
        const oldestToKeep = new Date()
        oldestToKeep.setDate(oldestToKeep.getDate() - 30)
        
        const deletedSnapshots = await tx.dashboardSnapshot.deleteMany({
          where: {
            timestamp: {
              lt: oldestToKeep,
            },
          },
        })
        
        if (deletedSnapshots.count > 0) {
          console.log(`🧹 [${timestamp}] Cleaned up ${deletedSnapshots.count} old dashboard snapshots`)
        }
      })
      
      console.log(`✅ [${timestamp}] CRON: Dashboard snapshot completed successfully\n`)
    } catch (error) {
      console.error(`❌ [${timestamp}] Error in dashboard snapshot task:`, error)
      
      if (error instanceof DatabaseError) {
        console.error('🔌 Database error during dashboard snapshot:', error.cause)
      }
    }
  })

  return task
}

/**
 * Manually create a dashboard snapshot
 * Useful for testing or on-demand analytics
 */
export async function createManualSnapshot(snapshotType: 'daily' | 'weekly' | 'monthly' = 'daily') {
  console.log(`Creating manual ${snapshotType} dashboard snapshot...`)
  
  try {
    return await withTransaction(async (tx) => {
      // Similar logic to the scheduled task but allow different snapshot types
      const now = new Date()
      
      // Get basic counts
      const [totalClasses, totalTeachers, totalStudents, totalAssignments] = await Promise.all([
        tx.class.count(),
        tx.user.count({ where: { customRole: 'TEACHER' } }),
        tx.user.count({ where: { customRole: 'STUDENT' } }),
        tx.assignment.count({ where: { publishedAt: { not: null } } }),
      ])
      
      // Get assignment type breakdown
      const [classAssignments, individualAssignments] = await Promise.all([
        tx.assignment.count({ 
          where: { 
            publishedAt: { not: null },
            type: 'CLASS',
          }
        }),
        tx.assignment.count({ 
          where: { 
            publishedAt: { not: null },
            type: 'INDIVIDUAL',
          }
        }),
      ])
      
      // Get recent activities count
      const recentActivities = await tx.activityLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      })
      
      // Create snapshot with basic metrics
      // For a manual snapshot, we'll use simplified calculations
      const snapshot = await tx.dashboardSnapshot.create({
        data: {
          timestamp: now,
          snapshotType,
          totalClasses,
          totalTeachers,
          totalStudents,
          totalAssignments,
          classAssignments,
          individualAssignments,
          averageCompletionRate: 0, // Will be calculated in full version
          averageSuccessRate: 0, // Will be calculated in full version
          studentsNeedingAttention: 0, // Will be calculated in full version
          recentActivities,
          publishedAt: now,
        },
      })
      
      console.log(`Manual snapshot created: ${snapshot.id}`)
      return snapshot
    })
  } catch (error) {
    console.error('Error creating manual snapshot:', error)
    throw error
  }
}

/**
 * Get recent dashboard snapshots
 */
export async function getRecentSnapshots(limit: number = 30) {
  return await prisma.dashboardSnapshot.findMany({
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  })
} 