import { PrismaClient } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
import { ActivityLogService } from './activity-log.service'
import { StatisticsService } from './statistics.service'
import { hashPassword } from '../auth'
import { withTransaction } from '../db'

const prisma = new PrismaClient()

export interface CreateUserData {
  username: string
  email: string
  password: string
  customRole: 'ADMIN' | 'TEACHER' | 'STUDENT'
  phone?: string
  address?: string
  isPlayGame?: boolean
}

export interface UpdateUserData {
  username?: string
  email?: string
  phone?: string
  address?: string
  isPlayGame?: boolean
  confirmed?: boolean
  blocked?: boolean
  theme?: 'light' | 'dark' | 'system'
  customRole?: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'
}

export interface UserWithDetails {
  id: string
  username: string
  email: string
  customRole: string
  phone: string | null
  address: string | null
  confirmed: boolean
  blocked: boolean
  isPlayGame: boolean | null
  theme: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignmentsCreated: number
    assignmentsAssigned: number
    progresses: number
    classes: number
  }
}

export interface UserListParams {
  page?: number
  limit?: number
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT'
  search?: string
  classId?: string
}

/**
 * Users Service
 * Handles all user-related database operations with authentication and activity logging
 */
export class UsersService {
  /**
   * Create a new user
   * Only admins can create users
   */
  static async createUser(
    currentUser: AuthenticatedUser,
    userData: CreateUserData
  ): Promise<UserWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    // Helper function to generate 3 random numbers
    const generateRandomSuffix = () => Math.floor(100 + Math.random() * 900).toString()

    // Handle username collision by adding random numbers
    let finalUsername = userData.username
    let usernameExists = await prisma.user.findUnique({
      where: { username: finalUsername }
    })

    while (usernameExists) {
      const suffix = generateRandomSuffix()
      finalUsername = `${userData.username}${suffix}`
      usernameExists = await prisma.user.findUnique({
        where: { username: finalUsername }
      })
    }

    // Handle email collision by adding random numbers before @
    let finalEmail = userData.email
    let emailExists = await prisma.user.findUnique({
      where: { email: finalEmail }
    })

    while (emailExists) {
      const suffix = generateRandomSuffix()
      const [localPart, domain] = userData.email.split('@')
      finalEmail = `${localPart}${suffix}@${domain}`
      emailExists = await prisma.user.findUnique({
        where: { email: finalEmail }
      })
    }

    const hashedPassword = await hashPassword(userData.password)

    return withTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          username: finalUsername,
          email: finalEmail,
          password: hashedPassword,
          confirmed: true, // Admin-created users are auto-confirmed
        },
        select: {
          id: true,
          username: true,
          email: true,
          customRole: true,
          phone: true,
          address: true,
          confirmed: true,
          blocked: true,
          isPlayGame: true,
          theme: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Log the activity using the new format
      await tx.activityLog.create({
        data: {
          type: 'USER_CREATED',
          action: `${user.username} was added!`,
          details: {
            targetUserId: user.id,
            targetUsername: user.username,
            targetEmail: user.email,
            targetRole: user.customRole,
            createdByAdmin: true,
            adminId: currentUser.id,
            adminUsername: currentUser.username,
            originalUsername: userData.username !== finalUsername ? userData.username : undefined,
            originalEmail: userData.email !== finalEmail ? userData.email : undefined,
          },
          userId: currentUser.id,
        },
      })

      // Initialize student statistics if this is a student
      if (user.customRole === 'STUDENT') {
        await StatisticsService.initializeStudentStatistics(user.id, tx)
      }

      return user as UserWithDetails
    })
  }

  /**
   * Get user by ID
   * Users can only access their own data unless they're admin/teacher
   */
  static async getUserById(
    currentUser: AuthenticatedUser,
    userId: string
  ): Promise<UserWithDetails> {
    AuthService.requireOwnershipOrTeacher(currentUser, userId)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        customRole: true,
        phone: true,
        address: true,
        confirmed: true,
        blocked: true,
        isPlayGame: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignmentsCreated: true,
            assignmentsAssigned: true,
            progresses: true,
            classes: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    return user as UserWithDetails
  }

  /**
   * Update user
   * Users can update their own data, admins can update anyone
   */
  static async updateUser(
    currentUser: AuthenticatedUser,
    userId: string,
    updateData: UpdateUserData,
    skipActivityLog: boolean = false
  ): Promise<UserWithDetails> {
    // Only admins can change confirmation status or block/unblock users
    if (updateData.confirmed !== undefined || updateData.blocked !== undefined || updateData.customRole !== undefined) {
      AuthService.requireAdmin(currentUser)
    } else {
      AuthService.requireOwnershipOrTeacher(currentUser, userId)
    }

    await AuthService.verifyUserExists(userId)

    // Get the current user data for comparison and logging
    const currentUserData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        customRole: true,
        phone: true,
        address: true,
        confirmed: true,
        blocked: true,
        isPlayGame: true,
        theme: true,
      }
    })

    if (!currentUserData) {
      throw new NotFoundError('User not found')
    }

    // Validate email uniqueness if changing email
    if (updateData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: userId }
        }
      })

      if (existingUser) {
        throw new ValidationError('Email already exists')
      }
    }

    // Validate username uniqueness if changing username
    if (updateData.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: updateData.username,
          id: { not: userId }
        }
      })

      if (existingUser) {
        throw new ValidationError('Username already exists')
      }
    }

    return withTransaction(async (tx) => {
      const updatedUser = await tx.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        customRole: true,
        phone: true,
        address: true,
        confirmed: true,
        blocked: true,
        isPlayGame: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
      },
    })

      // Skip activity logging if flag is set (for personal preference changes like theme)
      if (skipActivityLog) {
        console.log(`🔕 ACTIVITY LOG SKIPPED: User ${updatedUser.username} update completed without logging`)
    return updatedUser as UserWithDetails
      }

      // Track what changed for activity logging and if specific logs were created
      const changedFields: string[] = []
      let specificLogCreated = false
      const logDetails: any = {
        updatedByAdmin: currentUser.customRole === 'ADMIN' && currentUser.id !== userId,
        adminId: currentUser.customRole === 'ADMIN' ? currentUser.id : undefined,
        adminUsername: currentUser.customRole === 'ADMIN' ? currentUser.username : undefined
      }

      // Check for field changes and add specific activity logs
      if (updateData.username !== undefined && updateData.username !== currentUserData.username) {
        changedFields.push('username')
        logDetails.oldUsername = currentUserData.username
        logDetails.newUsername = updateData.username
      }

      if (updateData.email !== undefined && updateData.email !== currentUserData.email) {
        changedFields.push('email')
        logDetails.oldEmail = currentUserData.email
        logDetails.newEmail = updateData.email
      }

      if (updateData.customRole !== undefined && updateData.customRole !== currentUserData.customRole) {
        changedFields.push('customRole')
        specificLogCreated = true
        
        // Create role change activity log directly in the transaction
        await tx.activityLog.create({
          data: {
            type: 'USER_ROLE_CHANGED',
            action: `User ${updatedUser.username} role changed from ${currentUserData.customRole} to ${updateData.customRole}`,
            details: {
              targetUserId: updatedUser.id,
              targetUsername: updatedUser.username,
              targetEmail: updatedUser.email,
              oldRole: currentUserData.customRole,
              newRole: updateData.customRole,
              changedByAdmin: true,
              adminId: currentUser.id,
              adminUsername: currentUser.username
            },
            userId: currentUser.id,
            publishedAt: new Date(),
          },
        })
      }

      if (updateData.blocked !== undefined && updateData.blocked !== currentUserData.blocked) {
        changedFields.push('blocked')
        specificLogCreated = true
        
        console.log(`🔒 BLOCKING/UNBLOCKING USER: ${updatedUser.username} - blocked: ${updateData.blocked}`)
        
        // Create activity log directly in the transaction (simplified for debugging)
        await tx.activityLog.create({
          data: {
            type: updateData.blocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
            action: `User ${updatedUser.username} was ${updateData.blocked ? 'blocked' : 'unblocked'}`,
            details: {
              blocked: updateData.blocked,
              adminId: currentUser.id,
            },
            userId: currentUser.id,
            publishedAt: new Date(),
          },
        })
        
        console.log(`✅ ACTIVITY LOG CREATED for ${updateData.blocked ? 'blocking' : 'unblocking'} user: ${updatedUser.username}`)
      }

      if (updateData.confirmed !== undefined && updateData.confirmed !== currentUserData.confirmed) {
        changedFields.push('confirmed')
        specificLogCreated = true
        
        // Create confirmation activity log
        await tx.activityLog.create({
          data: {
            type: 'USER_CONFIRMED',
            action: `User ${updatedUser.username} was ${updateData.confirmed ? 'confirmed' : 'unconfirmed'}`,
            details: {
              targetUserId: updatedUser.id,
              targetUsername: updatedUser.username,
              targetEmail: updatedUser.email,
              confirmed: updateData.confirmed,
              changedByAdmin: true,
              adminId: currentUser.id,
              adminUsername: currentUser.username
            },
            userId: currentUser.id,
            publishedAt: new Date(),
          },
        })
      }

      if (updateData.phone !== undefined && updateData.phone !== currentUserData.phone) {
        changedFields.push('phone')
      }

      if (updateData.address !== undefined && updateData.address !== currentUserData.address) {
        changedFields.push('address')
      }

      if (updateData.isPlayGame !== undefined && updateData.isPlayGame !== currentUserData.isPlayGame) {
        changedFields.push('isPlayGame')
      }

      // Only create generic USER_UPDATED log if:
      // 1. There were changes to track
      // 2. No specific activity logs were already created
      // 3. There are non-specific fields that changed (like username, email, phone, etc.)
      const nonSpecificFields = changedFields.filter(field => 
        !['customRole', 'blocked', 'confirmed'].includes(field)
      )

      if (nonSpecificFields.length > 0 && !specificLogCreated) {
        await tx.activityLog.create({
          data: {
            type: 'USER_UPDATED',
            action: `User ${updatedUser.username} updated`,
            details: {
              targetUserId: updatedUser.id,
              targetUsername: updatedUser.username,
              targetEmail: updatedUser.email,
              updatedFields: nonSpecificFields,
              updatedByAdmin: currentUser.customRole === 'ADMIN' && currentUser.id !== userId,
              adminId: currentUser.customRole === 'ADMIN' ? currentUser.id : undefined,
              adminUsername: currentUser.customRole === 'ADMIN' ? currentUser.username : undefined
            },
            userId: currentUser.id,
            publishedAt: new Date(),
          },
        })
      }

      return updatedUser as UserWithDetails
    })
  }

  /**
   * Delete user
   * Only admins can delete users
   */
  static async deleteUser(
    currentUser: AuthenticatedUser,
    userId: string
  ): Promise<void> {
    AuthService.requireAdmin(currentUser)

    if (currentUser.id === userId) {
      throw new ValidationError('Cannot delete your own account')
    }

    await AuthService.verifyUserExists(userId)

    // Get user data before deletion for logging
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        customRole: true
      }
    })

    if (!userToDelete) {
      throw new NotFoundError('User not found')
    }

    await withTransaction(async (tx) => {
      // Log the deletion before actually deleting
      await tx.activityLog.create({
        data: {
          type: 'USER_DELETED',
          action: `User ${userToDelete.username} deleted`,
          details: {
            targetUserId: userToDelete.id,
            targetUsername: userToDelete.username,
            targetEmail: userToDelete.email,
            deletedByAdmin: true,
            adminId: currentUser.id,
            adminUsername: currentUser.username,
            userRole: userToDelete.customRole
          },
          userId: currentUser.id,
          publishedAt: new Date(),
        },
      })

      // The foreign key constraints with onDelete: Cascade will handle
      // cleaning up related records (progresses, assignments, etc.)
      await tx.user.delete({
        where: { id: userId }
      })
    })
  }

  /**
   * List users with filtering and pagination
   * Only teachers and admins can list users
   */
  static async listUsers(
    currentUser: AuthenticatedUser,
    params: UserListParams = {}
  ): Promise<{
    users: UserWithDetails[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    roleCounts: {
      admin: number
      teacher: number
      student: number
      parent: number
    }
  }> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const {
      page = 1,
      limit = 20,
      role,
      search,
      classId
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (role) {
      where.customRole = role
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (classId) {
      where.classes = {
        some: { classId }
      }
    }

    const [users, total, adminCount, teacherCount, studentCount, parentCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          customRole: true,
          phone: true,
          address: true,
          confirmed: true,
          blocked: true,
          isPlayGame: true,
          theme: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignmentsCreated: true,
              assignmentsAssigned: true,
              progresses: true,
              classes: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { customRole: 'ADMIN' } }),
      prisma.user.count({ where: { customRole: 'TEACHER' } }),
      prisma.user.count({ where: { customRole: 'STUDENT' } }),
      prisma.user.count({ where: { customRole: 'PARENT' } }),
    ])

    return {
      users: users as UserWithDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      roleCounts: {
        admin: adminCount,
        teacher: teacherCount,
        student: studentCount,
        parent: parentCount
      }
    }
  }

  /**
   * Get users by role
   * Teachers and admins only
   */
  static async getUsersByRole(
    currentUser: AuthenticatedUser,
    role: 'ADMIN' | 'TEACHER' | 'STUDENT'
  ): Promise<UserWithDetails[]> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const users = await prisma.user.findMany({
      where: { customRole: role },
      select: {
        id: true,
        username: true,
        email: true,
        customRole: true,
        phone: true,
        address: true,
        confirmed: true,
        blocked: true,
        isPlayGame: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { username: 'asc' }
    })

    return users as UserWithDetails[]
  }

  /**
   * Change user password
   * Users can change their own password, admins can change anyone's
   */
  static async changePassword(
    currentUser: AuthenticatedUser,
    userId: string,
    newPassword: string
  ): Promise<void> {
    AuthService.requireOwnershipOrTeacher(currentUser, userId)

    await AuthService.verifyUserExists(userId)

    if (newPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters')
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })
  }

  /**
   * Get current user profile
   */
  static async getCurrentUserProfile(
    currentUser: AuthenticatedUser
  ): Promise<UserWithDetails> {
    return this.getUserById(currentUser, currentUser.id)
  }

  /**
   * Update current user's profile
   * Users can only update their own profile data
   */
  static async updateCurrentUserProfile(
    currentUser: AuthenticatedUser,
    updateData: Omit<UpdateUserData, 'confirmed'>,
    skipActivityLog: boolean = false
  ): Promise<UserWithDetails> {
    return this.updateUser(
      currentUser, 
      currentUser.id, 
      updateData, 
      skipActivityLog
    )
  }
} 