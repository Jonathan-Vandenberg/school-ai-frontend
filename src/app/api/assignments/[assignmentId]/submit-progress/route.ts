import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../../lib/services/assignments.service'

interface SubmitProgressRequest {
  questionId: string
  isCorrect: boolean
  actualScore?: number  // The actual pronunciation/reading score (0-100)
  result: any
  type: 'VIDEO' | 'READING'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await AuthService.getAuthenticatedUser()

    // Only students can submit progress
    if (user.customRole !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit progress' }, { status: 403 })
    }

    const { assignmentId } = await params
    const body: SubmitProgressRequest = await request.json()
    const { questionId, isCorrect, actualScore, result, type } = body

    if (!questionId || typeof isCorrect !== 'boolean' || !result || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract actualScore from result object if not provided at top level
    const finalActualScore = actualScore || result?.actualScore

    const response = await AssignmentsService.submitStudentProgress(
      user.id,
      assignmentId,
      questionId,
      isCorrect,
      result,
      type,
      finalActualScore
    )

    return NextResponse.json(response)

  } catch (error) {
    return handleServiceError(error)
  }
} 