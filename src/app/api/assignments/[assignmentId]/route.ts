import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { handleServiceError } from '../../../../../lib/services/auth.service'
import { z } from 'zod'

/**
 * GET /api/assignments/[assignmentId]
 * Get a specific assignment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { assignmentId } = await params
    
    // Get assignment by ID
    const assignment = await AssignmentsService.getAssignmentById(
      currentUser,
      assignmentId
    )

    return NextResponse.json({
      success: true,
      data: assignment,
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * PUT /api/assignments/[assignmentId]
 * Update a specific assignment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { assignmentId } = await params
    
    // Parse request body
    const body = await request.json()
    
    // Validate request data
    const updateSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      videoUrl: z.string().url().optional().nullable(),
      context: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      scheduledPublishAt: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      type: z.enum(['CLASS', 'INDIVIDUAL']).optional(),
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      questions: z.array(z.object({
        id: z.string().optional(),
        textQuestion: z.string().min(1, 'Question text is required'),
        textAnswer: z.string().min(1, 'Answer text is required')
      })).min(1, 'At least one question is required')
    })

    const validatedData = updateSchema.parse(body)

    // Update assignment with questions
    const updatedAssignment = await AssignmentsService.updateAssignment(
      currentUser,
      assignmentId,
      {
        topic: validatedData.topic,
        videoUrl: validatedData.videoUrl || undefined,
        context: validatedData.context || undefined,
        isActive: validatedData.isActive,
        scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        type: validatedData.type,
        classIds: validatedData.classIds,
        studentIds: validatedData.studentIds,
      },
      validatedData.questions
    )

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
      message: 'Assignment updated successfully',
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