import { PrismaClient } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
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
 * Handles all user-related database operations with authentication
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
    AuthService.requireAdmin(currentUser)

    // Validate email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (existingUser) {
      throw new ValidationError('Email already exists')
    }

    // Validate username uniqueness
    const existingUsername = await prisma.user.findUnique({
      where: { username: userData.username }
    })

    if (existingUsername) {
      throw new ValidationError('Username already exists')
    }

    const hashedPassword = await hashPassword(userData.password)

    return withTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
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

      // Log the activity
      await tx.activityLog.create({
        data: {
          type: userData.customRole === 'STUDENT' ? 'STUDENT_CREATED' : 'TEACHER_CREATED',
          userId: currentUser.id,
          publishedAt: new Date(),
        },
      })

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
    updateData: UpdateUserData
  ): Promise<UserWithDetails> {
    // Only admins can change confirmation status or block/unblock users
    if (updateData.confirmed !== undefined || updateData.blocked !== undefined) {
      AuthService.requireAdmin(currentUser)
    } else {
      AuthService.requireOwnershipOrTeacher(currentUser, userId)
    }

    await AuthService.verifyUserExists(userId)

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

    const updatedUser = await prisma.user.update({
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

    return updatedUser as UserWithDetails
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

    await withTransaction(async (tx) => {
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
   * Update current user profile
   */
  static async updateCurrentUserProfile(
    currentUser: AuthenticatedUser,
    updateData: Omit<UpdateUserData, 'confirmed'>
  ): Promise<UserWithDetails> {
    return this.updateUser(currentUser, currentUser.id, updateData)
  }
} 