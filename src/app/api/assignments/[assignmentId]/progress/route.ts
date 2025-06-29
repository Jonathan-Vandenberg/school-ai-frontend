import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'
import { prisma } from '@/lib/db'

/**
 * GET /api/assignments/[assignmentId]/progress
 * Get comprehensive student progress for an assignment
 * Only teachers and admins can access this endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Students can only view their own progress, teachers and admins can view all progress
    const isStudent = currentUser.customRole === 'STUDENT'

    const { assignmentId } = await params

    // Get assignment with full details including students and classes
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        teacher: {
          select: { id: true, username: true }
        },
        questions: {
          select: {
            id: true,
            textQuestion: true,
            textAnswer: true
          },
          orderBy: { createdAt: 'asc' }
        },
        classes: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                users: {
                  where: {
                    user: { customRole: 'STUDENT' }
                  },
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        email: true
                      }
                    }
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
                username: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Assignment not found' 
        },
        { status: 404 }
      )
    }

    // Check access permissions
    if (currentUser.customRole === 'TEACHER' && assignment.teacher?.id !== currentUser.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You can only view progress for your own assignments' 
        },
        { status: 403 }
      )
    }

    // For students, verify they have access to this assignment
    if (isStudent) {
      const hasAccess = assignment.classes.some(classAssignment => 
        classAssignment.class.users.some(userClass => userClass.user.id === currentUser.id)
      ) || assignment.students.some(studentAssignment => 
        studentAssignment.user.id === currentUser.id
      )

      if (!hasAccess) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'You do not have access to this assignment' 
          },
          { status: 403 }
        )
      }
    }

    // Collect all students who should complete this assignment
    const studentsMap = new Map<string, {
      id: string
      username: string
      email: string
      source: 'class' | 'individual'
      className?: string
    }>()

    // Add students from classes
    assignment.classes.forEach(classAssignment => {
      classAssignment.class.users.forEach(userClass => {
        const student = userClass.user
        studentsMap.set(student.id, {
          id: student.id,
          username: student.username,
          email: student.email,
          source: 'class',
          className: classAssignment.class.name
        })
      })
    })

    // Add individual students
    assignment.students.forEach(studentAssignment => {
      const student = studentAssignment.user
      studentsMap.set(student.id, {
        id: student.id,
        username: student.username,
        email: student.email,
        source: 'individual'
      })
    })

    const allStudents = Array.from(studentsMap.values())
    
    // For students, filter to only include themselves
    const filteredStudents = isStudent 
      ? allStudents.filter(student => student.id === currentUser.id)
      : allStudents

    // Get progress records for this assignment (filtered by student if applicable)
    const progresses = await prisma.studentAssignmentProgress.findMany({
      where: {
        assignmentId: assignmentId,
        ...(isStudent && { studentId: currentUser.id })
      },
      include: {
        student: {
          select: {
            id: true,
            username: true
          }
        },
        question: {
          select: {
            id: true,
            textQuestion: true
          }
        }
      },
      orderBy: [
        { studentId: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Group progress by student
    const progressByStudent = new Map<string, typeof progresses>()
    progresses.forEach(progress => {
      const studentId = progress.studentId
      if (!progressByStudent.has(studentId)) {
        progressByStudent.set(studentId, [])
      }
      progressByStudent.get(studentId)!.push(progress)
    })

    // Calculate statistics for each student
    const studentProgress = filteredStudents.map(student => {
      const studentProgresses = progressByStudent.get(student.id) || []
      const totalQuestions = assignment.questions.length
      
      // Count unique questions answered (not just progress records)
      const uniqueQuestionsAnswered = new Set(
        studentProgresses.filter(p => p.isComplete).map(p => p.questionId)
      ).size
      const correctAnswers = studentProgresses.filter(p => p.isCorrect).length
      
      const completionRate = totalQuestions > 0 ? (uniqueQuestionsAnswered / totalQuestions) * 100 : 0
      const accuracyRate = uniqueQuestionsAnswered > 0 ? (correctAnswers / uniqueQuestionsAnswered) * 100 : 0
      const isComplete = uniqueQuestionsAnswered >= totalQuestions
      
      return {
        student: {
          id: student.id,
          username: student.username,
          email: student.email,
          source: student.source,
          className: student.className
        },
        stats: {
          totalQuestions,
          completedQuestions: uniqueQuestionsAnswered,
          correctAnswers,
          completionRate: Math.round(completionRate),
          accuracyRate: Math.round(accuracyRate),
          isComplete
        },
        questionProgress: assignment.questions.map(question => {
          const questionProgress = studentProgresses.find(p => p.questionId === question.id)
          return {
            questionId: question.id,
            questionText: question.textQuestion,
            isComplete: questionProgress?.isComplete || false,
            isCorrect: questionProgress?.isCorrect || false,
            submittedAt: questionProgress?.createdAt || null
          }
        })
      }
    })

    // Calculate overall assignment statistics (use appropriate student count based on user role)
    const totalStudents = isStudent ? 1 : allStudents.length
    const studentsCompleted = studentProgress.filter(sp => sp.stats.isComplete).length
    const studentsStarted = studentProgress.filter(sp => sp.stats.completedQuestions > 0).length
    const overallCompletionRate = totalStudents > 0 ? (studentsCompleted / totalStudents) * 100 : 0
    
    // Calculate average accuracy for students who have completed at least one question
    const studentsWithAnswers = studentProgress.filter(sp => sp.stats.completedQuestions > 0)
    const overallAccuracyRate = studentsWithAnswers.length > 0
      ? studentsWithAnswers.reduce((sum, sp) => sum + sp.stats.accuracyRate, 0) / studentsWithAnswers.length
      : 0

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          topic: assignment.topic,
          type: assignment.type,
          totalQuestions: assignment.questions.length,
          teacher: assignment.teacher
        },
        overallStats: {
          totalStudents,
          studentsStarted,
          studentsCompleted,
          completionRate: Math.round(overallCompletionRate),
          averageAccuracy: Math.round(overallAccuracyRate)
        },
        studentProgress: studentProgress.sort((a, b) => {
          // Sort by completion status, then by completion rate, then by name
          if (a.stats.isComplete !== b.stats.isComplete) {
            return a.stats.isComplete ? -1 : 1
          }
          if (a.stats.completionRate !== b.stats.completionRate) {
            return b.stats.completionRate - a.stats.completionRate
          }
          return a.student.username.localeCompare(b.student.username)
        }),
        questions: assignment.questions
      }
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 