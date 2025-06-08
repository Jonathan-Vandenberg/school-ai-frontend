import { NextRequest, NextResponse } from 'next/server'
import { AuthService, AssignmentsService, handleServiceError } from '@/lib/services'
import { z } from 'zod'

/**
 * GET /api/assignments
 * List assignments with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const classId = searchParams.get('classId')
    const assignmentType = searchParams.get('assignmentType') as 'CLASS' | 'INDIVIDUAL' | null
    const search = searchParams.get('search')
    const includeQuestions = searchParams.get('includeQuestions') === 'true'

    // Use service to get assignments
    const result = await AssignmentsService.listAssignments(currentUser, {
      page,
      limit,
      classId: classId || undefined,
      assignmentType: assignmentType || undefined,
      search: search || undefined,
      includeQuestions,
    })

    return NextResponse.json({
      success: true,
      data: result.assignments,
      pagination: result.pagination,
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * POST /api/assignments
 * Create a new assignment (either standard or video)
 * Teachers and admins can create assignments
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser();
    const body = await request.json();

    // Differentiator for creation type
    const { creationType, ...data } = body;

    if (creationType === 'video') {
      // Logic for creating a video assignment
      const newAssignment = await AssignmentsService.createVideoAssignment(currentUser, data);
      return NextResponse.json({
        success: true,
        data: newAssignment,
        message: 'Video assignment created successfully',
      }, { status: 201 });

    } else {
      // Existing logic for standard assignment creation
      const { 
        name, 
        description, 
        assignmentType, 
        classId, 
        studentId, 
        scheduledPublishAt,
        questions = [],
        targetLanguages = [],
        tools = []
      } = data;

      // Validate required fields
      if (!name || !assignmentType) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Missing required fields: name, assignmentType' 
          },
          { status: 400 }
        )
      }

      // Validate assignment type requirements
      if (assignmentType === 'CLASS' && !classId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'classId is required for CLASS assignments' 
          },
          { status: 400 }
        )
      }

      if (assignmentType === 'INDIVIDUAL' && !studentId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'studentId is required for INDIVIDUAL assignments' 
          },
          { status: 400 }
        )
      }

      // Use service to create assignment
      const newAssignment = await AssignmentsService.createAssignment(currentUser, {
        name,
        description,
        assignmentType,
        classId,
        studentId,
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : undefined,
        questions,
        targetLanguages,
        tools,
      })

      return NextResponse.json({
        success: true,
        data: newAssignment,
        message: 'Assignment created successfully',
      }, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return handleServiceError(error)
  }
} 