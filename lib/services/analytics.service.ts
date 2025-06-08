import { PrismaClient } from '@prisma/client'
import { AuthService, AuthenticatedUser, ForbiddenError } from './auth.service'

const prisma = new PrismaClient()

export interface DashboardMetrics {
  totalUsers: number
  totalTeachers: number
  totalStudents: number
  totalClasses: number
  totalAssignments: number
  activeAssignments: number
  scheduledAssignments: number
  averageCompletionRate: number
  averageSuccessRate: number
  studentsNeedingAttention: number
  recentActivities: Array<{
    type: string
    user: {
      username: string
      customRole: string
    } | null
    assignment: {
      topic: string | null
    } | null
    class: {
      name: string
    } | null
    date: Date
  }>
}

export interface UserAnalytics {
  user: {
    id: string
    username: string
    customRole: string
  }
  totalAssignments: number
  completedAssignments: number
  completionRate: number
  averageScore: number
  recentProgress: Array<{
    assignment: {
      id: string
      topic: string | null
    }
    completedQuestions: number
    totalQuestions: number
    lastActivity: Date
  }>
}

export interface ClassPerformanceReport {
  class: {
    id: string
    name: string
  }
  totalStudents: number
  totalAssignments: number
  averageCompletion: number
  averageScore: number
  topPerformers: Array<{
    student: {
      id: string
      username: string
    }
    completionRate: number
    averageScore: number
  }>
  strugglingStudents: Array<{
    student: {
      id: string
      username: string
    }
    completionRate: number
    averageScore: number
  }>
  assignmentProgress: Array<{
    assignment: {
      id: string
      topic: string | null
    }
    completionRate: number
    averageScore: number
  }>
}

export interface TeacherReport {
  teacher: {
    id: string
    username: string
  }
  totalAssignments: number
  totalStudents: number
  averageCompletionRate: number
  averageSuccessRate: number
  assignmentBreakdown: Array<{
    assignment: {
      id: string
      topic: string | null
      type: string | null
    }
    studentCount: number
    completionRate: number
    averageScore: number
  }>
}

export interface SystemAnalytics {
  totalUsers: {
    admins: number
    teachers: number
    students: number
  }
  engagement: {
    activeUsers: number
    assignmentsCompletedToday: number
    assignmentsCompletedThisWeek: number
    assignmentsCompletedThisMonth: number
  }
  performance: {
    averageSystemCompletion: number
    averageSystemScore: number
    totalProgressRecords: number
  }
  growth: {
    newUsersToday: number
    newUsersThisWeek: number
    newUsersThisMonth: number
    newAssignmentsThisWeek: number
  }
}

/**
 * Analytics Service
 * Handles all analytics and reporting with proper authentication
 */
export class AnalyticsService {
  /**
   * Get dashboard metrics
   * Role-based filtering: Admins see all, Teachers see their data, Students see personal metrics
   */
  static async getDashboardMetrics(
    currentUser: AuthenticatedUser
  ): Promise<DashboardMetrics> {
    let userFilter: any = {}
    let assignmentFilter: any = {}

    // Apply role-based filtering
    if (currentUser.customRole === 'TEACHER') {
      assignmentFilter.teacherId = currentUser.id
    } else if (currentUser.customRole === 'STUDENT') {
      // Students only see their own metrics
      userFilter.id = currentUser.id
      assignmentFilter.OR = [
        {
          classes: {
            some: {
              class: {
                users: {
                  some: { userId: currentUser.id }
                }
              }
            }
          }
        },
        {
          students: {
            some: { userId: currentUser.id }
          }
        }
      ]
    }

    // Get basic counts
    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalAssignments,
      activeAssignments,
      scheduledAssignments
    ] = await Promise.all([
      currentUser.customRole === 'ADMIN' ? prisma.user.count() : 
        currentUser.customRole === 'STUDENT' ? 1 : 
        prisma.user.count({ where: { customRole: 'STUDENT' } }),
      currentUser.customRole === 'ADMIN' ? prisma.user.count({ where: { customRole: 'TEACHER' } }) : 0,
      currentUser.customRole === 'ADMIN' ? prisma.user.count({ where: { customRole: 'STUDENT' } }) : 
        currentUser.customRole === 'TEACHER' ? prisma.user.count({ where: { customRole: 'STUDENT' } }) : 1,
      currentUser.customRole === 'ADMIN' ? prisma.class.count() : 
        currentUser.customRole === 'TEACHER' ? prisma.class.count() :
        prisma.userClass.count({ where: { userId: currentUser.id } }),
      prisma.assignment.count({ where: assignmentFilter }),
      prisma.assignment.count({ where: { ...assignmentFilter, isActive: true } }),
      prisma.assignment.count({ where: { ...assignmentFilter, isActive: false, scheduledPublishAt: { not: null } } })
    ])

    // Calculate performance metrics
    const progresses = await prisma.studentAssignmentProgress.findMany({
      where: currentUser.customRole === 'STUDENT' ? {
        studentId: currentUser.id
      } : currentUser.customRole === 'TEACHER' ? {
        assignment: { teacherId: currentUser.id }
      } : {}
    })

    const completedCount = progresses.filter((p: any) => p.isComplete).length
    const correctCount = progresses.filter((p: any) => p.isCorrect).length
    const totalProgress = progresses.length

    const averageCompletionRate = totalProgress > 0 ? (completedCount / totalProgress) * 100 : 0
    const averageSuccessRate = completedCount > 0 ? (correctCount / completedCount) * 100 : 0

    // Find students needing attention (low completion rates)
    const studentStats = new Map()
    for (const progress of progresses) {
      const studentId = progress.studentId
      if (!studentStats.has(studentId)) {
        studentStats.set(studentId, { completed: 0, total: 0 })
      }
      const stats = studentStats.get(studentId)
      stats.total++
      if (progress.isComplete) {
        stats.completed++
      }
    }

    const studentsNeedingAttention = Array.from(studentStats.values())
      .filter((stats: any) => stats.total > 0 && (stats.completed / stats.total) < 0.6).length

    // Get recent activities
    const recentActivities = await prisma.activityLog.findMany({
      take: 10,
      where: currentUser.customRole === 'TEACHER' ? {
        OR: [
          { userId: currentUser.id },
          { assignment: { teacherId: currentUser.id } }
        ]
      } : currentUser.customRole === 'STUDENT' ? {
        OR: [
          { userId: currentUser.id },
          { assignment: { 
            OR: [
              { classes: { some: { class: { users: { some: { userId: currentUser.id } } } } } },
              { students: { some: { userId: currentUser.id } } }
            ]
          }}
        ]
      } : {},
      include: {
        user: {
          select: { username: true, customRole: true }
        },
        assignment: {
          select: { topic: true }
        },
        class: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalAssignments,
      activeAssignments,
      scheduledAssignments,
      averageCompletionRate,
      averageSuccessRate,
      studentsNeedingAttention,
      recentActivities: recentActivities.map((activity: any) => ({
        type: activity.type,
        user: activity.user,
        assignment: activity.assignment,
        class: activity.class,
        date: activity.createdAt
      }))
    }
  }

  /**
   * Get user analytics
   * Users can see their own analytics, teachers/admins can see any user
   */
  static async getUserAnalytics(
    currentUser: AuthenticatedUser,
    userId?: string
  ): Promise<UserAnalytics> {
    const targetUserId = userId || currentUser.id

    // Check permissions
    if (currentUser.customRole === 'STUDENT' && targetUserId !== currentUser.id) {
      throw new ForbiddenError('Can only view your own analytics')
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, customRole: true }
    })

    if (!user) {
      throw new ForbiddenError('User not found')
    }

    // Get assignment progress
    const progresses = await prisma.studentAssignmentProgress.findMany({
      where: { studentId: targetUserId },
      include: {
        assignment: {
          select: { id: true, topic: true }
        },
        question: {
          select: { id: true }
        }
      }
    })

    // Calculate metrics
    const assignmentStats = new Map()
    for (const progress of progresses) {
      const assignmentId = progress.assignment.id
      if (!assignmentStats.has(assignmentId)) {
        assignmentStats.set(assignmentId, {
          assignment: progress.assignment,
          completed: 0,
          correct: 0,
          total: 0,
          lastActivity: progress.createdAt
        })
      }
      const stats = assignmentStats.get(assignmentId)
      stats.total++
      if (progress.isComplete) {
        stats.completed++
        if (progress.isCorrect) {
          stats.correct++
        }
      }
      if (progress.createdAt > stats.lastActivity) {
        stats.lastActivity = progress.createdAt
      }
    }

    const assignments = Array.from(assignmentStats.values())
    const totalAssignments = assignments.length
    const completedAssignments = assignments.filter((a: any) => a.completed === a.total && a.total > 0).length
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

    const totalCorrect = assignments.reduce((sum: number, a: any) => sum + a.correct, 0)
    const totalCompleted = assignments.reduce((sum: number, a: any) => sum + a.completed, 0)
    const averageScore = totalCompleted > 0 ? (totalCorrect / totalCompleted) * 100 : 0

    return {
      user,
      totalAssignments,
      completedAssignments,
      completionRate,
      averageScore,
      recentProgress: assignments
        .sort((a: any, b: any) => b.lastActivity - a.lastActivity)
        .slice(0, 10)
        .map((a: any) => ({
          assignment: a.assignment,
          completedQuestions: a.completed,
          totalQuestions: a.total,
          lastActivity: a.lastActivity
        }))
    }
  }

  /**
   * Get class performance report
   * Only teachers and admins can view class reports
   */
  static async getClassPerformanceReport(
    currentUser: AuthenticatedUser,
    classId: string
  ): Promise<ClassPerformanceReport> {
    AuthService.requireTeacherOrAdmin(currentUser)

    // Get class info
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true }
    })

    if (!classData) {
      throw new ForbiddenError('Class not found')
    }

    // Get class analytics using the existing method
    const analytics = await this.getClassAnalytics(currentUser, classId)

    return {
      class: classData,
      totalStudents: analytics.totalStudents,
      totalAssignments: analytics.totalAssignments,
      averageCompletion: analytics.averageCompletion,
      averageScore: analytics.averageScore,
      topPerformers: analytics.topPerformers,
      strugglingStudents: analytics.topPerformers
        .filter((p: any) => p.averageScore < 60)
        .reverse(), // Lowest scores first
      assignmentProgress: [] // Could be implemented if needed
    }
  }

  /**
   * Get teacher report
   * Only admins can view teacher reports, teachers can view their own
   */
  static async getTeacherReport(
    currentUser: AuthenticatedUser,
    teacherId?: string
  ): Promise<TeacherReport> {
    const targetTeacherId = teacherId || currentUser.id

    // Check permissions
    if (currentUser.customRole === 'TEACHER' && targetTeacherId !== currentUser.id) {
      throw new ForbiddenError('Can only view your own report')
    } else if (currentUser.customRole === 'STUDENT') {
      throw new ForbiddenError('Students cannot view teacher reports')
    }

    // Get teacher info
    const teacher = await prisma.user.findUnique({
      where: { id: targetTeacherId, customRole: 'TEACHER' },
      select: { id: true, username: true }
    })

    if (!teacher) {
      throw new ForbiddenError('Teacher not found')
    }

    // Get teacher's assignments with stats
    const assignments = await prisma.assignment.findMany({
      where: { teacherId: targetTeacherId },
      include: {
        _count: { select: { progresses: true } },
        progresses: true,
        classes: { include: { class: { include: { _count: { select: { users: true } } } } } },
        students: true
      }
    })

    let totalStudents = 0
    const assignmentBreakdown = assignments.map((assignment: any) => {
      const studentCount = assignment.type === 'CLASS' 
        ? assignment.classes.reduce((sum: number, ca: any) => sum + ca.class._count.users, 0)
        : assignment.students.length

      totalStudents += studentCount

      const completed = assignment.progresses.filter((p: any) => p.isComplete).length
      const correct = assignment.progresses.filter((p: any) => p.isCorrect).length
      const total = assignment.progresses.length

      return {
        assignment: {
          id: assignment.id,
          topic: assignment.topic,
          type: assignment.type
        },
        studentCount,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        averageScore: completed > 0 ? (correct / completed) * 100 : 0
      }
    })

    const averageCompletionRate = assignmentBreakdown.length > 0 
      ? assignmentBreakdown.reduce((sum: number, a: any) => sum + a.completionRate, 0) / assignmentBreakdown.length 
      : 0

    const averageSuccessRate = assignmentBreakdown.length > 0 
      ? assignmentBreakdown.reduce((sum: number, a: any) => sum + a.averageScore, 0) / assignmentBreakdown.length 
      : 0

    return {
      teacher,
      totalAssignments: assignments.length,
      totalStudents,
      averageCompletionRate,
      averageSuccessRate,
      assignmentBreakdown
    }
  }

  /**
   * Get system analytics
   * Only admins can view system analytics
   */
  static async getSystemAnalytics(
    currentUser: AuthenticatedUser
  ): Promise<SystemAnalytics> {
    AuthService.requireAdmin(currentUser)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalAdmins,
      totalTeachers,
      totalStudents,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      newAssignmentsThisWeek,
      assignmentsCompletedToday,
      assignmentsCompletedThisWeek,
      assignmentsCompletedThisMonth,
      totalProgressRecords,
      allProgresses
    ] = await Promise.all([
      prisma.user.count({ where: { customRole: 'ADMIN' } }),
      prisma.user.count({ where: { customRole: 'TEACHER' } }),
      prisma.user.count({ where: { customRole: 'STUDENT' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.assignment.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.studentAssignmentProgress.count({ 
        where: { 
          isComplete: true,
          createdAt: { gte: today }
        }
      }),
      prisma.studentAssignmentProgress.count({ 
        where: { 
          isComplete: true,
          createdAt: { gte: weekAgo }
        }
      }),
      prisma.studentAssignmentProgress.count({ 
        where: { 
          isComplete: true,
          createdAt: { gte: monthAgo }
        }
      }),
      prisma.studentAssignmentProgress.count(),
      prisma.studentAssignmentProgress.findMany()
    ])

    // Calculate performance metrics
    const completedCount = allProgresses.filter((p: any) => p.isComplete).length
    const correctCount = allProgresses.filter((p: any) => p.isCorrect).length

    const averageSystemCompletion = totalProgressRecords > 0 ? (completedCount / totalProgressRecords) * 100 : 0
    const averageSystemScore = completedCount > 0 ? (correctCount / completedCount) * 100 : 0

    // Get active users (users with activity in the last week)
    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          { activityLogs: { some: { createdAt: { gte: weekAgo } } } },
          { progresses: { some: { createdAt: { gte: weekAgo } } } }
        ]
      }
    })

    return {
      totalUsers: {
        admins: totalAdmins,
        teachers: totalTeachers,
        students: totalStudents
      },
      engagement: {
        activeUsers,
        assignmentsCompletedToday,
        assignmentsCompletedThisWeek,
        assignmentsCompletedThisMonth
      },
      performance: {
        averageSystemCompletion,
        averageSystemScore,
        totalProgressRecords
      },
      growth: {
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        newAssignmentsThisWeek
      }
    }
  }

  /**
   * Create dashboard snapshot
   * Used by scheduled tasks to store daily metrics
   */
  static async createDashboardSnapshot(): Promise<void> {
    // Get system metrics
    const adminUser = { customRole: 'ADMIN' } as AuthenticatedUser
    const [dashboardMetrics, systemAnalytics] = await Promise.all([
      this.getDashboardMetrics(adminUser),
      this.getSystemAnalytics(adminUser)
    ])

    await prisma.dashboardSnapshot.create({
      data: {
        timestamp: new Date(),
        snapshotType: 'daily',
        totalClasses: dashboardMetrics.totalClasses,
        totalTeachers: dashboardMetrics.totalTeachers,
        totalStudents: dashboardMetrics.totalStudents,
        totalAssignments: dashboardMetrics.totalAssignments,
        classAssignments: await prisma.assignment.count({ where: { type: 'CLASS' } }),
        individualAssignments: await prisma.assignment.count({ where: { type: 'INDIVIDUAL' } }),
        averageCompletionRate: Math.round(dashboardMetrics.averageCompletionRate),
        averageSuccessRate: Math.round(dashboardMetrics.averageSuccessRate),
        studentsNeedingAttention: dashboardMetrics.studentsNeedingAttention,
        recentActivities: dashboardMetrics.recentActivities.length,
        publishedAt: new Date(),
      }
    })
  }

  // Helper method to get class analytics (used internally)
  private static async getClassAnalytics(
    currentUser: AuthenticatedUser,
    classId: string
  ): Promise<any> {
    // This would be the same implementation as ClassesService.getClassAnalytics
    // For now, return basic structure
    return {
      totalStudents: 0,
      totalAssignments: 0,
      averageCompletion: 0,
      averageScore: 0,
      topPerformers: []
    }
  }
} 