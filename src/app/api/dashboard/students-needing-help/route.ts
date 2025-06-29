import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { StudentsNeedingHelpService } from '@/lib/services/students-needing-help.service'

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const currentUser = await AuthService.getAuthenticatedUser(request)

    // Only admins and teachers can view this data
    if (currentUser.customRole !== 'ADMIN' && currentUser.customRole !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get students needing help using the service
    const result = await StudentsNeedingHelpService.getStudentsNeedingHelp(currentUser)

    return NextResponse.json({
      success: true,
      students: result.students,
      summary: result.summary
    })

  } catch (error) {
    console.error('Error fetching students needing help:', error)
    
    if (error instanceof Error && error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch students needing help' },
      { status: 500 }
    )
  }
} 