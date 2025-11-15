import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { TemplatesService } from '../../../../../lib/services/templates.service'
import { handleServiceError } from '../../../../../lib/services/auth.service'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { LevelType, CEFRLevel, GradeLevel } from '@prisma/client'

/**
 * POST /api/assignments/video
 * Create a new video assignment
 * Teachers and admins can create video assignments
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

    // Validate required fields for video assignment
    const videoSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      description: z.string().optional(),
      videoUrl: z.string().url('Valid video URL is required'),
      languageId: z.string().optional().nullable(), // Made optional
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
      levels: z.array(z.object({
        levelType: z.nativeEnum(LevelType),
        cefrLevel: z.nativeEnum(CEFRLevel).optional(),
        gradeLevel: z.nativeEnum(GradeLevel).optional(),
      })).min(1, 'At least one level must be specified'),
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

    // Automatically create a template from this assignment
    try {
      await TemplatesService.createTemplate(currentUser, {
        topic: validatedData.topic,
        description: validatedData.description ?? undefined,
        color: validatedData.color ?? undefined,
        videoUrl: validatedData.videoUrl ?? undefined,
        videoTranscript: validatedData.videoTranscript ?? undefined,
        languageId: validatedData.languageId ?? undefined,
        evaluationSettings: {
          type: 'VIDEO' as any,
          customPrompt: undefined,
          rules: validatedData.rules || [],
          acceptableResponses: [],
          feedbackSettings: validatedData.feedbackSettings || {}
        },
        questions: validatedData.questions.map((q, index) => ({
          textQuestion: q.text,
          textAnswer: q.answer,
          order: index
        })),
        levels: validatedData.levels
      });
    } catch (templateError) {
      // Log but don't fail assignment creation if template creation fails
      console.error('Failed to create template:', templateError);
    }

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