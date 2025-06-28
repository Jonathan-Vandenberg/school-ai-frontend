import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../../lib/services/assignments.service'

interface SubmitProgressRequest {
  questionId: string
  isCorrect: boolean
  transcript: string
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
    const { questionId, isCorrect, transcript } = body

    if (!questionId || typeof isCorrect !== 'boolean' || !transcript) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await AssignmentsService.submitStudentProgress(
      user.id,
      assignmentId,
      questionId,
      isCorrect,
      transcript
    )

    return NextResponse.json(result)

  } catch (error) {
    return handleServiceError(error)
  }
} 