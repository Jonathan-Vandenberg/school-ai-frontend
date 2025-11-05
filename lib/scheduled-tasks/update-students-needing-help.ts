import cron from 'node-cron'
import { prisma, withTransaction } from '../db'
import { StudentsNeedingHelpService } from '../services/students-needing-help.service'

/**
 * Students Needing Help update scheduled task
 * Uses the StudentsNeedingHelpService for consistent analysis logic
 * Runs every 10 minutes for responsive testing
 */
export function createStudentsNeedingHelpTask() {
  console.log('Registering students needing help update task...')
  
  // Schedule the task to run every 10 minutes for responsive testing
  const task = cron.schedule('*/10 * * * *', async () => {
    const now = new Date()
    const timestamp = now.toISOString()
    
    try {
      await withTransaction(async (tx) => {
        const result = await StudentsNeedingHelpService.analyzeAllStudents(tx)

        console.log(`📊 [${timestamp}] Students needing help analysis completed:`)
        console.log(`   ✅ Students processed: ${result.studentsProcessed}`)
        console.log(`   🚨 Currently needing help: ${result.currentlyNeedingHelp}`)
        console.log(`   📈 Total students analyzed: ${result.totalStudents}`)
        
        if (result.errors.length > 0) {
          console.log(`   ❌ Errors encountered: ${result.errors.length}`)
          result.errors.slice(0, 5).forEach(error => console.log(`      - ${error}`))
          if (result.errors.length > 5) {
            console.log(`      ... and ${result.errors.length - 5} more`)
          }
        }
      })
    } catch (error) {
      console.error(`❌ [${timestamp}] Error in students needing help task:`, error)
    }
  })

  return task
}

/**
 * Manually run the students needing help analysis using the service
 */
export async function runStudentsNeedingHelpAnalysis() {
  console.log('Running manual students needing help analysis...')
  
  return await withTransaction(async (tx) => {
    return await StudentsNeedingHelpService.analyzeAllStudents(tx)
  })
} 