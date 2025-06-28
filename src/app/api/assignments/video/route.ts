import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { handleServiceError } from '../../../../../lib/services/auth.service'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/assignments/video
 * Create a new video assignment
 * Teachers and admins can create video assignments
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

    // Validate required fields for video assignment
    const videoSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      videoUrl: z.string().url('Valid video URL is required'),
      languageId: z.string(),
      questions: z.array(z.object({
        text: z.string().min(1, 'Question text is required'),
        answer: z.string().min(1, 'Answer is required'),
      })).min(1, 'At least one question is required'),
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      assignToEntireClass: z.boolean(),
      scheduledPublishAt: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      color: z.string().optional(),
      rules: z.array(z.string()).optional(),
      feedbackSettings: z.object({
        detailedFeedback: z.boolean(),
        encouragementEnabled: z.boolean(),
      }).optional(),
      videoTranscript: z.string().optional(),
      hasTranscript: z.boolean().optional(),
      totalStudentsInScope: z.number().optional(),
      analysisResult: z.any().optional(),
    });

    const validatedData = videoSchema.parse({ ...body, languageId });

    // Create the video assignment
    const newAssignment = await AssignmentsService.createVideoAssignment(currentUser, {
      topic: validatedData.topic,
      videoUrl: validatedData.videoUrl,
      videoTranscript: validatedData.videoTranscript,
      hasTranscript: validatedData.hasTranscript,
      languageId: validatedData.languageId,
      questions: validatedData.questions.map(q => ({
        question: q.text,
        answer: q.answer
      })),
      classIds: validatedData.classIds || [],
      studentIds: validatedData.studentIds || [],
      assignToEntireClass: validatedData.assignToEntireClass,
      scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : null,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      color: validatedData.color,
      rules: validatedData.rules,
      feedbackSettings: validatedData.feedbackSettings,
      totalStudentsInScope: validatedData.totalStudentsInScope,
      analysisResult: validatedData.analysisResult,
    });

    return NextResponse.json({
      success: true,
      data: newAssignment,
      message: 'Video assignment created successfully',
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