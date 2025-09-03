import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../../../lib/services/auth.service'
import { prisma } from '@/lib/db'

/**
 * GET /api/assignments/teacher/calendar
 * Get assignments created by the teacher for calendar view
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    if (currentUser.customRole !== 'TEACHER') {
      return NextResponse.json({
        success: false,
        error: 'This endpoint is only for teachers'
      }, { status: 403 })
    }

    // Get assignments created by the teacher
    const assignments = await prisma.assignment.findMany({
      where: {
        teacherId: currentUser.id
      },
      include: {
        teacher: {
          select: { id: true, username: true }
        },
        language: {
          select: { id: true, language: true, code: true }
        },
        questions: {
          select: {
            id: true,
            textQuestion: true,
            textAnswer: true,
          }
        },
        classes: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    users: true
                  }
                }
              }
            }
          }
        },
        students: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        progresses: {
          include: {
            student: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            questions: true,
            progresses: true,
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },
        { scheduledPublishAt: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Transform the data to include assignment statistics for teachers
    const assignmentsWithStats = assignments.map(assignment => {
      // Calculate total assigned students
      const classStudents = assignment.classes.reduce((acc, classAssignment) => {
        return acc + (classAssignment.class._count?.users || 0)
      }, 0)
      const individualStudents = assignment.students.length
      const totalAssignedStudents = classStudents + individualStudents

      // Group progresses by student
      const studentProgresses = assignment.progresses.reduce((acc, progress) => {
        if (!acc[progress.student.id]) {
          acc[progress.student.id] = []
        }
        acc[progress.student.id].push(progress)
        return acc
      }, {} as Record<string, typeof assignment.progresses>)

      // Calculate completion statistics
      let completedCount = 0
      let inProgressCount = 0
      const totalQuestions = assignment._count.questions

      Object.values(studentProgresses).forEach(studentProgressList => {
        const completedQuestions = studentProgressList.filter(p => p.isComplete).length
        if (completedQuestions === totalQuestions && totalQuestions > 0) {
          // Student has completed all questions
          completedCount++
        } else if (completedQuestions > 0) {
          // Student has started but not completed all questions
          inProgressCount++
        }
        // If completedQuestions === 0, they haven't started (handled by notStartedCount)
      })

      const studentsWhoStarted = Object.keys(studentProgresses).length
      const notStartedCount = totalAssignedStudents - studentsWhoStarted

      // Calculate average score (percentage of correct answers for completed assignments)
      const completedStudentProgresses = Object.values(studentProgresses).filter(studentProgressList => {
        const completedQuestions = studentProgressList.filter(p => p.isComplete).length
        return completedQuestions === totalQuestions && totalQuestions > 0
      })

      const averageScore = completedStudentProgresses.length > 0 
        ? completedStudentProgresses.reduce((sum, studentProgressList) => {
            const correctAnswers = studentProgressList.filter(p => p.isCorrect).length
            const studentScore = (correctAnswers / studentProgressList.length) * 100
            return sum + studentScore
          }, 0) / completedStudentProgresses.length
        : null

      return {
        id: assignment.id,
        topic: assignment.topic,
        type: assignment.type,
        isActive: assignment.isActive,
        scheduledPublishAt: assignment.scheduledPublishAt,
        dueDate: assignment.dueDate,
        createdAt: assignment.createdAt,
        publishedAt: assignment.publishedAt,
        language: assignment.language,
        totalQuestions: assignment._count.questions,
        // Teacher-specific stats
        stats: {
          totalAssignedStudents,
          completedCount,
          inProgressCount,
          notStartedCount,
          completionRate: totalAssignedStudents > 0 ? (completedCount / totalAssignedStudents) * 100 : 0,
          averageScore: averageScore ? Math.round(averageScore) : null
        },
        // For compatibility with existing calendar component
        progress: {
          completed: false, // Teachers don't complete their own assignments
          hasStarted: false,
          completedQuestions: 0,
          totalQuestions: assignment._count.questions,
          score: null
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: assignmentsWithStats
    })

  } catch (error) {
    console.error('Error fetching teacher calendar assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}
