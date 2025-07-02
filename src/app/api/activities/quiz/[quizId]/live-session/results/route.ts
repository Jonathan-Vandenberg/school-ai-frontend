import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/activities/quiz/[quizId]/live-session/results - Get final session results with rankings
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

    // Get the most recent live session for this quiz (including ended ones)
    const liveSession = await prisma.quizLiveSession.findFirst({
      where: {
        quizId: quizId,
        teacherId: session.user.id
      },
      orderBy: {
        startedAt: 'desc'
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            topic: true,
            numberOfQuestions: true
          }
        }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'No live session found' }, { status: 404 });
    }

    // Get all student submissions for this quiz
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
        { percentage: 'desc' }, // Sort by percentage (highest first)
        { completedAt: 'asc' }  // Then by completion time (fastest first)
      ]
    });

    // Get student progress data from live session
    const studentProgress = await prisma.quizLiveStudentProgress.findMany({
      where: {
        sessionId: liveSession.id
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Create a comprehensive ranking list with proper tie handling
    const rankings = submissions.map((submission, index) => {
      const progress = studentProgress.find(p => p.studentId === submission.studentId);
      
      return {
        rank: 0, // Will be set below
        submission,
        progress,
        student: {
          id: submission.student.id,
          username: submission.student.username,
          email: submission.student.email
        },
        score: submission.score,
        totalScore: submission.totalScore,
        percentage: Math.round(submission.percentage * 100) / 100, // Round to 2 decimal places
        completedAt: submission.completedAt,
        questionsAnswered: progress?.questionsAnswered || submission.totalScore,
        joinedAt: progress?.joinedAt || null,
        timeSpent: progress && submission.completedAt && progress.joinedAt ? 
          Math.round((new Date(submission.completedAt).getTime() - new Date(progress.joinedAt).getTime()) / 1000) : null
      };
    });

    // Assign ranks with proper tie handling
    let currentRank = 1;
    rankings.forEach((student, index) => {
      if (index === 0) {
        student.rank = 1;
      } else {
        const prevStudent = rankings[index - 1];
        // Check if current student has same percentage and completion time as previous
        const samePercentage = Math.abs(student.percentage - prevStudent.percentage) < 0.01;
        const sameCompletionTime = student.completedAt && prevStudent.completedAt && 
          Math.abs(new Date(student.completedAt).getTime() - new Date(prevStudent.completedAt).getTime()) < 1000; // Within 1 second
        
        if (samePercentage && sameCompletionTime) {
          // Tie - same rank as previous student
          student.rank = prevStudent.rank;
        } else {
          // No tie - rank is current position + 1
          currentRank = index + 1;
          student.rank = currentRank;
        }
      }
    });

    // Clean up the response to remove temporary fields
    const finalRankings = rankings.map(({ submission, progress, ...student }) => student);

    // Include students who participated but didn't complete
    const incompleteStudents = studentProgress.filter(p => 
      !submissions.some(s => s.studentId === p.studentId)
    ).map(progress => ({
      rank: null,
      student: {
        id: progress.student.id,
        username: progress.student.username,
        email: progress.student.email
      },
      score: 0,
      totalScore: liveSession.quiz.numberOfQuestions,
      percentage: 0,
      completedAt: null,
      questionsAnswered: progress.questionsAnswered,
      joinedAt: progress.joinedAt,
      timeSpent: null,
      isIncomplete: true
    }));

    const sessionStats = {
      totalParticipants: studentProgress.length,
      completedStudents: submissions.length,
      averageScore: submissions.length > 0 ? 
        Math.round((submissions.reduce((sum, s) => sum + s.percentage, 0) / submissions.length) * 100) / 100 : 0,
      highestScore: submissions.length > 0 ? Math.max(...submissions.map(s => s.percentage)) : 0,
      lowestScore: submissions.length > 0 ? Math.min(...submissions.map(s => s.percentage)) : 0,
      sessionDuration: liveSession.endedAt && liveSession.startedAt ? 
        Math.round((new Date(liveSession.endedAt).getTime() - new Date(liveSession.startedAt).getTime()) / 1000) : null
    };

    return NextResponse.json({
      success: true,
      session: {
        id: liveSession.id,
        startedAt: liveSession.startedAt,
        endedAt: liveSession.endedAt,
        isActive: liveSession.isActive,
        timeLimitMinutes: liveSession.timeLimitMinutes
      },
      quiz: liveSession.quiz,
      rankings: finalRankings,
      incompleteStudents: incompleteStudents,
      stats: sessionStats
    });

  } catch (error) {
    console.error('Error fetching session results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session results' },
      { status: 500 }
    );
  }
} 