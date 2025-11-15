import { NextRequest, NextResponse } from 'next/server'
import { AuthService, IELTSAssignmentsService, handleServiceError } from '@/lib/services'
import { z } from 'zod'
import { LevelType, CEFRLevel, GradeLevel } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const data = await request.json()

    // Validate request data
    const schema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      classIds: z.array(z.string()).min(1, 'At least one class is required'),
      studentIds: z.array(z.string()).optional(),
      assignToEntireClass: z.boolean(),
      scheduledPublishAt: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      languageId: z.string().optional().nullable(),
      totalStudentsInScope: z.number().optional(),
      passages: z.array(z.object({
        text: z.string().min(1),
        title: z.string().optional(),
      })).optional(),
      context: z.string().optional(),
      accent: z.enum(['us', 'uk']).optional(),
      levels: z.array(z.object({
        levelType: z.nativeEnum(LevelType),
        cefrLevel: z.nativeEnum(CEFRLevel).optional(),
        gradeLevel: z.nativeEnum(GradeLevel).optional(),
      })).min(1, 'At least one level must be specified'),
    })

    const validatedData = schema.parse(data)

    // Transform form data to IELTS assignment DTO
    const assignmentData = {
      topic: validatedData.topic,
      subtype: 'reading' as const,
      classIds: validatedData.classIds,
      studentIds: validatedData.assignToEntireClass ? [] : (validatedData.studentIds || []),
      assignToEntireClass: validatedData.assignToEntireClass,
      scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : null,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      languageId: validatedData.languageId || null,
      color: '#10B981', // Green for reading
      totalStudentsInScope: validatedData.totalStudentsInScope || 0,
      passages: validatedData.passages,
      context: validatedData.context,
      accent: validatedData.accent || 'us',
      levels: validatedData.levels,
    }

    const assignment = await IELTSAssignmentsService.createIELTSAssignment(currentUser, assignmentData)

    return NextResponse.json({
      success: true,
      assignment,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Validation failed',
        details: error.errors 
      }, { status: 400 });
    }
    return handleServiceError(error)
  }
}
