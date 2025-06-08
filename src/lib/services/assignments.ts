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

class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

// Interfaces for assignment operations
export interface AssignmentListParams {
  page?: number
  limit?: number
  classId?: string
  assignmentType?: 'CLASS' | 'INDIVIDUAL'
  search?: string
  includeQuestions?: boolean
}

export interface CreateAssignmentData {
  name: string
  description?: string
  assignmentType: 'CLASS' | 'INDIVIDUAL'
  classId?: string
  studentId?: string
  scheduledPublishAt?: Date
  questions?: any[]
  targetLanguages?: string[]
  tools?: string[]
}

export interface Assignment {
  id: string
  name: string
  description?: string
  assignmentType: 'CLASS' | 'INDIVIDUAL'
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  teacherId: string
  classId?: string
  studentId?: string
  scheduledPublishAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PaginationResult {
  page: number
  limit: number
  total: number
  pages: number
}

export interface AssignmentListResult {
  assignments: Assignment[]
  pagination: PaginationResult
}

export class AssignmentsService {
  /**
   * List assignments with filtering and pagination
   */
  static async listAssignments(
    user: AuthenticatedUser,
    params: AssignmentListParams = {}
  ): Promise<AssignmentListResult> {
    // Check permissions
    if (!this.canViewAssignments(user)) {
      throw new AuthorizationError('Cannot view assignments')
    }

    const {
      page = 1,
      limit = 20,
      classId,
      assignmentType,
      search,
      includeQuestions = false
    } = params

    // For demo purposes, return mock data
    // In production, this would query the database using Prisma
    const mockAssignments: Assignment[] = [
      {
        id: '1',
        name: 'Japanese Writing Exercise',
        description: 'Practice hiragana and katakana writing',
        assignmentType: 'CLASS',
        status: 'ACTIVE',
        teacherId: user.id,
        classId: classId || 'class-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Vocabulary Quiz',
        description: 'Basic Japanese vocabulary test',
        assignmentType: 'INDIVIDUAL',
        status: 'DRAFT',
        teacherId: user.id,
        studentId: 'student-1',
        scheduledPublishAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]

    // Apply basic filtering
    let filteredAssignments = mockAssignments
    
    if (assignmentType) {
      filteredAssignments = filteredAssignments.filter(a => a.assignmentType === assignmentType)
    }
    
    if (search) {
      filteredAssignments = filteredAssignments.filter(a => 
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Calculate pagination
    const total = filteredAssignments.length
    const pages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const assignments = filteredAssignments.slice(startIndex, endIndex)

    return {
      assignments,
      pagination: {
        page,
        limit,
        total,
        pages,
      }
    }
  }

  /**
   * Create a new assignment
   */
  static async createAssignment(
    user: AuthenticatedUser,
    data: CreateAssignmentData
  ): Promise<Assignment> {
    // Check permissions
    if (!this.canCreateAssignments(user)) {
      throw new AuthorizationError('Cannot create assignments')
    }

    // Validate required fields
    if (!data.name || !data.assignmentType) {
      throw new ValidationError('Name and assignment type are required')
    }

    // Validate assignment type requirements
    if (data.assignmentType === 'CLASS' && !data.classId) {
      throw new ValidationError('Class ID is required for class assignments')
    }

    if (data.assignmentType === 'INDIVIDUAL' && !data.studentId) {
      throw new ValidationError('Student ID is required for individual assignments')
    }

    // For demo purposes, return a mock assignment
    // In production, this would create the assignment in the database using Prisma
    const newAssignment: Assignment = {
      id: `assignment-${Date.now()}`,
      name: data.name,
      description: data.description,
      assignmentType: data.assignmentType,
      status: data.scheduledPublishAt ? 'DRAFT' : 'ACTIVE',
      teacherId: user.id,
      classId: data.classId,
      studentId: data.studentId,
      scheduledPublishAt: data.scheduledPublishAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return newAssignment
  }

  /**
   * Check if user can view assignments
   */
  private static canViewAssignments(user: AuthenticatedUser): boolean {
    return ['ADMIN', 'TEACHER', 'STUDENT'].includes(user.customRole)
  }

  /**
   * Check if user can create assignments
   */
  private static canCreateAssignments(user: AuthenticatedUser): boolean {
    return ['ADMIN', 'TEACHER'].includes(user.customRole)
  }
} 