import { NextRequest, NextResponse } from 'next/server'
import { AuthService, IELTSAssignmentsService, handleServiceError } from '@/lib/services'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const data = await request.json()

    // Transform form data to IELTS assignment DTO
    const assignmentData = {
      topic: data.topic,
      subtype: 'question-answer' as const,
      classIds: data.classIds,
      studentIds: data.assignToEntireClass ? [] : (data.studentIds || []),
      assignToEntireClass: data.assignToEntireClass,
      scheduledPublishAt: data.scheduledPublishAt ? new Date(data.scheduledPublishAt) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      languageId: data.languageId || null,
      color: '#3B82F6', // Blue for question-answer
      totalStudentsInScope: data.totalStudentsInScope || 0,
      questions: data.questions,
      context: data.context,
      accent: data.accent || 'us',
    }

    const assignment = await IELTSAssignmentsService.createIELTSAssignment(currentUser, assignmentData)

    return NextResponse.json({
      success: true,
      assignment,
    })
  } catch (error) {
    return handleServiceError(error)
  }
}
