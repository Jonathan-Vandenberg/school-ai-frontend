import { StatisticsService } from '../lib/services/statistics.service'
import { prisma } from '../lib/db'

/**
 * Fix corrupted student statistics
 * This script recalculates student stats to fix issues where completedAssignments > totalAssignments
 */
async function fixStudentStats() {
  try {
    console.log('🔧 Fixing corrupted student statistics...')

    // Find all students with corrupted stats (completedAssignments > totalAssignments)
    const corruptedStats = await prisma.$queryRaw<any[]>`
      SELECT * FROM "StudentStats" 
      WHERE "completedAssignments" > "totalAssignments"
    `
    
    // Get the full records with student info
    const corruptedStudentIds = corruptedStats.map(stat => stat.studentId)
    const corruptedStatsWithStudents = await prisma.studentStats.findMany({
      where: {
        studentId: { in: corruptedStudentIds }
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    })

    console.log(`Found ${corruptedStatsWithStudents.length} students with corrupted stats`)

    for (const stats of corruptedStatsWithStudents) {
      console.log(`\n📊 Fixing stats for student: ${stats.student.username} (${stats.student.email})`)
      console.log(`  Before: ${stats.completedAssignments}/${stats.totalAssignments} completed assignments`)
      
      // Recalculate the statistics
      await StatisticsService.recalculateStudentStatistics(stats.studentId)
      
      // Get updated stats
      const updatedStats = await prisma.studentStats.findUnique({
        where: { studentId: stats.studentId }
      })
      
      if (updatedStats) {
        console.log(`  After:  ${updatedStats.completedAssignments}/${updatedStats.totalAssignments} completed assignments`)
        console.log(`  ✅ Fixed!`)
      }
    }

    // Also recalculate for specific student if needed
    const specificStudent = await prisma.user.findFirst({
      where: {
        email: 'student@gmail.com'
      }
    })

    if (specificStudent) {
      console.log(`\n🎯 Recalculating stats for specific student: ${specificStudent.username}`)
      await StatisticsService.recalculateStudentStatistics(specificStudent.id)
      
      const finalStats = await prisma.studentStats.findUnique({
        where: { studentId: specificStudent.id }
      })
      
      if (finalStats) {
        console.log(`Final stats: ${finalStats.completedAssignments}/${finalStats.totalAssignments} completed assignments`)
        console.log(`Average score: ${finalStats.averageScore}%`)
        console.log(`Completion rate: ${finalStats.completionRate}%`)
      }
    }

    console.log('\n✅ Student statistics fix completed!')

  } catch (error) {
    console.error('❌ Error fixing student statistics:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixStudentStats() 