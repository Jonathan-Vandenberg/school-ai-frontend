import { PrismaClient } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
import { withTransaction } from '../db'

const prisma = new PrismaClient()

export interface CreateAssignmentData {
  topic: string
  type: 'CLASS' | 'INDIVIDUAL'
  color?: string
  vocabularyItems?: any[]
  scheduledPublishAt?: Date
  videoUrl?: string
  videoTranscript?: string
  languageAssessmentType?: 'SCRIPTED_US' | 'SCRIPTED_UK' | 'UNSCRIPTED_US' | 'UNSCRIPTED_UK' | 'PRONUNCIATION_US' | 'PRONUNCIATION_UK'
  isIELTS?: boolean
  context?: string
  languageId: string
  classIds?: string[] // For class assignments
  studentIds?: string[] // For individual assignments
  evaluationSettings?: {
    type: 'CUSTOM' | 'IMAGE' | 'VIDEO' | 'Q_AND_A' | 'READING' | 'PRONUNCIATION'
    customPrompt?: string
    rules?: any
    acceptableResponses?: any
    feedbackSettings?: any
  }
}

export interface UpdateAssignmentData {
  topic?: string
  color?: string
  vocabularyItems?: any[]
  scheduledPublishAt?: Date | null
  isActive?: boolean
  videoUrl?: string
  videoTranscript?: string
  languageAssessmentType?: 'SCRIPTED_US' | 'SCRIPTED_UK' | 'UNSCRIPTED_US' | 'UNSCRIPTED_UK' | 'PRONUNCIATION_US' | 'PRONUNCIATION_UK'
  isIELTS?: boolean
  context?: string
  languageId?: string
}

export interface AssignmentWithDetails {
  id: string
  topic: string | null
  type: 'CLASS' | 'INDIVIDUAL' | null
  color: string | null
  vocabularyItems: any
  scheduledPublishAt: Date | null
  isActive: boolean | null
  videoUrl: string | null
  videoTranscript: string | null
  languageAssessmentType: string | null
  isIELTS: boolean | null
  context: string | null
  totalStudentsInScope: number | null
  completedStudentsCount: number | null
  completionRate: number | null
  averageScoreOfCompleted: number | null
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  teacher: {
    id: string
    username: string
  } | null
  language: {
    id: string
    language: string
    code: string
  } | null
  evaluationSettings: {
    id: string
    type: string
    customPrompt: string | null
    rules: any
    acceptableResponses: any
    feedbackSettings: any
  } | null
  questions: Array<{
    id: string
    textQuestion: string | null
    textAnswer: string | null
    image: string | null
    videoUrl: string | null
  }>
  classes: Array<{
    class: {
      id: string
      name: string
    }
  }>
  students: Array<{
    user: {
      id: string
      username: string
    }
  }>
  _count?: {
    progresses: number
    questions: number
  }
}

export interface AssignmentListParams {
  page?: number
  limit?: number
  type?: 'CLASS' | 'INDIVIDUAL'
  isActive?: boolean
  teacherId?: string
  classId?: string
  studentId?: string
  search?: string
  languageId?: string
  isScheduled?: boolean
}

export interface StudentProgress {
  id: string
  isComplete: boolean
  isCorrect: boolean
  languageConfidenceResponse: any
  grammarCorrected: any
  createdAt: Date
  student: {
    id: string
    username: string
  }
  question: {
    id: string
    textQuestion: string | null
  } | null
}

/**
 * Assignments Service
 * Handles all assignment-related database operations with authentication
 */
export class AssignmentsService {
  /**
   * Create a new assignment
   * Only teachers and admins can create assignments
   */
  static async createAssignment(
    currentUser: AuthenticatedUser,
    assignmentData: CreateAssignmentData
  ): Promise<AssignmentWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const { classIds, studentIds, evaluationSettings, ...assignmentFields } = assignmentData

    // Validate language exists
    const language = await prisma.language.findUnique({
      where: { id: assignmentData.languageId }
    })

    if (!language) {
      throw new ValidationError('Language not found')
    }

    // Validate class assignments are for classes where user is teacher (unless admin)
    if (classIds && classIds.length > 0 && currentUser.customRole === 'TEACHER') {
      // For now, allow teachers to assign to any class
      // You could add more restrictive logic here if needed
    }

    return withTransaction(async (tx) => {
      // Create the assignment
      const assignment = await tx.assignment.create({
        data: {
          ...assignmentFields,
          teacherId: currentUser.id,
          isActive: assignmentData.scheduledPublishAt ? false : true,
          publishedAt: new Date(),
          evaluationSettings: evaluationSettings ? {
            create: {
              ...evaluationSettings,
              feedbackSettings: evaluationSettings.feedbackSettings || {},
            }
          } : undefined,
        },
        include: {
          teacher: {
            select: { id: true, username: true }
          },
          language: {
            select: { id: true, language: true, code: true }
          },
          evaluationSettings: true,
          questions: {
            select: {
              id: true,
              textQuestion: true,
              textAnswer: true,
              image: true,
              videoUrl: true,
            }
          },
          classes: {
            include: {
              class: {
                select: { id: true, name: true }
              }
            }
          },
          students: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            }
          },
        }
      })

      // Assign to classes if specified
      if (classIds && classIds.length > 0) {
        await tx.classAssignment.createMany({
          data: classIds.map(classId => ({
            classId,
            assignmentId: assignment.id,
          }))
        })
      }

      // Assign to individual students if specified
      if (studentIds && studentIds.length > 0) {
        await tx.userAssignment.createMany({
          data: studentIds.map(userId => ({
            userId,
            assignmentId: assignment.id,
          }))
        })
      }

      // Log the activity
      await tx.activityLog.create({
        data: {
          type: assignmentData.type === 'CLASS' ? 'ASSIGNMENT_CREATED' : 'INDIVIDUAL_ASSIGNMENT_CREATED',
          userId: currentUser.id,
          assignmentId: assignment.id,
          publishedAt: new Date(),
        },
      })

      return assignment as AssignmentWithDetails
    })
  }

  /**
   * Get assignment by ID
   * Students can only access assignments they're enrolled in
   */
  static async getAssignmentById(
    currentUser: AuthenticatedUser,
    assignmentId: string
  ): Promise<AssignmentWithDetails> {
    // Check access permissions
    const hasAccess = await AuthService.canAccessAssignment(currentUser, assignmentId)
    if (!hasAccess) {
      throw new ForbiddenError('Cannot access this assignment')
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        teacher: {
          select: { id: true, username: true }
        },
        language: {
          select: { id: true, language: true, code: true }
        },
        evaluationSettings: true,
        questions: {
          select: {
            id: true,
            textQuestion: true,
            textAnswer: true,
            image: true,
            videoUrl: true,
          }
        },
        classes: {
          include: {
            class: {
              select: { id: true, name: true }
            }
          }
        },
        students: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        _count: {
          select: {
            progresses: true,
            questions: true,
          }
        }
      }
    })

    if (!assignment) {
      throw new NotFoundError('Assignment not found')
    }

    return assignment as AssignmentWithDetails
  }

  /**
   * Update assignment
   * Only the teacher who created it or admins can update
   */
  static async updateAssignment(
    currentUser: AuthenticatedUser,
    assignmentId: string,
    updateData: UpdateAssignmentData
  ): Promise<AssignmentWithDetails> {
    const canManage = await AuthService.canManageAssignment(currentUser, assignmentId)
    if (!canManage) {
      throw new ForbiddenError('Cannot modify this assignment')
    }

    // Validate language if changing
    if (updateData.languageId) {
      const language = await prisma.language.findUnique({
        where: { id: updateData.languageId }
      })

      if (!language) {
        throw new ValidationError('Language not found')
      }
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        teacher: {
          select: { id: true, username: true }
        },
        language: {
          select: { id: true, language: true, code: true }
        },
        evaluationSettings: true,
        questions: {
          select: {
            id: true,
            textQuestion: true,
            textAnswer: true,
            image: true,
            videoUrl: true,
          }
        },
        classes: {
          include: {
            class: {
              select: { id: true, name: true }
            }
          }
        },
        students: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        _count: {
          select: {
            progresses: true,
            questions: true,
          }
        }
      }
    })

    return updatedAssignment as AssignmentWithDetails
  }

  /**
   * Delete assignment
   * Only the teacher who created it or admins can delete
   */
  static async deleteAssignment(
    currentUser: AuthenticatedUser,
    assignmentId: string
  ): Promise<void> {
    const canManage = await AuthService.canManageAssignment(currentUser, assignmentId)
    if (!canManage) {
      throw new ForbiddenError('Cannot delete this assignment')
    }

    await withTransaction(async (tx) => {
      // Foreign key constraints will handle cascading deletes
      await tx.assignment.delete({
        where: { id: assignmentId }
      })
    })
  }

  /**
   * List assignments with filtering and pagination
   */
  static async listAssignments(
    currentUser: AuthenticatedUser,
    params: AssignmentListParams = {}
  ): Promise<{
    assignments: AssignmentWithDetails[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      isActive,
      teacherId,
      classId,
      studentId,
      search,
      languageId,
      isScheduled
    } = params

    const skip = (page - 1) * limit

    // Build where clause based on user role
    const where: any = {}

    // Role-based filtering
    if (currentUser.customRole === 'TEACHER') {
      where.teacherId = currentUser.id
    } else if (currentUser.customRole === 'STUDENT') {
      where.OR = [
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
      where.isActive = true // Students only see active assignments
    }

    // Additional filters
    if (type) {
      where.type = type
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (teacherId) {
      where.teacherId = teacherId
    }

    if (classId) {
      where.classes = {
        some: { classId }
      }
    }

    if (studentId) {
      where.students = {
        some: { userId: studentId }
      }
    }

    if (search) {
      where.topic = {
        contains: search,
        mode: 'insensitive'
      }
    }

    if (languageId) {
      where.languageId = languageId
    }

    if (isScheduled !== undefined) {
      if (isScheduled) {
        where.scheduledPublishAt = { not: null }
        where.isActive = false
      } else {
        where.OR = [
          { scheduledPublishAt: null },
          { isActive: true }
        ]
      }
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacher: {
            select: { id: true, username: true }
          },
          language: {
            select: { id: true, language: true, code: true }
          },
          evaluationSettings: true,
          questions: {
            select: {
              id: true,
              textQuestion: true,
              textAnswer: true,
              image: true,
              videoUrl: true,
            }
          },
          classes: {
            include: {
              class: {
                select: { id: true, name: true }
              }
            }
          },
          students: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            }
          },
          _count: {
            select: {
              progresses: true,
              questions: true,
            }
          }
        },
        orderBy: [
          { scheduledPublishAt: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.assignment.count({ where })
    ])

    return {
      assignments: assignments as AssignmentWithDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get assignment progress for a specific student
   */
  static async getAssignmentProgress(
    currentUser: AuthenticatedUser,
    assignmentId: string,
    studentId?: string
  ): Promise<StudentProgress[]> {
    const targetStudentId = studentId || currentUser.id

    // Check permissions
    if (currentUser.customRole === 'STUDENT' && targetStudentId !== currentUser.id) {
      throw new ForbiddenError('Can only view your own progress')
    }

    const hasAccess = await AuthService.canAccessAssignment(currentUser, assignmentId)
    if (!hasAccess) {
      throw new ForbiddenError('Cannot access this assignment')
    }

    const progresses = await prisma.studentAssignmentProgress.findMany({
      where: {
        assignmentId,
        studentId: targetStudentId,
      },
      include: {
        student: {
          select: { id: true, username: true }
        },
        question: {
          select: { id: true, textQuestion: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return progresses as StudentProgress[]
  }

  /**
   * Submit assignment progress
   * Students can submit their own progress
   */
  static async submitProgress(
    currentUser: AuthenticatedUser,
    assignmentId: string,
    questionId: string,
    data: {
      isComplete: boolean
      isCorrect?: boolean
      languageConfidenceResponse?: any
      grammarCorrected?: any
    }
  ): Promise<StudentProgress> {
    // Students can only submit their own progress
    if (currentUser.customRole === 'STUDENT') {
      const hasAccess = await AuthService.canAccessAssignment(currentUser, assignmentId)
      if (!hasAccess) {
        throw new ForbiddenError('Cannot access this assignment')
      }
    }

    // Verify question belongs to assignment
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        assignmentId,
      }
    })

    if (!question) {
      throw new NotFoundError('Question not found in this assignment')
    }

    return withTransaction(async (tx) => {
      // First, try to find existing progress
      const existingProgress = await tx.studentAssignmentProgress.findFirst({
        where: {
          studentId: currentUser.id,
          assignmentId,
          questionId,
        }
      })

      let progress
      if (existingProgress) {
        // Update existing progress
        progress = await tx.studentAssignmentProgress.update({
          where: { id: existingProgress.id },
          data: {
            ...data,
            publishedAt: new Date(),
          },
          include: {
            student: {
              select: { id: true, username: true }
            },
            question: {
              select: { id: true, textQuestion: true }
            }
          }
        })
      } else {
        // Create new progress
        progress = await tx.studentAssignmentProgress.create({
          data: {
            studentId: currentUser.id,
            assignmentId,
            questionId,
            ...data,
            publishedAt: new Date(),
          },
          include: {
            student: {
              select: { id: true, username: true }
            },
            question: {
              select: { id: true, textQuestion: true }
            }
          }
        })
      }

      return progress as StudentProgress
    })
  }

  /**
   * Get assignments for current user (dashboard)
   */
  static async getMyAssignments(
    currentUser: AuthenticatedUser,
    params: { status?: 'active' | 'completed' | 'scheduled' } = {}
  ): Promise<AssignmentWithDetails[]> {
    const { status = 'active' } = params

    let where: any = {}

    if (currentUser.customRole === 'TEACHER') {
      where.teacherId = currentUser.id
    } else if (currentUser.customRole === 'STUDENT') {
      where.OR = [
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

    // Status-based filtering
    if (status === 'active') {
      where.isActive = true
    } else if (status === 'scheduled') {
      where.isActive = false
      where.scheduledPublishAt = { not: null }
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, username: true }
        },
        language: {
          select: { id: true, language: true, code: true }
        },
        evaluationSettings: true,
        questions: {
          select: {
            id: true,
            textQuestion: true,
            textAnswer: true,
            image: true,
            videoUrl: true,
          }
        },
        classes: {
          include: {
            class: {
              select: { id: true, name: true }
            }
          }
        },
        students: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        _count: {
          select: {
            progresses: true,
            questions: true,
          }
        }
      },
      orderBy: [
        { scheduledPublishAt: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return assignments as AssignmentWithDetails[]
  }
} 