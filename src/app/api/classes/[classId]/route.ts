import { NextRequest, NextResponse } from 'next/server'
import { AuthService, ClassesService, handleServiceError } from '@/lib/services'

/**
 * GET /api/classes/[classId]
 * Get class details including teachers and students
 * Role-based access: Admins/Teachers see all, Students see only their classes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { classId } = await params

    // Validate classId
    if (!classId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing classId parameter' 
        },
        { status: 400 }
      )
    }

    // Use service to get class details
    const classDetails = await ClassesService.getClassById(currentUser, classId, true)

    // Transform the response to separate teachers and students
    const teachers = classDetails.users?.filter(uc => uc.user.customRole === 'TEACHER').map(uc => uc.user) || []
    const students = classDetails.users?.filter(uc => uc.user.customRole === 'STUDENT').map(uc => uc.user) || []

    return NextResponse.json({
      success: true,
      data: {
        ...classDetails,
        teachers,
        students
      },
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 