import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/activities/quiz/[quizId]/live-progress - Update student's live progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.customRole !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await request.json();
    const { 
      questionIndex, 
      questionId = null, 
      selectedAnswer = null, 
      isCorrect = false, 
      timeSpent = 0 
    } = body;

    // Get the active live session for this quiz
    const liveSession = await prisma.quizLiveSession.findFirst({
      where: {
        quizId: quizId,
        isActive: true
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'No active live session found' }, { status: 404 });
    }

    // Verify student has access to this quiz
    const hasAccess = await prisma.quiz.findFirst({
      where: {
        id: quizId,
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
      }
    });

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this quiz' }, { status: 403 });
    }

    // Get current progress to determine what to update
    const currentProgress = await prisma.quizLiveStudentProgress.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: liveSession.id,
          studentId: session.user.id
        }
      }
    });

    // Track which questions have been answered
    const hasAnsweredCurrentQuestion = questionId !== null && selectedAnswer !== null;
    
    let newQuestionsAnswered;
    if (currentProgress) {
      // If this is a new answer (not just navigation), increment questionsAnswered
      if (hasAnsweredCurrentQuestion) {
        // Check if this question was already answered
        const existingAnswer = await prisma.quizAnswer.findFirst({
          where: {
            submission: {
              quizId: quizId,
              studentId: session.user.id
            },
            questionId: questionId
          }
        });
        
        // Only increment if this is a new answer
        newQuestionsAnswered = existingAnswer ? 
          currentProgress.questionsAnswered : 
          currentProgress.questionsAnswered + 1;
      } else {
        // Just navigation, keep current count
        newQuestionsAnswered = currentProgress.questionsAnswered;
      }
    } else {
      // New student joining
      newQuestionsAnswered = hasAnsweredCurrentQuestion ? 1 : 0;
    }

    // Update or create student progress
    const studentProgress = await prisma.quizLiveStudentProgress.upsert({
      where: {
        sessionId_studentId: {
          sessionId: liveSession.id,
          studentId: session.user.id
        }
      },
      update: {
        currentQuestion: questionIndex + 1, // 1-indexed current question
        questionsAnswered: newQuestionsAnswered,
        lastActivity: new Date(),
        isCompleted: newQuestionsAnswered >= liveSession.quiz.questions.length
      },
      create: {
        sessionId: liveSession.id,
        studentId: session.user.id,
        currentQuestion: questionIndex + 1, // 1-indexed current question
        questionsAnswered: newQuestionsAnswered,
        isCompleted: newQuestionsAnswered >= liveSession.quiz.questions.length,
        joinedAt: new Date(),
        lastActivity: new Date()
      }
    });

    // Store the answer for potential submission later
    // We'll create a temporary answer record if this is a live session
    if (hasAnsweredCurrentQuestion) {
      // Get the question to check the correct answer
      const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: {
          options: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      // Calculate correct answer on server side
      const selectedOption = question.options[selectedAnswer];
      const serverIsCorrect = selectedOption && selectedOption.text === question.correctAnswer;

      // Check if we already have a submission for this student
      let submission = await prisma.quizSubmission.findFirst({
        where: {
          quizId: quizId,
          studentId: session.user.id
        }
      });

      // Create a temporary submission if none exists
      if (!submission) {
        submission = await prisma.quizSubmission.create({
          data: {
            quizId: quizId,
            studentId: session.user.id,
            isCompleted: false,
            percentage: 0,
            score: 0,
            totalScore: liveSession.quiz.questions.length
          }
        });
      }

      // Store/update the answer
      await prisma.quizAnswer.upsert({
        where: {
          submissionId_questionId: {
            submissionId: submission.id,
            questionId: questionId
          }
        },
        update: {
          answer: selectedAnswer.toString(),
          isCorrect: serverIsCorrect
        },
        create: {
          submissionId: submission.id,
          questionId: questionId,
          answer: selectedAnswer.toString(),
          isCorrect: serverIsCorrect
        }
      });

      // Update submission score
      const currentScore = await prisma.quizAnswer.count({
        where: {
          submissionId: submission.id,
          isCorrect: true
        }
      });

      const isCompleted = newQuestionsAnswered >= liveSession.quiz.questions.length;

      await prisma.quizSubmission.update({
        where: { id: submission.id },
        data: {
          score: currentScore,
          percentage: (currentScore / liveSession.quiz.questions.length) * 100,
          isCompleted: isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });
    }

    // Return current progress
    const updatedProgress = await prisma.quizLiveStudentProgress.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: liveSession.id,
          studentId: session.user.id
        }
      },
      include: {
        student: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      progress: {
        studentId: updatedProgress!.student.id,
        username: updatedProgress!.student.username,
        currentQuestion: updatedProgress!.currentQuestion,
        questionsAnswered: updatedProgress!.questionsAnswered,
        isCompleted: updatedProgress!.isCompleted,
        lastActivity: updatedProgress!.lastActivity
      }
    });

  } catch (error) {
    console.error('Error updating live progress:', error);
    return NextResponse.json(
      { error: 'Failed to update live progress' },
      { status: 500 }
    );
  }
} 