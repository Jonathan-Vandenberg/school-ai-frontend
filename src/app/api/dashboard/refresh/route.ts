import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, isAdmin } from '@/lib/auth'
import { StatisticsService } from '@/lib/services/statistics.service'
import { AssignmentsService } from '@/lib/services/assignments.service'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and require admin access
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin access for refresh functionality
    if (!isAdmin(session.user.customRole)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    console.log('🔄 Starting comprehensive dashboard refresh...')

    // Step 1: Delete all existing statistics to start fresh
    console.log('🧹 Clearing existing statistics...')
    const [deletedSnapshots, deletedSchoolStats, deletedAssignmentStats, deletedStudentStats] = await Promise.all([
      prisma.dashboardSnapshot.deleteMany({}),
      prisma.schoolStats.deleteMany({}),
      prisma.assignmentStats.deleteMany({}),
      prisma.studentStats.deleteMany({})
    ])
    
    console.log(`✅ Deleted ${deletedSnapshots.count} dashboard snapshots`)
    console.log(`✅ Deleted ${deletedSchoolStats.count} school statistics`)
    console.log(`✅ Deleted ${deletedAssignmentStats.count} assignment statistics`) 
    console.log(`✅ Deleted ${deletedStudentStats.count} student statistics`)

    // Step 2: Recalculate assignment statistics from scratch with corrected logic
    console.log('🔄 Recalculating assignment statistics...')
    const assignments = await prisma.assignment.findMany({
      select: { id: true }
    })

    for (const assignment of assignments) {
      try {
        await StatisticsService.recalculateAssignmentStatistics(assignment.id)
        console.log(`✅ Recalculated statistics for assignment ${assignment.id}`)
      } catch (error) {
        console.error(`❌ Failed to recalculate assignment ${assignment.id}:`, error)
      }
    }

    // Step 3: Recalculate student statistics for all students from existing progress data
    console.log('🔄 Recalculating student statistics...')
    const students = await prisma.user.findMany({
      where: { customRole: 'STUDENT' },
      select: { id: true, username: true }
    })

    for (const student of students) {
      try {
        await StatisticsService.recalculateStudentStatistics(student.id)
        console.log(`✅ Recalculated statistics for student ${student.username} (${student.id})`)
      } catch (error) {
        console.error(`❌ Failed to recalculate student ${student.id}:`, error)
      }
    }

    // Step 4: Recalculate school-wide statistics from the fresh assignment stats
    console.log('🔄 Recalculating school-wide statistics...')
    try {
      await StatisticsService.updateSchoolStatistics()
      console.log('✅ StatisticsService.updateSchoolStatistics() completed successfully')
    } catch (serviceError: any) {
      console.error('❌ StatisticsService failed:', serviceError)
      throw new Error(`StatisticsService.updateSchoolStatistics failed: ${serviceError?.message || 'Unknown error'}`)
    }

    // Step 5: Recalculate class statistics for all classes
    console.log('🔄 Recalculating class statistics...')
    const classes = await prisma.class.findMany({
      select: { id: true, name: true }
    })

    for (const classObj of classes) {
      try {
        await StatisticsService.updateClassStatistics(classObj.id)
        console.log(`✅ Recalculated statistics for class ${classObj.name} (${classObj.id})`)
      } catch (error) {
        console.error(`❌ Failed to recalculate class ${classObj.id}:`, error)
      }
    }

    // Step 6: Verify what was created and create dashboard snapshot
    const newStats = await StatisticsService.getSchoolStatistics()
    
    if (newStats) {
      console.log('📊 Verification - Created school stats:', {
        totalStudents: newStats.totalStudents,
        totalAssignments: newStats.totalAssignments,
        totalQuestions: newStats.totalQuestions,
        totalAnswers: newStats.totalAnswers,
        totalCorrectAnswers: newStats.totalCorrectAnswers,
        completedStudents: newStats.completedStudents,
        inProgressStudents: newStats.inProgressStudents,
        notStartedStudents: newStats.notStartedStudents,
        averageCompletionRate: newStats.averageCompletionRate,
        studentsNeedingHelp: newStats.studentsNeedingHelp
      })

      // Create a fresh dashboard snapshot
      await prisma.dashboardSnapshot.create({
        data: {
          timestamp: new Date(),
          snapshotType: 'daily',
          totalClasses: newStats.totalClasses,
          totalTeachers: newStats.totalTeachers,
          totalStudents: newStats.totalStudents,
          totalAssignments: newStats.totalAssignments,
          classAssignments: 0,
          individualAssignments: 0,
          averageCompletionRate: Math.round(newStats.averageCompletionRate),
          averageSuccessRate: newStats.totalAnswers > 0 ? 
            Math.round((newStats.totalCorrectAnswers / newStats.totalAnswers) * 100) : 0,
          studentsNeedingAttention: newStats.studentsNeedingHelp,
          recentActivities: newStats.totalAnswers
        }
      })
      console.log('✅ Created fresh dashboard snapshot')
    }

    console.log('🎉 Comprehensive dashboard refresh completed successfully!')

    return NextResponse.json({ 
      success: true, 
      message: 'Dashboard refreshed successfully with recalculated statistics',
      deletedSnapshots: deletedSnapshots.count,
      deletedSchoolStats: deletedSchoolStats.count,
              deletedAssignmentStats: deletedAssignmentStats.count,
        deletedStudentStats: deletedStudentStats.count,
        recalculatedAssignments: assignments.length,
        recalculatedStudents: students.length,
        recalculatedClasses: classes.length,
      createdStats: newStats ? {
        totalStudents: newStats.totalStudents,
        totalQuestions: newStats.totalQuestions,
        totalAnswers: newStats.totalAnswers,
        totalCorrectAnswers: newStats.totalCorrectAnswers,
        completedStudents: newStats.completedStudents,
        averageCompletionRate: newStats.averageCompletionRate
      } : null
    })

  } catch (error) {
    console.error('❌ Dashboard refresh error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to refresh dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 