import { PrismaClient, Prisma } from '@prisma/client'
import { prisma, withTransaction } from '../db'
import { StudentsNeedingHelpService } from './students-needing-help.service'

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
                    users: { 
                      select: { 
                        userId: true,
                        user: {
                          select: {
                            customRole: true
                          }
                        }
                      } 
                    }
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
          ac.class.users
            .filter((u: any) => u.user?.customRole === 'STUDENT') // Only include students, not teachers
            .map((u: any) => u.userId)
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
    providedTx?: any,
    questionId?: string
  ) {
    if (providedTx) {
      // Use the provided transaction
      return this._updateStudentStatisticsWithTx(providedTx, studentId, assignmentId, isCorrect, isNewSubmission, questionId)
    } else {
      // Create our own transaction
      return withTransaction(async (tx) => {
        return this._updateStudentStatisticsWithTx(tx, studentId, assignmentId, isCorrect, isNewSubmission, questionId)
      })
    }
  }

  private static async _updateStudentStatisticsWithTx(
    tx: any,
    studentId: string,
    assignmentId: string,
    isCorrect: boolean,
    isNewSubmission: boolean = true,
    questionId?: string
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

      // Count only assignments for this student (not quizzes)
      const studentAssignmentCount = await tx.assignment.count({
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
          totalAssignments: studentAssignmentCount,
          completedAssignments: 0,
          inProgressAssignments: 0,
          notStartedAssignments: studentAssignmentCount,
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

      // Check if this assignment status needs to change
      const totalQuestions = await tx.question.count({
        where: { assignmentId }
      })

      // Get all unique questions this student has answered for this assignment
      const allProgressRecords = await tx.studentAssignmentProgress.findMany({
        where: {
          studentId,
          assignmentId,
          isComplete: true
        },
        select: { questionId: true },
        distinct: ['questionId']
      })

      const uniqueQuestionsAnswered = allProgressRecords.length
      const isNowComplete = uniqueQuestionsAnswered >= totalQuestions

      // Get current student stats to check if this assignment is already counted as completed
      const currentStats = await tx.studentStats.findUnique({
        where: { studentId }
      })

      if (!currentStats) {
        throw new Error('Student stats not found')
      }

      // Check if assignment is now complete but verify we haven't already counted it
      if (isNowComplete) {
        // Verify how many assignments this student has actually completed
        const actuallyCompletedAssignments = await tx.assignment.findMany({
          where: {
            OR: [
              { students: { some: { userId: studentId } } },
              { 
                classes: { 
                  some: { 
                    class: { 
                      users: { 
                        some: { 
                          userId: studentId,
                          user: { customRole: 'STUDENT' }
                        }
                      }
                    }
                  }
                }
              }
            ]
          },
          include: {
            questions: { select: { id: true } }
          }
        })

        // Count how many assignments are truly completed
        let trueCompletedCount = 0
        for (const assignment of actuallyCompletedAssignments) {
          const uniqueCompleted = await tx.studentAssignmentProgress.findMany({
            where: {
              studentId,
              assignmentId: assignment.id,
              isComplete: true
            },
            select: { questionId: true },
            distinct: ['questionId']
          })
          
          if (uniqueCompleted.length >= assignment.questions.length) {
            trueCompletedCount++
          }
        }

        // Only update if our current count is wrong
        if (currentStats.completedAssignments !== trueCompletedCount) {
          updates.completedAssignments = trueCompletedCount
        }
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
      // Get all students in the class (exclude teachers and other roles)
      const classUsers = await tx.userClass.findMany({
        where: { 
          classId,
          user: {
            customRole: 'STUDENT'
          }
        },
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

      // Get individual student stats to calculate proper averages
      const studentStatsRecords = await tx.studentStats.findMany({
        where: {
          studentId: { in: studentIds }
        },
        select: {
          averageScore: true,
          completionRate: true,
          accuracyRate: true,
          totalQuestions: true,
          totalAnswers: true,
          totalCorrectAnswers: true,
          completedAssignments: true,
          lastActivityDate: true
        }
      })

      // Calculate class average score from individual completed assignments only
      // Get all completed assignments for students in this class
      const completedAssignmentProgresses = await tx.studentAssignmentProgress.findMany({
        where: {
          studentId: { in: studentIds },
          isComplete: true,
          assignment: {
            classes: {
              some: { classId }
            }
          }
        },
        include: {
          assignment: {
            include: {
              questions: { select: { id: true } }
            }
          }
        }
      })

      // Group by student and assignment to calculate scores per completed assignment
      const assignmentCompletions = new Map<string, { correct: number, total: number }>()
      completedAssignmentProgresses.forEach((progress: any) => {
        const key = `${progress.studentId}-${progress.assignmentId}`
        if (!assignmentCompletions.has(key)) {
          assignmentCompletions.set(key, { correct: 0, total: 0 })
        }
        const completion = assignmentCompletions.get(key)!
        completion.total++
        if (progress.isCorrect) completion.correct++
      })

      // Calculate scores for each completed assignment and average them
      const assignmentScores: number[] = []
      for (const [key, completion] of assignmentCompletions) {
        const [studentId, assignmentId] = key.split('-')
        // Find the assignment to get total questions
        const assignment = completedAssignmentProgresses.find((p: any) => p.assignmentId === assignmentId)?.assignment
        if (assignment && completion.total >= assignment.questions.length) {
          // Only include if student completed all questions in the assignment
          const score = assignment.questions.length > 0 ? (completion.correct / assignment.questions.length) * 100 : 0
          assignmentScores.push(score)
        }
      }

      const classAverageScore = assignmentScores.length > 0
        ? assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length
        : 0

      // Calculate total questions available in class assignments (not accumulated across students)
      const classAssignmentsWithQuestions = await tx.assignment.findMany({
        where: {
          classes: {
            some: { classId }
          }
        },
        include: {
          questions: { select: { id: true } }
        }
      })
      const totalQuestions = classAssignmentsWithQuestions.reduce((sum, assignment) => sum + assignment.questions.length, 0)

      // Calculate other aggregates from all students
      const totalAnswers = studentStatsRecords.reduce((sum, student) => sum + student.totalAnswers, 0)
      const totalCorrectAnswers = studentStatsRecords.reduce((sum, student) => sum + student.totalCorrectAnswers, 0)
      
      const averageCompletionRate = studentStatsRecords.length > 0
        ? studentStatsRecords.reduce((sum, student) => sum + student.completionRate, 0) / studentStatsRecords.length
        : 0

      const averageAccuracyRate = studentStatsRecords.length > 0
        ? studentStatsRecords.reduce((sum, student) => sum + student.accuracyRate, 0) / studentStatsRecords.length
        : 0

      // Count active students (those with recent activity)
      const activeStudents = studentStatsRecords.filter(student => 
        student.lastActivityDate && 
        student.lastActivityDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length

      // Students needing help (low completion rate or accuracy)
      const studentsNeedingHelp = studentStatsRecords.filter(student =>
        student.completionRate < 50 || student.accuracyRate < 60
      ).length

      // Update or create class stats
      await tx.classStatsDetailed.upsert({
        where: { classId },
        update: {
          totalStudents: studentIds.length,
          totalAssignments: assignmentIds.length,
          averageCompletion: parseFloat(averageCompletionRate.toFixed(2)),
          averageScore: parseFloat(classAverageScore.toFixed(2)), // Average from individual completed assignments only
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(averageAccuracyRate.toFixed(2)),
          activeStudents,
          studentsNeedingHelp,
          lastActivityDate: new Date(),
          lastUpdated: new Date()
        },
        create: {
          classId,
          totalStudents: studentIds.length,
          totalAssignments: assignmentIds.length,
          averageCompletion: parseFloat(averageCompletionRate.toFixed(2)),
          averageScore: parseFloat(classAverageScore.toFixed(2)), // Average from individual completed assignments only
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(averageAccuracyRate.toFixed(2)),
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
          where: { 
            classId: classObj.id,
            user: {
              customRole: 'STUDENT'
            }
          },
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
        },
        _sum: {
          completedStudents: true,
          inProgressStudents: true,
          notStartedStudents: true,
          totalAnswers: true,
          totalCorrectAnswers: true
        }
      })

      // Calculate total question opportunities (questions × students for each assignment)
      const assignmentStatsForQuestions = await tx.assignmentStats.findMany({
        select: {
          totalQuestions: true,
          totalStudents: true
        }
      })
      
      const totalQuestionOpportunities = assignmentStatsForQuestions.reduce((sum, stat) => 
        sum + (stat.totalQuestions * stat.totalStudents), 0
      )

      // Students needing help (use the proper StudentsNeedingHelp table)
      const studentsNeedingHelp = await tx.studentsNeedingHelp.count({
        where: { isResolved: false }
      })

      // Assignment status distribution totals
      const completedStudents = assignmentStatsAgg._sum.completedStudents || 0
      const inProgressStudents = assignmentStatsAgg._sum.inProgressStudents || 0
      const notStartedStudents = assignmentStatsAgg._sum.notStartedStudents || 0

      // Q&A analytics totals  
      const totalQuestions = totalQuestionOpportunities // Use question opportunities instead of unique questions
      const totalAnswers = assignmentStatsAgg._sum.totalAnswers || 0
      const totalCorrectAnswers = assignmentStatsAgg._sum.totalCorrectAnswers || 0

      // Calculate completed assignments (assignments where at least one student has finished all questions)
      const allAssignmentStats = await tx.assignmentStats.findMany({
        where: {
          totalStudents: { gt: 0 } // Only assignments with students
        },
        select: {
          totalStudents: true,
          completedStudents: true
        }
      })
      
      const completedAssignments = allAssignmentStats.filter(stat => 
        stat.completedStudents > 0
      ).length

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
          completedAssignments,
          completedStudents,
          inProgressStudents,
          notStartedStudents,
          averageCompletionRate: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
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
          completedAssignments,
          completedStudents,
          inProgressStudents,
          notStartedStudents,
          averageCompletionRate: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
          averageScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
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
      // Calculate the actual total ASSIGNMENTS ONLY for this student
      const assignmentCount = await tx.assignment.count({
        where: {
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
                      some: { 
                        userId: studentId,
                        user: { customRole: 'STUDENT' }
                      }
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
        // Initialize stats for new student - ASSIGNMENTS ONLY
        studentStats = await tx.studentStats.create({
          data: {
            studentId,
            totalAssignments: assignmentCount, // Only count assignments, not quizzes
            completedAssignments: 0,
            inProgressAssignments: 0,
            notStartedAssignments: assignmentCount,
            averageScore: 0.0,
            totalQuestions: 0,
            totalAnswers: 0,
            totalCorrectAnswers: 0,
            accuracyRate: 0.0,
            completionRate: 0.0
          }
        })
      } else {
        // Update with actual assignment count (not quiz count)
        studentStats = await tx.studentStats.update({
          where: { studentId },
          data: {
            totalAssignments: assignmentCount, // Only count assignments, not quizzes
            lastUpdated: new Date()
          }
        })
      }

      // Recalculate completion rate using assignments only
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

  /**
   * Initialize all statistics for a new student
   * This should be called when a student is created
   */
  static async initializeStudentStatistics(studentId: string, providedTx?: any) {
    if (providedTx) {
      return this._initializeStudentStatisticsWithTx(providedTx, studentId)
    } else {
      return withTransaction(async (tx) => {
        return this._initializeStudentStatisticsWithTx(tx, studentId)
      })
    }
  }

  private static async _initializeStudentStatisticsWithTx(tx: any, studentId: string) {
    // Check if student stats already exist
    const existingStats = await tx.studentStats.findUnique({
      where: { studentId }
    })

    if (existingStats) {
      // Just update timestamp if stats already exist
      await tx.studentStats.update({
        where: { studentId },
        data: { lastUpdated: new Date() }
      })
      return
    }

    // For new students, calculate initial statistics based on existing data
    await this._recalculateStudentStatisticsWithTx(tx, studentId)
  }

  /**
   * Handle all updates when a student is added to a class
   * This includes updating assignment statistics and checking help status
   */
  static async handleStudentAddedToClass(studentId: string, classId: string, providedTx?: any) {
    if (providedTx) {
      await this._handleStudentAddedToClassWithTx(providedTx, studentId, classId)
      // Note: Caller is responsible for updating school statistics after transaction
      return
    } else {
      await withTransaction(async (tx) => {
        await this._handleStudentAddedToClassWithTx(tx, studentId, classId)
      })
      
      // Now update school statistics using the existing service method
      // This properly recalculates question opportunities, assignment status, response rates, etc.
      await this.updateSchoolStatistics()
    }
  }

  private static async _handleStudentAddedToClassWithTx(tx: any, studentId: string, classId: string) {
    // 1. Initialize student statistics if not exists
    await this._initializeStudentStatisticsWithTx(tx, studentId)

    // 2. Get all assignments for this class
    const classAssignments = await tx.assignment.findMany({
      where: {
        classes: {
          some: { classId }
        },
        isActive: true
      },
      include: {
        questions: { select: { id: true } }
      }
    })

    // 3. Update assignment statistics for each assignment to include the new student
    for (const assignment of classAssignments) {
      await this._updateAssignmentStatsForNewStudent(tx, assignment.id, studentId)
    }

    // 4. Update student's total assignment count
    if (classAssignments.length > 0) {
      await tx.studentStats.update({
        where: { studentId },
        data: {
          totalAssignments: { increment: classAssignments.length },
          notStartedAssignments: { increment: classAssignments.length },
          updatedAt: new Date()
        }
      })

      // 5. Check if student needs help (only when they actually have assignments)
      await StudentsNeedingHelpService.updateStudentHelpStatus(studentId, 'class-assignment', 0, 0, tx)
    }

    // Note: School statistics will be updated after the transaction completes
    // to ensure all derived metrics (question opportunities, response rates, etc.) are properly recalculated
  }

  /**
   * Update assignment statistics when a new student is added to a class
   */
  private static async _updateAssignmentStatsForNewStudent(tx: any, assignmentId: string, studentId: string) {
    // Get or create assignment stats
    let assignmentStats = await tx.assignmentStats.findUnique({
      where: { assignmentId }
    })

    if (!assignmentStats) {
      // Initialize stats for assignment if they don't exist
      const assignment = await tx.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          questions: { select: { id: true } },
          classes: {
            include: {
              class: {
                include: {
                  users: { 
                    select: { 
                      userId: true,
                      user: {
                        select: {
                          customRole: true
                        }
                      }
                    } 
                  }
                }
              }
            }
          },
          students: { select: { userId: true } }
        }
      })

      if (!assignment) return

      // Calculate total students including the new one
      const classStudentIds = assignment.classes.flatMap((ac: any) => 
        ac.class.users
          .filter((u: any) => u.user?.customRole === 'STUDENT') // Only include students, not teachers
          .map((u: any) => u.userId)
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
    } else {
      // Update existing stats to include new student
      await tx.assignmentStats.update({
        where: { assignmentId },
        data: {
          totalStudents: { increment: 1 },
          notStartedStudents: { increment: 1 },
          lastUpdated: new Date()
        }
      })

      // Recalculate completion rate
      const updated = await tx.assignmentStats.findUnique({
        where: { assignmentId }
      })
      
      if (updated) {
        const completionRate = updated.totalStudents > 0 
          ? (updated.completedStudents / updated.totalStudents) * 100 
          : 0

        await tx.assignmentStats.update({
          where: { assignmentId },
          data: {
            completionRate: parseFloat(completionRate.toFixed(2))
          }
        })
      }
    }
  }

  /**
   * Recalculate assignment statistics from existing progress data
   */
  static async recalculateAssignmentStatistics(assignmentId: string, providedTx?: any) {
    if (providedTx) {
      return this._recalculateAssignmentStatisticsWithTx(providedTx, assignmentId)
    } else {
      return withTransaction(async (tx) => {
        return this._recalculateAssignmentStatisticsWithTx(tx, assignmentId)
      })
    }
  }

  private static async _recalculateAssignmentStatisticsWithTx(tx: any, assignmentId: string) {
    // Get assignment details
    const assignment = await tx.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        questions: { select: { id: true } },
        classes: {
          include: {
            class: {
              include: {
                users: { 
                  select: { 
                    userId: true,
                    user: {
                      select: {
                        customRole: true
                      }
                    }
                  } 
                }
              }
            }
          }
        },
        students: { select: { userId: true } }
      }
    })

    if (!assignment) return

    // Calculate total students in scope (only actual students, not teachers)
    const classStudentIds = assignment.classes.flatMap((ac: any) => 
      ac.class.users
        .filter((u: any) => u.user?.customRole === 'STUDENT')
        .map((u: any) => u.userId)
    )
    const individualStudentIds = assignment.students.map((s: any) => s.userId)
    const allStudentIds = [...new Set([...classStudentIds, ...individualStudentIds])]

    // Get all existing progress for this assignment
    const allProgress = await tx.studentAssignmentProgress.findMany({
      where: {
        assignmentId,
        isComplete: true
      },
      select: {
        studentId: true,
        isCorrect: true,
        questionId: true
      }
    })

    // Calculate statistics from existing progress
    const totalQuestions = assignment.questions.length
    const totalAnswers = allProgress.length
    const totalCorrectAnswers = allProgress.filter((p: any) => p.isCorrect).length

    // Group progress by student to calculate completion status
    const studentProgress = new Map<string, Set<string>>()
    allProgress.forEach((progress: any) => {
      if (!studentProgress.has(progress.studentId)) {
        studentProgress.set(progress.studentId, new Set())
      }
      studentProgress.get(progress.studentId)!.add(progress.questionId)
    })

    // Count completion statuses
    let completedStudents = 0
    let inProgressStudents = 0
    let notStartedStudents = 0

    allStudentIds.forEach(studentId => {
      const questionsAnswered = studentProgress.get(studentId)?.size || 0
      if (questionsAnswered >= totalQuestions) {
        completedStudents++
      } else if (questionsAnswered > 0) {
        inProgressStudents++
      } else {
        notStartedStudents++
      }
    })

    // Calculate derived metrics
    const completionRate = allStudentIds.length > 0 
      ? (completedStudents / allStudentIds.length) * 100 
      : 0

    const accuracyRate = totalAnswers > 0 
      ? (totalCorrectAnswers / totalAnswers) * 100 
      : 0

    // Calculate average score for completed students
    let averageScore = 0
    if (completedStudents > 0) {
      const completedStudentScores: number[] = []
      studentProgress.forEach((questionsAnswered, studentId) => {
        if (questionsAnswered.size >= totalQuestions) {
          const studentCorrect = allProgress.filter((p: any) => 
            p.studentId === studentId && p.isCorrect
          ).length
          const score = totalQuestions > 0 ? (studentCorrect / totalQuestions) * 100 : 0
          completedStudentScores.push(score)
        }
      })
      
      if (completedStudentScores.length > 0) {
        averageScore = completedStudentScores.reduce((sum, score) => sum + score, 0) / completedStudentScores.length
      }
    }

    // Create or update assignment stats
    const statsData = {
      assignmentId,
      totalStudents: allStudentIds.length,
      totalQuestions,
      completedStudents,
      inProgressStudents,
      notStartedStudents,
      completionRate: parseFloat(completionRate.toFixed(2)),
      averageScore: parseFloat(averageScore.toFixed(2)),
      totalAnswers,
      totalCorrectAnswers,
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      lastUpdated: new Date()
    }

    const assignmentStats = await tx.assignmentStats.upsert({
      where: { assignmentId },
      create: statsData,
      update: statsData
    })

    console.log(`✅ Recalculated statistics for assignment ${assignmentId}:`, {
      totalStudents: allStudentIds.length,
      completedStudents,
      inProgressStudents,
      notStartedStudents,
      totalQuestions,
      totalAnswers,
      totalCorrectAnswers,
      completionRate: completionRate.toFixed(1) + '%',
      accuracyRate: accuracyRate.toFixed(1) + '%'
    })

    return assignmentStats
  }

  /**
   * Recalculate student statistics from existing progress data
   */
  static async recalculateStudentStatistics(studentId: string, providedTx?: any) {
    if (providedTx) {
      return this._recalculateStudentStatisticsWithTx(providedTx, studentId)
    } else {
      return withTransaction(async (tx) => {
        return this._recalculateStudentStatisticsWithTx(tx, studentId)
      })
    }
  }

  private static async _recalculateStudentStatisticsWithTx(tx: any, studentId: string) {
    // Get all assignments this student is assigned to (ASSIGNMENTS ONLY, not quizzes)
    const studentAssignments = await tx.assignment.findMany({
      where: {
        OR: [
          // Individual assignments
          { students: { some: { userId: studentId } } },
          // Class assignments
          { 
            classes: { 
              some: { 
                class: { 
                  users: { 
                    some: { 
                      userId: studentId,
                      user: { customRole: 'STUDENT' }
                    }
                  }
                }
              }
            }
          }
        ]
      },
      include: {
        questions: { select: { id: true } }
      }
    })

    // Get all progress for this student
    const allProgress = await tx.studentAssignmentProgress.findMany({
      where: {
        studentId,
        isComplete: true
      },
      select: {
        assignmentId: true,
        isCorrect: true,
        questionId: true
      }
    })

    // Calculate statistics (ASSIGNMENTS ONLY)
    const totalAssignments = studentAssignments.length
    const totalQuestions = studentAssignments.reduce((sum: number, assignment: any) => sum + assignment.questions.length, 0)
    const totalAnswers = allProgress.length
    const totalCorrectAnswers = allProgress.filter((p: any) => p.isCorrect).length

    // Group progress by assignment to calculate completion status
    const assignmentProgress = new Map<string, Set<string>>()
    allProgress.forEach((progress: any) => {
      if (!assignmentProgress.has(progress.assignmentId)) {
        assignmentProgress.set(progress.assignmentId, new Set())
      }
      assignmentProgress.get(progress.assignmentId)!.add(progress.questionId)
    })

    // Count assignment completion statuses
    let completedAssignments = 0
    let inProgressAssignments = 0
    let notStartedAssignments = 0

    // Count completed assignments
    studentAssignments.forEach((assignment: any) => {
      const questionsAnswered = assignmentProgress.get(assignment.id)?.size || 0
      const totalQuestionsInAssignment = assignment.questions.length
      
      if (questionsAnswered >= totalQuestionsInAssignment) {
        completedAssignments++
      } else if (questionsAnswered > 0) {
        inProgressAssignments++
      } else {
        notStartedAssignments++
      }
    })

    // Calculate remaining not started assignments
    notStartedAssignments = totalAssignments - completedAssignments - inProgressAssignments

    // Calculate derived metrics
    const completionRate = totalAssignments > 0 
      ? (completedAssignments / totalAssignments) * 100 
      : 0

    const accuracyRate = totalAnswers > 0 
      ? (totalCorrectAnswers / totalAnswers) * 100 
      : 0

    // Calculate average score based on completed assignments ONLY
    let averageScore = 0
    if (completedAssignments > 0) {
      const assignmentScores: number[] = []
      
      // Calculate assignment scores
      studentAssignments.forEach((assignment: any) => {
        const questionsAnswered = assignmentProgress.get(assignment.id)?.size || 0
        if (questionsAnswered >= assignment.questions.length) {
          const assignmentCorrect = allProgress.filter((p: any) => 
            p.assignmentId === assignment.id && p.isCorrect
          ).length
          const score = assignment.questions.length > 0 
            ? (assignmentCorrect / assignment.questions.length) * 100 
            : 0
          assignmentScores.push(score)
        }
      })
      
      if (assignmentScores.length > 0) {
        averageScore = assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length
      }
    }

    // Create or update student stats
    const statsData = {
      studentId,
      totalAssignments,
      completedAssignments,
      inProgressAssignments,
      notStartedAssignments,
      averageScore: parseFloat(averageScore.toFixed(2)),
      completionRate: parseFloat(completionRate.toFixed(2)),
      totalQuestions,
      totalAnswers,
      totalCorrectAnswers,
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      lastActivityDate: new Date(),
      lastUpdated: new Date()
    }

    const studentStats = await tx.studentStats.upsert({
      where: { studentId },
      create: statsData,
      update: statsData
    })

    console.log(`✅ Recalculated statistics for student ${studentId}:`, {
      totalAssignments,
      completedAssignments,
      inProgressAssignments,
      notStartedAssignments,
      totalQuestions,
      totalAnswers,
      totalCorrectAnswers,
      completionRate: completionRate.toFixed(1) + '%',
      averageScore: averageScore.toFixed(1) + '%',
      accuracyRate: accuracyRate.toFixed(1) + '%'
    })

    return studentStats
  }

  /**
   * Update student statistics when a quiz is completed
   * This method ensures that quiz completions are included in student statistics
   * and prevents double-counting when a student retakes a quiz
   */
  static async updateStudentQuizStatistics(
    studentId: string, 
    quizId: string, 
    sessionNumber: number,
    providedTx?: any
  ) {
    if (providedTx) {
      return this._updateStudentQuizStatisticsWithTx(providedTx, studentId, quizId, sessionNumber)
    } else {
      return withTransaction(async (tx) => {
        return this._updateStudentQuizStatisticsWithTx(tx, studentId, quizId, sessionNumber)
      })
    }
  }

  private static async _updateStudentQuizStatisticsWithTx(
    tx: any, 
    studentId: string, 
    quizId: string, 
    sessionNumber: number
  ) {
    // Check if this student has already completed this specific quiz before
    // We count completion per unique quiz, not per session
    const previousCompletions = await tx.quizSubmission.findMany({
      where: {
        quizId,
        studentId,
        isCompleted: true,
        sessionNumber: { lt: sessionNumber } // Only check previous sessions
      }
    })

    const isFirstTimeCompletion = previousCompletions.length === 0

    // Get or create student stats
    let studentStats = await tx.studentStats.findUnique({
      where: { studentId }
    })

    if (!studentStats) {
      // Initialize stats for new student - count ASSIGNMENTS ONLY (not quizzes)
      const assignmentCount = await tx.assignment.count({
        where: {
          OR: [
            {
              classes: {
                some: {
                  class: {
                    users: {
                      some: { 
                        userId: studentId,
                        user: { customRole: 'STUDENT' }
                      }
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
          totalAssignments: assignmentCount, // Only count assignments, not quizzes
          completedAssignments: isFirstTimeCompletion ? 1 : 0,
          inProgressAssignments: 0,
          notStartedAssignments: assignmentCount - (isFirstTimeCompletion ? 1 : 0),
          averageScore: 0.0,
          totalQuestions: 0,
          totalAnswers: 0,
          totalCorrectAnswers: 0,
          accuracyRate: 0.0,
          completionRate: 0.0,
          lastActivityDate: new Date()
        }
      })
    } else {
      // Only increment completed count if this is the first time completing this quiz
      if (isFirstTimeCompletion) {
        studentStats = await tx.studentStats.update({
          where: { studentId },
          data: {
            completedAssignments: { increment: 1 },
            notStartedAssignments: { decrement: 1 },
            lastActivityDate: new Date(),
            lastUpdated: new Date()
          }
        })
      } else {
        // Just update activity timestamp for retakes
        studentStats = await tx.studentStats.update({
          where: { studentId },
          data: {
            lastActivityDate: new Date(),
            lastUpdated: new Date()
          }
        })
      }
    }

    // Recalculate completion rate and average score
    await this._recalculateStudentAverageScoreWithTx(tx, studentId)

    return { studentStats, isFirstTimeCompletion }
  }

  /**
   * Recalculate student average score including both assignments and quizzes
   */
  private static async _recalculateStudentAverageScoreWithTx(tx: any, studentId: string) {
    // Get completed assignments
    const completedAssignments = await tx.assignment.findMany({
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
      include: {
        questions: { select: { id: true } }
      }
    })

    // Get assignment progress
    const assignmentProgress = await tx.studentAssignmentProgress.findMany({
      where: {
        studentId,
        isComplete: true
      },
      select: {
        assignmentId: true,
        isCorrect: true,
        questionId: true
      }
    })

    // Calculate assignment scores
    const assignmentScores: number[] = []
    completedAssignments.forEach((assignment: any) => {
      const progress = assignmentProgress.filter((p: any) => p.assignmentId === assignment.id)
      const uniqueQuestions = new Set(progress.map((p: any) => p.questionId))
      
      if (uniqueQuestions.size >= assignment.questions.length) {
        const correctAnswers = progress.filter((p: any) => p.isCorrect).length
        const score = assignment.questions.length > 0 
          ? (correctAnswers / assignment.questions.length) * 100 
          : 0
        assignmentScores.push(score)
      }
    })

    // Get completed quiz submissions (only the latest/best score per quiz)
    const completedQuizzes = await tx.quizSubmission.findMany({
      where: {
        studentId,
        isCompleted: true,
        quiz: {
          isActive: true,
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
      },
      orderBy: [
        { quizId: 'asc' },
        { percentage: 'desc' }, // Get best score for each quiz
        { completedAt: 'desc' }
      ]
    })

    // Get unique quiz scores (best score per quiz)
    const quizScores: number[] = []
    const seenQuizzes = new Set<string>()
    
    completedQuizzes.forEach((submission: any) => {
      if (!seenQuizzes.has(submission.quizId)) {
        seenQuizzes.add(submission.quizId)
        quizScores.push(submission.percentage)
      }
    })

    // Calculate combined average score
    const allScores = [...assignmentScores, ...quizScores]
    const averageScore = allScores.length > 0 
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
      : 0

    // Update student stats with new average
    const updatedStats = await tx.studentStats.findUnique({
      where: { studentId }
    })

    if (updatedStats) {
      const completionRate = updatedStats.totalAssignments > 0 
        ? (updatedStats.completedAssignments / updatedStats.totalAssignments) * 100 
        : 0

      await tx.studentStats.update({
        where: { studentId },
        data: {
          averageScore: parseFloat(averageScore.toFixed(2)),
          completionRate: parseFloat(completionRate.toFixed(2))
        }
      })
    }

    return averageScore
  }

} 