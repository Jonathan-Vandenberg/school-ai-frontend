import { prisma, withTransaction } from '../db'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError } from './auth.service'

export interface StudentNeedingHelpData {
  id: string
  studentId: string
  reasons: string[]
  needsHelpSince: Date
  daysNeedingHelp: number
  overdueAssignments: number
  averageScore: number
  completionRate: number
  isResolved: boolean
  severity: 'CRITICAL' | 'WARNING' | 'RECENT'
  teacherNotes?: string
  actionsTaken?: string[]
  student: {
    id: string
    username: string
    email?: string
  }
  classes: Array<{
    class: {
      id: string
      name: string
    }
  }>
  teachers: Array<{
    teacher: {
      id: string
      username: string
    }
  }>
}

export interface StudentsNeedingHelpSummary {
  total: number
  critical: number
  warning: number
  recent: number
}

/**
 * Students Needing Help Service
 * Handles identification, tracking, and management of students who need academic assistance
 */
export class StudentsNeedingHelpService {
  /**
   * Get all students currently needing help with role-based filtering
   */
  static async getStudentsNeedingHelp(
    currentUser: AuthenticatedUser
  ): Promise<{ students: StudentNeedingHelpData[], summary: StudentsNeedingHelpSummary }> {
    AuthService.requireTeacherOrAdmin(currentUser)

    // Build where clause based on user role
    let whereClause: any = {
      isResolved: false
    }

    // If user is a teacher, only show students from their classes
    if (currentUser.customRole === 'TEACHER') {
      whereClause = {
        ...whereClause,
        teachers: {
          some: {
            teacherId: currentUser.id
          }
        }
      }
    }
    // If user is ADMIN, show all students (no additional filter needed)

    // Fetch current students needing help from database
    const studentsNeedingHelp = await prisma.studentsNeedingHelp.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        classes: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        daysNeedingHelp: 'desc'
      }
    })

    const summary = {
      total: studentsNeedingHelp.length,
      critical: studentsNeedingHelp.filter(s => s.severity === 'CRITICAL').length,
      warning: studentsNeedingHelp.filter(s => s.severity === 'WARNING').length,
      recent: studentsNeedingHelp.filter(s => s.severity === 'RECENT').length
    }

    return {
      students: studentsNeedingHelp as StudentNeedingHelpData[],
      summary
    }
  }

  /**
   * Get count of students needing help for dashboard
   */
  static async getStudentsNeedingHelpCount(): Promise<number> {
    return await prisma.studentsNeedingHelp.count({
      where: {
        isResolved: false
      }
    })
  }

  /**
   * Update student help status based on comprehensive analysis
   * This is the main method that should be called when student performance changes
   */
  static async updateStudentHelpStatus(
    studentId: string, 
    assignmentId: string = 'bulk-analysis', 
    completionPercentage: number = 0, 
    accuracy: number = 0, 
    tx?: any
  ) {
    try {
      const db = tx || prisma
      const currentDate = new Date()

      // Get student and assignment details
      const [student, assignment] = await Promise.all([
        db.user.findUnique({
          where: { id: studentId },
          select: { id: true, username: true, email: true }
        }),
        assignmentId !== 'bulk-analysis' && assignmentId !== 'manual-analysis' && assignmentId !== 'manual-fix'
          ? db.assignment.findUnique({
              where: { id: assignmentId },
              select: { 
                id: true, 
                topic: true, 
                teacherId: true,
                classes: {
                  include: {
                    class: {
                      select: { id: true }
                    }
                  }
                }
              }
            })
          : null
      ])

      if (!student) {
        return
      }

      // Get student's classes
      const studentClasses = await db.userClass.findMany({
        where: { userId: studentId },
        select: { classId: true }
      })
      const classIds = studentClasses.map((uc: { classId: string }) => uc.classId)

      // Get student's overall statistics for accurate analysis
      const studentStats = await db.studentStats.findUnique({
        where: { studentId: studentId },
        select: { 
          averageScore: true, 
          completionRate: true,
          completedAssignments: true,
          totalAssignments: true
        }
      })

      // Use overall statistics instead of single assignment performance
      const overallAverageScore = studentStats?.averageScore || 0
      const overallCompletionRate = studentStats?.completionRate || 0

      // Calculate current overdue assignments count using comprehensive query
      const overdueAssignments = await db.assignment.count({
        where: {
          dueDate: { lt: currentDate },
          isActive: true,
          OR: [
            // Class assignments where student is enrolled
            {
              classes: {
                some: {
                  class: {
                    users: {
                      some: { userId: studentId }
                    }
                  }
                }
              }
            },
            // Individual assignments for this student
            {
              students: {
                some: { userId: studentId }
              }
            }
          ],
          // Assignment is not fully completed by this student
          NOT: {
            questions: {
              every: {
                progresses: {
                  some: {
                    studentId: studentId,
                    isComplete: true
                  }
                }
              }
            }
          }
        }
      })

      // Determine if student needs help based on OVERALL completion and score
      const reasons: string[] = []
      let needsHelp = false

      // Only evaluate students who have assignments assigned to them
      const totalAssignments = studentStats?.totalAssignments || 0
      if (totalAssignments > 0) {
        // Check if student has low overall completion rate
        if (overallCompletionRate < 50) {
          reasons.push('Low overall completion rate')
          needsHelp = true
        }
        
        // Check if student has low overall accuracy (even if completing assignments)
        if (overallAverageScore < 50) {
          reasons.push('Low average score')
          needsHelp = true
        }

        // Check if student has overdue assignments
        if (overdueAssignments > 0) {
          reasons.push(`${overdueAssignments} overdue assignment${overdueAssignments === 1 ? '' : 's'}`)
          needsHelp = true
        }
      }
      // Students with 0 assignments don't need help - they just haven't been assigned work yet

      // Get existing help record (there can only be one per student now)
      const existingRecord = await db.studentsNeedingHelp.findUnique({
        where: { studentId: studentId }
      })

      if (needsHelp) {
        if (existingRecord) {
          // Update existing record
          await db.studentsNeedingHelp.update({
            where: { id: existingRecord.id },
            data: {
              reasons: reasons,
              daysNeedingHelp: Math.max(1, Math.ceil((currentDate.getTime() - existingRecord.needsHelpSince.getTime()) / (1000 * 60 * 60 * 24))),
              overdueAssignments: overdueAssignments,
              averageScore: overallAverageScore,
              completionRate: overallCompletionRate,
              severity: 'RECENT',
              isResolved: false,
              resolvedAt: null,
              updatedAt: currentDate
            }
          })
        } else {
          // Create new record
          const record = await db.studentsNeedingHelp.create({
            data: {
              studentId: studentId,
              reasons: reasons,
              needsHelpSince: currentDate,
              daysNeedingHelp: 1,
              overdueAssignments: overdueAssignments,
              averageScore: overallAverageScore,
              completionRate: overallCompletionRate,
              severity: 'RECENT',
              isResolved: false
            }
          })

          // Link to classes
          for (const classId of classIds) {
            await db.studentsNeedingHelpClass.create({
              data: {
                studentNeedingHelpId: record.id,
                classId: classId
              }
            })
          }

          // Link to teacher if we have assignment context
          if (assignment?.teacherId) {
            await db.studentsNeedingHelpTeacher.create({
              data: {
                studentNeedingHelpId: record.id,
                teacherId: assignment.teacherId
              }
            })
          }
        }
      } else if (overallCompletionRate >= 50 && overallAverageScore >= 50 && overdueAssignments === 0) {
        // Student's overall performance is good and no overdue assignments, remove help record if it exists
        if (existingRecord) {
          await db.studentsNeedingHelp.delete({
            where: { id: existingRecord.id }
          })
        }
      }

    } catch (error) {
      console.error(`Error updating help status for student ${studentId}:`, error)
      // If we're in a transaction, throw the error to rollback
      if (tx) {
        throw error
      }
      // If not in a transaction, just log and continue to avoid breaking assignment submission
    }
  }

  /**
   * Bulk analyze all students and update their help status
   * Used by cron jobs and manual analysis
   */
  static async analyzeAllStudents(tx?: any): Promise<{
    studentsProcessed: number
    currentlyNeedingHelp: number
    totalStudents: number
    errors: string[]
  }> {
    const db = tx || prisma
    
    // Get all students
    const students = await db.user.findMany({
      where: { customRole: 'STUDENT' },
      select: { id: true, username: true, email: true }
    })

    let studentsProcessed = 0
    const errors: string[] = []

    for (const student of students) {
      try {
        await this.updateStudentHelpStatus(
          student.id,
          'bulk-analysis', // dummy assignment ID
          0, // dummy completion percentage  
          0, // dummy accuracy
          tx
        )
        studentsProcessed++
      } catch (error) {
        console.error(`❌ Error analyzing student ${student.username}:`, error)
        errors.push(`${student.username}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Get final counts
    const currentlyNeedingHelp = await db.studentsNeedingHelp.count({
      where: { isResolved: false }
    })

    return {
      studentsProcessed,
      currentlyNeedingHelp,
      totalStudents: students.length,
      errors
    }
  }
} 