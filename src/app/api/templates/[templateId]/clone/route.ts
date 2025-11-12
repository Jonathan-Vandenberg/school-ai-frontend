import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError, AssignmentsService } from '@/lib/services'
import { TemplatesService } from '@/lib/services/templates.service'
import { z } from 'zod'

/**
 * POST /api/templates/[templateId]/clone
 * Create an assignment from a template
 * Teachers specify class/student assignments, due dates, etc.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const { templateId } = await params
    const body = await request.json()

    // Validation schema for assignment-specific data
    const schema = z.object({
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      dueDate: z.string().optional(),
      scheduledPublishAt: z.string().optional(),
      isActive: z.boolean().optional(),
    })

    const validatedData = schema.parse(body)

    // Get the template
    const template = await TemplatesService.getTemplateById(currentUser, templateId)

    // Create assignment from template data
    const assignmentData = {
      topic: template.topic,
      color: template.color || undefined,
      vocabularyItems: Array.isArray(template.vocabularyItems) ? template.vocabularyItems : undefined,
      videoUrl: template.videoUrl || undefined,
      videoTranscript: template.videoTranscript || undefined,
      languageAssessmentType: template.languageAssessmentType || undefined,
      isIELTS: template.isIELTS || undefined,
      context: template.context || undefined,
      languageId: template.languageId || undefined,
      type: (validatedData.classIds && validatedData.classIds.length > 0) ? 'CLASS' as const : 'INDIVIDUAL' as const,
      classIds: validatedData.classIds,
      studentIds: validatedData.studentIds,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : undefined,
      evaluationSettings: template.evaluationSettings ? {
        type: template.evaluationSettings.type,
        customPrompt: template.evaluationSettings.customPrompt || undefined,
        rules: template.evaluationSettings.rules || undefined,
        acceptableResponses: template.evaluationSettings.acceptableResponses || undefined,
        feedbackSettings: template.evaluationSettings.feedbackSettings || {},
      } : undefined,
    }

    // Create the assignment
    const assignment = await AssignmentsService.createAssignment(currentUser, assignmentData)

    // Copy questions from template to assignment
    if (template.questions && template.questions.length > 0) {
      const { prisma } = await import('@/lib/db')
      await prisma.question.createMany({
        data: template.questions.map(q => ({
          assignmentId: assignment.id,
          image: q.image,
          textQuestion: q.textQuestion,
          videoUrl: q.videoUrl,
          textAnswer: q.textAnswer,
        }))
      })
    }

    // Increment template usage count
    await TemplatesService.incrementUsageCount(templateId)

    // Fetch the complete assignment with questions
    const { prisma } = await import('@/lib/db')
    const completeAssignment = await prisma.assignment.findUnique({
      where: { id: assignment.id },
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

    return NextResponse.json({
      success: true,
      data: completeAssignment,
      message: 'Assignment created from template successfully',
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

