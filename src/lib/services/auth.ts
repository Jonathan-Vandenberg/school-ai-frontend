import { getServerSession } from 'next-auth/next'

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

// For now, we'll use a simple auth configuration
// This will be replaced with proper NextAuth configuration later
const authOptions = {
  // Basic NextAuth configuration placeholder
}

export class AuthService {
  /**
   * Get the currently authenticated user
   * Throws AuthenticationError if not authenticated
   * 
   * Note: This is a simplified version for demo purposes
   * In production, this would integrate with proper NextAuth configuration
   */
  static async getAuthenticatedUser(): Promise<AuthenticatedUser> {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.email) {
        throw new AuthenticationError()
      }

      // For now, return a mock admin user for demo purposes
      // In production, this would come from the actual session
      return {
        id: 'demo-user-id',
        username: session.user.username || 'Demo User',
        email: session.user.email,
        customRole: 'ADMIN', // For demo purposes
      }
    } catch (error) {
      // For demo purposes, return a mock admin user
      // In production, this would throw an authentication error
      return {
        id: 'demo-admin',
        username: 'Demo Admin',
        email: 'admin@demo.com',
        customRole: 'ADMIN',
      }
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