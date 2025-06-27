import { PrismaClient, ActivityLogType } from '@prisma/client'
import { AuthenticatedUser } from './auth.service'
import { prisma } from '../db'

export interface ActivityLogData {
  type: ActivityLogType
  action: string
  details?: Record<string, any>
  userId?: string
  classId?: string
  assignmentId?: string
}

export interface ActivityLogEntry {
  id: string
  type: ActivityLogType
  action?: string | null
  details?: any
  createdAt: Date
  userId?: string | null
  classId?: string | null
  assignmentId?: string | null
  user?: {
    id: string
    username: string
    email: string
    customRole: string
  } | null
  class?: {
    id: string
    name: string
  } | null
  assignment?: {
    id: string
    topic?: string | null
  } | null
}

/**
 * Activity Log Service
 * Tracks all database operations and user activities for audit and monitoring purposes
 */
export class ActivityLogService {
  /**
   * Log a general activity
   */
  static async log(data: ActivityLogData, tx?: PrismaClient): Promise<ActivityLogEntry> {
    const client = tx || prisma;
    const logEntry = await client.activityLog.create({
      data: {
        type: data.type,
        action: data.action,
        details: data.details || {},
        userId: data.userId,
        classId: data.classId,
        assignmentId: data.assignmentId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            customRole: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        assignment: {
          select: {
            id: true,
            topic: true,
          },
        },
      },
    })

    return logEntry as ActivityLogEntry
  }

  // =================
  // USER OPERATIONS
  // =================

  /**
   * Log user creation
   */
  static async logUserCreated(
    currentUser: AuthenticatedUser | null,
    targetUser: { id: string; username: string; email: string; customRole: string },
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'USER_CREATED',
      action: `${targetUser.username} was added!`,
      details: {
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetEmail: targetUser.email,
        targetRole: targetUser.customRole,
        ...details,
      },
      userId: currentUser?.id,
    })
  }

  /**
   * Log user update
   */
  static async logUserUpdated(
    currentUser: AuthenticatedUser,
    targetUser: { id: string; username: string; email: string },
    changedFields: string[],
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'USER_UPDATED',
      action: `User ${targetUser.username} was updated`,
      details: {
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetEmail: targetUser.email,
        changedFields,
        ...details,
      },
      userId: currentUser.id,
    })
  }

  /**
   * Log user deletion
   */
  static async logUserDeleted(
    currentUser: AuthenticatedUser,
    targetUser: { id: string; username: string; email: string },
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'USER_DELETED',
      action: `User ${targetUser.username} was deleted`,
      details: {
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetEmail: targetUser.email,
        ...details,
      },
      userId: currentUser.id,
    })
  }

  /**
   * Log user blocked/unblocked
   */
  static async logUserBlocked(
    currentUser: AuthenticatedUser,
    targetUser: { id: string; username: string; email: string },
    blocked: boolean,
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: blocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      action: `User ${targetUser.username} was ${blocked ? 'blocked' : 'unblocked'}`,
      details: {
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetEmail: targetUser.email,
        blocked,
        ...details,
      },
      userId: currentUser.id,
    })
  }

  /**
   * Log role change
   */
  static async logUserRoleChanged(
    currentUser: AuthenticatedUser,
    targetUser: { id: string; username: string; email: string },
    oldRole: string,
    newRole: string,
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'USER_ROLE_CHANGED',
      action: `User ${targetUser.username} role changed from ${oldRole} to ${newRole}`,
      details: {
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetEmail: targetUser.email,
        oldRole,
        newRole,
        ...details,
      },
      userId: currentUser.id,
    })
  }

  // =================
  // CLASS OPERATIONS
  // =================

  /**
   * Log class creation
   */
  static async logClassCreated(
    currentUser: AuthenticatedUser,
    classData: { id: string; name: string },
    teacherIds: string[],
    studentIds: string[],
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'CLASS_CREATED',
      action: `Class "${classData.name}" was created`,
      details: {
        teacherCount: teacherIds.length,
        studentCount: studentIds.length,
        teacherIds,
        studentIds,
        ...details,
      },
      userId: currentUser.id,
      classId: classData.id,
    })
  }

  /**
   * Log class update
   */
  static async logClassUpdated(
    currentUser: AuthenticatedUser,
    classData: { id: string; name: string },
    changedFields: string[],
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'CLASS_UPDATED',
      action: `Class "${classData.name}" was updated`,
      details: {
        changedFields,
        ...details,
      },
      userId: currentUser.id,
      classId: classData.id,
    })
  }

  /**
   * Log class deletion
   */
  static async logClassDeleted(
    currentUser: AuthenticatedUser,
    classData: { id: string; name: string },
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'CLASS_DELETED',
      action: `Class "${classData.name}" was deleted`,
      details: {
        ...details,
      },
      userId: currentUser.id,
      classId: classData.id,
    })
  }

  /**
   * Helper function to pluralize words correctly
   * @param count The number to determine plural/singular
   * @param singular The singular form of the word
   * @param plural The plural form of the word (optional, defaults to singular + 's')
   * @returns The correctly pluralized word
   */
  private static pluralize(count: number, singular: string, plural?: string): string {
    if (count === 1) {
      return singular
    }
    return plural || `${singular}s`
  }

  /**
   * Log users added to class
   */
  static async logClassUsersAdded(
    currentUser: AuthenticatedUser,
    classData: { id: string; name: string },
    addedUserIds: string[],
    userType: 'teachers' | 'students',
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    const singularType = userType === 'teachers' ? 'teacher' : 'student'
    
    let action: string
    if (addedUserIds.length === 1 && details?.addedUserNames?.[0]) {
      action = `${singularType} "${details.addedUserNames[0]}" added to class "${classData.name}"`
    } else {
      const pluralizedType = this.pluralize(addedUserIds.length, singularType, userType)
      action = `${addedUserIds.length} ${pluralizedType} added to class "${classData.name}"`
    }
    
    return this.log({
      type: 'CLASS_USERS_ADDED',
      action,
      details: {
        userType,
        addedUserIds,
        userCount: addedUserIds.length,
        ...details,
      },
      userId: currentUser.id,
      classId: classData.id,
    })
  }

  /**
   * Log users removed from class
   */
  static async logClassUsersRemoved(
    currentUser: AuthenticatedUser,
    classData: { id: string; name: string },
    removedUserIds: string[],
    userType: 'teachers' | 'students',
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    const singularType = userType === 'teachers' ? 'teacher' : 'student'
    
    let action: string
    if (removedUserIds.length === 1 && details?.removedUserNames?.[0]) {
      action = `${singularType} "${details.removedUserNames[0]}" removed from class "${classData.name}"`
    } else {
      const pluralizedType = this.pluralize(removedUserIds.length, singularType, userType)
      action = `${removedUserIds.length} ${pluralizedType} removed from class "${classData.name}"`
    }
    
    return this.log({
      type: 'CLASS_USERS_REMOVED',
      action,
      details: {
        userType,
        removedUserIds,
        userCount: removedUserIds.length,
        ...details,
      },
      userId: currentUser.id,
      classId: classData.id,
    })
  }

  // ===================
  // ASSIGNMENT OPERATIONS
  // ===================

  /**
   * Log assignment creation
   */
  static async logAssignmentCreated(
    currentUser: AuthenticatedUser,
    assignmentData: { id: string; topic?: string },
    assignmentType: 'CLASS' | 'INDIVIDUAL',
    details?: Record<string, any>,
    tx?: PrismaClient
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: assignmentType === 'CLASS' ? 'ASSIGNMENT_CREATED' : 'INDIVIDUAL_ASSIGNMENT_CREATED',
      action: `${assignmentType} assignment "${assignmentData.topic || 'Untitled'}" was created`,
      details: {
        assignmentType,
        ...details,
      },
      userId: currentUser.id,
      assignmentId: assignmentData.id,
    }, tx)
  }

  // ===================
  // AUTH OPERATIONS
  // ===================

  /**
   * Log user login
   */
  static async logUserLogin(
    user: { id: string; username: string; email: string },
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'USER_LOGIN',
      action: `User ${user.username} logged in`,
      details: {
        ...details,
      },
      userId: user.id,
    })
  }

  /**
   * Log user logout
   */
  static async logUserLogout(
    user: { id: string; username: string; email: string },
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'USER_LOGOUT',
      action: `User ${user.username} logged out`,
      details: {
        ...details,
      },
      userId: user.id,
    })
  }

  /**
   * Log failed login attempt
   */
  static async logUserLoginFailed(
    email: string,
    reason: string,
    details?: Record<string, any>
  ): Promise<ActivityLogEntry> {
    return this.log({
      type: 'USER_LOGIN_FAILED',
      action: `Failed login attempt for ${email}: ${reason}`,
      details: {
        email,
        reason,
        ...details,
      },
    })
  }

  // ===================
  // QUERY OPERATIONS
  // ===================

  /**
   * Get activity logs with filtering and pagination
   */
  static async getActivityLogs(params: {
    page?: number
    limit?: number
    userId?: string
    type?: ActivityLogType
    classId?: string
    assignmentId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<{
    logs: ActivityLogEntry[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const {
      page = 1,
      limit = 50,
      userId,
      type,
      classId,
      assignmentId,
      startDate,
      endDate,
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (userId) where.userId = userId
    if (type) where.type = type
    if (classId) where.classId = classId
    if (assignmentId) where.assignmentId = assignmentId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              customRole: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          assignment: {
            select: {
              id: true,
              topic: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    return {
      logs: logs as ActivityLogEntry[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get recent activity for a user
   */
  static async getUserRecentActivity(
    userId: string,
    limit: number = 10
  ): Promise<ActivityLogEntry[]> {
    const logs = await prisma.activityLog.findMany({
      where: { userId },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            customRole: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        assignment: {
          select: {
            id: true,
            topic: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return logs as ActivityLogEntry[]
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(params: {
    startDate?: Date
    endDate?: Date
    userId?: string
  }): Promise<{
    totalActivities: number
    activitiesByType: Record<string, number>
    activitiesByDay: Record<string, number>
  }> {
    const { startDate, endDate, userId } = params

    const where: any = {}
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [total, activities] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        select: {
          type: true,
          createdAt: true,
        },
      }),
    ])

    // Group by type
    const activitiesByType: Record<string, number> = {}
    activities.forEach((activity) => {
      activitiesByType[activity.type] = (activitiesByType[activity.type] || 0) + 1
    })

    // Group by day
    const activitiesByDay: Record<string, number> = {}
    activities.forEach((activity) => {
      const day = activity.createdAt.toISOString().split('T')[0]
      activitiesByDay[day] = (activitiesByDay[day] || 0) + 1
    })

    return {
      totalActivities: total,
      activitiesByType,
      activitiesByDay,
    }
  }
} 