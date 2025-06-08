import { NextRequest, NextResponse } from 'next/server'
import { AuthService, UsersService, handleServiceError } from '@/lib/services'

/**
 * GET /api/users/[userId]
 * Get a specific user by ID
 * Users can only access their own data unless they're admin/teacher
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Await params for Next.js 15 compatibility
    const { userId } = await params
    
    // Get user data
    const user = await UsersService.getUserById(currentUser, userId)

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 