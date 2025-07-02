import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../../lib/services/auth.service';
import { QuizService, CreateQuizData } from '../../../../../../lib/services/quiz.service';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser();
    AuthService.requireTeacherOrAdmin(currentUser);

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const {
      title,
      topic,
      description,
      numberOfOptions,
      classIds,
      studentIds,
      assignToEntireClass,
      scheduledPublishAt,
      dueDate,
      isAIGenerated,
      questions
    } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required and must be a string' },
        { status: 400 }
      );
    }

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one class must be selected' },
        { status: 400 }
      );
    }

    // Validate questions are provided
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Calculate numberOfQuestions from actual questions array
    const numberOfQuestions = questions.length;

    if (numberOfQuestions < 1 || numberOfQuestions > 50) {
      return NextResponse.json(
        { error: 'Number of questions must be between 1 and 50' },
        { status: 400 }
      );
    }

    if (numberOfOptions < 2 || numberOfOptions > 8) {
      return NextResponse.json(
        { error: 'Number of options must be between 2 and 8' },
        { status: 400 }
      );
    }

    // Prepare quiz data
    const quizData: CreateQuizData = {
      title: title.trim(),
      topic: topic.trim(),
      description: description?.trim(),
      numberOfQuestions,
      numberOfOptions,
      classIds,
      studentIds: assignToEntireClass ? undefined : studentIds,
      assignToEntireClass,
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      isAIGenerated,
      questions
    };

    // Create the quiz
    const quiz = await QuizService.createQuiz(currentUser, quizData);

    return NextResponse.json({
      success: true,
      quiz,
      message: 'Quiz created successfully'
    });

  } catch (error: any) {
    console.error('Error creating quiz:', error);

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message || 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message || 'Validation failed' },
        { status: 400 }
      );
    }

    if (error.name === 'NotFoundError') {
      return NextResponse.json(
        { error: error.message || 'Resource not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create quiz',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 