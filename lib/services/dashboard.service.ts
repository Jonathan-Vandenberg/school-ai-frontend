import { prisma } from '../db'
import { StatisticsService } from './statistics.service'
import { getRecentSnapshots } from '../scheduled-tasks/dashboard-snapshot'

export interface DashboardGraphData {
  snapshots: SnapshotData[]
  trends: TrendData
  currentMetrics: CurrentMetrics
  performanceMetrics: PerformanceMetrics
}

export interface SnapshotData {
  id: string
  timestamp: Date
  snapshotType: string
  totalClasses: number
  totalTeachers: number
  totalStudents: number
  totalAssignments: number
  classAssignments: number
  individualAssignments: number
  averageCompletionRate: number
  averageSuccessRate: number
  studentsNeedingAttention: number
  recentActivities: number
}

export interface TrendData {
  completionRateTrend: { date: string; value: number }[]
  successRateTrend: { date: string; value: number }[]
  assignmentTrend: { date: string; total: number; class: number; individual: number }[]
  studentActivityTrend: { date: string; active: number; needingHelp: number }[]
}

export interface CurrentMetrics {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  totalAssignments: number
  activeAssignments: number
  averageCompletionRate: number
  averageScore: number
  dailyActiveStudents: number
  studentsNeedingHelp: number
}

export interface PerformanceMetrics {
  topPerformingClasses: Array<{
    id: string
    name: string
    completionRate: number
    averageScore: number
    studentCount: number
  }>
  assignmentCompletionRates: Array<{
    id: string
    topic: string
    completionRate: number
    averageScore: number
    totalStudents: number
  }>
  recentActivity: Array<{
    type: string
    description: string
    timestamp: Date
    user?: string
  }>
}

export class DashboardService {
  /**
   * Get comprehensive dashboard data for graphs and analytics
   */
  static async getDashboardGraphData(days: number = 30): Promise<DashboardGraphData> {
    const [snapshots, currentMetrics, performanceMetrics] = await Promise.all([
      DashboardService.getSnapshotTrends(days),
      DashboardService.getCurrentMetrics(),
      DashboardService.getPerformanceMetrics()
    ])

    const trends = DashboardService.calculateTrends(snapshots)

    return {
      snapshots,
      trends,
      currentMetrics,
      performanceMetrics
    }
  }

  /**
   * Get recent snapshots for trend analysis
   */
  static async getSnapshotTrends(days: number = 30): Promise<SnapshotData[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const snapshots = await prisma.dashboardSnapshot.findMany({
      where: {
        timestamp: {
          gte: cutoffDate
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    })

    return snapshots.map(snapshot => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      snapshotType: snapshot.snapshotType,
      totalClasses: snapshot.totalClasses || 0,
      totalTeachers: snapshot.totalTeachers || 0,
      totalStudents: snapshot.totalStudents || 0,
      totalAssignments: snapshot.totalAssignments || 0,
      classAssignments: snapshot.classAssignments || 0,
      individualAssignments: snapshot.individualAssignments || 0,
      averageCompletionRate: snapshot.averageCompletionRate || 0,
      averageSuccessRate: snapshot.averageSuccessRate || 0,
      studentsNeedingAttention: snapshot.studentsNeedingAttention || 0,
      recentActivities: snapshot.recentActivities || 0
    }))
  }

  /**
   * Get current real-time metrics using our statistics service
   */
  static async getCurrentMetrics(): Promise<CurrentMetrics> {
    const [schoolStats, studentsNeedingHelpCount] = await Promise.all([
      StatisticsService.getSchoolStatistics(),
      prisma.studentsNeedingHelp.count({
        where: { isResolved: false }
      })
    ])

    // Handle null case by providing defaults
    if (!schoolStats) {
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        totalAssignments: 0,
        activeAssignments: 0,
        averageCompletionRate: 0,
        averageScore: 0,
        dailyActiveStudents: 0,
        studentsNeedingHelp: studentsNeedingHelpCount
      }
    }

    return {
      totalStudents: schoolStats.totalStudents,
      totalTeachers: schoolStats.totalTeachers,
      totalClasses: schoolStats.totalClasses,
      totalAssignments: schoolStats.totalAssignments,
      activeAssignments: schoolStats.activeAssignments,
      averageCompletionRate: schoolStats.averageCompletionRate,
      averageScore: schoolStats.averageScore,
      dailyActiveStudents: schoolStats.dailyActiveStudents,
      studentsNeedingHelp: studentsNeedingHelpCount
    }
  }

  /**
   * Calculate trend data from snapshots
   */
  static calculateTrends(snapshots: SnapshotData[]): TrendData {
    const completionRateTrend = snapshots.map(s => ({
      date: s.timestamp.toISOString().split('T')[0],
      value: s.averageCompletionRate
    }))

    const successRateTrend = snapshots.map(s => ({
      date: s.timestamp.toISOString().split('T')[0],
      value: s.averageSuccessRate
    }))

    const assignmentTrend = snapshots.map(s => ({
      date: s.timestamp.toISOString().split('T')[0],
      total: s.totalAssignments,
      class: s.classAssignments,
      individual: s.individualAssignments
    }))

    const studentActivityTrend = snapshots.map(s => ({
      date: s.timestamp.toISOString().split('T')[0],
      active: s.recentActivities,
      needingHelp: s.studentsNeedingAttention
    }))

    return {
      completionRateTrend,
      successRateTrend,
      assignmentTrend,
      studentActivityTrend
    }
  }

  /**
   * Get performance metrics and analytics
   */
  static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // Get top performing classes
    const classStats = await prisma.classStatsDetailed.findMany({
      include: {
        class: { select: { name: true } }
      },
      orderBy: {
        averageScore: 'desc'
      },
      take: 5
    })

    const topPerformingClasses = classStats.map(stat => ({
      id: stat.classId,
      name: stat.class.name,
      completionRate: stat.averageCompletion,
      averageScore: stat.averageScore,
      studentCount: stat.totalStudents
    }))

    // Get assignment completion rates
    const assignmentStats = await prisma.assignmentStats.findMany({
      include: {
        assignment: { select: { topic: true } }
      },
      where: {
        totalStudents: { gt: 0 }
      },
      orderBy: {
        completionRate: 'desc'
      },
      take: 10
    })

    const assignmentCompletionRates = assignmentStats.map(stat => ({
      id: stat.assignmentId,
      topic: stat.assignment.topic || 'Untitled Assignment',
      completionRate: stat.completionRate,
      averageScore: stat.averageScore,
      totalStudents: stat.totalStudents
    }))

    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      include: {
        user: { select: { username: true } }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      where: {
        publishedAt: { not: null }
      }
    })

    const formattedRecentActivity = recentActivity.map(activity => ({
      type: activity.type,
      description: activity.action || DashboardService.formatActivityDescription(activity.type),
      timestamp: activity.createdAt,
      user: activity.user?.username
    }))

    return {
      topPerformingClasses,
      assignmentCompletionRates,
      recentActivity: formattedRecentActivity
    }
  }

  /**
   * Format activity descriptions for display
   */
  static formatActivityDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'ASSIGNMENT_CREATED': 'New assignment created',
      'ASSIGNMENT_UPDATED': 'Assignment updated',
      'ASSIGNMENT_PUBLISHED': 'Assignment published',
      'CLASS_CREATED': 'New class created',
      'CLASS_UPDATED': 'Class updated',
      'USER_CREATED': 'New user created',
      'USER_LOGIN': 'User logged in',
      'STUDENT_CREATED': 'New student added',
      'TEACHER_CREATED': 'New teacher added'
    }

    return descriptions[type] || 'System activity'
  }

  /**
   * Get specific metric trends for individual charts
   */
  static async getMetricTrend(
    metric: 'completion' | 'success' | 'assignments' | 'students',
    days: number = 30
  ) {
    const snapshots = await DashboardService.getSnapshotTrends(days)
    
    switch (metric) {
      case 'completion':
        return snapshots.map(s => ({
          date: s.timestamp.toISOString().split('T')[0],
          value: s.averageCompletionRate
        }))
      
      case 'success':
        return snapshots.map(s => ({
          date: s.timestamp.toISOString().split('T')[0],
          value: s.averageSuccessRate
        }))
      
      case 'assignments':
        return snapshots.map(s => ({
          date: s.timestamp.toISOString().split('T')[0],
          total: s.totalAssignments,
          class: s.classAssignments,
          individual: s.individualAssignments
        }))
      
      case 'students':
        return snapshots.map(s => ({
          date: s.timestamp.toISOString().split('T')[0],
          total: s.totalStudents,
          needingHelp: s.studentsNeedingAttention
        }))
      
      default:
        return []
    }
  }

  /**
   * Get real-time dashboard summary
   */
  static async getDashboardSummary() {
    const [currentMetrics, recentSnapshots] = await Promise.all([
      DashboardService.getCurrentMetrics(),
      getRecentSnapshots(7)
    ])

    // Calculate weekly changes
    const weekOldSnapshot = recentSnapshots[recentSnapshots.length - 1]
    const changes = weekOldSnapshot ? {
      studentChange: currentMetrics.totalStudents - (weekOldSnapshot.totalStudents || 0),
      assignmentChange: currentMetrics.totalAssignments - (weekOldSnapshot.totalAssignments || 0),
      completionChange: currentMetrics.averageCompletionRate - (weekOldSnapshot.averageCompletionRate || 0),
      activityChange: currentMetrics.dailyActiveStudents
    } : null

    return {
      current: currentMetrics,
      changes,
      lastSnapshot: recentSnapshots[0] || null
    }
  }
} 