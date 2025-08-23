import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../../../lib/services/auth.service';
import { prisma } from '../../../../../../../lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser();
    
    const { quizId } = await params;

    // Get the quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        topic: true,
        numberOfQuestions: true,
        teacherId: true
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check if user has access (teacher or admin for now)
    const isTeacher = quiz.teacherId === currentUser.id;
    if (!isTeacher && currentUser.customRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all live sessions for this quiz (oldest first for proper session numbering)
    const liveSessions = await prisma.quizLiveSession.findMany({
      where: { quizId },
      orderBy: { startedAt: 'asc' }
    });

    if (liveSessions.length === 0) {
      return NextResponse.json({
        quiz: {
          id: quiz.id,
          title: quiz.title,
          topic: quiz.topic,
          numberOfQuestions: quiz.numberOfQuestions
        },
        sessions: [],
        totalSessions: 0
      });
    }

    // Process each session with proper session-aware data
    const processedSessions = await Promise.all(liveSessions.map(async (session, index) => {
      const sessionNumber = index + 1; // Session 1 = first/oldest, Session 2 = second, etc.
      
      // Get submissions for THIS SPECIFIC SESSION ONLY
      const submissions = await prisma.quizSubmission.findMany({
        where: {
          quizId,
          isCompleted: true,
          sessionNumber: sessionNumber // Filter by actual session number
        },
        include: {
          student: {
            select: { id: true, username: true, email: true }
          }
        },
        orderBy: [
          { percentage: 'desc' },
          { completedAt: 'asc' }
        ]
      });

      // Get student progress from live session (for incomplete students)
      const studentProgress = await prisma.quizLiveStudentProgress.findMany({
        where: {
          sessionId: session.id
        },
        include: {
          student: {
            select: { id: true, username: true, email: true }
          }
        }
      });

      // Calculate rankings with proper tie handling
      const rankings = submissions.map((submission, rankIndex) => {
        const progress = studentProgress.find(p => p.studentId === submission.studentId);
        
        return {
          rank: 0, // Will be set below
          student: submission.student,
          score: submission.score,
          totalScore: submission.totalScore,
          percentage: Math.round(submission.percentage * 100) / 100,
          completedAt: submission.completedAt,
          questionsAnswered: progress?.questionsAnswered || submission.totalScore,
          timeSpent: progress && submission.completedAt && progress.joinedAt 
            ? Math.round((new Date(submission.completedAt).getTime() - new Date(progress.joinedAt).getTime()) / 1000)
            : null
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

      // Include students who participated but didn't complete this session
      const incompleteStudents = studentProgress.filter(p => 
        !submissions.some(s => s.studentId === p.studentId)
      ).map(progress => ({
        rank: null,
        student: progress.student,
        score: 0,
        totalScore: quiz.numberOfQuestions,
        percentage: 0,
        completedAt: null,
        questionsAnswered: progress.questionsAnswered,
        timeSpent: null,
        isIncomplete: true
      }));

      // Calculate session statistics
      const stats = {
        totalParticipants: studentProgress.length,
        completedStudents: submissions.length,
        averageScore: submissions.length > 0 
          ? Math.round(submissions.reduce((sum, s) => sum + s.percentage, 0) / submissions.length)
          : 0,
        highestScore: submissions.length > 0 ? Math.max(...submissions.map(s => s.percentage)) : 0,
        lowestScore: submissions.length > 0 ? Math.min(...submissions.map(s => s.percentage)) : 0,
        sessionDuration: session.endedAt 
          ? Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
          : null
      };

      return {
        sessionNumber,
        session: {
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          isActive: session.isActive,
          timeLimitMinutes: session.timeLimitMinutes
        },
        rankings,
        incompleteStudents,
        stats
      };
    }));

    // Sort sessions to show most recent first in the UI (Session 2, Session 1)
    const sortedSessions = processedSessions.sort((a, b) => b.sessionNumber - a.sessionNumber);

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        numberOfQuestions: quiz.numberOfQuestions
      },
      sessions: sortedSessions,
      totalSessions: sortedSessions.length
    });

  } catch (error) {
    console.error('Error fetching historical results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical results' },
      { status: 500 }
    );
  }
} 