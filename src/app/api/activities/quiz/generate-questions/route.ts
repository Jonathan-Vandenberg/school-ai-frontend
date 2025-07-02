import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../../lib/services/auth.service';
import { QuizService } from '../../../../../../lib/services/quiz.service';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser();
    AuthService.requireTeacherOrAdmin(currentUser);

    // Parse request body
    const body = await request.json();
    const { topic, numberOfQuestions, numberOfOptions, title, description, imageUrls, existingQuestions } = body;

    // Validate input
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required and must be a string' },
        { status: 400 }
      );
    }

    if (!numberOfQuestions || numberOfQuestions < 1 || numberOfQuestions > 50) {
      return NextResponse.json(
        { error: 'Number of questions must be between 1 and 50' },
        { status: 400 }
      );
    }

    if (!numberOfOptions || numberOfOptions < 2 || numberOfOptions > 8) {
      return NextResponse.json(
        { error: 'Number of options must be between 2 and 8' },
        { status: 400 }
      );
    }

    // Generate questions using AI with title, description, and image context
    const questions = await QuizService.generateQuestionsWithAI(
      topic,
      numberOfQuestions,
      numberOfOptions,
      title,
      description,
      imageUrls,
      existingQuestions
    );

    return NextResponse.json({
      success: true,
      questions,
      message: `Generated ${questions.length} questions successfully`
    });

  } catch (error: any) {
    console.error('Error generating quiz questions:', error);

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate questions',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 