import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { handleServiceError } from '../../../../../lib/services'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/ielts/question-and-answer
 * Create a new IELTS Question & Answer assignment
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

    // Validate required fields for IELTS Q&A assignment
    const ieltsQASchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      accent: z.enum(['us', 'uk']).default('us'),
      questions: z.array(z.object({
        text: z.string().min(1, 'Question text is required'),
        topic: z.string().optional(),
        expectedLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
      })).min(1, 'At least one question is required'),
      context: z.string().optional(),
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      assignToEntireClass: z.boolean(),
      scheduledPublishAt: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      color: z.string().optional(),
    });

    const validatedData = ieltsQASchema.parse(body);

    // Set assignment type and evaluation settings
    const assignmentData = {
      topic: validatedData.topic,
      type: (validatedData.assignToEntireClass ? 'CLASS' : 'INDIVIDUAL') as 'CLASS' | 'INDIVIDUAL',
      languageId: languageId,
      color: validatedData.color || '#22C55E', // Green for Q&A
      context: validatedData.context,
      isIELTS: true,
      classIds: validatedData.assignToEntireClass ? validatedData.classIds : undefined,
      studentIds: !validatedData.assignToEntireClass ? validatedData.studentIds : undefined,
      evaluationSettings: {
        type: 'Q_AND_A' as const,
        customPrompt: validatedData.context,
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
    console.error('Error creating IELTS Q&A assignment:', error);
    return handleServiceError(error);
  }
} 