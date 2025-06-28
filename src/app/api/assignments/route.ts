import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../lib/services/assignments.service'
import { handleServiceError } from '../../../../lib/services/auth.service'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * GET /api/assignments
 * List assignments with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser()
    const assignments = await AssignmentsService.getMyAssignments(currentUser)
    
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/assignments
 * Create a new assignment (either standard or video)
 * Teachers and admins can create assignments
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await AuthService.getAuthenticatedUser();
    const body = await request.json();

    // Differentiator for creation type
    const { creationType, ...data } = body;

    if (creationType === 'video') {
      // Get default English language if languageId is empty
      let languageId = data.languageId;
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
        languageId: z.string().min(1, 'Language is required'),
        questions: z.array(z.object({
          text: z.string().min(1, 'Question text is required'),
          answer: z.string().min(1, 'Answer is required'),
        })).min(1, 'At least one question is required'),
        classIds: z.array(z.string()).optional(),
        studentIds: z.array(z.string()).optional(),
        assignToEntireClass: z.boolean(),
        scheduledPublishAt: z.string().optional().nullable(),
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

      const validatedData = videoSchema.parse({ ...data, languageId });

      // Logic for creating a video assignment
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

    } else {
      // Existing logic for standard assignment creation
      const standardSchema = z.object({
        topic: z.string().min(1, 'Topic is required'),
        type: z.enum(['CLASS', 'INDIVIDUAL']),
        languageId: z.string().min(1, 'Language is required'),
        classIds: z.array(z.string()).optional(),
        studentIds: z.array(z.string()).optional(),
        color: z.string().optional(),
        vocabularyItems: z.array(z.any()).optional(),
        scheduledPublishAt: z.string().optional(),
        videoUrl: z.string().optional(),
        videoTranscript: z.string().optional(),
        languageAssessmentType: z.enum(['SCRIPTED_US', 'SCRIPTED_UK', 'UNSCRIPTED_US', 'UNSCRIPTED_UK', 'PRONUNCIATION_US', 'PRONUNCIATION_UK']).optional(),
        isIELTS: z.boolean().optional(),
        context: z.string().optional(),
        evaluationSettings: z.object({
          type: z.enum(['CUSTOM', 'IMAGE', 'VIDEO', 'Q_AND_A', 'READING', 'PRONUNCIATION']),
          customPrompt: z.string().optional(),
          rules: z.any().optional(),
          acceptableResponses: z.any().optional(),
          feedbackSettings: z.any().optional(),
        }).optional(),
      });

      const validatedData = standardSchema.parse(data);

      // Use service to create assignment
      const newAssignment = await AssignmentsService.createAssignment(currentUser, {
        topic: validatedData.topic,
        type: validatedData.type,
        languageId: validatedData.languageId,
        classIds: validatedData.classIds,
        studentIds: validatedData.studentIds,
        color: validatedData.color,
        vocabularyItems: validatedData.vocabularyItems,
        scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : undefined,
        videoUrl: validatedData.videoUrl,
        videoTranscript: validatedData.videoTranscript,
        languageAssessmentType: validatedData.languageAssessmentType,
        isIELTS: validatedData.isIELTS,
        context: validatedData.context,
        evaluationSettings: validatedData.evaluationSettings,
      })

      return NextResponse.json({
        success: true,
        data: newAssignment,
        message: 'Assignment created successfully',
      }, { status: 201 })
    }
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