import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { sendWeeklyReportsForWeek, testWeeklyReports, getNextWeeklyReportsRunTime } from '@/lib/scheduled-tasks/weekly-parent-reports'
import { StudentWeeklyResultsService } from '@/lib/services/student-weekly-results.service'
import { emailService } from '@/lib/services/email.service'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (admin only)
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Check if user is admin
    if (currentUser.customRole !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: 'Admin access required' 
      }, { 
        status: 403 
      })
    }

    const body = await request.json()
    const { action, weekStart, weekEnd, language, testEmail, studentId } = body

    switch (action) {
      case 'send_reports':
        return await handleSendReports(weekStart, weekEnd, language, studentId, request)
      
      case 'test_email':
        return await handleTestEmail(testEmail)
      
      case 'test_functionality':
        return await handleTestFunctionality()
      
      case 'get_next_run':
        return await handleGetNextRun()
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action', 
          details: 'Supported actions: send_reports, test_email, test_functionality, get_next_run' 
        }, { 
          status: 400 
        })
    }

  } catch (error) {
    console.error('Error in weekly reports API:', error)
    
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
      details: 'Failed to process request' 
    }, { 
      status: 500 
    })
  }
}

async function handleSendReports(weekStart?: string, weekEnd?: string, language?: 'en' | 'vi', studentId?: string, request?: NextRequest) {
  try {
    let startDate: Date
    let endDate: Date

    if (weekStart && weekEnd) {
      startDate = new Date(weekStart)
      endDate = new Date(weekEnd)
    } else {
      // Use current week by default (from Monday to today)
      const { weekStart: currentWeekStart, weekEnd: currentWeekEnd } = StudentWeeklyResultsService.getCurrentWeekBoundaries()
      startDate = currentWeekStart
      endDate = currentWeekEnd
    }

    console.log(`Manual weekly reports triggered for: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`)

    if (studentId) {
      // Send reports for a specific student
      const studentResult = await StudentWeeklyResultsService.getStudentWeeklyResult(
        studentId,
        startDate,
        endDate
      )

      if (!studentResult) {
        return NextResponse.json({
          success: false,
          data: {
            weekStart: startDate.toISOString(),
            weekEnd: endDate.toISOString(),
            language: language || 'both',
            processed: 0,
            sent: 0,
            failed: 1,
            errors: ['No data found for the specified student and week'],
          },
        })
      }

      // Get host from request headers
      const host = request?.headers.get('host') || undefined

      // Send reports for this student
      const englishSuccess = await emailService.sendWeeklyParentReport(studentResult, 'en', host)
      const vietnameseSuccess = await emailService.sendWeeklyParentReport(studentResult, 'vi', host)

      const sent = (englishSuccess ? 1 : 0) + (vietnameseSuccess ? 1 : 0)
      const failed = 2 - sent

      return NextResponse.json({
        success: true,
        data: {
          weekStart: startDate.toISOString(),
          weekEnd: endDate.toISOString(),
          language: language || 'both',
          processed: 1,
          sent,
          failed,
          errors: [],
        },
      })
    } else {
      // Send reports for all students (original behavior)
      const results = await sendWeeklyReportsForWeek(startDate, endDate, language)

      return NextResponse.json({
        success: true,
        data: {
          weekStart: startDate.toISOString(),
          weekEnd: endDate.toISOString(),
          language: language || 'both',
          ...results,
        },
      })
    }

  } catch (error) {
    console.error('Error sending weekly reports:', error)
    return NextResponse.json({ 
      error: 'Failed to send reports', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500 
    })
  }
}

async function handleTestEmail(testEmail: string) {
  try {
    if (!testEmail) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'testEmail is required' 
      }, { 
        status: 400 
      })
    }

    if (!emailService.isAvailable()) {
      return NextResponse.json({ 
        error: 'Service unavailable', 
        details: 'Email service is not configured' 
      }, { 
        status: 503 
      })
    }

    const success = await emailService.sendTestEmail(testEmail)

    return NextResponse.json({
      success,
      data: {
        email: testEmail,
        message: success ? 'Test email sent successfully' : 'Failed to send test email',
      },
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ 
      error: 'Failed to send test email', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500 
    })
  }
}

async function handleTestFunctionality() {
  try {
    const success = await testWeeklyReports()

    return NextResponse.json({
      success,
      data: {
        message: success ? 'Weekly reports functionality is working' : 'Weekly reports functionality has issues',
        emailServiceAvailable: emailService.isAvailable(),
      },
    })

  } catch (error) {
    console.error('Error testing functionality:', error)
    return NextResponse.json({ 
      error: 'Failed to test functionality', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500 
    })
  }
}

async function handleGetNextRun() {
  try {
    const nextRun = getNextWeeklyReportsRunTime()

    return NextResponse.json({
      success: true,
      data: {
        nextRun: nextRun.toISOString(),
        nextRunFormatted: nextRun.toLocaleString(),
        emailServiceAvailable: emailService.isAvailable(),
      },
    })

  } catch (error) {
    console.error('Error getting next run time:', error)
    return NextResponse.json({ 
      error: 'Failed to get next run time', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500 
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user (admin only)
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Check if user is admin
    if (currentUser.customRole !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: 'Admin access required' 
      }, { 
        status: 403 
      })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        return await handleGetStatus()
      
      case 'next_run':
        return await handleGetNextRun()
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action', 
          details: 'Supported actions: status, next_run' 
        }, { 
          status: 400 
        })
    }

  } catch (error) {
    console.error('Error in weekly reports GET API:', error)
    
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
      details: 'Failed to process request' 
    }, { 
      status: 500 
    })
  }
}

async function handleGetStatus() {
  try {
    const nextRun = getNextWeeklyReportsRunTime()
    const { weekStart, weekEnd } = StudentWeeklyResultsService.getPreviousWeekBoundaries()
    
    // Get count of active students from previous week
    const activeStudents = await StudentWeeklyResultsService.getActiveStudentsInWeek(weekStart, weekEnd)

    return NextResponse.json({
      success: true,
      data: {
        emailServiceAvailable: emailService.isAvailable(),
        nextRun: nextRun.toISOString(),
        nextRunFormatted: nextRun.toLocaleString(),
        previousWeek: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          activeStudents: activeStudents.length,
        },
        configuration: {
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS),
          openaiConfigured: !!process.env.OPENAI_API_KEY,
        },
      },
    })

  } catch (error) {
    console.error('Error getting status:', error)
    return NextResponse.json({ 
      error: 'Failed to get status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500 
    })
  }
}