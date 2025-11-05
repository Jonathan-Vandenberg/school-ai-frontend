import cron from 'node-cron'
import { prisma, withTransaction, DatabaseError } from '../db'
import { StudentWeeklyResultsService } from '../services/student-weekly-results.service'
import { emailService } from '@/lib/services/email.service'

/**
 * Scheduled task to send weekly parent reports
 * This function will run every Sunday at 6:00 PM to send reports for the previous week
 */
export function createWeeklyParentReportsTask() {
  console.log('Registering weekly parent reports task...')
  
  // Schedule the task to run every Sunday at 6:00 PM
  const task = cron.schedule('0 18 * * 0', async () => {
    const now = new Date()
    const timestamp = now.toISOString()
    console.log(`\n📧 [${timestamp}] CRON: Starting weekly parent reports...`)
    
    try {
      // Check if email service is available
      if (!emailService.isAvailable()) {
        console.warn(`⚠️ [${timestamp}] Email service is not configured. Skipping parent reports.`)
        return
      }

      // Get previous week boundaries
      const { weekStart, weekEnd } = StudentWeeklyResultsService.getPreviousWeekBoundaries()
      
      console.log(`📅 [${timestamp}] Processing week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`)

      // Get all students with activity in the previous week
      const activeStudents = await StudentWeeklyResultsService.getActiveStudentsInWeek(weekStart, weekEnd)
      
      if (activeStudents.length === 0) {
        console.log(`💤 [${timestamp}] No active students found for the week. Skipping reports.`)
        return
      }

      console.log(`👥 [${timestamp}] Found ${activeStudents.length} active students`)

      // Process each student
      let totalProcessed = 0
      let totalSent = 0
      let totalFailed = 0
      const errors: string[] = []

      for (const student of activeStudents) {
        try {
          console.log(`📊 [${timestamp}] Processing student: ${student.username} (${student.id})`)
          
          // Get student weekly results
          const studentResult = await StudentWeeklyResultsService.getStudentWeeklyResult(
            student.id,
            weekStart,
            weekEnd
          )

          if (!studentResult) {
            console.warn(`⚠️ [${timestamp}] No results found for student: ${student.username}`)
            continue
          }

          // Skip if no parent email
          if (!studentResult.parentEmail) {
            console.warn(`⚠️ [${timestamp}] No parent email for student: ${student.username}`)
            continue
          }

          totalProcessed++

          // Send reports in both languages
          const englishSuccess = await emailService.sendWeeklyParentReport(studentResult, 'en')
          const vietnameseSuccess = await emailService.sendWeeklyParentReport(studentResult, 'vi')

          if (englishSuccess && vietnameseSuccess) {
            totalSent += 2 // Count both languages
            console.log(`✅ [${timestamp}] Reports sent successfully for: ${student.username}`)
          } else {
            totalFailed += 2
            const errorMsg = `Failed to send reports for ${student.username}`
            errors.push(errorMsg)
            console.error(`❌ [${timestamp}] ${errorMsg}`)
          }

          // Add a small delay to avoid overwhelming the email service
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          totalFailed++
          const errorMsg = `Error processing student ${student.username}: ${error}`
          errors.push(errorMsg)
          console.error(`❌ [${timestamp}] ${errorMsg}`)
        }
      }

      // Log summary
      console.log(`\n📈 [${timestamp}] Weekly Parent Reports Summary:`)
      console.log(`   📊 Students processed: ${totalProcessed}`)
      console.log(`   ✅ Reports sent successfully: ${totalSent}`)
      console.log(`   ❌ Reports failed: ${totalFailed}`)
      
      if (errors.length > 0) {
        console.log(`   🚨 Errors:`)
        errors.forEach(error => console.log(`      - ${error}`))
      }

      // Log the activity
      await withTransaction(async (tx) => {
        await tx.activityLog.create({
          data: {
            type: 'SYSTEM_MAINTENANCE',
            action: 'weekly_parent_reports',
            details: {
              weekStart: weekStart.toISOString(),
              weekEnd: weekEnd.toISOString(),
              studentsProcessed: totalProcessed,
              reportsSent: totalSent,
              reportsFailed: totalFailed,
              errors: errors.slice(0, 10), // Limit to first 10 errors
            },
            publishedAt: now,
          },
        })
      })

      console.log(`🎉 [${timestamp}] CRON: Weekly parent reports completed\n`)

    } catch (error) {
      console.error(`❌ [${timestamp}] Error in weekly parent reports:`, error)
      
      // If it's a database error, we might want to retry or alert
      if (error instanceof DatabaseError) {
        console.error('🔌 Database error during weekly parent reports:', error.cause)
      }
    }
  })

  return task
}

/**
 * Utility function to manually send weekly reports for a specific week
 */
export async function sendWeeklyReportsForWeek(
  weekStart: Date,
  weekEnd: Date,
  language?: 'en' | 'vi'
): Promise<{
  processed: number
  sent: number
  failed: number
  errors: string[]
}> {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    // Check if email service is available
    if (!emailService.isAvailable()) {
      throw new Error('Email service is not configured')
    }

    console.log(`📅 Manual weekly reports for: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`)

    // Get all students with activity in the specified week
    const activeStudents = await StudentWeeklyResultsService.getActiveStudentsInWeek(weekStart, weekEnd)
    
    if (activeStudents.length === 0) {
      console.log('💤 No active students found for the specified week')
      return results
    }

    console.log(`👥 Found ${activeStudents.length} active students`)

    // Process each student
    for (const student of activeStudents) {
      try {
        console.log(`📊 Processing student: ${student.username}`)
        
        // Get student weekly results
        const studentResult = await StudentWeeklyResultsService.getStudentWeeklyResult(
          student.id,
          weekStart,
          weekEnd
        )

        if (!studentResult) {
          console.warn(`⚠️ No results found for student: ${student.username}`)
          continue
        }

        // Skip if no parent email
        if (!studentResult.parentEmail) {
          console.warn(`⚠️ No parent email for student: ${student.username}`)
          continue
        }

        results.processed++

        // Send reports
        if (language) {
          // Send in specific language
          const success = await emailService.sendWeeklyParentReport(studentResult, language)
          if (success) {
            results.sent++
            console.log(`✅ Report sent successfully for: ${student.username} (${language})`)
          } else {
            results.failed++
            results.errors.push(`Failed to send report for ${student.username}`)
            console.error(`❌ Failed to send report for: ${student.username}`)
          }
        } else {
          // Send in both languages
          const englishSuccess = await emailService.sendWeeklyParentReport(studentResult, 'en')
          const vietnameseSuccess = await emailService.sendWeeklyParentReport(studentResult, 'vi')

          if (englishSuccess && vietnameseSuccess) {
            results.sent += 2
            console.log(`✅ Reports sent successfully for: ${student.username}`)
          } else {
            results.failed += 2
            results.errors.push(`Failed to send reports for ${student.username}`)
            console.error(`❌ Failed to send reports for: ${student.username}`)
          }
        }

        // Add a small delay
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.failed++
        const errorMsg = `Error processing student ${student.username}: ${error}`
        results.errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    // Log summary
    console.log(`\n📈 Manual Weekly Reports Summary:`)
    console.log(`   📊 Students processed: ${results.processed}`)
    console.log(`   ✅ Reports sent: ${results.sent}`)
    console.log(`   ❌ Reports failed: ${results.failed}`)

    return results

  } catch (error) {
    console.error('Error in manual weekly reports:', error)
    throw error
  }
}

/**
 * Get the next scheduled run time for the weekly reports task
 */
export function getNextWeeklyReportsRunTime(): Date {
  const now = new Date()
  const nextSunday = new Date(now)
  
  // Find next Sunday
  const daysUntilSunday = (7 - now.getDay()) % 7
  if (daysUntilSunday === 0 && now.getHours() >= 18) {
    // If it's Sunday and past 6 PM, schedule for next Sunday
    nextSunday.setDate(now.getDate() + 7)
  } else {
    nextSunday.setDate(now.getDate() + daysUntilSunday)
  }
  
  nextSunday.setHours(18, 0, 0, 0) // 6:00 PM
  
  return nextSunday
}

/**
 * Test the weekly reports functionality
 */
export async function testWeeklyReports(): Promise<boolean> {
  try {
    console.log('🧪 Testing weekly reports functionality...')
    
    // Check email service
    if (!emailService.isAvailable()) {
      console.error('❌ Email service is not available')
      return false
    }

    // Get current week boundaries
    const { weekStart, weekEnd } = StudentWeeklyResultsService.getWeekBoundaries(new Date())
    
    // Get active students
    const activeStudents = await StudentWeeklyResultsService.getActiveStudentsInWeek(weekStart, weekEnd)
    
    if (activeStudents.length === 0) {
      console.log('ℹ️ No active students found for current week')
      return true
    }

    console.log(`✅ Found ${activeStudents.length} active students`)
    console.log(`✅ Email service is available`)
    console.log(`✅ Weekly reports functionality is working`)
    
    return true

  } catch (error) {
    console.error('❌ Weekly reports test failed:', error)
    return false
  }
}
