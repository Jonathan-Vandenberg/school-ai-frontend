import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/activities/quiz/[quizId]/restart - Restart quiz for all students
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
    const { clearPreviousResults = false } = body;

    // Verify the user is the teacher/admin who owns this quiz
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        teacherId: session.user.id
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Get count of existing submissions
    const submissionCount = await prisma.quizSubmission.count({
      where: {
        quizId: quizId
      }
    });

    if (clearPreviousResults) {
      // Option 1: Clear all previous submissions
      await prisma.quizSubmission.deleteMany({
        where: {
          quizId: quizId
        }
      });

      // Reset to session 1
      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          currentSession: 1,
          allowMultipleSessions: true
        }
      });

      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'QUIZ_RESET',
          type: 'USER_LOGIN', // Using as placeholder
          quizId: quiz.id,
          details: {
            quizTitle: quiz.title,
            previousSubmissions: submissionCount,
            action: 'clear_all_results'
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Quiz reset successfully. All previous results cleared.',
        currentSession: 1,
        action: 'reset'
      });
    } else {
      // Option 2: Start a new session (keep historical data)
      const newSessionNumber = quiz.currentSession + 1;

      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          currentSession: newSessionNumber,
          allowMultipleSessions: true
        }
      });

      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'QUIZ_RESTARTED',
          type: 'USER_LOGIN', // Using as placeholder
          quizId: quiz.id,
          details: {
            quizTitle: quiz.title,
            newSession: newSessionNumber,
            previousSession: quiz.currentSession,
            action: 'new_session'
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: `Quiz restarted as session ${newSessionNumber}. Previous results preserved.`,
        currentSession: newSessionNumber,
        previousSession: quiz.currentSession,
        action: 'new_session'
      });
    }

  } catch (error) {
    console.error('Error restarting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to restart quiz' },
      { status: 500 }
    );
  }
} 