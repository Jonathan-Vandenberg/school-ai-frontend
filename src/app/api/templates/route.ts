import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'
import { TemplatesService } from '@/lib/services/templates.service'
import { z } from 'zod'
import { CEFRLevel, GradeLevel, LevelType, EvaluationType } from '@prisma/client'

/**
 * GET /api/templates
 * List templates with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const cefrLevel = searchParams.get('cefrLevel') as CEFRLevel | undefined
    const gradeLevel = searchParams.get('gradeLevel') as GradeLevel | undefined
    const evaluationType = searchParams.get('evaluationType') as EvaluationType | undefined
    const languageId = searchParams.get('languageId') || undefined
    const isIELTS = searchParams.get('isIELTS') === 'true' ? true : searchParams.get('isIELTS') === 'false' ? false : undefined
    const creatorId = searchParams.get('creatorId') || undefined

    const result = await TemplatesService.listTemplates(currentUser, {
      page,
      limit,
      search,
      cefrLevel,
      gradeLevel,
      evaluationType,
      languageId,
      isIELTS,
      creatorId,
    })

    return NextResponse.json({
      success: true,
      data: result.templates,
      pagination: result.pagination
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * POST /api/templates
 * Create a new template
 * Only teachers and admins can create templates
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const body = await request.json()

    // Validation schema
    const schema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      description: z.string().optional(),
      color: z.string().optional(),
      vocabularyItems: z.any().optional(),
      videoUrl: z.string().optional(),
      videoTranscript: z.string().optional(),
      languageAssessmentType: z.string().optional(),
      isIELTS: z.boolean().optional(),
      context: z.string().optional(),
      languageId: z.string().optional(),
      evaluationSettings: z.object({
        type: z.string(),
        customPrompt: z.string().optional(),
        rules: z.any().optional(),
        acceptableResponses: z.any().optional(),
        feedbackSettings: z.any().optional(),
      }).optional(),
      questions: z.array(z.object({
        image: z.string().optional(),
        textQuestion: z.string().optional(),
        videoUrl: z.string().optional(),
        textAnswer: z.string().optional(),
        order: z.number().optional(),
      })).optional(),
      levels: z.array(z.object({
        levelType: z.enum(['CEFR', 'GRADE']),
        cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        gradeLevel: z.enum([
          'PRE_K', 'KINDERGARTEN', 
          'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6',
          'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'
        ]).optional(),
      })).min(1, 'At least one level is required'),
    })

    const validatedData = schema.parse(body)

    const template = await TemplatesService.createTemplate(currentUser, validatedData as any)

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template created successfully',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Validation failed',
        details: error.errors 
      }, { status: 400 })
    }
    return handleServiceError(error)
  }
}

