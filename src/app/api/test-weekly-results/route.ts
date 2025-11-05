import { NextRequest, NextResponse } from 'next/server'
import { StudentWeeklyResultsService } from '@/lib/services/student-weekly-results.service'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing student weekly results service...')
    
    // Get previous week boundaries
    const { weekStart, weekEnd } = StudentWeeklyResultsService.getPreviousWeekBoundaries()
    console.log('Week range:', weekStart.toISOString(), 'to', weekEnd.toISOString())
    
    // Get active students in the previous week
    const activeStudents = await StudentWeeklyResultsService.getActiveStudentsInWeek(weekStart, weekEnd)
    console.log('Active students found:', activeStudents.length)
    
    // Get weekly results for all students
    const weeklyResults = await StudentWeeklyResultsService.getWeeklyResultsForAllStudents(weekStart, weekEnd)
    console.log('Weekly results found:', weeklyResults.length)
    
    return NextResponse.json({
      success: true,
      data: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        activeStudents: activeStudents.length,
        weeklyResults: weeklyResults.length,
        students: activeStudents.map(s => ({
          id: s.id,
          username: s.username,
          email: s.email
        })),
        results: weeklyResults.map(r => ({
          studentId: r.studentId,
          studentName: r.studentName,
          parentEmail: r.parentEmail,
          assignments: r.assignments.length,
          quizzes: r.quizzes.length,
          overallStats: r.overallStats
        }))
      }
    })
    
  } catch (error) {
    console.error('❌ Error in weekly results test:', error)
    return NextResponse.json({ 
      error: 'Weekly results test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500 
    })
  }
}
