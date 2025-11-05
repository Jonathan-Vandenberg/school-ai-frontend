import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { StudentWeeklyResultsService } from '@/lib/services/student-weekly-results.service'
import { emailService } from '@/lib/services/email.service'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (teacher or admin)
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Check if user is teacher or admin
    if (currentUser.customRole !== 'ADMIN' && currentUser.customRole !== 'TEACHER') {
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: 'Teacher or Admin access required' 
      }, { 
        status: 403 
      })
    }

    const body = await request.json()
    const { studentId, language = 'both' } = body

    if (!studentId) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'studentId is required' 
      }, { 
        status: 400 
      })
    }

    // Check if email service is available
    if (!emailService.isAvailable()) {
      return NextResponse.json({ 
        error: 'Service unavailable', 
        details: 'Email service is not configured' 
      }, { 
        status: 503 
      })
    }

    // Get current week boundaries (from Monday to today)
    const { weekStart, weekEnd } = StudentWeeklyResultsService.getCurrentWeekBoundaries()
    
    console.log(`Sending weekly report for student ${studentId} (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})`)

    // Get student weekly results
    const studentResult = await StudentWeeklyResultsService.getStudentWeeklyResult(
      studentId,
      weekStart,
      weekEnd
    )

    if (!studentResult) {
      return NextResponse.json({
        success: false,
        data: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          language,
          processed: 0,
          sent: 0,
          failed: 1,
          errors: ['No data found for the specified student and week'],
        },
      })
    }

    // Skip if no parent email
    if (!studentResult.parentEmail) {
      return NextResponse.json({
        success: false,
        data: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          language,
          processed: 0,
          sent: 0,
          failed: 1,
          errors: ['No parent email found for student'],
        },
      })
    }

    // Get host from request headers
    const host = request.headers.get('host') || undefined

    // Send reports based on language preference
    let sent = 0
    let failed = 0
    const errors: string[] = []

    if (language === 'both' || language === 'en') {
      try {
        const success = await emailService.sendWeeklyParentReport(studentResult, 'en', host)
        if (success) {
          sent++
        } else {
          failed++
          errors.push('Failed to send English report')
        }
      } catch (error) {
        failed++
        errors.push(`Error sending English report: ${error}`)
      }
    }

    if (language === 'both' || language === 'vi') {
      try {
        const success = await emailService.sendWeeklyParentReport(studentResult, 'vi', host)
        if (success) {
          sent++
        } else {
          failed++
          errors.push('Failed to send Vietnamese report')
        }
      } catch (error) {
        failed++
        errors.push(`Error sending Vietnamese report: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        language,
        processed: 1,
        sent,
        failed,
        errors,
        studentName: studentResult.studentName,
        parentEmail: studentResult.parentEmail,
      },
    })

  } catch (error) {
    console.error('Error in class weekly reports API:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'Authentication required' 
      }, { 
        status: 401 
      })
    }

    return NextResponse.json({ 
      error: 'Internal server error', 
      details: 'Failed to send weekly reports' 
    }, { 
      status: 500 
    })
  }
}
