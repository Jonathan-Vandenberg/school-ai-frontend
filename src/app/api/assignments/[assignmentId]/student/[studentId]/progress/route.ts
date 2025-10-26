import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { assignmentId: string; studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only teachers and admins can view student progress
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { assignmentId, studentId } = params

    // Get student's progress for this specific assignment
    const studentProgress = await prisma.studentAssignmentProgress.findMany({
      where: {
        assignmentId: assignmentId,
        studentId: studentId
      },
      include: {
        question: {
          select: {
            id: true,
            textQuestion: true,
            textAnswer: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Transform the data to match the expected format
    const transformedProgress = studentProgress.map(progress => ({
      questionId: progress.questionId,
      isComplete: progress.isComplete,
      isCorrect: progress.isCorrect,
      languageConfidenceResponse: progress.languageConfidenceResponse,
      actualScore: progress.actualScore
    }))

    return NextResponse.json({
      success: true,
      data: transformedProgress
    })

  } catch (error) {
    console.error('Error fetching student assignment progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student progress' },
      { status: 500 }
    )
  }
}
