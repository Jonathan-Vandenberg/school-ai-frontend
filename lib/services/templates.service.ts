import { prisma, withTransaction } from '@/lib/db'
import { AuthenticatedUser, ValidationError, NotFoundError, ForbiddenError } from './auth.service'
import { CEFRLevel, GradeLevel, LevelType, EvaluationType, LanguageAssessmentType } from '@prisma/client'

// Types
export interface TemplateLevel {
  levelType: LevelType
  cefrLevel?: CEFRLevel
  gradeLevel?: GradeLevel
}

export interface TemplateQuestion {
  id?: string
  image?: string
  textQuestion?: string
  videoUrl?: string
  textAnswer?: string
  order?: number
}

export interface TemplateEvaluationSettings {
  type: EvaluationType
  customPrompt?: string
  rules?: any
  acceptableResponses?: any
  feedbackSettings?: any
}

export interface CreateTemplateData {
  topic: string
  description?: string
  color?: string
  vocabularyItems?: any
  videoUrl?: string
  videoTranscript?: string
  languageAssessmentType?: LanguageAssessmentType
  isIELTS?: boolean
  context?: string
  languageId?: string
  evaluationSettings?: TemplateEvaluationSettings
  questions?: TemplateQuestion[]
  levels: TemplateLevel[]
}

export interface UpdateTemplateData {
  topic?: string
  description?: string
  color?: string
  vocabularyItems?: any
  videoUrl?: string
  videoTranscript?: string
  languageAssessmentType?: LanguageAssessmentType
  isIELTS?: boolean
  context?: string
  languageId?: string
  isActive?: boolean
  levels?: TemplateLevel[]
}

export interface TemplateListParams {
  page?: number
  limit?: number
  search?: string
  cefrLevel?: CEFRLevel
  gradeLevel?: GradeLevel
  evaluationType?: EvaluationType
  languageId?: string
  isIELTS?: boolean
  creatorId?: string
  isActive?: boolean
}

/**
 * Templates Service
 * Handles all template-related database operations
 */
export class TemplatesService {
  /**
   * Create a new template
   * Only teachers and admins can create templates
   */
  static async createTemplate(
    currentUser: AuthenticatedUser,
    templateData: CreateTemplateData
  ) {
    // Validate user has permission
    if (currentUser.customRole !== 'TEACHER' && currentUser.customRole !== 'ADMIN') {
      throw new ForbiddenError('Only teachers and admins can create templates')
    }

    // Validate language exists (only if languageId is provided)
    if (templateData.languageId) {
      const language = await prisma.language.findUnique({
        where: { id: templateData.languageId }
      })

      if (!language) {
        throw new ValidationError('Language not found')
      }
    }

    // Validate at least one level is provided
    if (!templateData.levels || templateData.levels.length === 0) {
      throw new ValidationError('At least one level must be specified')
    }

    return withTransaction(async (tx) => {
      const { levels, questions, evaluationSettings, ...templateFields } = templateData

      // Create the template
      const template = await tx.assignmentTemplate.create({
        data: {
          ...templateFields,
          creatorId: currentUser.id,
          evaluationSettings: evaluationSettings ? {
            create: {
              ...evaluationSettings,
              feedbackSettings: evaluationSettings.feedbackSettings || {},
            }
          } : undefined,
        },
        include: {
          creator: {
            select: { id: true, username: true }
          },
          language: {
            select: { id: true, language: true, code: true }
          },
          evaluationSettings: true,
          questions: {
            orderBy: { order: 'asc' }
          },
          levels: true,
        }
      })

      // Create questions if provided
      if (questions && questions.length > 0) {
        await tx.templateQuestion.createMany({
          data: questions.map((q, index) => ({
            ...q,
            templateId: template.id,
            order: q.order ?? index,
          }))
        })
      }

      // Create levels
      await tx.assignmentTemplateLevel.createMany({
        data: levels.map(level => ({
          templateId: template.id,
          levelType: level.levelType,
          cefrLevel: level.cefrLevel,
          gradeLevel: level.gradeLevel,
        }))
      })

      // Fetch complete template with all relations
      const completeTemplate = await tx.assignmentTemplate.findUnique({
        where: { id: template.id },
        include: {
          creator: {
            select: { id: true, username: true }
          },
          language: {
            select: { id: true, language: true, code: true }
          },
          evaluationSettings: true,
          questions: {
            orderBy: { order: 'asc' }
          },
          levels: true,
        }
      })

      return completeTemplate
    })
  }

  /**
   * List templates with filters
   */
  static async listTemplates(
    currentUser: AuthenticatedUser,
    params: TemplateListParams = {}
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      cefrLevel,
      gradeLevel,
      evaluationType,
      languageId,
      isIELTS,
      creatorId,
      isActive = true,
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      isActive,
    }

    if (search) {
      where.OR = [
        { topic: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (languageId) {
      where.languageId = languageId
    }

    if (isIELTS !== undefined) {
      where.isIELTS = isIELTS
    }

    if (creatorId) {
      where.creatorId = creatorId
    }

    if (evaluationType) {
      where.evaluationSettings = {
        type: evaluationType
      }
    }

    // Handle level filters
    if (cefrLevel || gradeLevel) {
      where.levels = {
        some: {
          ...(cefrLevel && { cefrLevel }),
          ...(gradeLevel && { gradeLevel }),
        }
      }
    }

    // Execute query
    const [templates, total] = await Promise.all([
      prisma.assignmentTemplate.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: { id: true, username: true }
          },
          language: {
            select: { id: true, language: true, code: true }
          },
          evaluationSettings: {
            select: { type: true }
          },
          levels: true,
          _count: {
            select: { questions: true }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.assignmentTemplate.count({ where })
    ])

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(
    currentUser: AuthenticatedUser,
    templateId: string
  ) {
    const template = await prisma.assignmentTemplate.findUnique({
      where: { id: templateId },
      include: {
        creator: {
          select: { id: true, username: true, email: true }
        },
        language: {
          select: { id: true, language: true, code: true }
        },
        evaluationSettings: true,
        questions: {
          orderBy: { order: 'asc' }
        },
        levels: true,
      }
    })

    if (!template) {
      throw new NotFoundError('Template not found')
    }

    if (!template.isActive && template.creatorId !== currentUser.id && currentUser.customRole !== 'ADMIN') {
      throw new ForbiddenError('Cannot access inactive template')
    }

    return template
  }

  /**
   * Update template
   * Only the creator or admins can update
   */
  static async updateTemplate(
    currentUser: AuthenticatedUser,
    templateId: string,
    updateData: UpdateTemplateData
  ) {
    const template = await prisma.assignmentTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, creatorId: true }
    })

    if (!template) {
      throw new NotFoundError('Template not found')
    }

    // Check permissions
    if (template.creatorId !== currentUser.id && currentUser.customRole !== 'ADMIN') {
      throw new ForbiddenError('Only the template creator or admins can update this template')
    }

    return withTransaction(async (tx) => {
      const { levels, ...templateFields } = updateData

      // Update template
      const updatedTemplate = await tx.assignmentTemplate.update({
        where: { id: templateId },
        data: templateFields,
        include: {
          creator: {
            select: { id: true, username: true }
          },
          language: {
            select: { id: true, language: true, code: true }
          },
          evaluationSettings: true,
          questions: {
            orderBy: { order: 'asc' }
          },
          levels: true,
        }
      })

      // Update levels if provided
      if (levels) {
        // Delete existing levels
        await tx.assignmentTemplateLevel.deleteMany({
          where: { templateId }
        })

        // Create new levels
        if (levels.length > 0) {
          await tx.assignmentTemplateLevel.createMany({
            data: levels.map(level => ({
              templateId,
              levelType: level.levelType,
              cefrLevel: level.cefrLevel,
              gradeLevel: level.gradeLevel,
            }))
          })
        }
      }

      // Fetch complete template with updated levels
      return await tx.assignmentTemplate.findUnique({
        where: { id: templateId },
        include: {
          creator: {
            select: { id: true, username: true }
          },
          language: {
            select: { id: true, language: true, code: true }
          },
          evaluationSettings: true,
          questions: {
            orderBy: { order: 'asc' }
          },
          levels: true,
        }
      })
    })
  }

  /**
   * Delete template
   * Only the creator or admins can delete
   */
  static async deleteTemplate(
    currentUser: AuthenticatedUser,
    templateId: string
  ) {
    const template = await prisma.assignmentTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, creatorId: true }
    })

    if (!template) {
      throw new NotFoundError('Template not found')
    }

    // Check permissions
    if (template.creatorId !== currentUser.id && currentUser.customRole !== 'ADMIN') {
      throw new ForbiddenError('Only the template creator or admins can delete this template')
    }

    await prisma.assignmentTemplate.delete({
      where: { id: templateId }
    })

    return { success: true, message: 'Template deleted successfully' }
  }

  /**
   * Increment usage count
   */
  static async incrementUsageCount(templateId: string) {
    await prisma.assignmentTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1
        }
      }
    })
  }
}

