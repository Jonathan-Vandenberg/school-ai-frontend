import { NextRequest, NextResponse } from 'next/server'
import { AuthService, ClassesService, handleServiceError } from '@/lib/services'

/**
 * GET /api/classes/[classId]/available-users
 * Get available teachers and students for editing a class
 * Includes current class members plus other available users
 * Role-based access: Only admins and teachers can access
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

    // Use service to get available users for this class
    const availableUsers = await ClassesService.getAvailableUsersForClass(currentUser, classId)

    return NextResponse.json({
      success: true,
      data: availableUsers,
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 