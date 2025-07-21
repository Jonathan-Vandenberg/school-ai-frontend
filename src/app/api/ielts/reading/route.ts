import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { handleServiceError } from '../../../../../lib/services'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/ielts/reading
 * Create a new IELTS Reading assignment
 * Teachers and admins can create IELTS assignments
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser();
    const body = await request.json();

    // Get default English language
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
    }

    // Validate required fields for IELTS Reading assignment
    const ieltsReadingSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      accent: z.enum(['us', 'uk']).default('us'),
      passages: z.array(z.object({
        text: z.string().min(1, 'Passage text is required'),
        title: z.string().optional(),
      })).min(1, 'At least one passage is required'),
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      assignToEntireClass: z.boolean(),
      scheduledPublishAt: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      color: z.string().optional(),
    });

    const validatedData = ieltsReadingSchema.parse(body);

    // Set assignment type and evaluation settings
    const assignmentData = {
      topic: validatedData.topic,
      type: (validatedData.assignToEntireClass ? 'CLASS' : 'INDIVIDUAL') as 'CLASS' | 'INDIVIDUAL',
      languageId: languageId,
      color: validatedData.color || '#3B82F6', // Blue for reading
      isIELTS: true,
      classIds: validatedData.assignToEntireClass ? validatedData.classIds : undefined,
      studentIds: !validatedData.assignToEntireClass ? validatedData.studentIds : undefined,
      evaluationSettings: {
        type: 'READING' as const,
        customPrompt: '',
        rules: [],
        acceptableResponses: [],
        feedbackSettings: {
          detailedFeedback: true,
          encouragementEnabled: true,
          accent: validatedData.accent,
          scoringCriteria: 'ielts',
        }
      },
      ...(validatedData.scheduledPublishAt && {
        scheduledPublishAt: new Date(validatedData.scheduledPublishAt)
      }),
      ...(validatedData.dueDate && {
        dueDate: new Date(validatedData.dueDate)
      })
    };

    const result = await AssignmentsService.createAssignment(
      currentUser,
      assignmentData
    );

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Error creating IELTS Reading assignment:', error);
    return handleServiceError(error);
  }
} 