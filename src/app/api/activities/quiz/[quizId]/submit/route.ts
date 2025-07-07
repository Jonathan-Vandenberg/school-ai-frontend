import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await request.json();
    const { answers, isLiveSession, liveSessionId, autoSubmit } = body;

    // Get the quiz and verify student has access
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        isActive: true,
        classes: {
          some: {
            class: {
              users: {
                some: {
                  userId: session.user.id
                }
              }
            }
          }
        }
      },
      include: {
        questions: {
          include: {
            options: {
              orderBy: { order: 'asc' }
            }
          }
        },
        classes: {
          include: {
            class: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Check if student already has a submission for the current session
    const existingSubmission = await prisma.quizSubmission.findFirst({
      where: {
        quizId: quizId,
        studentId: session.user.id,
        sessionNumber: quiz.currentSession // Only check current session
      }
    });

    if (existingSubmission && existingSubmission.isCompleted) {
      return NextResponse.json({ error: 'Quiz already completed for this session' }, { status: 400 });
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;
    
    const submissionAnswers = quiz.questions.map(question => {
      const studentAnswerIndex = answers[question.id];
      let isCorrect = false;
      
      if (studentAnswerIndex !== undefined && studentAnswerIndex >= 0 && studentAnswerIndex < question.options.length) {
        const selectedOption = question.options[studentAnswerIndex];
        isCorrect = selectedOption.text === question.correctAnswer;
      }
      
      if (isCorrect) {
        correctAnswers++;
      }

      return {
        questionId: question.id,
        answer: studentAnswerIndex !== undefined ? studentAnswerIndex.toString() : '',
        isCorrect
      };
    });

    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Create or update submission
    let submission;
    if (existingSubmission) {
      // Update existing submission (if it exists but wasn't completed)
      submission = await prisma.quizSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          percentage: percentage,
          score: correctAnswers,
          totalScore: totalQuestions,
          answers: {
            deleteMany: {},
            create: submissionAnswers
          }
        },
        include: {
          answers: true
        }
      });
    } else {
      // Create new submission for the current session
      submission = await prisma.quizSubmission.create({
        data: {
          quizId: quizId,
          studentId: session.user.id,
          sessionNumber: quiz.currentSession, // Use current session number
          isCompleted: true,
          completedAt: new Date(),
          percentage: percentage,
          score: correctAnswers,
          totalScore: totalQuestions,
          answers: {
            create: submissionAnswers
          }
        },
        include: {
          answers: true
        }
      });
    }

    // If it's a live session, update the live session participant data
    if (isLiveSession && liveSessionId) {
      await prisma.quizLiveStudentProgress.upsert({
        where: {
          sessionId_studentId: {
            sessionId: liveSessionId,
            studentId: session.user.id
          }
        },
        update: {
          isCompleted: true,
          questionsAnswered: totalQuestions,
          lastActivity: new Date()
        },
        create: {
          sessionId: liveSessionId,
          studentId: session.user.id,
          currentQuestion: totalQuestions,
          questionsAnswered: totalQuestions,
          isCompleted: true,
          joinedAt: new Date(),
          lastActivity: new Date()
        }
      });
    }

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: `${isLiveSession ? 'LIVE_' : ''}QUIZ_COMPLETED`,
        type: 'USER_LOGIN', // Using as placeholder since QUIZ_COMPLETION doesn't exist
        quizId: quiz.id,
        details: {
          quizTitle: quiz.title,
          score: percentage,
          correctAnswers: correctAnswers,
          totalQuestions: totalQuestions,
          isLiveSession: isLiveSession,
          autoSubmit: autoSubmit
        }
      }
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        percentage: percentage,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        isCompleted: true,
        completedAt: submission.completedAt
      },
      isLiveSession: isLiveSession
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
} 