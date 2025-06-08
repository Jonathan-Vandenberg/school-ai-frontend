import { NextRequest, NextResponse } from 'next/server'
import { AuthService, ClassesService, handleServiceError } from '@/lib/services'

/**
 * GET /api/classes
 * List classes with filtering and pagination, or get available users for class creation
 * Role-based access: Admins/Teachers see all, Students see only their classes
 * Query params: ?users=available to get available students and teachers
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const users = searchParams.get('users')
    
    // If requesting available users for class creation
    if (users === 'available') {
      const [availableStudents, allTeachers] = await Promise.all([
        ClassesService.getAvailableStudents(currentUser),
        ClassesService.getAllTeachers(currentUser)
      ])

      return NextResponse.json({
        success: true,
        data: {
          students: availableStudents,
          teachers: allTeachers
        }
      })
    }
    
    // Original classes listing logic
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    // Use service to get classes
    const result = await ClassesService.listClasses(currentUser, {
      page,
      limit,
      search: search || undefined,
    })

    return NextResponse.json({
      success: true,
      data: result.classes,
      pagination: result.pagination,
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * POST /api/classes
 * Create a new class
 * Only admins and teachers can create classes
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Parse request body
    const body = await request.json()
    const { name, description, teacherIds, studentIds } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: name' 
        },
        { status: 400 }
      )
    }

    // Use service to create class
    const newClass = await ClassesService.createClass(currentUser, {
      name,
      description,
      teacherIds,
      studentIds,
    })

    return NextResponse.json({
      success: true,
      data: newClass,
      message: 'Class created successfully',
    }, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * PUT /api/classes
 * Update a class
 * Only admins and teachers can update classes
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Parse request body
    const body = await request.json()
    const { classId, name, description, teacherIds, studentIds } = body

    // Validate required fields
    if (!classId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: classId' 
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (teacherIds !== undefined) updateData.teacherIds = teacherIds
    if (studentIds !== undefined) updateData.studentIds = studentIds

    // Use service to update class
    const updatedClass = await ClassesService.updateClass(currentUser, classId, updateData)

    return NextResponse.json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully',
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * DELETE /api/classes
 * Delete a class
 * Only admins can delete classes
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Parse request body
    const body = await request.json()
    const { classId } = body

    // Validate required fields
    if (!classId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: classId' 
        },
        { status: 400 }
      )
    }

    // Use service to delete class
    await ClassesService.deleteClass(currentUser, classId)

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully',
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 