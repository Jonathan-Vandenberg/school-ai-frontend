import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogService, AuthService, handleServiceError } from '@/lib/services'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = await AuthService.getAuthenticatedUser()
    
    // Only admins can view activity logs
    if (user.customRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can view activity logs' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const userId = searchParams.get('userId') || undefined
    const type = searchParams.get('type') || undefined
    const classId = searchParams.get('classId') || undefined
    const assignmentId = searchParams.get('assignmentId') || undefined
    
    // Parse date filters
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    // Get activity logs
    const result = await ActivityLogService.getActivityLogs({
      page,
      limit,
      userId,
      type: type as any,
      classId,
      assignmentId,
      startDate,
      endDate,
    })

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('Activity logs API error:', error)
    return handleServiceError(error)
  }
} 