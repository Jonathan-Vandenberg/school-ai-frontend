import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'
import { TemplatesService } from '@/lib/services/templates.service'
import { z } from 'zod'

/**
 * GET /api/templates/[templateId]
 * Get template details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const { templateId } = await params

    const template = await TemplatesService.getTemplateById(currentUser, templateId)

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * PUT /api/templates/[templateId]
 * Update template
 * Only the creator or admins can update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const { templateId } = await params
    const body = await request.json()

    // Validation schema
    const schema = z.object({
      topic: z.string().min(1).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      vocabularyItems: z.any().optional(),
      videoUrl: z.string().optional(),
      videoTranscript: z.string().optional(),
      languageAssessmentType: z.string().optional(),
      isIELTS: z.boolean().optional(),
      context: z.string().optional(),
      languageId: z.string().optional(),
      isActive: z.boolean().optional(),
      levels: z.array(z.object({
        levelType: z.enum(['CEFR', 'GRADE']),
        cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
        gradeLevel: z.enum([
          'PRE_K', 'KINDERGARTEN', 
          'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6',
          'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'
        ]).optional(),
      })).optional(),
    })

    const validatedData = schema.parse(body)

    const template = await TemplatesService.updateTemplate(currentUser, templateId, validatedData as any)

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    })
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

/**
 * DELETE /api/templates/[templateId]
 * Delete template
 * Only the creator or admins can delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const { templateId } = await params

    const result = await TemplatesService.deleteTemplate(currentUser, templateId)

    return NextResponse.json(result)
  } catch (error) {
    return handleServiceError(error)
  }
}

