import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export interface AuthenticatedUser {
  id: string
  username?: string
  email: string
  customRole: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'
}

// Local error classes to avoid circular imports
class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class AuthService {
  /**
   * Get the currently authenticated user
   * Throws AuthenticationError if not authenticated
   */
  static async getAuthenticatedUser(): Promise<AuthenticatedUser> {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.email) {
        throw new AuthenticationError('No valid session found')
      }

      return {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        customRole: session.user.role,
      }
    } catch (error) {
      throw new AuthenticationError('No valid session found')
    }
  }

  /**
   * Check if user has required role
   */
  static hasRole(user: AuthenticatedUser, requiredRoles: string[]): boolean {
    return requiredRoles.includes(user.customRole)
  }

  /**
   * Require specific roles
   * Throws AuthorizationError if user doesn't have required role
   */
  static requireRole(user: AuthenticatedUser, requiredRoles: string[]): void {
    if (!this.hasRole(user, requiredRoles)) {
      throw new AuthorizationError(`Required role: ${requiredRoles.join(' or ')}`)
    }
  }

  /**
   * Check if user is admin
   */
  static isAdmin(user: AuthenticatedUser): boolean {
    return user.customRole === 'ADMIN'
  }

  /**
   * Check if user is teacher or admin
   */
  static isTeacherOrAdmin(user: AuthenticatedUser): boolean {
    return user.customRole === 'TEACHER' || user.customRole === 'ADMIN'
  }
} 