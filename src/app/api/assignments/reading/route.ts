import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { handleServiceError } from '../../../../../lib/services/auth.service'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/assignments/reading
 * Create a new reading assignment
 * Teachers and admins can create reading assignments
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser();
    const body = await request.json();

    // Get default English language if languageId is empty
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
      } else {
        return NextResponse.json({
          success: false,
          error: 'No English language found. Please specify a languageId.',
        }, { status: 400 });
      }
    }

    // Validate required fields for reading assignment
    const readingSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      context: z.string().min(1, 'Reading text/context is required'),
      languageId: z.string().min(1, 'Language is required'),
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      type: z.enum(['CLASS', 'INDIVIDUAL']),
      scheduledPublishAt: z.string().optional(),
      color: z.string().optional(),
      vocabularyItems: z.array(z.any()).optional(),
      isIELTS: z.boolean().optional(),
      evaluationSettings: z.object({
        type: z.literal('READING'),
        customPrompt: z.string().optional(),
        rules: z.any().optional(),
        acceptableResponses: z.any().optional(),
        feedbackSettings: z.any().optional(),
      }).optional(),
    });

    const validatedData = readingSchema.parse({ ...body, languageId });

    // Create the reading assignment
    const newAssignment = await AssignmentsService.createAssignment(currentUser, {
      topic: validatedData.topic,
      type: validatedData.type,
      languageId: validatedData.languageId,
      classIds: validatedData.classIds,
      studentIds: validatedData.studentIds,
      color: validatedData.color,
      vocabularyItems: validatedData.vocabularyItems,
      scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : undefined,
      context: validatedData.context,
      isIELTS: validatedData.isIELTS,
      evaluationSettings: validatedData.evaluationSettings,
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