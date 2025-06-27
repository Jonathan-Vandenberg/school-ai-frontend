// Common error handling classes
export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_REQUIRED')
  }
}

export class AuthorizationError extends ServiceError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS')
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

// Service exports
export { AuthService } from './auth'  
export { UsersService } from './users'
export { AssignmentsService } from './assignments'
export { QuestionsService } from './questions'
export { AnalyticsService } from './analytics'

// Common utilities
import { NextResponse } from 'next/server'

export function handleServiceError(error: unknown): NextResponse {
  console.error('Service error:', error)

  if (error instanceof ServiceError) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code 
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A record with this information already exists',
          code: 'DUPLICATE_RECORD'
        },
        { status: 409 }
      )
    }
    
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Record not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      )
    }
  }

  // Generic error
  return NextResponse.json(
    { 
      success: false, 
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  )
} 