import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/activities/quiz/[quizId]/live-session/students - Get real-time student progress
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

    // Check if user can manage this quiz
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        OR: [
          { teacherId: session.user.id },
          { 
            AND: [
              { teacher: { customRole: 'ADMIN' } },
              { teacher: { id: session.user.id } }
            ]
          }
        ]
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    // Get the active live session
    const liveSession = await prisma.quizLiveSession.findFirst({
      where: {
        quizId: quizId,
        isActive: true
      },
      include: {
        studentProgress: {
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
            { questionsAnswered: 'desc' },
            { lastActivity: 'desc' }
          ]
        }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'No active live session found' }, { status: 404 });
    }

    // Get submission scores for completed students
    const studentScores = await prisma.quizSubmission.findMany({
      where: {
        quizId: quizId,
        studentId: {
          in: liveSession.studentProgress.map(p => p.studentId)
        }
      },
      select: {
        studentId: true,
        score: true,
        totalScore: true,
        percentage: true,
        isCompleted: true
      }
    });

    const scoreMap = new Map(
      studentScores.map(s => [s.studentId, s])
    );

    // Format the response with real-time data
    const studentsProgress = liveSession.studentProgress.map(progress => {
      const submission = scoreMap.get(progress.studentId);
      
      return {
        id: progress.student.id,
        username: progress.student.username,
        email: progress.student.email,
        currentQuestion: progress.currentQuestion,
        questionsAnswered: progress.questionsAnswered,
        totalQuestions: quiz.questions.length,
        progressPercentage: Math.round((progress.questionsAnswered / quiz.questions.length) * 100),
        isCompleted: progress.isCompleted,
        joinedAt: progress.joinedAt,
        lastActivity: progress.lastActivity,
        score: submission?.score || 0,
        totalScore: submission?.totalScore || quiz.questions.length,
        scorePercentage: submission?.percentage || 0,
        hasSubmission: !!submission?.isCompleted
      };
    });

    return NextResponse.json({
      success: true,
      liveSession: {
        id: liveSession.id,
        startedAt: liveSession.startedAt,
        timeLimitMinutes: liveSession.timeLimitMinutes,
        isActive: liveSession.isActive
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        totalQuestions: quiz.questions.length
      },
      students: studentsProgress,
      summary: {
        totalStudents: studentsProgress.length,
        activeStudents: studentsProgress.filter(s => 
          new Date().getTime() - new Date(s.lastActivity).getTime() < 5 * 60 * 1000 // Active in last 5 minutes
        ).length,
        completedStudents: studentsProgress.filter(s => s.isCompleted).length,
        averageProgress: studentsProgress.length > 0 
          ? Math.round(studentsProgress.reduce((sum, s) => sum + s.progressPercentage, 0) / studentsProgress.length)
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching live session progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live session progress' },
      { status: 500 }
    );
  }
} 