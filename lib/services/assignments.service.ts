import { PrismaClient, Prisma, User, Assignment, StudentAssignmentProgress, Question, Class, UserClass } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
import { ActivityLogService } from './activity-log.service'
import { withTransaction } from '../db'
import { handleServiceError } from './auth.service'
import { DefaultArgs } from '@prisma/client/runtime/library'
import { QuestionsService } from './questions.service'
import { StatisticsService } from './statistics.service'
import { prisma } from '../db'

// Type definitions for complex Prisma queries
type AssignmentWithStatisticsData = Prisma.AssignmentGetPayload<{
  include: {
    questions: { select: { id: true } }
    progresses: {
      where: { isComplete: true }
      select: {
        studentId: true
        isCorrect: true
        questionId: true
      }
    }
    classes: {
      include: {
        class: {
          include: {
            users: { select: { userId: true } }
          }
        }
      }
    }
    students: { select: { userId: true } }
  }
}>

type ClassWithAssignments = Prisma.AssignmentGetPayload<{
  include: {
    questions: { select: { id: true } }
    progresses: {
      select: {
        studentId: true
        isCorrect: true
        questionId: true
        assignmentId: true
      }
    }
  }
}>

export interface CreateAssignmentData {
  topic: string
  type: 'CLASS' | 'INDIVIDUAL'
  color?: string
  vocabularyItems?: any[]
  scheduledPublishAt?: Date
  dueDate?: Date
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
  dueDate?: Date | null
  isActive?: boolean
  videoUrl?: string
  videoTranscript?: string
  languageAssessmentType?: 'SCRIPTED_US' | 'SCRIPTED_UK' | 'UNSCRIPTED_US' | 'UNSCRIPTED_UK' | 'PRONUNCIATION_US' | 'PRONUNCIATION_UK'
  isIELTS?: boolean
  context?: string
  languageId?: string
  type?: 'CLASS' | 'INDIVIDUAL'
  classIds?: string[]
  studentIds?: string[]
  questions?: Array<{ id?: string; textQuestion: string; textAnswer: string }>
}

export interface AssignmentWithDetails {
  id: string
  topic: string | null
  type: 'CLASS' | 'INDIVIDUAL' | null
  color: string | null
  vocabularyItems: any
  scheduledPublishAt: Date | null
  dueDate: Date | null
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
  progresses?: Array<{
    id: string
    isComplete: boolean
    isCorrect: boolean
    createdAt: Date
    updatedAt: Date
    publishedAt: Date | null
    assignmentId: string
    languageConfidenceResponse: any
    grammarCorrected: any
    studentId: string
    questionId: string | null
    question: {
      id: string
    } | null
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
 * Handles all assignment-related database operations with authentication and activity logging
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

      // Log the activity using the comprehensive ActivityLogService
      await ActivityLogService.logAssignmentCreated(
        currentUser,
        {
          id: assignment.id,
          topic: assignment.topic || 'Untitled Assignment'
        },
        assignmentData.type,
        {
          createdBy: currentUser.customRole,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username,
          language: language.language,
          languageCode: language.code,
          classCount: classIds?.length || 0,
          studentCount: studentIds?.length || 0,
          isScheduled: !!assignmentData.scheduledPublishAt,
          scheduledDate: assignmentData.scheduledPublishAt?.toISOString(),
          assignmentType: assignmentData.type,
          evaluationType: evaluationSettings?.type
        },
        tx
      )

      // Initialize assignment statistics
      await AssignmentsService.initializeAssignmentStatistics(assignment.id)

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
    updateData: UpdateAssignmentData,
    questions: Array<{ id?: string; textQuestion: string; textAnswer: string }>
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

    // Extract questions and assignment data from updateData since they're not part of assignment schema
    const { questions: _, classIds, studentIds, ...assignmentUpdateData } = updateData

    return withTransaction(async (tx) => {
      // Update assignment basic data
      await tx.assignment.update({
        where: { id: assignmentId },
        data: assignmentUpdateData,
      })

      // Handle class/student reassignment if provided
      if (classIds !== undefined || studentIds !== undefined) {
        // Clear existing assignments
        await tx.classAssignment.deleteMany({
          where: { assignmentId }
        })
        await tx.userAssignment.deleteMany({
          where: { assignmentId }
        })

        // Add new class assignments
        if (classIds && classIds.length > 0) {
          await tx.classAssignment.createMany({
            data: classIds.map(classId => ({
              classId,
              assignmentId,
            }))
          })
        }

        // Add new individual student assignments
        if (studentIds && studentIds.length > 0) {
          await tx.userAssignment.createMany({
            data: studentIds.map(userId => ({
              userId,
              assignmentId,
            }))
          })
        }
      }

      // Handle questions if provided
      if (questions.length > 0) {
        // Get current questions
        const currentQuestions = await tx.question.findMany({
          where: { assignmentId },
          select: { id: true }
        })

        const currentQuestionIds = currentQuestions.map(q => q.id)
        const updatedQuestionIds = questions.filter(q => q.id).map(q => q.id!)

        // Delete questions that are no longer in the list
        const questionsToDelete = currentQuestionIds.filter(id => !updatedQuestionIds.includes(id))
        if (questionsToDelete.length > 0) {
          await tx.question.deleteMany({
            where: {
              id: { in: questionsToDelete },
              assignmentId
            }
          })
        }

        // Update or create questions
        for (const question of questions) {
          if (question.id) {
            // Update existing question
            await tx.question.update({
              where: { id: question.id },
              data: {
                textQuestion: question.textQuestion,
                textAnswer: question.textAnswer
              }
            })
          } else {
            // Create new question
            await tx.question.create({
              data: {
                assignmentId,
                textQuestion: question.textQuestion,
                textAnswer: question.textAnswer
              }
            })
          }
        }
      }

      // Return updated assignment with all relations
      const updatedAssignment = await tx.assignment.findUnique({
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

      if (!updatedAssignment) {
        throw new NotFoundError('Assignment not found')
      }

      return updatedAssignment as AssignmentWithDetails
    })
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

    const where: any = {}

    if (currentUser.customRole === 'TEACHER') {
      if (!classId) {
        where.teacherId = currentUser.id
      }
    } else if (currentUser.customRole === 'ADMIN') {
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
      where.isActive = true
    }

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
   * Get assignments for current user
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
        // Include student progress for students
        ...(currentUser.customRole === 'STUDENT' && {
          progresses: {
            where: { studentId: currentUser.id },
            include: {
              question: {
                select: { id: true }
              }
            }
          }
        }),
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

    return assignments as any
  }

  /**
   * Creates a new video assignment with comprehensive features
   * @param currentUser - The authenticated user performing the action
   * @param data - The data for the new video assignment
   * @returns The newly created assignment with full details
   */
  static async createVideoAssignment(
    currentUser: AuthenticatedUser,
    data: CreateVideoAssignmentDto
  ): Promise<AssignmentWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const {
      topic,
      videoUrl,
      videoTranscript,
      hasTranscript,
      languageId,
      questions,
      classIds,
      studentIds,
      assignToEntireClass,
      scheduledPublishAt,
      dueDate,
      color,
      rules,
      feedbackSettings,
      evaluationSettings,
      totalStudentsInScope,
      analysisResult,
    } = data;

    // Validate language exists
    const language = await prisma.language.findUnique({
      where: { id: languageId }
    })

    if (!language) {
      throw new ValidationError('Language not found')
    }

    return withTransaction(async (tx) => {
      // Calculate initial stats
      const initialTotalStudentsInScope = totalStudentsInScope || 0;
      const publishDate = new Date();
      const isActive = !scheduledPublishAt;

      // Create comprehensive evaluation settings
      const evaluationData = {
        type: 'VIDEO' as const,
        customPrompt: evaluationSettings?.customPrompt || '',
        rules: rules || evaluationSettings?.rules || [],
        acceptableResponses: analysisResult ? [JSON.stringify(analysisResult)] : (evaluationSettings?.acceptableResponses || []),
        feedbackSettings: feedbackSettings || evaluationSettings?.feedbackSettings || {
          detailedFeedback: true,
          encouragementEnabled: true
        }
      };

      // 1. Create the main Assignment record
      const newAssignment = await tx.assignment.create({
        data: {
          topic,
          videoUrl,
          videoTranscript: videoTranscript || '',
          languageId,
          teacherId: currentUser.id,
          type: assignToEntireClass ? 'CLASS' : 'INDIVIDUAL',
          color: color || '#3B82F6',
          isActive,
          publishedAt: publishDate,
          scheduledPublishAt,
          dueDate,
          totalStudentsInScope: initialTotalStudentsInScope,
          completedStudentsCount: 0,
          completionRate: 0.0,
          averageScoreOfCompleted: 0.0,
          evaluationSettings: {
            create: evaluationData
          }
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
      });

      // 2. Create the associated questions
      if (questions && questions.length > 0) {
        await tx.question.createMany({
          data: questions.map(q => ({
            textQuestion: q.question,
            textAnswer: q.answer,
            assignmentId: newAssignment.id,
            videoUrl: videoUrl,
            publishedAt: publishDate
          }))
        });
      }

      // 3. Link assignment to classes or students
      if (assignToEntireClass && classIds && classIds.length > 0) {
        await tx.classAssignment.createMany({
          data: classIds.map((classId) => ({
            classId,
            assignmentId: newAssignment.id,
          })),
        });
      } else if (!assignToEntireClass && studentIds && studentIds.length > 0) {
        await tx.userAssignment.createMany({
          data: studentIds.map((userId) => ({
            userId,
            assignmentId: newAssignment.id,
          })),
        });
      }

      // 4. Log the activity using the comprehensive ActivityLogService
      await ActivityLogService.logAssignmentCreated(
        currentUser,
        {
          id: newAssignment.id,
          topic: newAssignment.topic || 'Untitled Assignment'
        },
        assignToEntireClass ? 'CLASS' : 'INDIVIDUAL',
        {
          createdBy: currentUser.customRole,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username,
          language: language.language,
          languageCode: language.code,
          classCount: classIds?.length || 0,
          studentCount: studentIds?.length || 0,
          isScheduled: !!scheduledPublishAt,
          scheduledDate: scheduledPublishAt?.toISOString(),
          assignmentType: assignToEntireClass ? 'CLASS' : 'INDIVIDUAL',
          evaluationType: 'VIDEO',
          hasTranscript: hasTranscript || false,
          questionCount: questions?.length || 0
        },
        tx
      );
      
      // Refetch the assignment with all relations to match AssignmentWithDetails interface
      const completeAssignment = await tx.assignment.findUnique({
        where: { id: newAssignment.id },
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
      });

      if (!completeAssignment) {
        throw new Error('Failed to retrieve created assignment');
      }

      // Initialize assignment statistics
      await AssignmentsService.initializeAssignmentStatistics(newAssignment.id)

      return completeAssignment as AssignmentWithDetails;
    });
  }

  /**
   * Submit student progress for a question
   */
  static async submitStudentProgress(
    studentId: string,
    assignmentId: string,
    questionId: string,
    isCorrect: boolean,
    transcript: string
  ) {
    return withTransaction(async (tx) => {
      // Check if student has access to this assignment
      const assignment = await tx.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          classes: {
            include: {
              class: {
                include: {
                  users: {
                    where: { userId: studentId }
                  }
                }
              }
            }
          },
          students: {
            where: { userId: studentId }
          }
        }
      })

      if (!assignment) {
        throw new NotFoundError('Assignment not found')
      }

      // Check if student has access (either through class or individual assignment)
      const hasClassAccess = assignment.classes.some(ac => ac.class.users.length > 0)
      const hasIndividualAccess = assignment.students.length > 0
      
      if (!hasClassAccess && !hasIndividualAccess) {
        throw new ForbiddenError('Access denied')
      }

      // Verify the question belongs to this assignment
      const question = await tx.question.findFirst({
        where: {
          id: questionId,
          assignmentId: assignmentId
        }
      })

      if (!question) {
        throw new NotFoundError('Question not found in this assignment')
      }

      // Check if progress already exists
      const existingProgress = await tx.studentAssignmentProgress.findFirst({
        where: {
          studentId: studentId,
          assignmentId: assignmentId,
          questionId: questionId
        }
      })

      let progress
      if (existingProgress) {
        // Update existing progress
        progress = await tx.studentAssignmentProgress.update({
          where: {
            id: existingProgress.id
          },
          data: {
            isCorrect,
            languageConfidenceResponse: {
              transcript: transcript,
              timestamp: new Date().toISOString()
            },
            isComplete: true,
            updatedAt: new Date()
          }
        })
      } else {
        // Create new progress record
        progress = await tx.studentAssignmentProgress.create({
          data: {
            studentId: studentId,
            assignmentId: assignmentId,
            questionId: questionId,
            isCorrect,
            languageConfidenceResponse: {
              transcript: transcript,
              timestamp: new Date().toISOString()
            },
            isComplete: true
          }
        })
      }

      // Get the student's current progress for this assignment
      const studentProgress = await tx.studentAssignmentProgress.findMany({
        where: {
          studentId: studentId,
          assignmentId: assignmentId,
          isComplete: true
        },
        include: {
          question: true
        }
      })

      // Calculate completion percentage and accuracy
      const totalQuestions = await tx.question.count({
        where: { assignmentId: assignmentId }
      })

      const completedQuestions = studentProgress.length
      const correctAnswers = studentProgress.filter(p => p.isCorrect).length
      
      const completionPercentage = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0
      const accuracy = completedQuestions > 0 ? (correctAnswers / completedQuestions) * 100 : 0

                   // Update statistics incrementally using the new scalable service
      await StatisticsService.updateAssignmentStatistics(assignmentId, studentId, isCorrect, true)
      await StatisticsService.updateStudentStatistics(studentId, assignmentId, isCorrect, true)

      return {
        success: true,
        progress: {
          totalQuestions,
          completedQuestions,
          correctAnswers,
          completionPercentage: Math.round(completionPercentage * 100) / 100,
          accuracy: Math.round(accuracy * 100) / 100,
          isComplete: completedQuestions >= totalQuestions
        }
      }
    })
  }

  /**
   * Get assignment statistics using pre-aggregated data
   */
  static async getAssignmentStatistics(assignmentId: string) {
    return await StatisticsService.getAssignmentStatistics(assignmentId)
  }

  /**
   * Initialize assignment statistics when assignment is created
   */
  static async initializeAssignmentStatistics(assignmentId: string) {
    try {
      // Get assignment details to determine scope
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          classes: {
            include: {
              class: {
                include: {
                  users: { select: { userId: true } }
                }
              }
            }
          },
          students: { select: { userId: true } }
        }
      })

      if (!assignment) {
        console.error(`Assignment ${assignmentId} not found for statistics initialization`)
        return
      }

      // 1. Initialize assignment statistics record
      await StatisticsService.updateAssignmentStatistics(assignmentId, '', false, false)

      // 2. Get all affected students
      const classStudentIds = assignment.classes.flatMap(ac => 
        ac.class.users.map(u => u.userId)
      )
      const individualStudentIds = assignment.students.map(s => s.userId)
      const allStudentIds = [...new Set([...classStudentIds, ...individualStudentIds])]

      // 3. Update each student's assignment count
      for (const studentId of allStudentIds) {
        await StatisticsService.incrementStudentAssignmentCount(studentId)
      }

      // 4. Update class statistics for class assignments
      if (assignment.type === 'CLASS') {
        for (const classAssignment of assignment.classes) {
          await StatisticsService.incrementClassAssignmentCount(classAssignment.classId)
        }
      }

      // 5. Update school-wide statistics
      await StatisticsService.incrementSchoolAssignmentCount(true, !!assignment.scheduledPublishAt)

      console.log(`Initialized statistics for assignment ${assignmentId} (${allStudentIds.length} students affected)`)
    } catch (error) {
      console.error('Error initializing assignment statistics:', error)
      // Don't throw error to avoid breaking assignment creation
    }
  }




}

export interface CreateVideoAssignmentDto {
  topic: string;
  videoUrl: string;
  videoTranscript?: string;
  hasTranscript?: boolean;
  languageId: string;
  questions: { question: string; answer: string }[];
  classIds: string[];
  studentIds?: string[];
  assignToEntireClass: boolean;
  scheduledPublishAt?: Date | null;
  dueDate?: Date | null;
  color?: string;
  rules?: string[];
  feedbackSettings?: {
    detailedFeedback: boolean;
    encouragementEnabled: boolean;
  };
  evaluationSettings?: {
    type: 'VIDEO';
    customPrompt?: string;
    rules?: string[];
    acceptableResponses?: string[];
    feedbackSettings?: {
      detailedFeedback: boolean;
      encouragementEnabled: boolean;
    };
  };
  totalStudentsInScope?: number;
  analysisResult?: any;
} 