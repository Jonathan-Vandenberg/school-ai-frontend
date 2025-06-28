import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../../lib/services/auth.service'
import { prisma } from '@/lib/db'

/**
 * GET /api/assignments/calendar
 * Get assignments for calendar view with progress data for students
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    if (currentUser.customRole !== 'STUDENT') {
      return NextResponse.json({
        success: false,
        error: 'This endpoint is only for students'
      }, { status: 403 })
    }

    // Get assignments for the student with their progress
    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          {
            classes: {
              some: {
                class: {
                  users: {
                    some: { userId: currentUser.id }
                  }
                }
              }
            }
          },
          {
            students: {
              some: { userId: currentUser.id }
            }
          }
        ],
        isActive: true
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
        progresses: {
          where: {
            studentId: currentUser.id
          },
          include: {
            question: {
              select: { id: true }
            }
          }
        },
        _count: {
          select: {
            questions: true,
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },
        { scheduledPublishAt: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Transform the data to include progress information
    const assignmentsWithProgress = assignments.map(assignment => {
      const studentProgress = assignment.progresses || []
      const totalQuestions = assignment._count.questions
      const completedQuestions = studentProgress.filter(p => p.isComplete).length
      const correctAnswers = studentProgress.filter(p => p.isCorrect).length
      
      const isCompleted = totalQuestions > 0 && completedQuestions === totalQuestions
      const accuracyScore = completedQuestions > 0 ? (correctAnswers / completedQuestions) * 100 : null

      return {
        id: assignment.id,
        topic: assignment.topic,
        type: assignment.type,
        dueDate: assignment.dueDate,
        scheduledPublishAt: assignment.scheduledPublishAt,
        isActive: assignment.isActive,
        publishedAt: assignment.publishedAt,
        teacher: assignment.teacher,
        language: assignment.language,
        progress: {
          completed: isCompleted,
          completedQuestions,
          totalQuestions,
          score: accuracyScore,
          hasStarted: studentProgress.length > 0
        },
        _count: {
          progresses: studentProgress.length,
          questions: totalQuestions
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: assignmentsWithProgress
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 