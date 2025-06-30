import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { StatisticsService } from '@/lib/services/statistics.service'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params

    const classAccess = await prisma.class.findFirst({
      where: {
        id: classId,
        OR: [
          ...(session.user.customRole === 'TEACHER' ? [{
            users: {
              some: {
                userId: session.user.id
              }
            }
          }] : []),...(session.user.customRole === 'ADMIN' ? [{
            id: classId
          }] : []),
          ...(session.user.customRole === 'STUDENT' ? [{
            users: {
              some: {
                userId: session.user.id
              }
            }
          }] : [])
        ]
      }
    })

    if (!classAccess) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 })
    }

    const classStats = await StatisticsService.getClassStatistics(classId)
    
    if (!classStats) {
      return NextResponse.json({ 
        error: 'Class statistics not found',
        message: 'Statistics may not be initialized yet'
      }, { status: 404 })
    }

    const studentsNeedingHelpCount = await prisma.studentsNeedingHelp.count({
      where: {
        isResolved: false,
        classes: {
          some: {
            classId: classId
          }
        }
      }
    })

    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    const response = {
      success: true,
      data: {
        classInfo: {
          id: classDetails?.id,
          name: classDetails?.name,
          createdAt: classDetails?.createdAt
        },
        stats: {
          totalStudents: classStats.totalStudents,
          totalAssignments: classStats.totalAssignments,
          averageCompletion: classStats.averageCompletion,
          averageScore: classStats.averageScore,
          totalQuestions: classStats.totalQuestions,
          totalAnswers: classStats.totalAnswers,
          totalCorrectAnswers: classStats.totalCorrectAnswers,
          accuracyRate: classStats.accuracyRate,
          activeStudents: classStats.activeStudents,
          studentsNeedingHelp: studentsNeedingHelpCount,
          lastActivityDate: classStats.lastActivityDate,
          lastUpdated: classStats.lastUpdated
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching class statistics:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 