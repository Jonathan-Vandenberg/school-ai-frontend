import { PrismaClient, Prisma } from '@prisma/client'
import { prisma, withTransaction } from '../db'

/**
 * Scalable Statistics Service
 * Uses pre-aggregated statistics tables for high performance
 * Handles incremental updates instead of full recalculations
 */
export class StatisticsService {
  
  /**
   * Incrementally update assignment statistics when a student submits progress
   * This is much more efficient than recalculating everything from scratch
   */
  static async updateAssignmentStatistics(
    assignmentId: string,
    studentId: string,
    isCorrect: boolean,
    isNewSubmission: boolean = true,
    providedTx?: any
  ) {
    if (providedTx) {
      // Use the provided transaction
      return this._updateAssignmentStatisticsWithTx(providedTx, assignmentId, studentId, isCorrect, isNewSubmission)
    } else {
      // Create our own transaction
      return withTransaction(async (tx) => {
        return this._updateAssignmentStatisticsWithTx(tx, assignmentId, studentId, isCorrect, isNewSubmission)
      })
    }
  }

  private static async _updateAssignmentStatisticsWithTx(
    tx: any,
    assignmentId: string,
    studentId: string,
    isCorrect: boolean,
    isNewSubmission: boolean = true
  ) {
      // Get or create assignment stats
      let assignmentStats = await tx.assignmentStats.findUnique({
        where: { assignmentId }
      })

      if (!assignmentStats) {
        // Initialize stats for new assignment
        const assignment = await tx.assignment.findUnique({
          where: { id: assignmentId },
          include: {
            questions: { select: { id: true } },
            classes: {
              include: {
                class: {
                  include: {
                    users: { select: { userId: true } }
                  }
                }
              }
            },
            students: { select: { userId: true } }
          }
        })

        if (!assignment) return

        // Calculate total students in scope
        const classStudentIds = assignment.classes.flatMap((ac: any) => 
          ac.class.users.map((u: any) => u.userId)
        )
        const individualStudentIds = assignment.students.map((s: any) => s.userId)
        const allStudentIds = [...new Set([...classStudentIds, ...individualStudentIds])]

        assignmentStats = await tx.assignmentStats.create({
          data: {
            assignmentId,
            totalStudents: allStudentIds.length,
            totalQuestions: assignment.questions.length,
            completedStudents: 0,
            inProgressStudents: 0,
            notStartedStudents: allStudentIds.length,
            completionRate: 0.0,
            averageScore: 0.0,
            totalAnswers: 0,
            totalCorrectAnswers: 0,
            accuracyRate: 0.0
          }
        })
      }

      // Update counters incrementally
      const updates: any = {
        lastUpdated: new Date()
      }

      if (isNewSubmission) {
        updates.totalAnswers = { increment: 1 }
        if (isCorrect) {
          updates.totalCorrectAnswers = { increment: 1 }
        }

        // Check if this student has completed all questions
        const studentProgress = await tx.studentAssignmentProgress.count({
          where: {
            studentId,
            assignmentId,
            isComplete: true
          }
        })

        if (studentProgress >= assignmentStats.totalQuestions) {
          // Student just completed the assignment
          updates.completedStudents = { increment: 1 }
          updates.inProgressStudents = { decrement: 1 }
        } else if (studentProgress === 1) {
          // Student just started the assignment
          updates.inProgressStudents = { increment: 1 }
          updates.notStartedStudents = { decrement: 1 }
        }
      }

      // Update assignment stats
      const updatedStats = await tx.assignmentStats.update({
        where: { assignmentId },
        data: updates
      })

      // Calculate derived metrics
      const completionRate = updatedStats.totalStudents > 0 
        ? (updatedStats.completedStudents / updatedStats.totalStudents) * 100 
        : 0

      const accuracyRate = updatedStats.totalAnswers > 0 
        ? (updatedStats.totalCorrectAnswers / updatedStats.totalAnswers) * 100 
        : 0

      // Calculate average score for completed students
      let averageScore = 0
      if (updatedStats.completedStudents > 0) {
        // Get completed students and their scores
        const completedStudents = await tx.studentAssignmentProgress.findMany({
          where: {
            assignmentId,
            isComplete: true
          },
          select: {
            studentId: true,
            isCorrect: true
          }
        })

        // Group by student and calculate scores
        const studentScores = new Map<string, { correct: number, total: number }>()
        completedStudents.forEach((progress: any) => {
          if (!studentScores.has(progress.studentId)) {
            studentScores.set(progress.studentId, { correct: 0, total: 0 })
          }
          const student = studentScores.get(progress.studentId)!
          student.total++
          if (progress.isCorrect) student.correct++
        })

        // Calculate average score only for students who completed all questions
        const fullyCompletedScores: number[] = []
        studentScores.forEach((scores, studentId) => {
          if (scores.total >= updatedStats.totalQuestions) {
            const score = scores.total > 0 ? (scores.correct / scores.total) * 100 : 0
            fullyCompletedScores.push(score)
          }
        })

        if (fullyCompletedScores.length > 0) {
          averageScore = fullyCompletedScores.reduce((sum, score) => sum + score, 0) / fullyCompletedScores.length
        }
      }

      // Update calculated fields
      await tx.assignmentStats.update({
        where: { assignmentId },
        data: {
          completionRate: parseFloat(completionRate.toFixed(2)),
          accuracyRate: parseFloat(accuracyRate.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2))
        }
      })

      return updatedStats
  }

  /**
   * Incrementally update student statistics
   */
  static async updateStudentStatistics(
    studentId: string,
    assignmentId: string,
    isCorrect: boolean,
    isNewSubmission: boolean = true,
    providedTx?: any
  ) {
    if (providedTx) {
      // Use the provided transaction
      return this._updateStudentStatisticsWithTx(providedTx, studentId, assignmentId, isCorrect, isNewSubmission)
    } else {
      // Create our own transaction
      return withTransaction(async (tx) => {
        return this._updateStudentStatisticsWithTx(tx, studentId, assignmentId, isCorrect, isNewSubmission)
      })
    }
  }

  private static async _updateStudentStatisticsWithTx(
    tx: any,
    studentId: string,
    assignmentId: string,
    isCorrect: boolean,
    isNewSubmission: boolean = true
  ) {
    // Get or create student stats
    let studentStats = await tx.studentStats.findUnique({
      where: { studentId }
    })

    if (!studentStats) {
      // Initialize stats for new student
      const studentAssignments = await tx.assignment.count({
        where: {
          OR: [
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
            {
              students: {
                some: { userId: studentId }
              }
            }
          ]
        }
      })

      studentStats = await tx.studentStats.create({
        data: {
          studentId,
          totalAssignments: studentAssignments,
          completedAssignments: 0,
          inProgressAssignments: 0,
          notStartedAssignments: studentAssignments,
          averageScore: 0.0,
          totalQuestions: 0,
          totalAnswers: 0,
          totalCorrectAnswers: 0,
          accuracyRate: 0.0,
          completionRate: 0.0,
          lastActivityDate: new Date()
        }
      })
    }

    // Efficient incremental updates
    const updates: any = {
      lastUpdated: new Date(),
      lastActivityDate: new Date()
    }

    if (isNewSubmission) {
      // Update answer counts
      updates.totalAnswers = { increment: 1 }
      if (isCorrect) {
        updates.totalCorrectAnswers = { increment: 1 }
      }

      // Check if this assignment just became complete
      const totalQuestions = await tx.question.count({
        where: { assignmentId }
      })

      // Get unique questions answered for this specific assignment
      const uniqueProgressRecords = await tx.studentAssignmentProgress.findMany({
        where: {
          studentId,
          assignmentId,
          isComplete: true
        },
        select: { questionId: true },
        distinct: ['questionId']
      })
      const uniqueQuestionsAnswered = uniqueProgressRecords.length

      // Check assignment status changes
      const wasComplete = uniqueQuestionsAnswered - 1 >= totalQuestions
      const isNowComplete = uniqueQuestionsAnswered >= totalQuestions

      if (!wasComplete && isNowComplete) {
        // Assignment just became complete
        updates.completedAssignments = { increment: 1 }
        updates.inProgressAssignments = { decrement: 1 }
      } else if (uniqueQuestionsAnswered === 1) {
        // First question answered - moved from not started to in progress
        updates.inProgressAssignments = { increment: 1 }
        updates.notStartedAssignments = { decrement: 1 }
      }
    }

    // Update student stats
    const updatedStats = await tx.studentStats.update({
      where: { studentId },
      data: updates
    })

    // Calculate derived metrics
    const completionRate = updatedStats.totalAssignments > 0 
      ? (updatedStats.completedAssignments / updatedStats.totalAssignments) * 100 
      : 0

    const accuracyRate = updatedStats.totalAnswers > 0 
      ? (updatedStats.totalCorrectAnswers / updatedStats.totalAnswers) * 100 
      : 0

    // Calculate average score
    let averageScore = 0
    if (updatedStats.completedAssignments > 0) {
      // Get all assignments for this student to check which ones are truly completed
      const studentAssignments = await tx.assignment.findMany({
        where: {
          OR: [
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
            {
              students: {
                some: { userId: studentId }
              }
            }
          ]
        },
        select: {
          id: true,
          questions: {
            select: { id: true }
          }
        }
      })

      // Get all progress for this student
      const studentProgress = await tx.studentAssignmentProgress.findMany({
        where: {
          studentId,
          isComplete: true
        },
        select: {
          assignmentId: true,
          questionId: true,
          isCorrect: true
        }
      })

      // Calculate scores only for truly completed assignments
      const completedAssignmentScores: number[] = []
      
      for (const assignment of studentAssignments) {
        const assignmentProgress = studentProgress.filter((p: any) => p.assignmentId === assignment.id)
        const uniqueQuestionsAnswered = new Set(assignmentProgress.map((p: any) => p.questionId)).size
        const totalQuestions = assignment.questions.length
        
        // Only include if all questions have been answered
        if (totalQuestions > 0 && uniqueQuestionsAnswered >= totalQuestions) {
          const correctAnswers = assignmentProgress.filter((p: any) => p.isCorrect).length
          const score = (correctAnswers / totalQuestions) * 100
          completedAssignmentScores.push(score)
        }
      }

      if (completedAssignmentScores.length > 0) {
        averageScore = completedAssignmentScores.reduce((sum, score) => sum + score, 0) / completedAssignmentScores.length
      }
    }

    // Update calculated fields
    await tx.studentStats.update({
      where: { studentId },
      data: {
        completionRate: parseFloat(completionRate.toFixed(2)),
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        averageScore: parseFloat(averageScore.toFixed(2))
      }
    })

    return updatedStats
  }

  /**
   * Update class statistics incrementally
   */
  static async updateClassStatistics(classId: string) {
    return withTransaction(async (tx) => {
      // Get all students in the class
      const classUsers = await tx.userClass.findMany({
        where: { classId },
        select: { userId: true }
      })
      const studentIds = classUsers.map(u => u.userId)

      // Get all assignments for this class
      const classAssignments = await tx.assignment.findMany({
        where: {
          classes: {
            some: { classId }
          }
        },
        select: { id: true }
      })
      const assignmentIds = classAssignments.map(a => a.id)

      // Aggregate statistics from student stats
      const studentStatsAgg = await tx.studentStats.aggregate({
        where: {
          studentId: { in: studentIds }
        },
        _avg: {
          averageScore: true,
          completionRate: true,
          accuracyRate: true
        },
        _sum: {
          totalQuestions: true,
          totalAnswers: true,
          totalCorrectAnswers: true
        }
      })

      // Count active students (those with recent activity)
      const activeStudents = await tx.studentStats.count({
        where: {
          studentId: { in: studentIds },
          lastActivityDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })

      // Students needing help (low completion rate or accuracy)
      const studentsNeedingHelp = await tx.studentStats.count({
        where: {
          studentId: { in: studentIds },
          OR: [
            { completionRate: { lt: 50 } },
            { accuracyRate: { lt: 60 } }
          ]
        }
      })

      // Update or create class stats
      await tx.classStatsDetailed.upsert({
        where: { classId },
        update: {
          totalStudents: studentIds.length,
          totalAssignments: assignmentIds.length,
          averageCompletion: parseFloat((studentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageScore: parseFloat((studentStatsAgg._avg.averageScore || 0).toFixed(2)),
          totalQuestions: studentStatsAgg._sum.totalQuestions || 0,
          totalAnswers: studentStatsAgg._sum.totalAnswers || 0,
          totalCorrectAnswers: studentStatsAgg._sum.totalCorrectAnswers || 0,
          accuracyRate: parseFloat((studentStatsAgg._avg.accuracyRate || 0).toFixed(2)),
          activeStudents,
          studentsNeedingHelp,
          lastActivityDate: new Date(),
          lastUpdated: new Date()
        },
        create: {
          classId,
          totalStudents: studentIds.length,
          totalAssignments: assignmentIds.length,
          averageCompletion: parseFloat((studentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageScore: parseFloat((studentStatsAgg._avg.averageScore || 0).toFixed(2)),
          totalQuestions: studentStatsAgg._sum.totalQuestions || 0,
          totalAnswers: studentStatsAgg._sum.totalAnswers || 0,
          totalCorrectAnswers: studentStatsAgg._sum.totalCorrectAnswers || 0,
          accuracyRate: parseFloat((studentStatsAgg._avg.accuracyRate || 0).toFixed(2)),
          activeStudents,
          studentsNeedingHelp,
          lastActivityDate: new Date()
        }
      })
    })
  }

  /**
   * Update teacher statistics
   */
  static async updateTeacherStatistics(teacherId: string) {
    return withTransaction(async (tx) => {
      // Get teacher's assignments
      const teacherAssignments = await tx.assignment.findMany({
        where: { teacherId },
        select: { id: true }
      })

      // Get teacher's classes
      const teacherClasses = await tx.class.findMany({
        where: {
          users: {
            some: { userId: teacherId }
          }
        },
        select: { id: true }
      })

      // Get all students taught by this teacher
      const allStudentIds = new Set<string>()
      for (const classObj of teacherClasses) {
        const classUsers = await tx.userClass.findMany({
          where: { classId: classObj.id },
          select: { userId: true }
        })
        classUsers.forEach(u => allStudentIds.add(u.userId))
      }

      // Aggregate assignment statistics
      const assignmentStatsAgg = await tx.assignmentStats.aggregate({
        where: {
          assignmentId: { in: teacherAssignments.map(a => a.id) }
        },
        _avg: {
          completionRate: true,
          averageScore: true
        },
        _count: {
          assignmentId: true
        }
      })

      // Count active and scheduled assignments
      const activeAssignments = await tx.assignment.count({
        where: {
          teacherId,
          isActive: true
        }
      })

      const scheduledAssignments = await tx.assignment.count({
        where: {
          teacherId,
          isActive: false,
          scheduledPublishAt: { not: null }
        }
      })

      // Update or create teacher stats
      await tx.teacherStats.upsert({
        where: { teacherId },
        update: {
          totalAssignments: teacherAssignments.length,
          totalClasses: teacherClasses.length,
          totalStudents: allStudentIds.size,
          averageClassCompletion: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageClassScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
          activeAssignments,
          scheduledAssignments,
          lastUpdated: new Date()
        },
        create: {
          teacherId,
          totalAssignments: teacherAssignments.length,
          totalClasses: teacherClasses.length,
          totalStudents: allStudentIds.size,
          averageClassCompletion: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageClassScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
          activeAssignments,
          scheduledAssignments
        }
      })
    })
  }

  /**
   * Update school-wide statistics (run daily via cron job)
   */
  static async updateSchoolStatistics(date: Date = new Date()) {
    return withTransaction(async (tx) => {
      const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate())

      // Count totals
      const [
        totalUsers,
        totalTeachers, 
        totalStudents,
        totalClasses,
        totalAssignments,
        activeAssignments,
        scheduledAssignments
      ] = await Promise.all([
        tx.user.count(),
        tx.user.count({ where: { customRole: 'TEACHER' } }),
        tx.user.count({ where: { customRole: 'STUDENT' } }),
        tx.class.count(),
        tx.assignment.count(),
        tx.assignment.count({ where: { isActive: true } }),
        tx.assignment.count({ 
          where: { 
            isActive: false, 
            scheduledPublishAt: { not: null } 
          } 
        })
      ])

      // Aggregate assignment statistics
      const assignmentStatsAgg = await tx.assignmentStats.aggregate({
        _avg: {
          completionRate: true,
          averageScore: true
        }
      })

      // Count daily active users
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const [dailyActiveStudents, dailyActiveTeachers] = await Promise.all([
        tx.studentStats.count({
          where: {
            lastActivityDate: { gte: yesterday }
          }
        }),
        tx.teacherStats.count({
          where: {
            lastUpdated: { gte: yesterday }
          }
        })
      ])

      // Students needing help
      const studentsNeedingHelp = await tx.studentStats.count({
        where: {
          OR: [
            { completionRate: { lt: 50 } },
            { accuracyRate: { lt: 60 } }
          ]
        }
      })

      // Update or create school stats
      await tx.schoolStats.upsert({
        where: { date: dateKey },
        update: {
          totalUsers,
          totalTeachers,
          totalStudents,
          totalClasses,
          totalAssignments,
          activeAssignments,
          scheduledAssignments,
          averageCompletionRate: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
          dailyActiveStudents,
          dailyActiveTeachers,
          studentsNeedingHelp
        },
        create: {
          date: dateKey,
          totalUsers,
          totalTeachers,
          totalStudents,
          totalClasses,
          totalAssignments,
          activeAssignments,
          scheduledAssignments,
          averageCompletionRate: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
          dailyActiveStudents,
          dailyActiveTeachers,
          studentsNeedingHelp
        }
      })
    })
  }

  /**
   * Get assignment statistics (fast read from pre-aggregated data)
   */
  static async getAssignmentStatistics(assignmentId: string) {
    return await prisma.assignmentStats.findUnique({
      where: { assignmentId },
      include: {
        assignment: {
          select: {
            topic: true,
            type: true,
            createdAt: true
          }
        }
      }
    })
  }

  /**
   * Get student statistics (fast read from pre-aggregated data)
   */
  static async getStudentStatistics(studentId: string) {
    return await prisma.studentStats.findUnique({
      where: { studentId },
      include: {
        student: {
          select: {
            username: true,
            customRole: true
          }
        }
      }
    })
  }

  /**
   * Get class statistics (fast read from pre-aggregated data)
   */
  static async getClassStatistics(classId: string) {
    return await prisma.classStatsDetailed.findUnique({
      where: { classId },
      include: {
        class: {
          select: {
            name: true,
            createdAt: true
          }
        }
      }
    })
  }

  /**
   * Get teacher statistics (fast read from pre-aggregated data)
   */
  static async getTeacherStatistics(teacherId: string) {
    return await prisma.teacherStats.findUnique({
      where: { teacherId },
      include: {
        teacher: {
          select: {
            username: true,
            customRole: true
          }
        }
      }
    })
  }

  /**
   * Get school statistics for dashboard (fast read from pre-aggregated data)
   * Falls back to most recent stats if today's data doesn't exist
   */
  static async getSchoolStatistics(date: Date = new Date()) {
    const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    // Try to get today's stats first
    let stats = await prisma.schoolStats.findUnique({
      where: { date: dateKey }
    })
    
    // If today's stats don't exist, get the most recent stats
    if (!stats) {
      stats = await prisma.schoolStats.findFirst({
        orderBy: { date: 'desc' }
      })
    }
    
    return stats
  }

  /**
   * Get recent school statistics for trends
   */
  static async getSchoolStatisticsTrend(days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return await prisma.schoolStats.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    })
  }

  /**
   * Increment student assignment count when a new assignment is created
   */
  static async incrementStudentAssignmentCount(studentId: string, providedTx?: any) {
    if (providedTx) {
      // Use the provided transaction
      return this._incrementStudentAssignmentCountWithTx(providedTx, studentId)
    } else {
      // Create our own transaction
      return withTransaction(async (tx) => {
        return this._incrementStudentAssignmentCountWithTx(tx, studentId)
      })
    }
  }

  private static async _incrementStudentAssignmentCountWithTx(tx: any, studentId: string) {
      // Calculate the actual total assignments for this student
      const actualAssignmentCount = await tx.assignment.count({
        where: {
          isActive: true,
          OR: [
            {
              students: {
                some: { userId: studentId }
              }
            },
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
            }
          ]
        }
      })

      // Get or create student stats
      let studentStats = await tx.studentStats.findUnique({
        where: { studentId }
      })

      if (!studentStats) {
        // Initialize stats for new student
        studentStats = await tx.studentStats.create({
          data: {
            studentId,
            totalAssignments: actualAssignmentCount,
            completedAssignments: 0,
            inProgressAssignments: 0,
            notStartedAssignments: actualAssignmentCount,
            averageScore: 0.0,
            totalQuestions: 0,
            totalAnswers: 0,
            totalCorrectAnswers: 0,
            accuracyRate: 0.0,
            completionRate: 0.0
          }
        })
      } else {
        // Update with actual assignment count (not just increment)
        studentStats = await tx.studentStats.update({
          where: { studentId },
          data: {
            totalAssignments: actualAssignmentCount,
            lastUpdated: new Date()
          }
        })
      }

      // Recalculate completion rate using the actual total
      const completionRate = studentStats.totalAssignments > 0 
        ? (studentStats.completedAssignments / studentStats.totalAssignments) * 100 
        : 0

      await tx.studentStats.update({
        where: { studentId },
        data: {
          completionRate: parseFloat(completionRate.toFixed(2))
        }
      })

      return studentStats
  }

  /**
   * Increment class assignment count when a new class assignment is created
   */
  static async incrementClassAssignmentCount(classId: string, providedTx?: any) {
    if (providedTx) {
      // Use the provided transaction
      return this._incrementClassAssignmentCountWithTx(providedTx, classId)
    } else {
      // Create our own transaction
      return withTransaction(async (tx) => {
        return this._incrementClassAssignmentCountWithTx(tx, classId)
      })
    }
  }

  private static async _incrementClassAssignmentCountWithTx(tx: any, classId: string) {
      // Get or create class stats
      let classStats = await tx.classStatsDetailed.findUnique({
        where: { classId }
      })

      if (!classStats) {
        // Get class details for initialization
        const classData = await tx.class.findUnique({
          where: { id: classId },
          include: {
            users: { select: { userId: true } }
          }
        })

        if (!classData) return

        classStats = await tx.classStatsDetailed.create({
          data: {
            classId,
            totalStudents: classData.users.length,
            totalAssignments: 1,
            averageCompletion: 0.0,
            averageScore: 0.0
          }
        })
      } else {
        // Increment total assignments
        await tx.classStatsDetailed.update({
          where: { classId },
          data: {
            totalAssignments: { increment: 1 },
            lastUpdated: new Date()
          }
        })
      }

      return classStats
  }

  /**
   * Increment school assignment count when a new assignment is created
   */
  static async incrementSchoolAssignmentCount(isActive: boolean, isScheduled: boolean, providedTx?: any) {
    if (providedTx) {
      // Use the provided transaction
      return this._incrementSchoolAssignmentCountWithTx(providedTx, isActive, isScheduled)
    } else {
      // Create our own transaction
      return withTransaction(async (tx) => {
        return this._incrementSchoolAssignmentCountWithTx(tx, isActive, isScheduled)
      })
    }
  }

  private static async _incrementSchoolAssignmentCountWithTx(tx: any, isActive: boolean, isScheduled: boolean) {
      const today = new Date()
      const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      // Get or create today's school stats
      let schoolStats = await tx.schoolStats.findUnique({
        where: { date: dateKey }
      })

      if (!schoolStats) {
        // Initialize today's school stats by running the full calculation
        await this.updateSchoolStatistics(today)
        schoolStats = await tx.schoolStats.findUnique({
          where: { date: dateKey }
        })
      }

      if (schoolStats) {
        // Increment the appropriate counters
        const updates: any = {
          totalAssignments: { increment: 1 },
          updatedAt: new Date()
        }

        if (isActive) {
          updates.activeAssignments = { increment: 1 }
        }

        if (isScheduled) {
          updates.scheduledAssignments = { increment: 1 }
        }

        await tx.schoolStats.update({
          where: { date: dateKey },
          data: updates
        })
      }

      return schoolStats
  }
} 