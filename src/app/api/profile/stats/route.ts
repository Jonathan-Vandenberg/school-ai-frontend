import { NextRequest, NextResponse } from 'next/server'
import { AuthService, ClassesService, AssignmentsService, handleServiceError } from '@/lib/services'
import { StatisticsService } from '@/lib/services/statistics.service'
import { prisma } from '@/lib/db'
import { withAppRouterMetrics } from '@/app/lib/withMetrics'

/**
 * GET /api/profile/stats
 * Get profile statistics for the current user
 * Returns different metrics based on user role (TEACHER, STUDENT, ADMIN)
 */
async function getProfileStats(request: NextRequest): Promise<Response> {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const stats: any = {
      role: currentUser.customRole
    }

    if (currentUser.customRole === 'TEACHER') {
      // Get teacher's classes with student counts
      const classesResult = await ClassesService.listClasses(currentUser, { 
        page: 1, 
        limit: 1000 // Get all classes for counting
      })
      
      // Get teacher's assignments
      const assignmentsResult = await AssignmentsService.listAssignments(currentUser, {
        page: 1,
        limit: 1000, // Get all assignments for counting
        teacherId: currentUser.id
      })

      // Calculate totals
      const totalClasses = classesResult.classes.length
      const totalStudents = classesResult.classes.reduce((sum, cls) => sum + (cls._count?.students || 0), 0)
      const totalAssignments = assignmentsResult.assignments.length

      stats.classes = totalClasses
      stats.students = totalStudents
      stats.assignments = totalAssignments

    } else if (currentUser.customRole === 'STUDENT') {
      // Use the new scalable StatisticsService for fast reads
      const studentStats = await StatisticsService.getStudentStatistics(currentUser.id)
      
      if (studentStats) {
        // Use pre-aggregated statistics
        stats.assignments = studentStats.totalAssignments
        stats.completedAssignments = studentStats.completedAssignments
        stats.averageScore = Math.round(studentStats.averageScore)
      } else {
        // Fallback if no stats exist yet (new student)
        stats.assignments = 0
        stats.completedAssignments = 0
        stats.averageScore = 0
      }

      // Get student's classes count (lightweight query)
      const studentClasses = await prisma.userClass.count({
        where: { userId: currentUser.id }
      })
      stats.classes = studentClasses

    } else if (currentUser.customRole === 'ADMIN') {
      // Admins see everything - reuse existing logic but get counts
      const classesResult = await ClassesService.listClasses(currentUser, { 
        page: 1, 
        limit: 1000 
      })
      
      const assignmentsResult = await AssignmentsService.listAssignments(currentUser, {
        page: 1,
        limit: 1000
      })

      stats.classes = classesResult.classes.length
      stats.assignments = assignmentsResult.assignments.length
      stats.students = classesResult.classes.reduce((sum, cls) => sum + (cls._count?.students || 0), 0)
      stats.teachers = classesResult.classes.reduce((sum, cls) => sum + (cls._count?.teachers || 0), 0)

    } else if (currentUser.customRole === 'PARENT') {
      // For parents, we'd need to implement child tracking
      // For now, return basic structure
      stats.children = 0
      stats.reports = 0
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

// Export the GET handler wrapped with metrics
export const GET = withAppRouterMetrics(getProfileStats) 