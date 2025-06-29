import { prisma } from '../db'
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
   * Get all students currently needing help
   */
  static async getStudentsNeedingHelp(
    currentUser: AuthenticatedUser
  ): Promise<{ students: StudentNeedingHelpData[], summary: StudentsNeedingHelpSummary }> {
    AuthService.requireTeacherOrAdmin(currentUser)

    // Just fetch current students needing help from database (no real-time analysis)
    const studentsNeedingHelp = await prisma.studentsNeedingHelp.findMany({
      where: {
        isResolved: false
      },
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
    // Just return count from existing data (no real-time analysis)
    return await prisma.studentsNeedingHelp.count({
      where: {
        isResolved: false
      }
    })
  }

  /**
   * Private method to identify and update students who need help
   */
  private static async identifyAndUpdateStudentsNeedingHelp(): Promise<void> {
    try {
      const currentDate = new Date()

      // Get all students with basic info
      const students = await prisma.user.findMany({
        where: {
          customRole: 'STUDENT'
        },
        select: {
          id: true,
          username: true,
          email: true
        }
      })

      for (const student of students) {
        try {
          const analysis = await this.analyzeStudentPerformance(student.id, currentDate)
          
          if (analysis.needsHelp) {
            await this.createOrUpdateHelpRecord(student, analysis, currentDate)
          } else {
            await this.markStudentAsResolved(student.id)
          }
        } catch (error) {
          console.error(`Error analyzing student ${student.id}:`, error)
          // Continue with other students
        }
      }
    } catch (error) {
      console.error('Error in identifyAndUpdateStudentsNeedingHelp:', error)
      throw error
    }
  }

  /**
   * Analyze a student's performance to determine if they need help
   */
  private static async analyzeStudentPerformance(studentId: string, currentDate: Date) {
    // Simple analysis - get overdue assignments and scores
    const overdueAssignments = await prisma.assignment.count({
      where: {
        isActive: true,
        dueDate: {
          lt: currentDate
        },
        OR: [
          {
            students: {
              some: {
                userId: studentId
              }
            }
          },
          {
            classes: {
              some: {
                class: {
                  users: {
                    some: {
                      userId: studentId
                    }
                  }
                }
              }
            }
          }
        ]
      }
    })

    const completedProgresses = await prisma.studentAssignmentProgress.findMany({
      where: {
        studentId,
        isComplete: true
      }
    })

    const totalProgresses = completedProgresses.length
    const correctProgresses = completedProgresses.filter(p => p.isCorrect).length
    const averageScore = totalProgresses > 0 ? (correctProgresses / totalProgresses) * 100 : 0

    const reasons: string[] = []
    if (overdueAssignments > 0) {
      reasons.push('Has overdue assignments')
    }
    if (averageScore < 50 && totalProgresses > 0) {
      reasons.push('Low average score')
    }

    return {
      needsHelp: reasons.length > 0,
      reasons,
      metrics: {
        overdueAssignments,
        averageScore,
        completionRate: 0, // Simplified for now
        needsHelpSince: new Date()
      }
    }
  }

  /**
   * Create or update help record for a student
   */
  private static async createOrUpdateHelpRecord(
    student: { id: string, username: string, email: string | null },
    analysis: any,
    currentDate: Date
  ): Promise<void> {
    const daysNeedingHelp = 1 // Simplified for now

    let severity: 'CRITICAL' | 'WARNING' | 'RECENT' = 'RECENT'
    if (daysNeedingHelp > 14) {
      severity = 'CRITICAL'
    } else if (daysNeedingHelp > 7) {
      severity = 'WARNING'
    }

    const existingRecord = await prisma.studentsNeedingHelp.findFirst({
      where: { 
        studentId: student.id,
        isResolved: false 
      }
    })

    if (existingRecord) {
      // Update existing record
      await prisma.studentsNeedingHelp.update({
        where: { id: existingRecord.id },
        data: {
          reasons: analysis.reasons,
          daysNeedingHelp,
          overdueAssignments: analysis.metrics.overdueAssignments,
          averageScore: analysis.metrics.averageScore,
          completionRate: analysis.metrics.completionRate,
          severity,
          isResolved: false,
          updatedAt: currentDate
        }
      })
    } else {
      // Create new record
      await prisma.studentsNeedingHelp.create({
        data: {
          studentId: student.id,
          reasons: analysis.reasons,
          needsHelpSince: analysis.metrics.needsHelpSince,
          daysNeedingHelp,
          overdueAssignments: analysis.metrics.overdueAssignments,
          averageScore: analysis.metrics.averageScore,
          completionRate: analysis.metrics.completionRate,
          severity,
          isResolved: false
        }
      })
    }
  }

  /**
   * Mark student as resolved if they no longer need help
   */
  private static async markStudentAsResolved(studentId: string): Promise<void> {
    await prisma.studentsNeedingHelp.updateMany({
      where: {
        studentId,
        isResolved: false
      },
      data: {
        isResolved: true,
        resolvedAt: new Date()
      }
    })
  }
} 