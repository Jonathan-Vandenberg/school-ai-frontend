import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/activities/quiz/[quizId]/results - Get quiz results for students
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;

    // Verify student has access to this quiz
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
      select: {
        id: true,
        title: true,
        topic: true,
        numberOfQuestions: true,
        currentSession: true,
        isLiveSession: true,
        timeLimitMinutes: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Get all completed submissions for this quiz (from all sessions)
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: quizId,
        isCompleted: true
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: [
        { sessionNumber: 'desc' }, // Most recent session first
        { percentage: 'desc' },    // Then by percentage (highest first)
        { completedAt: 'asc' }     // Then by completion time (fastest first)
      ]
    });

    // Get current live session if it exists
    const liveSession = await prisma.quizLiveSession.findFirst({
      where: {
        quizId: quizId,
        isActive: true
      },
      select: {
        id: true,
        startedAt: true,
        timeLimitMinutes: true,
        isActive: true
      }
    });

    // Group submissions by session
    const sessionGroups: { [sessionNumber: number]: typeof submissions } = {};
    submissions.forEach(submission => {
      if (!sessionGroups[submission.sessionNumber]) {
        sessionGroups[submission.sessionNumber] = [];
      }
      sessionGroups[submission.sessionNumber].push(submission);
    });

    // Create rankings for each session
    const sessionResults = Object.entries(sessionGroups).map(([sessionNum, sessionSubmissions]) => {
      const sessionNumber = parseInt(sessionNum);
      
      // Create rankings for this session
      const rankings = sessionSubmissions.map((submission, index) => {
        return {
          rank: 0, // Will be set below
          student: {
            id: submission.student.id,
            username: submission.student.username,
            email: submission.student.email
          },
          score: submission.score,
          totalScore: submission.totalScore,
          percentage: Math.round(submission.percentage * 100) / 100,
          completedAt: submission.completedAt,
          isCurrentUser: submission.studentId === session.user.id
        };
      });

      // Assign ranks with proper tie handling
      rankings.forEach((student, index) => {
        if (index === 0) {
          student.rank = 1;
        } else {
          const prevStudent = rankings[index - 1];
          const samePercentage = Math.abs(student.percentage - prevStudent.percentage) < 0.01;
          const sameCompletionTime = student.completedAt && prevStudent.completedAt && 
            Math.abs(new Date(student.completedAt).getTime() - new Date(prevStudent.completedAt).getTime()) < 1000;
          
          if (samePercentage && sameCompletionTime) {
            student.rank = prevStudent.rank;
          } else {
            student.rank = index + 1;
          }
        }
      });

      const sessionStats = {
        totalParticipants: sessionSubmissions.length,
        averageScore: sessionSubmissions.length > 0 ? 
          Math.round((sessionSubmissions.reduce((sum, s) => sum + s.percentage, 0) / sessionSubmissions.length) * 100) / 100 : 0,
        highestScore: sessionSubmissions.length > 0 ? Math.max(...sessionSubmissions.map(s => s.percentage)) : 0,
        lowestScore: sessionSubmissions.length > 0 ? Math.min(...sessionSubmissions.map(s => s.percentage)) : 0
      };

      return {
        sessionNumber,
        rankings,
        stats: sessionStats,
        isCurrentSession: sessionNumber === quiz.currentSession
      };
    });

    // Sort sessions by session number (most recent first)
    sessionResults.sort((a, b) => b.sessionNumber - a.sessionNumber);

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        numberOfQuestions: quiz.numberOfQuestions,
        currentSession: quiz.currentSession,
        isLiveSession: quiz.isLiveSession,
        timeLimitMinutes: quiz.timeLimitMinutes
      },
      liveSession: liveSession,
      sessionResults: sessionResults,
      hasResults: submissions.length > 0
    });

  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz results' },
      { status: 500 }
    );
  }
} 