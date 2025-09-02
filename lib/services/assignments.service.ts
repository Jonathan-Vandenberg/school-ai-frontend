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
  languageId?: string | null
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
  publishedFrom?: Date
  publishedTo?: Date
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

    // Validate language exists (only if languageId is provided)
    let language = null
    if (assignmentData.languageId) {
      language = await prisma.language.findUnique({
        where: { id: assignmentData.languageId }
      })

      if (!language) {
        throw new ValidationError('Language not found')
      }
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
          language: language?.language || 'No language specified',
          languageCode: language?.code || 'none',
          classCount: classIds?.length || 0,
          studentCount: studentIds?.length || 0,
          isScheduled: !!assignmentData.scheduledPublishAt,
          scheduledDate: assignmentData.scheduledPublishAt?.toISOString(),
          assignmentType: assignmentData.type,
          evaluationType: evaluationSettings?.type
        },
        tx
      )

      // Initialize assignment statistics WITHIN the transaction
      await AssignmentsService.initializeAssignmentStatistics(assignment.id, tx)

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
      isScheduled,
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

    const orderBy = isScheduled
      ? [
          { scheduledPublishAt: 'desc' as const },
          { publishedAt: 'desc' as const },
          { createdAt: 'desc' as const }
        ]
      : [
          { publishedAt: 'desc' as const },
          { createdAt: 'desc' as const }
        ]

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
        orderBy
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
   * Get assignments for current user
   */
  static async getMyAssignments(
    currentUser: AuthenticatedUser,
    params: { status?: 'active' | 'completed' | 'scheduled' } = {}
  ): Promise<AssignmentWithDetails[]> {
    const { status } = params

    let where: any = {}

    if (currentUser.customRole === 'TEACHER') {
      where.teacherId = currentUser.id
      // For teachers, show ALL assignments (active and scheduled) by default
      // They need to see the complete picture of their assignments
      if (status === 'scheduled') {
        where.isActive = false
        where.scheduledPublishAt = { not: null }
      } else if (status === 'active') {
        where.isActive = true
      }
      // If no specific status filter provided, don't add any status filters (show all)
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
      
      // For students, still filter by status as before
      // Default to active assignments if no status specified
      if (status === 'scheduled') {
        where.isActive = false
        where.scheduledPublishAt = { not: null }
      } else {
        // Default behavior for students: only show active assignments
        where.isActive = true
      }
    }

    const orderBy = (status === 'scheduled')
      ? [
          { scheduledPublishAt: 'desc' as const },
          { publishedAt: 'desc' as const },
          { createdAt: 'desc' as const }
        ]
      : [
          { publishedAt: 'desc' as const },
          { createdAt: 'desc' as const }
        ]

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
      orderBy
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

    // Validate language exists (only if languageId is provided)
    let language = null
    if (languageId) {
      language = await prisma.language.findUnique({
        where: { id: languageId }
      })

      if (!language) {
        throw new ValidationError('Language not found')
      }
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
          languageId: languageId || undefined, // Convert null to undefined for Prisma
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
          language: language?.language || 'No language specified',
          languageCode: language?.code || 'none',
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

      // Initialize assignment statistics WITHIN the transaction
      await AssignmentsService.initializeAssignmentStatistics(newAssignment.id, tx)

      return completeAssignment as AssignmentWithDetails;
    });
  }

  static async createReadingAssignment(
    currentUser: AuthenticatedUser,
    data: CreateReadingAssignmentDto
  ): Promise<AssignmentWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const {
      topic,
      questions,
      classIds,
      studentIds,
      scheduledPublishAt,
      dueDate,
      languageId,
      color,
      totalStudentsInScope,
    } = data;

    // Validate language exists (only if languageId is provided)
    let language = null
    if (languageId) {
      language = await prisma.language.findUnique({
        where: { id: languageId }
      })

      if (!language) {
        throw new ValidationError('Language not found')
      }
    }

    return withTransaction(async (tx) => {
      // Calculate initial stats
      const initialTotalStudentsInScope = totalStudentsInScope || 0;
      const publishDate = new Date();
      const isActive = !scheduledPublishAt;

      // Create evaluation settings for reading assignment
      const evaluationData = {
        type: 'READING' as const,
        customPrompt: '',
        rules: [],
        acceptableResponses: [],
        feedbackSettings: {
          detailedFeedback: true,
          encouragementEnabled: true
        }
      };

      const isClassAssignment = classIds && classIds.length > 0 && studentIds && studentIds.length === 0

      // 1. Create the main Assignment record
      const newAssignment = await tx.assignment.create({
        data: {
          topic,
          videoUrl: null, // Reading assignments don't have videos
          videoTranscript: '', // Empty for reading assignments
          languageId: languageId || undefined,
          teacherId: currentUser.id,
          type: isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
          color: color || '#10B981', // Green color for reading assignments
          isActive,
          publishedAt: publishDate,
          scheduledPublishAt: scheduledPublishAt || publishDate,
          dueDate: dueDate || null,
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

      // 2. Create the associated reading passages as questions
      if (questions && questions.length > 0) {
        await tx.question.createMany({
          data: questions.map((q, i) => ({
            textQuestion: q.title || `Reading Passage ${i + 1}`,
            textAnswer: q.text, // The passage text goes in textAnswer
            assignmentId: newAssignment.id,
            videoUrl: null,
            publishedAt: publishDate
          }))
        });
      }

      // 3. Link assignment to classes or students
      if (studentIds && studentIds.length > 0) {
        await tx.userAssignment.createMany({
          data: studentIds.map((userId) => ({
            userId,
            assignmentId: newAssignment.id,
          })),
        });
      } else if (classIds && classIds.length > 0) {
        await tx.classAssignment.createMany({
          data: classIds.map((classId) => ({
            classId,
            assignmentId: newAssignment.id,
          })),
        });
      } else 

      // 4. Log the activity using the ActivityLogService
      await ActivityLogService.logAssignmentCreated(
        currentUser,
        {
          id: newAssignment.id,
          topic: newAssignment.topic || 'Untitled Reading Assignment'
        },
        isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
        {
          createdBy: currentUser.customRole,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username,
          language: language?.language || 'No language specified',
          languageCode: language?.code || 'none',
          classCount: classIds?.length || 0,
          studentCount: studentIds?.length || 0,
          isScheduled: !!scheduledPublishAt,
          scheduledDate: scheduledPublishAt?.toISOString(),
          assignmentType: isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
          evaluationType: 'READING',
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
        throw new Error('Failed to retrieve created reading assignment');
      }

      // Initialize assignment statistics WITHIN the transaction
      await AssignmentsService.initializeAssignmentStatistics(newAssignment.id, tx)

      return completeAssignment as AssignmentWithDetails;
    });
  }

  static async createPronunciationAssignment(
    currentUser: AuthenticatedUser,
    data: CreatePronunciationAssignmentDto
  ): Promise<AssignmentWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const {
      topic,
      questions,
      classIds,
      studentIds,
      scheduledPublishAt,
      dueDate,
      languageId,
      color,
      totalStudentsInScope,
    } = data;

    // Validate language exists (only if languageId is provided)
    let language = null
    if (languageId) {
      language = await prisma.language.findUnique({
        where: { id: languageId }
      })

      if (!language) {
        throw new ValidationError('Language not found')
      }
    }

    return withTransaction(async (tx) => {
      // Calculate initial stats
      const initialTotalStudentsInScope = totalStudentsInScope || 0;
      const publishDate = new Date();
      const isActive = !scheduledPublishAt;

      // Create evaluation settings for reading assignment
      const evaluationData = {
        type: 'PRONUNCIATION' as const,
        customPrompt: '',
        rules: [],
        acceptableResponses: [],
        feedbackSettings: {
          detailedFeedback: true,
          encouragementEnabled: true
        }
      };

      const isClassAssignment = classIds && classIds.length > 0 && studentIds && studentIds.length === 0

      // 1. Create the main Assignment record
      const newAssignment = await tx.assignment.create({
        data: {
          topic,
          videoUrl: null, // Reading assignments don't have videos
          videoTranscript: '', // Empty for reading assignments
          languageId: languageId || undefined,
          teacherId: currentUser.id,
          type: isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
          color: color || '#10B981', // Green color for reading assignments
          isActive,
          publishedAt: publishDate,
          scheduledPublishAt: scheduledPublishAt || publishDate,
          dueDate: dueDate || null,
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

      // 2. Create the associated reading passages as questions
      if (questions && questions.length > 0) {
        await tx.question.createMany({
          data: questions.map((q, i) => ({
            textQuestion: q.title || `Pronunciation ${i + 1}`,
            textAnswer: q.text, // The passage text goes in textAnswer
            assignmentId: newAssignment.id,
            videoUrl: null,
            publishedAt: publishDate
          }))
        });
      }

      // 3. Link assignment to classes or students
      if (studentIds && studentIds.length > 0) {
        await tx.userAssignment.createMany({
          data: studentIds.map((userId) => ({
            userId,
            assignmentId: newAssignment.id,
          })),
        });
      } else if (classIds && classIds.length > 0) {
        await tx.classAssignment.createMany({
          data: classIds.map((classId) => ({
            classId,
            assignmentId: newAssignment.id,
          })),
        });
      } else 

      // 4. Log the activity using the ActivityLogService
      await ActivityLogService.logAssignmentCreated(
        currentUser,
        {
          id: newAssignment.id,
          topic: newAssignment.topic || 'Untitled Reading Assignment'
        },
        isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
        {
          createdBy: currentUser.customRole,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username,
          language: language?.language || 'No language specified',
          languageCode: language?.code || 'none',
          classCount: classIds?.length || 0,
          studentCount: studentIds?.length || 0,
          isScheduled: !!scheduledPublishAt,
          scheduledDate: scheduledPublishAt?.toISOString(),
          assignmentType: isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
          evaluationType: 'PRONUNCIATION',
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
        throw new Error('Failed to retrieve created reading assignment');
      }

      // Initialize assignment statistics WITHIN the transaction
      await AssignmentsService.initializeAssignmentStatistics(newAssignment.id, tx)

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
    result: any,
    type: 'VIDEO' | 'READING' | 'PRONUNCIATION' | 'IELTS'
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
      let languageConfidenceResponse: any
      switch (type) {
        case 'VIDEO':
          languageConfidenceResponse = {
            transcript: result,
            timestamp: new Date().toISOString()
          }
          break
        case 'READING':
        case 'PRONUNCIATION':
        case 'IELTS':
          languageConfidenceResponse = {
            result,
            timestamp: new Date().toISOString()
          }
          break
        default:
          languageConfidenceResponse = {
            result,
            timestamp: new Date().toISOString()
          }
          break
      }

      if (existingProgress) {
        // Update existing progress
        progress = await tx.studentAssignmentProgress.update({
          where: {
            id: existingProgress.id
          },
          data: {
            isCorrect,
            languageConfidenceResponse,
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
            languageConfidenceResponse,
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
        select: {
          questionId: true,
          isCorrect: true
        }
      })

      // Calculate completion percentage and accuracy using unique questions answered
      const totalQuestions = await tx.question.count({
        where: { assignmentId: assignmentId }
      })

      // Count unique questions answered (not just progress records)
      const uniqueQuestionsAnswered = new Set(studentProgress.map(p => p.questionId)).size
      const correctAnswers = studentProgress.filter(p => p.isCorrect).length
      
      const completionPercentage = totalQuestions > 0 ? (uniqueQuestionsAnswered / totalQuestions) * 100 : 0
      const accuracy = uniqueQuestionsAnswered > 0 ? (correctAnswers / uniqueQuestionsAnswered) * 100 : 0

      // Update statistics incrementally using the new scalable service
      // These updates MUST be part of the transaction to ensure data integrity
      console.log(`[STATS] Updating assignment statistics for assignment ${assignmentId}, student ${studentId}`)
      await StatisticsService.updateAssignmentStatistics(assignmentId, studentId, isCorrect, true, tx)
      
      console.log(`[STATS] Updating student statistics for student ${studentId}, assignment ${assignmentId}`)
      await StatisticsService.updateStudentStatistics(studentId, assignmentId, isCorrect, true, tx, questionId)
      
      console.log(`[STATS] Statistics update completed successfully`)

      // Update help status based on completion and performance
      const { StudentsNeedingHelpService } = await import('./students-needing-help.service')
      await StudentsNeedingHelpService.updateStudentHelpStatus(studentId, assignmentId, completionPercentage, accuracy, tx)

      return {
        success: true,
        progress: {
          totalQuestions,
          completedQuestions: uniqueQuestionsAnswered,
          correctAnswers,
          completionPercentage: Math.round(completionPercentage * 100) / 100,
          accuracy: Math.round(accuracy * 100) / 100,
          isComplete: uniqueQuestionsAnswered >= totalQuestions
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
  static async initializeAssignmentStatistics(assignmentId: string, tx?: any) {
    try {
      // Use the provided transaction or fallback to prisma
      const db = tx || prisma

      // Get assignment details to determine scope
      const assignment = await db.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          classes: {
            include: {
              class: {
                include: {
                  users: { 
                    select: { 
                      userId: true,
                      user: {
                        select: {
                          customRole: true
                        }
                      }
                    } 
                  }
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
      await StatisticsService.updateAssignmentStatistics(assignmentId, '', false, false, tx)

      // 2. Get all affected students (only actual students, not teachers)
      const classStudentIds = assignment.classes.flatMap((ac: any) => 
        ac.class.users
          .filter((u: any) => u.user?.customRole === 'STUDENT') // Only include students, not teachers
          .map((u: any) => u.userId)
      )
      const individualStudentIds = assignment.students.map((s: any) => s.userId)
      const allStudentIds = [...new Set([...classStudentIds, ...individualStudentIds])]

      // 3. Update each student's assignment count
      for (const studentId of allStudentIds) {
        await StatisticsService.incrementStudentAssignmentCount(studentId, tx)
      }

      // 4. Update class statistics for class assignments
      if (assignment.type === 'CLASS') {
        for (const classAssignment of assignment.classes) {
          await StatisticsService.incrementClassAssignmentCount(classAssignment.classId, tx)
        }
      }

      // 5. Update school-wide statistics
      await StatisticsService.incrementSchoolAssignmentCount(true, !!assignment.scheduledPublishAt, tx)

      console.log(`Initialized statistics for assignment ${assignmentId} (${allStudentIds.length} students affected)`)
    } catch (error) {
      console.error('Error initializing assignment statistics:', error)
      // Throw error to rollback the transaction if we're in one
      if (tx) {
        throw error
      }
    }
  }




}

export interface CreateVideoAssignmentDto {
  topic: string;
  videoUrl: string;
  videoTranscript?: string;
  hasTranscript?: boolean;
  languageId?: string | null;
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

export interface CreateReadingAssignmentDto {
  topic: string;
  questions: { text: string; title?: string }[]; // Reading passages
  classIds: string[];
  studentIds?: string[];
  assignToEntireClass: boolean;
  scheduledPublishAt?: Date | null;
  dueDate?: Date | null;
  hasTranscript?: boolean;
  languageId?: string | null;
  color?: string;
  totalStudentsInScope?: number;
} 

export interface CreatePronunciationAssignmentDto {
  topic: string;
  questions: { text: string; title?: string }[]; // Reading passages
  classIds: string[];
  studentIds?: string[];
  assignToEntireClass: boolean;
  scheduledPublishAt?: Date | null;
  dueDate?: Date | null;
  hasTranscript?: boolean;
  languageId?: string | null;
  color?: string;
  totalStudentsInScope?: number;
}

export interface CreateIELTSAssignmentDto {
  topic: string;
  subtype: 'reading' | 'question-answer' | 'pronunciation';
  classIds: string[];
  studentIds?: string[];
  assignToEntireClass?: boolean;
  scheduledPublishAt?: Date | null;
  dueDate?: Date | null;
  languageId?: string | null;
  color?: string;
  totalStudentsInScope?: number;
  
  // For reading and pronunciation assignments
  passages?: { text: string; title?: string }[];
  
  // For question-answer assignments
  questions?: { text: string; topic?: string; expectedLevel?: 'beginner' | 'intermediate' | 'advanced' }[];
  context?: string;
  
  // IELTS specific
  accent?: 'us' | 'uk';
}

export class IELTSAssignmentsService {
  static async createIELTSAssignment(
    currentUser: AuthenticatedUser,
    data: CreateIELTSAssignmentDto
  ): Promise<AssignmentWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const {
      topic,
      subtype,
      classIds,
      studentIds,
      assignToEntireClass,
      scheduledPublishAt,
      dueDate,
      languageId,
      color,
      totalStudentsInScope,
      passages,
      questions,
      context,
      accent,
    } = data;

    // Validate language exists (only if languageId is provided)
    let language = null
    if (languageId) {
      language = await prisma.language.findUnique({
        where: { id: languageId }
      })

      if (!language) {
        throw new ValidationError('Language not found')
      }
    }

    return withTransaction(async (tx) => {
      // Calculate initial stats
      const initialTotalStudentsInScope = totalStudentsInScope || 0;
      const publishDate = new Date();
      const isActive = !scheduledPublishAt;

      // Determine evaluation type based on subtype
      let evaluationType: 'READING' | 'Q_AND_A' | 'PRONUNCIATION';
      let assignmentColor = color;
      
      switch (subtype) {
        case 'reading':
          evaluationType = 'READING';
          assignmentColor = assignmentColor || '#10B981'; // Green
          break;
        case 'question-answer':
          evaluationType = 'Q_AND_A';
          assignmentColor = assignmentColor || '#3B82F6'; // Blue
          break;
        case 'pronunciation':
          evaluationType = 'PRONUNCIATION';
          assignmentColor = assignmentColor || '#8B5CF6'; // Purple
          break;
        default:
          throw new ValidationError('Invalid IELTS assignment subtype')
      }

      // Create evaluation settings for IELTS assignment
      const evaluationData = {
        type: evaluationType,
        customPrompt: context || '',
        rules: [],
        acceptableResponses: [],
        feedbackSettings: {
          detailedFeedback: true,
          encouragementEnabled: true,
          ieltsScoring: true,
          accent: accent || 'us'
        }
      };

      const isClassAssignment = assignToEntireClass && classIds && classIds.length > 0

      // 1. Create the main Assignment record
      const newAssignment = await tx.assignment.create({
        data: {
          topic,
          videoUrl: null, // IELTS assignments don't have videos
          videoTranscript: '', // Empty for IELTS assignments
          languageId: languageId || undefined,
          teacherId: currentUser.id,
          type: isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
          color: assignmentColor,
          isActive,
          publishedAt: publishDate,
          scheduledPublishAt: scheduledPublishAt || publishDate,
          dueDate: dueDate || null,
          totalStudentsInScope: initialTotalStudentsInScope,
          completedStudentsCount: 0,
          completionRate: 0.0,
          averageScoreOfCompleted: 0.0,
          isIELTS: true, // Mark as IELTS assignment
          context: context || null,
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

      // 2. Create the associated questions based on subtype
      if (subtype === 'reading' || subtype === 'pronunciation') {
        if (passages && passages.length > 0) {
          await tx.question.createMany({
            data: passages.map((passage, i) => ({
              textQuestion: passage.title || `${subtype === 'reading' ? 'Reading' : 'Pronunciation'} Passage ${i + 1}`,
              textAnswer: passage.text, // The passage text goes in textAnswer
              assignmentId: newAssignment.id,
              videoUrl: null,
              publishedAt: publishDate
            }))
          });
        }
      } else if (subtype === 'question-answer') {
        if (questions && questions.length > 0) {
          await tx.question.createMany({
            data: questions.map((question, i) => ({
              textQuestion: question.topic || `Question ${i + 1}`,
              textAnswer: question.text, // The question text goes in textAnswer for Q&A
              assignmentId: newAssignment.id,
              videoUrl: null,
              publishedAt: publishDate
            }))
          });
        }
      }

      // 3. Link assignment to classes or students
      if (studentIds && studentIds.length > 0) {
        await tx.userAssignment.createMany({
          data: studentIds.map((userId) => ({
            userId,
            assignmentId: newAssignment.id,
          })),
        });
      } else if (classIds && classIds.length > 0) {
        await tx.classAssignment.createMany({
          data: classIds.map((classId) => ({
            classId,
            assignmentId: newAssignment.id,
          })),
        });
      }

      // 4. Log the activity using the ActivityLogService
      await ActivityLogService.logAssignmentCreated(
        currentUser,
        {
          id: newAssignment.id,
          topic: newAssignment.topic || 'Untitled IELTS Assignment'
        },
        isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
        {
          createdBy: currentUser.customRole,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username,
          language: language?.language || 'No language specified',
          languageCode: language?.code || 'none',
          classCount: classIds?.length || 0,
          studentCount: studentIds?.length || 0,
          isScheduled: !!scheduledPublishAt,
          scheduledDate: scheduledPublishAt?.toISOString(),
          assignmentType: isClassAssignment ? 'CLASS' : 'INDIVIDUAL',
          evaluationType: evaluationType,
          subtype: subtype,
          isIELTS: true,
          questionCount: (passages?.length || questions?.length || 0)
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
        throw new Error('Failed to retrieve created IELTS assignment');
      }

      // Initialize assignment statistics WITHIN the transaction
      await AssignmentsService.initializeAssignmentStatistics(newAssignment.id, tx)

      return completeAssignment as AssignmentWithDetails;
    });
  }
}