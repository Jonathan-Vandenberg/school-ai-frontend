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
    
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const typeParam = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const publishedFromParam = searchParams.get('publishedFrom')
    const publishedToParam = searchParams.get('publishedTo')
    const publishedFrom = publishedFromParam ? new Date(publishedFromParam) : undefined
    const publishedTo = publishedToParam ? new Date(publishedToParam) : undefined

    // Validate type parameter
    const validTypes = ['CLASS', 'INDIVIDUAL'] as const
    const type = typeParam && validTypes.includes(typeParam as any) ? typeParam as 'CLASS' | 'INDIVIDUAL' : undefined

    // If classId is provided, use listAssignments for filtering
    if (classId) {
      const result = await AssignmentsService.listAssignments(currentUser, {
        classId,
        search: search || undefined,
        type,
        isActive: status === 'PUBLISHED' ? true : status === 'DRAFT' ? false : undefined,
        isScheduled: status === 'SCHEDULED' ? true : undefined,
        publishedFrom,
        publishedTo,
        page,
        limit
      })
      
      return NextResponse.json({
        success: true,
        data: result.assignments,
        pagination: result.pagination
      })
    }
    
    // Otherwise, use getMyAssignments for user-specific assignments
    const assignments = await AssignmentsService.getMyAssignments(currentUser, {
      status: status === 'PUBLISHED' ? 'active' : status === 'SCHEDULED' ? 'scheduled' : undefined
    })
    
    return NextResponse.json({
      success: true,
      data: assignments
    })
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
      // Get default English language if languageId is empty or not provided
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
        }
        // If no English language found, languageId remains undefined/null - this is now allowed
      }

      // Validate required fields for video assignment
      const videoSchema = z.object({
        topic: z.string().min(1, 'Topic is required'),
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
        languageId: z.string().optional().nullable(), // Made optional
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