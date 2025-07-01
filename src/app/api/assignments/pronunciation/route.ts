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

    // Validate required fields for pronunciation assignment
    const pronunciationSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      languageId: z.string().optional().nullable(), // Made optional
      languageAssessmentType: z.enum(['SCRIPTED_US', 'SCRIPTED_UK', 'UNSCRIPTED_US', 'UNSCRIPTED_UK', 'PRONUNCIATION_US', 'PRONUNCIATION_UK']),
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      type: z.enum(['CLASS', 'INDIVIDUAL']),
      scheduledPublishAt: z.string().optional(),
      color: z.string().optional(),
      vocabularyItems: z.array(z.any()).optional(),
      context: z.string().optional(),
      evaluationSettings: z.object({
        type: z.literal('PRONUNCIATION'),
        customPrompt: z.string().optional(),
        rules: z.any().optional(),
        acceptableResponses: z.any().optional(),
        feedbackSettings: z.any().optional(),
      }).optional(),
    });

    const validatedData = pronunciationSchema.parse({ ...body, languageId });

    // Create the pronunciation assignment
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
      languageAssessmentType: validatedData.languageAssessmentType,
      evaluationSettings: validatedData.evaluationSettings,
    });

    return NextResponse.json({
      success: true,
      data: newAssignment,
      message: 'Pronunciation assignment created successfully',
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