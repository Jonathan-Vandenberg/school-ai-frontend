import { NextRequest, NextResponse } from 'next/server'
import { AuthService, UsersService, handleServiceError } from '@/lib/services'

/**
 * GET /api/users
 * List users with filtering and pagination
 * Only admins and teachers can access this endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role') as 'ADMIN' | 'TEACHER' | 'STUDENT' | null
    const search = searchParams.get('search')
    const classId = searchParams.get('classId')

    // Use service to get users
    const result = await UsersService.listUsers(currentUser, {
      page,
      limit,
      role: role || undefined,
      search: search || undefined,
      classId: classId || undefined,
    })

    return NextResponse.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      roleCounts: result.roleCounts,
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * POST /api/users
 * Create a new user
 * Only admins can create users
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Parse request body
    const body = await request.json()
    const { username, email, password, customRole, phone, address, isPlayGame } = body

    // Validate required fields
    if (!username || !email || !password || !customRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: username, email, password, customRole' 
        },
        { status: 400 }
      )
    }

    // Use service to create user
    const newUser = await UsersService.createUser(currentUser, {
      username,
      email,
      password,
      customRole,
      phone,
      address,
      isPlayGame,
    })

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    }, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * PUT /api/users
 * Update a user
 * Only admins can update users (or users can update themselves with limited fields)
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Parse request body
    const body = await request.json()
    const { userId, username, email, customRole, phone, address, isPlayGame, confirmed, blocked, theme, isActivity = true } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: userId' 
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (customRole !== undefined) updateData.customRole = customRole
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (isPlayGame !== undefined) updateData.isPlayGame = isPlayGame
    if (confirmed !== undefined) updateData.confirmed = confirmed
    if (theme !== undefined) updateData.theme = theme

    // Handle blocking/unblocking
    if (blocked !== undefined) updateData.blocked = blocked

    // Use service to update user
    const updatedUser = await UsersService.updateUser(
      currentUser, 
      userId, 
      updateData, 
      !isActivity // Skip activity log when isActivity is false
    )

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * DELETE /api/users
 * Delete a user
 * Only admins can delete users
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Parse request body
    const body = await request.json()
    const { userId } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: userId' 
        },
        { status: 400 }
      )
    }

    // Use service to delete user
    await UsersService.deleteUser(currentUser, userId)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 