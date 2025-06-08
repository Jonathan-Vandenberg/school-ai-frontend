import { PrismaClient, Prisma } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
import { withTransaction } from '../db'

const prisma = new PrismaClient()

export interface CreateQuestionData {
  assignmentId: string
  textQuestion?: string
  textAnswer?: string
  image?: string
  videoUrl?: string
}

export interface UpdateQuestionData {
  textQuestion?: string
  textAnswer?: string
  image?: string
  videoUrl?: string
}

export interface QuestionWithDetails {
  id: string
  textQuestion: string | null
  textAnswer: string | null
  image: string | null
  videoUrl: string | null
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  assignment: {
    id: string
    topic: string | null
    teacher: {
      id: string
      username: string
    } | null
  }
  progresses?: Array<{
    id: string
    isComplete: boolean
    isCorrect: boolean
    student: {
      id: string
      username: string
    }
  }>
}

export interface QuestionListParams {
  page?: number
  limit?: number
  assignmentId?: string
  hasProgress?: boolean
}

/**
 * Questions Service
 * Handles all question-related database operations with authentication
 */
export class QuestionsService {
  /**
   * Create a new question
   * Only teachers who own the assignment or admins can create questions
   */
  static async createQuestion(
    currentUser: AuthenticatedUser,
    questionData: CreateQuestionData
  ): Promise<QuestionWithDetails> {
    // Check if user can manage the assignment
    const canManage = await AuthService.canManageAssignment(currentUser, questionData.assignmentId)
    if (!canManage) {
      throw new ForbiddenError('Cannot add questions to this assignment')
    }

    // Verify assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: questionData.assignmentId },
      select: { id: true }
    })

    if (!assignment) {
      throw new NotFoundError('Assignment not found')
    }

    // Validate that at least one question field is provided
    if (!questionData.textQuestion && !questionData.image && !questionData.videoUrl) {
      throw new ValidationError('At least one question field must be provided')
    }

    const question = await prisma.question.create({
      data: {
        ...questionData,
        publishedAt: new Date(),
      },
      include: {
        assignment: {
          select: {
            id: true,
            topic: true,
            teacher: {
              select: { id: true, username: true }
            }
          }
        }
      }
    })

    return question as QuestionWithDetails
  }

  /**
   * Get question by ID
   * Users can only access questions from assignments they have access to
   */
  static async getQuestionById(
    currentUser: AuthenticatedUser,
    questionId: string,
    includeProgress: boolean = false
  ): Promise<QuestionWithDetails> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        assignment: {
          select: {
            id: true,
            topic: true,
            teacher: {
              select: { id: true, username: true }
            }
          }
        },
        progresses: includeProgress ? {
          include: {
            student: {
              select: { id: true, username: true }
            }
          }
        } : undefined
      }
    })

    if (!question) {
      throw new NotFoundError('Question not found')
    }

    // Check if user can access the assignment this question belongs to
    const hasAccess = await AuthService.canAccessAssignment(currentUser, question.assignment.id)
    if (!hasAccess) {
      throw new ForbiddenError('Cannot access this question')
    }

    return question as QuestionWithDetails
  }

  /**
   * Update question
   * Only teachers who own the assignment or admins can update questions
   */
  static async updateQuestion(
    currentUser: AuthenticatedUser,
    questionId: string,
    updateData: UpdateQuestionData
  ): Promise<QuestionWithDetails> {
    // Get question with assignment info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        assignment: {
          select: { id: true }
        }
      }
    })

    if (!question) {
      throw new NotFoundError('Question not found')
    }

    // Check if user can manage the assignment
    const canManage = await AuthService.canManageAssignment(currentUser, question.assignment.id)
    if (!canManage) {
      throw new ForbiddenError('Cannot modify this question')
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
      include: {
        assignment: {
          select: {
            id: true,
            topic: true,
            teacher: {
              select: { id: true, username: true }
            }
          }
        }
      }
    })

    return updatedQuestion as QuestionWithDetails
  }

  /**
   * Delete question
   * Only teachers who own the assignment or admins can delete questions
   */
  static async deleteQuestion(
    currentUser: AuthenticatedUser,
    questionId: string
  ): Promise<void> {
    // Get question with assignment info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        assignment: {
          select: { id: true }
        }
      }
    })

    if (!question) {
      throw new NotFoundError('Question not found')
    }

    // Check if user can manage the assignment
    const canManage = await AuthService.canManageAssignment(currentUser, question.assignment.id)
    if (!canManage) {
      throw new ForbiddenError('Cannot delete this question')
    }

    await withTransaction(async (tx) => {
      // Foreign key constraints will handle cascading deletes for progress records
      await tx.question.delete({
        where: { id: questionId }
      })
    })
  }

  /**
   * List questions with filtering and pagination
   */
  static async listQuestions(
    currentUser: AuthenticatedUser,
    params: QuestionListParams = {}
  ): Promise<{
    questions: QuestionWithDetails[]
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
      assignmentId,
      hasProgress = false
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // If assignmentId is specified, check access
    if (assignmentId) {
      const hasAccess = await AuthService.canAccessAssignment(currentUser, assignmentId)
      if (!hasAccess) {
        throw new ForbiddenError('Cannot access questions from this assignment')
      }
      where.assignmentId = assignmentId
    } else {
      // Filter based on user role and accessible assignments
      if (currentUser.customRole === 'TEACHER') {
        where.assignment = {
          teacherId: currentUser.id
        }
      } else if (currentUser.customRole === 'STUDENT') {
        where.assignment = {
          OR: [
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
          ],
          isActive: true
        }
      }
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignment: {
            select: {
              id: true,
              topic: true,
              teacher: {
                select: { id: true, username: true }
              }
            }
          },
          progresses: hasProgress ? {
            include: {
              student: {
                select: { id: true, username: true }
              }
            }
          } : undefined
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.question.count({ where })
    ])

    return {
      questions: questions as QuestionWithDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get questions for a specific assignment
   * Users can only get questions from assignments they have access to
   */
  static async getAssignmentQuestions(
    currentUser: AuthenticatedUser,
    assignmentId: string
  ): Promise<QuestionWithDetails[]> {
    // Check if user can access the assignment
    const hasAccess = await AuthService.canAccessAssignment(currentUser, assignmentId)
    if (!hasAccess) {
      throw new ForbiddenError('Cannot access questions from this assignment')
    }

    const questions = await prisma.question.findMany({
      where: { assignmentId },
      include: {
        assignment: {
          select: {
            id: true,
            topic: true,
            teacher: {
              select: { id: true, username: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return questions as QuestionWithDetails[]
  }

  /**
   * Bulk create questions for an assignment
   * Only teachers who own the assignment or admins can create questions
   */
  static async createMultipleQuestions(
    currentUser: AuthenticatedUser,
    assignmentId: string,
    questionsData: Omit<CreateQuestionData, 'assignmentId'>[]
  ): Promise<QuestionWithDetails[]> {
    // Check if user can manage the assignment
    const canManage = await AuthService.canManageAssignment(currentUser, assignmentId)
    if (!canManage) {
      throw new ForbiddenError('Cannot add questions to this assignment')
    }

    // Verify assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true }
    })

    if (!assignment) {
      throw new NotFoundError('Assignment not found')
    }

    // Validate questions
    for (const questionData of questionsData) {
      if (!questionData.textQuestion && !questionData.image && !questionData.videoUrl) {
        throw new ValidationError('Each question must have at least one question field')
      }
    }

    return withTransaction(async (tx) => {
      const createdQuestions = []

      for (const questionData of questionsData) {
        const question = await tx.question.create({
          data: {
            ...questionData,
            assignmentId,
            publishedAt: new Date(),
          },
          include: {
            assignment: {
              select: {
                id: true,
                topic: true,
                teacher: {
                  select: { id: true, username: true }
                }
              }
            }
          }
        })

        createdQuestions.push(question)
      }

      return createdQuestions as QuestionWithDetails[]
    })
  }

  /**
   * Get question statistics for teachers
   * Only teachers who own the assignment or admins can view stats
   */
  static async getQuestionStats(
    currentUser: AuthenticatedUser,
    questionId: string
  ): Promise<{
    totalAttempts: number
    completedAttempts: number
    correctAttempts: number
    completionRate: number
    accuracyRate: number
    studentBreakdown: Array<{
      student: { id: string; username: string }
      isComplete: boolean
      isCorrect: boolean
      attemptDate: Date
    }>
  }> {
    // Get question with assignment info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        assignment: {
          select: { id: true }
        }
      }
    })

    if (!question) {
      throw new NotFoundError('Question not found')
    }

    // Check if user can manage the assignment
    const canManage = await AuthService.canManageAssignment(currentUser, question.assignment.id)
    if (!canManage) {
      throw new ForbiddenError('Cannot view statistics for this question')
    }

    // Get all progress records for this question
    const progresses = await prisma.studentAssignmentProgress.findMany({
      where: { questionId },
      include: {
        student: {
          select: { id: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const totalAttempts = progresses.length
    const completedAttempts = progresses.filter((p: any) => p.isComplete).length
    const correctAttempts = progresses.filter((p: any) => p.isCorrect).length

    return {
      totalAttempts,
      completedAttempts,
      correctAttempts,
      completionRate: totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
      accuracyRate: completedAttempts > 0 ? (correctAttempts / completedAttempts) * 100 : 0,
      studentBreakdown: progresses.map((p: any) => ({
        student: p.student,
        isComplete: p.isComplete,
        isCorrect: p.isCorrect,
        attemptDate: p.createdAt
      }))
    }
  }

  /**
   * Creates multiple questions for a given assignment within a transaction.
   * @param questions - The question data to create.
   * @param assignmentId - The ID of the assignment to associate the questions with.
   * @param tx - The Prisma transaction client.
   */
  public async createManyForAssignment(
    questions: { textQuestion: string; textAnswer: string }[],
    assignmentId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    if (!questions || questions.length === 0) {
      return;
    }

    const questionsData = questions.map((q) => ({
      ...q,
      assignmentId: assignmentId,
    }));

    await tx.question.createMany({
      data: questionsData,
    });
  }
} 