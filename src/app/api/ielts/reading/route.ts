import { NextRequest, NextResponse } from 'next/server'
import { AuthService, IELTSAssignmentsService, handleServiceError } from '@/lib/services'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const data = await request.json()

    // Transform form data to IELTS assignment DTO
    const assignmentData = {
      topic: data.topic,
      subtype: 'reading' as const,
      classIds: data.classIds,
      studentIds: data.assignToEntireClass ? [] : (data.studentIds || []),
      assignToEntireClass: data.assignToEntireClass,
      scheduledPublishAt: data.scheduledPublishAt ? new Date(data.scheduledPublishAt) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      languageId: data.languageId || null,
      color: '#10B981', // Green for reading
      totalStudentsInScope: data.totalStudentsInScope || 0,
      passages: data.passages,
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
