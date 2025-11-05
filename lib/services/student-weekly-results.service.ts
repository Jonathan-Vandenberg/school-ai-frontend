import { prisma, withTransaction } from '../db'
import { DatabaseError } from '../db'

export interface StudentWeeklyResult {
  studentId: string
  studentName: string
  studentEmail: string
  parentEmail: string
  weekStart: Date
  weekEnd: Date
  assignments: AssignmentResult[]
  quizzes: QuizResult[]
  overallStats: {
    totalAssignments: number
    completedAssignments: number
    totalQuizzes: number
    completedQuizzes: number
    averageScore: number
    completionRate: number
  }
}

export interface AssignmentResult {
  id: string
  topic: string
  type: string
  languageAssessmentType?: string
  isIELTS: boolean
  dueDate?: Date
  completedAt?: Date
  score?: number
  isComplete: boolean
  questions: QuestionResult[]
}

export interface QuestionResult {
  id: string
  textQuestion?: string
  image?: string
  videoUrl?: string
  textAnswer?: string
  isComplete: boolean
  isCorrect: boolean
  actualScore?: number
  languageConfidenceResponse?: any
  grammarCorrected?: any
}

export interface QuizResult {
  id: string
  title: string
  topic: string
  dueDate?: Date
  completedAt?: Date
  score: number
  percentage: number
  isCompleted: boolean
  sessionNumber: number
  questionsAnswered: number
  totalQuestions: number
}

export class StudentWeeklyResultsService {
  /**
   * Get weekly results for all students with parent emails
   */
  static async getWeeklyResultsForAllStudents(
    weekStart: Date,
    weekEnd: Date
  ): Promise<StudentWeeklyResult[]> {
    try {
      return await withTransaction(async (tx) => {
        // Get all students who have parent emails
        const students = await tx.user.findMany({
          where: {
            customRole: 'STUDENT',
            email: { not: null as any },
            // Only include students who have assignments or quizzes in the given week
            OR: [
              {
                progresses: {
                  some: {
                    createdAt: {
                      gte: weekStart,
                      lte: weekEnd,
                    },
                  },
                },
              },
              {
                quizSubmissions: {
                  some: {
                    createdAt: {
                      gte: weekStart,
                      lte: weekEnd,
                    },
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            username: true,
            email: true,
          },
        })

        const results: StudentWeeklyResult[] = []

        for (const student of students) {
          const studentResult = await this.getStudentWeeklyResult(
            student.id,
            weekStart,
            weekEnd,
            tx
          )
          
          if (studentResult) {
            results.push(studentResult)
          }
        }

        return results
      })
    } catch (error) {
      console.error('Error fetching weekly results for all students:', error)
      throw new DatabaseError('Failed to fetch weekly results', error)
    }
  }

  /**
   * Get weekly results for a specific student
   */
  static async getStudentWeeklyResult(
    studentId: string,
    weekStart: Date,
    weekEnd: Date,
    tx?: any
  ): Promise<StudentWeeklyResult | null> {
    const prismaClient = tx || prisma

    try {
      // Get student details
      const student = await prismaClient.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          username: true,
          email: true,
        },
      })

      if (!student) {
        return null
      }

      // Get assignments assigned to this specific student (either through class or individually)
      const studentAssignments = await prismaClient.assignment.findMany({
        where: {
          publishedAt: {
            lte: weekEnd, // Only assignments published before or during the week
          },
          OR: [
            // Individual assignments assigned directly to the student
            {
              students: {
                some: {
                  userId: studentId,
                },
              },
            },
            // Class assignments where the student is in the class
            {
              classes: {
                some: {
                  class: {
                    users: {
                      some: {
                        userId: studentId,
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          topic: true,
          type: true,
          languageAssessmentType: true,
          isIELTS: true,
          dueDate: true,
          publishedAt: true,
          questions: {
            select: {
              id: true,
              textQuestion: true,
              image: true,
              videoUrl: true,
              textAnswer: true,
            },
          },
        },
        orderBy: {
          publishedAt: 'desc',
        },
      })

      // Get assignment progress for the student in the given week
      const assignmentProgresses = await prismaClient.studentAssignmentProgress.findMany({
        where: {
          studentId,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          assignment: {
            select: {
              id: true,
            },
          },
          question: {
            select: {
              id: true,
            },
          },
        },
      })

      // Get quiz submissions in the given week
      const quizSubmissions = await prismaClient.quizSubmission.findMany({
        where: {
          studentId,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              topic: true,
              dueDate: true,
              publishedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Create a map of progress by assignment and question for quick lookup
      const progressMap = new Map<string, Map<string, any>>()
      for (const progress of assignmentProgresses) {
        const assignmentId = progress.assignmentId
        const questionId = progress.question?.id
        
        if (questionId) {
          if (!progressMap.has(assignmentId)) {
            progressMap.set(assignmentId, new Map())
          }
          
          progressMap.get(assignmentId)!.set(questionId, {
            completedAt: progress.isComplete ? progress.updatedAt : undefined,
            score: progress.actualScore,
            isComplete: progress.isComplete,
            isCorrect: progress.isCorrect,
            actualScore: progress.actualScore,
            languageConfidenceResponse: progress.languageConfidenceResponse,
            grammarCorrected: progress.grammarCorrected,
          })
        }
      }

      // Process all assignments and include progress where available
      const assignmentMap = new Map<string, AssignmentResult>()

      for (const assignment of studentAssignments) {
        const assignmentId = assignment.id
        const assignmentProgress = progressMap.get(assignmentId)
        
        // Calculate overall assignment completion and score
        let completedQuestions = 0
        let totalScore = 0
        let hasAnyProgress = false
        let latestCompletedAt: Date | undefined

        const questions: QuestionResult[] = []
        
        for (const question of assignment.questions) {
          const questionProgress = assignmentProgress?.get(question.id)
          const isComplete = questionProgress?.isComplete || false
          const isCorrect = questionProgress?.isCorrect || false
          // Use actualScore if available, otherwise use isCorrect (true = 100, false = 0)
          const actualScore = questionProgress?.actualScore !== null && questionProgress?.actualScore !== undefined 
            ? questionProgress.actualScore 
            : (isCorrect ? 100 : 0)
          
          if (questionProgress) {
            hasAnyProgress = true
            if (isComplete) {
              completedQuestions++
              totalScore += actualScore
              if (questionProgress.completedAt && (!latestCompletedAt || questionProgress.completedAt > latestCompletedAt)) {
                latestCompletedAt = questionProgress.completedAt
              }
            }
          }

          questions.push({
            id: question.id,
            textQuestion: question.textQuestion,
            image: question.image,
            videoUrl: question.videoUrl,
            textAnswer: question.textAnswer,
            isComplete,
            isCorrect,
            actualScore,
            languageConfidenceResponse: questionProgress?.languageConfidenceResponse,
            grammarCorrected: questionProgress?.grammarCorrected,
          })
        }

        const isComplete = completedQuestions === assignment.questions.length
        const score = completedQuestions > 0 ? Math.round(totalScore / completedQuestions) : undefined

        assignmentMap.set(assignmentId, {
          id: assignmentId,
          topic: assignment.topic || 'Untitled Assignment',
          type: assignment.type || 'CLASS',
          languageAssessmentType: assignment.languageAssessmentType,
          isIELTS: assignment.isIELTS || false,
          dueDate: assignment.dueDate,
          completedAt: latestCompletedAt,
          score,
          isComplete,
          questions,
        })
      }

      // Process quiz submissions
      const quizResults: QuizResult[] = quizSubmissions.map((submission: any) => ({
        id: submission.quiz.id,
        title: submission.quiz.title,
        topic: submission.quiz.topic,
        dueDate: submission.quiz.dueDate,
        completedAt: submission.completedAt,
        score: submission.score,
        percentage: submission.percentage,
        isCompleted: submission.isCompleted,
        sessionNumber: submission.sessionNumber,
        questionsAnswered: submission.answers.length,
        totalQuestions: submission.totalScore > 0 ? Math.round(submission.totalScore) : 0,
      }))

      // Calculate overall stats
      const assignments = Array.from(assignmentMap.values())
      const totalAssignments = assignments.length
      const completedAssignments = assignments.filter(a => a.isComplete).length
      const totalQuizzes = quizResults.length
      const completedQuizzes = quizResults.filter(q => q.isCompleted).length
      
      // Calculate average score (only from completed assignments)
      const completedAssignmentScores = assignments
        .filter(a => a.isComplete && a.score !== null && a.score !== undefined)
        .map(a => a.score!)
      
      const averageScore = completedAssignmentScores.length > 0 
        ? Math.round(completedAssignmentScores.reduce((sum, score) => sum + score, 0) / completedAssignmentScores.length)
        : 0

      const completionRate = (totalAssignments + totalQuizzes) > 0
        ? ((completedAssignments + completedQuizzes) / (totalAssignments + totalQuizzes)) * 100
        : 0

      // For now, we'll use the student's email as parent email
      // In a real system, you'd have a separate parent-student relationship
      const parentEmail = student.email

      return {
        studentId: student.id,
        studentName: student.username,
        studentEmail: student.email,
        parentEmail: parentEmail,
        weekStart,
        weekEnd,
        assignments,
        quizzes: quizResults,
        overallStats: {
          totalAssignments,
          completedAssignments,
          totalQuizzes,
          completedQuizzes,
          averageScore,
          completionRate: Math.round(completionRate),
        },
      }
    } catch (error) {
      console.error(`Error fetching weekly results for student ${studentId}:`, error)
      throw new DatabaseError('Failed to fetch student weekly results', error)
    }
  }

  /**
   * Get students who have activity in the given week
   */
  static async getActiveStudentsInWeek(
    weekStart: Date,
    weekEnd: Date
  ): Promise<Array<{ id: string; username: string; email: string }>> {
    try {
      return await prisma.user.findMany({
        where: {
          customRole: 'STUDENT',
          email: { not: null as any },
          OR: [
            {
              progresses: {
                some: {
                  createdAt: {
                    gte: weekStart,
                    lte: weekEnd,
                  },
                },
              },
            },
            {
              quizSubmissions: {
                some: {
                  createdAt: {
                    gte: weekStart,
                    lte: weekEnd,
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
        orderBy: {
          username: 'asc',
        },
      })
    } catch (error) {
      console.error('Error fetching active students:', error)
      throw new DatabaseError('Failed to fetch active students', error)
    }
  }

  /**
   * Get week boundaries for a given date
   */
  static getWeekBoundaries(date: Date): { weekStart: Date; weekEnd: Date } {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // End of week (Saturday)
    weekEnd.setHours(23, 59, 59, 999)

    return { weekStart, weekEnd }
  }

  /**
   * Get current week boundaries (from Monday of current week to today)
   */
  static getCurrentWeekBoundaries(): { weekStart: Date; weekEnd: Date } {
    const today = new Date()
    return this.getWeekBoundaries(today)
  }

  /**
   * Get previous week boundaries
   */
  static getPreviousWeekBoundaries(): { weekStart: Date; weekEnd: Date } {
    const today = new Date()
    const lastWeek = new Date(today)
    lastWeek.setDate(today.getDate() - 7)
    
    return this.getWeekBoundaries(lastWeek)
  }
}
