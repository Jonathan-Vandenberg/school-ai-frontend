import { NextRequest, NextResponse } from 'next/server'
import { runStudentsNeedingHelpAnalysis } from '@/lib/scheduled-tasks/update-students-needing-help'
import { activateMissedAssignments } from '@/lib/scheduled-tasks/publish-scheduled-assignments'

export async function GET(request: NextRequest) {
  const logs: string[] = []
  
  // Override console.log to capture logs
  const originalLog = console.log
  const originalError = console.error
  
  console.log = (...args) => {
    logs.push(`[LOG] ${args.join(' ')}`)
    originalLog(...args)
  }
  
  console.error = (...args) => {
    logs.push(`[ERROR] ${args.join(' ')}`)
    originalError(...args)
  }

  try {
    const timestamp = new Date().toISOString()
    console.log(`🧪 [${timestamp}] TEST: Manual cron task execution started`)
    
    // Test the assignment activation
    console.log('🎯 Testing assignment activation...')
    const assignmentResult = await activateMissedAssignments()
    console.log(`📊 Assignment activation result: ${assignmentResult.activated} activated, ${assignmentResult.errors.length} errors`)
    
    // Test the students needing help analysis
    console.log('👥 Testing students needing help analysis...')
    const helpResult = await runStudentsNeedingHelpAnalysis()
    console.log(`📊 Help analysis result: ${helpResult.studentsNeedingHelp} need help, ${helpResult.studentsResolved} resolved`)
    
    console.log(`✅ [${timestamp}] TEST: Manual cron task execution completed`)
    
    // Restore original console
    console.log = originalLog
    console.error = originalError
    
    return NextResponse.json({
      success: true,
      timestamp,
      results: {
        assignments: assignmentResult,
        help: helpResult
      },
      logs: logs
    })
    
  } catch (error) {
    // Restore original console
    console.log = originalLog
    console.error = originalError
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs: logs
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request) // Same functionality for POST
} 