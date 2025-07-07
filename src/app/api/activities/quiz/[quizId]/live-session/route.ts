import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthService } from "@/lib/services/auth.service";

// GET /api/activities/quiz/[quizId]/live-session - Get current live session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    // Check if user can access this quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { teacher: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check if user can manage this quiz
    const canManage = quiz.teacherId === session.user.id || 
                     session.user.customRole === 'ADMIN';
    
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current live session
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
                username: true
              }
            }
          }
        }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: "No active live session" }, { status: 404 });
    }

    // Check if session has expired and auto-end if necessary
    if (liveSession.timeLimitMinutes && liveSession.timeLimitMinutes > 0) {
      const sessionStartTime = new Date(liveSession.startedAt).getTime();
      const sessionDuration = liveSession.timeLimitMinutes * 60 * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (currentTime > sessionStartTime + sessionDuration) {
        // Session has expired - automatically end it
        await prisma.$transaction(async (tx) => {
          // Update quiz status
          await tx.quiz.update({
            where: { id: quizId },
            data: {
              isLiveSession: false,
              liveSessionEndedAt: new Date()
            }
          });

          // End the expired live session
          await tx.quizLiveSession.update({
            where: { id: liveSession.id },
            data: {
              isActive: false,
              endedAt: new Date()
            }
          });

          // Auto-submit any incomplete submissions for students who were taking the quiz in this session
          const incompleteSubmissions = await tx.quizSubmission.findMany({
            where: {
              quizId: quizId,
              sessionNumber: quiz.currentSession, // Only current session
              isCompleted: false
            }
          });

          for (const submission of incompleteSubmissions) {
            // Calculate final score based on current answers
            const answers = await tx.quizAnswer.findMany({
              where: { submissionId: submission.id },
              include: {
                question: {
                  include: {
                    options: true
                  }
                }
              }
            });

            const correctAnswers = answers.filter(answer => answer.isCorrect).length;
            const percentage = submission.totalScore > 0 ? (correctAnswers / submission.totalScore) * 100 : 0;

            // Mark submission as completed with time expiration
            await tx.quizSubmission.update({
              where: { id: submission.id },
              data: {
                isCompleted: true,
                completedAt: new Date(),
                percentage: percentage,
                score: correctAnswers
              }
            });
          }
        });

        return NextResponse.json({ 
          error: "Live session has expired and been automatically ended",
          expired: true 
        }, { status: 410 }); // 410 Gone - resource no longer available
      }
    }

    // Format response
    const formattedSession = {
      id: liveSession.id,
      startedAt: liveSession.startedAt,
      timeLimitMinutes: liveSession.timeLimitMinutes,
      isActive: liveSession.isActive,
      students: liveSession.studentProgress.map(progress => ({
        id: progress.student.id,
        username: progress.student.username,
        currentQuestion: progress.currentQuestion,
        questionsAnswered: progress.questionsAnswered,
        isCompleted: progress.isCompleted,
        joinedAt: progress.joinedAt,
        lastActivity: progress.lastActivity
      }))
    };

    return NextResponse.json(formattedSession);
  } catch (error) {
    console.error("Error getting live session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/activities/quiz/[quizId]/live-session - Start a live session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await request.json();
    const { timeLimitMinutes } = body;

    // Check if user can manage this quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { 
        teacher: true,
        classes: {
          include: {
            class: {
              include: {
                users: {
                  where: {
                    user: {
                      customRole: 'STUDENT'
                    }
                  },
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const canManage = quiz.teacherId === session.user.id || 
                     session.user.customRole === 'ADMIN';
    
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if there's already an active session
    const existingSession = await prisma.quizLiveSession.findFirst({
      where: {
        quizId: quizId,
        isActive: true
      }
    });

    if (existingSession) {
      return NextResponse.json({ error: "Live session already active" }, { status: 409 });
    }

    // Start transaction to create live session
    const liveSession = await prisma.$transaction(async (tx) => {
      // Update quiz status
      await tx.quiz.update({
        where: { id: quizId },
        data: {
          isLiveSession: true,
          liveSessionStartedAt: new Date()
        }
      });

      // Create live session
      const newSession = await tx.quizLiveSession.create({
        data: {
          quizId: quizId,
          teacherId: session.user.id,
          timeLimitMinutes: timeLimitMinutes || quiz.timeLimitMinutes || 30, // Default to 30 minutes if no limit set
          isActive: true
        }
      });

      // Don't pre-create student progress records
      // Students will be added to the session when they actually join the quiz

      return newSession;
    });

    // Fetch the complete session data
    const completeSession = await prisma.quizLiveSession.findUnique({
      where: { id: liveSession.id },
      include: {
        studentProgress: {
          include: {
            student: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    const formattedSession = {
      id: completeSession!.id,
      startedAt: completeSession!.startedAt,
      timeLimitMinutes: completeSession!.timeLimitMinutes,
      isActive: completeSession!.isActive,
      students: completeSession!.studentProgress.map(progress => ({
        id: progress.student.id,
        username: progress.student.username,
        currentQuestion: progress.currentQuestion,
        questionsAnswered: progress.questionsAnswered,
        isCompleted: progress.isCompleted,
        joinedAt: progress.joinedAt,
        lastActivity: progress.lastActivity
      }))
    };

    return NextResponse.json(formattedSession);
  } catch (error) {
    console.error("Error starting live session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/quiz/[quizId]/live-session - End live session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    // Check if user can manage this quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { teacher: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const canManage = quiz.teacherId === session.user.id || 
                     session.user.customRole === 'ADMIN';
    
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // End the live session
    await prisma.$transaction(async (tx) => {
      // Update quiz status
      await tx.quiz.update({
        where: { id: quizId },
        data: {
          isLiveSession: false,
          liveSessionEndedAt: new Date()
        }
      });

      // End active live sessions
      await tx.quizLiveSession.updateMany({
        where: {
          quizId: quizId,
          isActive: true
        },
        data: {
          isActive: false,
          endedAt: new Date()
        }
      });
    });

    return NextResponse.json({ message: "Live session ended successfully" });
  } catch (error) {
    console.error("Error ending live session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 