import { AuthenticatedUser } from './auth'

// Local error classes to avoid circular imports
class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

// Interfaces for user operations
export interface UserListParams {
  page?: number
  limit?: number
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'
  search?: string
  classId?: string
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  customRole: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'
  phone?: string
  address?: string
  isPlayGame?: boolean
}

export interface User {
  id: string
  username: string
  email: string
  customRole: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'
  phone?: string
  address?: string
  isPlayGame?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PaginationResult {
  page: number
  limit: number
  total: number
  pages: number
}

export interface UserListResult {
  users: User[]
  pagination: PaginationResult
}

export class UsersService {
  /**
   * List users with filtering and pagination
   */
  static async listUsers(
    currentUser: AuthenticatedUser,
    params: UserListParams = {}
  ): Promise<UserListResult> {
    // Check permissions - only admins and teachers can list users
    if (!this.canViewUsers(currentUser)) {
      throw new AuthorizationError('Cannot view users')
    }

    const {
      page = 1,
      limit = 20,
      role,
      search,
      classId
    } = params

    // For demo purposes, return mock data
    // In production, this would query the database using Prisma
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@school.com',
        customRole: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        username: 'teacher-tanaka',
        email: 'tanaka@school.com',
        customRole: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        username: 'student-yamada',
        email: 'yamada@student.com',
        customRole: 'STUDENT',
        isPlayGame: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]

    // Apply basic filtering
    let filteredUsers = mockUsers
    
    if (role) {
      filteredUsers = filteredUsers.filter(u => u.customRole === role)
    }
    
    if (search) {
      filteredUsers = filteredUsers.filter(u => 
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Calculate pagination
    const total = filteredUsers.length
    const pages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const users = filteredUsers.slice(startIndex, endIndex)

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages,
      }
    }
  }

  /**
   * Create a new user
   */
  static async createUser(
    currentUser: AuthenticatedUser,
    data: CreateUserData
  ): Promise<User> {
    // Check permissions - only admins can create users
    if (!this.canCreateUsers(currentUser)) {
      throw new AuthorizationError('Cannot create users')
    }

    // Validate required fields
    if (!data.username || !data.email || !data.password || !data.customRole) {
      throw new ValidationError('Username, email, password, and role are required')
    }

    // For demo purposes, return a mock user
    // In production, this would create the user in the database using Prisma
    const newUser: User = {
      id: `user-${Date.now()}`,
      username: data.username,
      email: data.email,
      customRole: data.customRole,
      phone: data.phone,
      address: data.address,
      isPlayGame: data.isPlayGame,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return newUser
  }

  /**
   * Check if user can view users
   */
  private static canViewUsers(user: AuthenticatedUser): boolean {
    return ['ADMIN', 'TEACHER'].includes(user.customRole)
  }

  /**
   * Check if user can create users
   */
  private static canCreateUsers(user: AuthenticatedUser): boolean {
    return user.customRole === 'ADMIN'
  }
} 