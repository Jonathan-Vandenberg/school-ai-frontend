import { StatisticsService } from '../services/statistics.service'
import { prisma } from '../db'
import cron from 'node-cron'

/**
 * Scheduled Statistics Update Task
 * 
 * This task runs hourly to keep statistics up-to-date:
 * 1. Update school-wide statistics
 * 2. Update class statistics for all classes
 * 3. Clean up old performance metrics
 * 
 * This replaces expensive real-time calculations with 
 * efficient pre-aggregated statistics updates.
 */
export function createStatisticsUpdateTask() {
  console.log('Registering statistics update task...')
  
  // Schedule the task to run every hour
  const task = cron.schedule('0 * * * *', async () => {
    const now = new Date()
    const timestamp = now.toISOString()
    
    try {
      await updateDailyStatistics()
    } catch (error) {
      console.error(`❌ [${timestamp}] Error in scheduled statistics update:`, error)
    }
  })

  return task
}

/**
 * Daily Statistics Update Task
 * 
 * This task should be run daily (via cron or similar) to:
 * 1. Update school-wide statistics
 * 2. Update class statistics for all classes
 * 3. Clean up old performance metrics
 * 
 * This replaces the expensive real-time calculations with 
 * efficient pre-aggregated statistics updates.
 */
export async function updateDailyStatistics() {
  console.log('Starting daily statistics update...')
  
  try {
    // 1. Update school-wide statistics
    console.log('Updating school statistics...')
    await StatisticsService.updateSchoolStatistics()
    
    // 2. Update all class statistics
    console.log('Updating class statistics...')
    const allClasses = await prisma.class.findMany({
      select: { id: true, name: true }
    })
    
    for (const classObj of allClasses) {
      try {
        await StatisticsService.updateClassStatistics(classObj.id)
        console.log(`Updated statistics for class: ${classObj.name}`)
      } catch (error) {
        console.error(`Error updating statistics for class ${classObj.name}:`, error)
        // Continue with other classes
      }
    }
    
    // 3. Update teacher statistics
    console.log('Updating teacher statistics...')
    const allTeachers = await prisma.user.findMany({
      where: { customRole: 'TEACHER' },
      select: { id: true, username: true }
    })
    
    for (const teacher of allTeachers) {
      try {
        await StatisticsService.updateTeacherStatistics(teacher.id)
        console.log(`Updated statistics for teacher: ${teacher.username}`)
      } catch (error) {
        console.error(`Error updating statistics for teacher ${teacher.username}:`, error)
        // Continue with other teachers
      }
    }
    
    // 4. Clean up old performance metrics (keep last 90 days)
    console.log('Cleaning up old performance metrics...')
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)
    
    const deletedMetrics = await prisma.performanceMetric.deleteMany({
      where: {
        date: { lt: cutoffDate }
      }
    })
    
    console.log(`Deleted ${deletedMetrics.count} old performance metrics`)
    
    // 5. Clean up old school statistics (keep last 365 days)
    console.log('Cleaning up old school statistics...')
    const schoolStatsCutoff = new Date()
    schoolStatsCutoff.setDate(schoolStatsCutoff.getDate() - 365)
    
    const deletedSchoolStats = await prisma.schoolStats.deleteMany({
      where: {
        date: { lt: schoolStatsCutoff }
      }
    })
    
    console.log(`Deleted ${deletedSchoolStats.count} old school statistics records`)
    
    console.log('Daily statistics update completed successfully!')
    
    return {
      success: true,
      classesUpdated: allClasses.length,
      teachersUpdated: allTeachers.length,
      metricsDeleted: deletedMetrics.count,
      schoolStatsDeleted: deletedSchoolStats.count
    }
    
  } catch (error) {
    console.error('Error during daily statistics update:', error)
    throw error
  }
}

/**
 * Initialize statistics for all existing assignments
 * Run this once when deploying the new statistics system
 */
export async function initializeAllStatistics() {
  console.log('Initializing statistics for all existing data...')
  
  try {
    // Get all assignments
    const assignments = await prisma.assignment.findMany({
      select: { id: true, topic: true }
    })
    
    console.log(`Found ${assignments.length} assignments to initialize`)
    
    for (const assignment of assignments) {
      try {
        // This will create initial statistics records
        await StatisticsService.updateAssignmentStatistics(assignment.id, '', false, false)
        console.log(`Initialized statistics for assignment: ${assignment.topic}`)
      } catch (error) {
        console.error(`Error initializing statistics for assignment ${assignment.topic}:`, error)
        // Continue with other assignments
      }
    }
    
    // Initialize student statistics
    const students = await prisma.user.findMany({
      where: { customRole: 'STUDENT' },
      select: { id: true, username: true }
    })
    
    console.log(`Found ${students.length} students to initialize`)
    
    for (const student of students) {
      try {
        // This will create initial student statistics
        await StatisticsService.updateStudentStatistics(student.id, '', false, false)
        console.log(`Initialized statistics for student: ${student.username}`)
      } catch (error) {
        console.error(`Error initializing statistics for student ${student.username}:`, error)
        // Continue with other students
      }
    }
    
    // Run daily statistics update to populate all aggregated data
    await updateDailyStatistics()
    
    console.log('Statistics initialization completed successfully!')
    
    return {
      success: true,
      assignmentsInitialized: assignments.length,
      studentsInitialized: students.length
    }
    
  } catch (error) {
    console.error('Error during statistics initialization:', error)
    throw error
  }
}

/**
 * Utility function to recalculate statistics for a specific assignment
 * Useful for fixing data inconsistencies
 */
export async function recalculateAssignmentStatistics(assignmentId: string) {
  console.log(`Recalculating statistics for assignment ${assignmentId}...`)
  
  try {
    // Delete existing statistics
    await prisma.assignmentStats.deleteMany({
      where: { assignmentId }
    })
    
    // Get all progress for this assignment
    const progresses = await prisma.studentAssignmentProgress.findMany({
      where: { 
        assignmentId,
        isComplete: true 
      },
      select: {
        studentId: true,
        isCorrect: true
      }
    })
    
    // Recalculate by replaying all progress submissions
    for (const progress of progresses) {
      await StatisticsService.updateAssignmentStatistics(
        assignmentId, 
        progress.studentId, 
        progress.isCorrect, 
        true
      )
    }
    
    console.log(`Recalculated statistics for assignment ${assignmentId}`)
    
    return { success: true, progressRecordsProcessed: progresses.length }
    
  } catch (error) {
    console.error(`Error recalculating statistics for assignment ${assignmentId}:`, error)
    throw error
  }
} 