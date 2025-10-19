import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'
import { StatisticsService } from '@/lib/services/statistics.service'
import { prisma } from '@/lib/db'

/**
 * GET /api/users/[userId]/stats
 * Get detailed student statistics and assignment progress
 * Teachers and admins can view any student, students can only view their own stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const { userId } = await params

    // Permission check: students can only view their own stats
    if (currentUser.customRole === 'STUDENT' && currentUser.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only view your own stats' },
        { status: 403 }
      )
    }

    // Get basic user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        customRole: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Only get stats for students
    if (user.customRole !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Stats are only available for students' },
        { status: 400 }
      )
    }

    // Get student statistics
    const studentStats = await StatisticsService.getStudentStatistics(userId)

    // Get student's classes
    const userClasses = await prisma.userClass.findMany({
      where: { userId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        }
      }
    })

    // Get student's assignments with progress
    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          {
            classes: {
              some: {
                class: {
                  users: {
                    some: { userId }
                  }
                }
              }
            }
          },
          {
            students: {
              some: { userId }
            }
          }
        ],
        isActive: true
      },
      include: {
        teacher: {
          select: { id: true, username: true }
        },
        classes: {
          include: {
            class: {
              select: { id: true, name: true }
            }
          }
        },
        progresses: {
          where: { studentId: userId },
          select: {
            id: true,
            questionId: true,
            isComplete: true,
            isCorrect: true,
            actualScore: true,
            updatedAt: true,
            question: {
              select: { id: true, textQuestion: true }
            }
          }
        },
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate assignment progress
    const assignmentProgress = assignments.map(assignment => {
      const totalQuestions = assignment._count.questions
      const completedQuestions = new Set(
        assignment.progresses.filter(p => p.isComplete).map(p => p.questionId)
      ).size
      const correctAnswers = assignment.progresses.filter(p => p.isCorrect).length
      
      const completionRate = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0
      
      // Calculate accuracy rate using actualScore when available, fallback to boolean
      let accuracyRate = 0
      if (completedQuestions > 0) {
        const completedProgresses = assignment.progresses.filter(p => p.isComplete)
        const scoresWithValues = completedProgresses.filter(p => p.actualScore !== null && p.actualScore !== undefined)
        
        if (scoresWithValues.length > 0) {
          // Use actual scores if available
          accuracyRate = scoresWithValues.reduce((sum, p) => sum + (p.actualScore || 0), 0) / scoresWithValues.length
        } else {
          // Fallback to boolean calculation
          accuracyRate = (correctAnswers / completedQuestions) * 100
        }
      }
      
      // Determine status based on progress
      let status: 'Not Started' | 'In Progress' | 'Complete'
      if (completedQuestions >= totalQuestions) {
        status = 'Complete'
      } else if (assignment.progresses.length > 0) {
        status = 'In Progress'
      } else {
        status = 'Not Started'
      }

      return {
        id: assignment.id,
        topic: assignment.topic,
        type: assignment.type,
        teacher: assignment.teacher,
        classes: assignment.classes.map(ac => ac.class),
        createdAt: assignment.createdAt,
        totalQuestions,
        completedQuestions,
        correctAnswers,
        completionRate: Math.round(completionRate),
        accuracyRate: Math.round(accuracyRate),
        isComplete: completedQuestions >= totalQuestions,
        status,
        lastActivity: assignment.progresses.length > 0 
          ? Math.max(...assignment.progresses.map(p => p.updatedAt.getTime()))
          : null
      }
    })

    // Check if student needs help
    const needsHelp = await prisma.studentsNeedingHelp.findFirst({
      where: {
        studentId: userId,
        isResolved: false
      },
      include: {
        classes: {
          include: {
            class: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.customRole,
          joinedAt: user.createdAt
        },
        statistics: studentStats ? {
          averageScore: Math.round(studentStats.averageScore),
          completionRate: Math.round(studentStats.completionRate),
          accuracyRate: Math.round(studentStats.accuracyRate),
          totalAssignments: studentStats.totalAssignments,
          completedAssignments: studentStats.completedAssignments,
          totalQuestions: studentStats.totalQuestions,
          totalAnswers: studentStats.totalAnswers,
          totalCorrectAnswers: studentStats.totalCorrectAnswers,
          lastActivityDate: studentStats.lastActivityDate,
          lastUpdated: studentStats.lastUpdated
        } : null,
        classes: userClasses.map(uc => uc.class),
        assignments: assignmentProgress,
        needsHelp: needsHelp ? {
          reasons: needsHelp.reasons,
          severity: needsHelp.severity,
          since: needsHelp.needsHelpSince,
          daysNeedingHelp: needsHelp.daysNeedingHelp,
          averageScore: needsHelp.averageScore,
          completionRate: needsHelp.completionRate,
          overdueAssignments: needsHelp.overdueAssignments,
          teacherNotes: needsHelp.teacherNotes,
          classes: needsHelp.classes.map(c => c.class)
        } : null
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching student stats:', error)
    return handleServiceError(error)
  }
} 