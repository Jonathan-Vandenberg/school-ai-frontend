import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

const prisma = new PrismaClient()

export interface AuthenticatedUser {
  id: string
  email: string
  username: string
  customRole: 'ADMIN' | 'TEACHER' | 'STUDENT'
  confirmed: boolean
}

export interface ServiceError {
  message: string
  code: string
  statusCode: number
}

export class UnauthorizedError extends Error {
  statusCode = 401
  code = 'UNAUTHORIZED'
  
  constructor(message = 'Unauthorized access') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  code = 'FORBIDDEN'
  
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  code = 'NOT_FOUND'
  
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  statusCode = 400
  code = 'VALIDATION_ERROR'
  
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication Service
 * Handles user authentication and authorization
 */
export class AuthService {
  /**
   * Get authenticated user from session
   */
  static async getAuthenticatedUser(req?: NextRequest): Promise<AuthenticatedUser> {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      throw new UnauthorizedError('No valid session found')
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        username: true,
        customRole: true,
        confirmed: true,
      },
    })

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    if (!user.confirmed) {
      throw new UnauthorizedError('Account not confirmed')
    }

    return user as AuthenticatedUser
  }

  /**
   * Check if user has required role
   */
  static requireRole(user: AuthenticatedUser, requiredRoles: string[]): void {
    if (!requiredRoles.includes(user.customRole)) {
      throw new ForbiddenError(`Required role: ${requiredRoles.join(' or ')}`)
    }
  }

  /**
   * Check if user is admin
   */
  static requireAdmin(user: AuthenticatedUser): void {
    this.requireRole(user, ['ADMIN'])
  }

  /**
   * Check if user is teacher or admin
   */
  static requireTeacherOrAdmin(user: AuthenticatedUser): void {
    this.requireRole(user, ['TEACHER', 'ADMIN'])
  }

  /**
   * Check if user can access resource (admin, teacher, or resource owner)
   */
  static requireOwnershipOrTeacher(user: AuthenticatedUser, resourceUserId: string): void {
    if (user.customRole === 'ADMIN' || user.customRole === 'TEACHER') {
      return // Admins and teachers can access any resource
    }
    
    if (user.id !== resourceUserId) {
      throw new ForbiddenError('Can only access your own resources')
    }
  }

  /**
   * Verify user exists and return basic info
   */
  static async verifyUserExists(userId: string): Promise<{ id: string; customRole: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, customRole: true },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    return user
  }

  /**
   * Check if user can manage assignment
   */
  static async canManageAssignment(user: AuthenticatedUser, assignmentId: string): Promise<boolean> {
    if (user.customRole === 'ADMIN') {
      return true
    }

    if (user.customRole === 'TEACHER') {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { teacherId: true },
      })

      return assignment?.teacherId === user.id
    }

    return false
  }

  /**
   * Check if user can access assignment (student must be enrolled)
   */
  static async canAccessAssignment(user: AuthenticatedUser, assignmentId: string): Promise<boolean> {
    if (user.customRole === 'ADMIN' || user.customRole === 'TEACHER') {
      return true
    }

    // Check if student is enrolled in a class with this assignment
    const enrollment = await prisma.userClass.findFirst({
      where: {
        userId: user.id,
        class: {
          assignments: {
            some: { assignmentId }
          }
        }
      }
    })

    // Or check if student has individual assignment
    const individualAssignment = await prisma.userAssignment.findUnique({
      where: {
        userId_assignmentId: {
          userId: user.id,
          assignmentId
        }
      }
    })

    return !!(enrollment || individualAssignment)
  }
}

/**
 * Utility function to handle service errors in API routes
 */
export function handleServiceError(error: unknown): Response {
  console.error('Service error:', error)

  if (error instanceof UnauthorizedError) {
    return new Response(
      JSON.stringify({ error: error.message, code: error.code }),
      { status: error.statusCode }
    )
  }

  if (error instanceof ForbiddenError) {
    return new Response(
      JSON.stringify({ error: error.message, code: error.code }),
      { status: error.statusCode }
    )
  }

  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({ error: error.message, code: error.code }),
      { status: error.statusCode }
    )
  }

  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: error.message, code: error.code }),
      { status: error.statusCode }
    )
  }

  // Generic server error
  return new Response(
    JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
    { status: 500 }
  )
} 