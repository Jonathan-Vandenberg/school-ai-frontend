import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { handleServiceError } from '../../../../../lib/services/auth.service'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/assignments/pronunciation
 * Create a new pronunciation assignment
 * Teachers and admins can create pronunciation assignments
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser();
    const body = await request.json();

    // Get default English language if languageId is empty or not provided
    let languageId = body.languageId;
    if (!languageId || languageId.trim() === '') {
      const englishLanguage = await prisma.language.findFirst({
        where: { 
          OR: [
            { code: 'en' },
            { code: 'en-US' }
          ]
        }
      });
      
      if (englishLanguage) {
        languageId = englishLanguage.id;
      }
      // If no English language found, languageId remains undefined/null - this is now allowed
    }

    // Validate required fields for reading assignment
    const pronunciationSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      languageId: z.string().optional().nullable(), // Made optional
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      scheduledPublishAt: z.string().datetime().optional().nullable(),
      dueDate: z.string().datetime().optional().nullable(),
      color: z.string().optional(),
      questions: z.array(z.object({
        text: z.string().min(1, 'Question text is required'),
        title: z.string().optional().nullable(),
      })).min(1, 'At least one question is required'),
    });

    const validatedData = pronunciationSchema.parse({ ...body, languageId });

    // Create the pronunciation assignment
    const newAssignment = await AssignmentsService.createPronunciationAssignment(currentUser, {
      topic: validatedData.topic,
      languageId: validatedData.languageId,
      classIds: validatedData.classIds || [],
      studentIds: validatedData.studentIds || [],
      color: validatedData.color,
      scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : undefined,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      questions: validatedData.questions.map(q => ({
        text: q.text,
        title: q.title || ''
      })),
      assignToEntireClass: validatedData.studentIds ? false : true,
    });

    return NextResponse.json({
      success: true,
      data: newAssignment,
      message: 'Reading assignment created successfully',
    }, { status: 201 });

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