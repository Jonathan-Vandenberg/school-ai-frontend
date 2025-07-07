import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QuizService } from "@/lib/services/quiz.service";
import { prisma } from "@/lib/db";

// GET /api/activities/quiz/[quizId] - Get quiz by ID
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

    // For students, get quiz with submission data
    if (session.user.customRole === 'STUDENT') {
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
            },
            orderBy: { order: 'asc' }
          },
          teacher: {
            select: { username: true }
          },
          classes: {
            include: {
              class: {
                select: { name: true }
              }
            }
          },
          liveSessions: {
            where: { isActive: true },
            select: {
              id: true,
              startedAt: true,
              timeLimitMinutes: true,
              isActive: true
            }
          }
        }
      });

      if (!quiz) {
        return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
      }

      // Get existing submission for the current session only
      const existingSubmission = await prisma.quizSubmission.findFirst({
        where: {
          quizId: quizId,
          studentId: session.user.id,
          sessionNumber: quiz.currentSession // Only check submissions for the current session
        },
        select: {
          id: true,
          isCompleted: true,
          percentage: true,
          completedAt: true,
          sessionNumber: true
        }
      });

      // Transform quiz for student
      const studentQuiz = {
        ...quiz,
        questions: quiz.questions.map(q => {
          // Find the index of the correct answer option
          const correctAnswerIndex = q.options.findIndex(opt => opt.text === q.correctAnswer);
          
          return {
            id: q.id,
            text: q.question,
            options: q.options.map(opt => opt.text),
            correctAnswer: correctAnswerIndex // Return the index of the correct option
          };
        })
      };

      return NextResponse.json({ 
        quiz: studentQuiz, 
        submission: existingSubmission,
        liveSession: quiz.liveSessions[0] || null
      });
    }

    // For teachers/admins, use the existing service
    const quiz = await QuizService.getQuizById(
      {
        id: session.user.id,
        customRole: session.user.customRole as any,
        username: session.user.username || '',
        email: session.user.email || '',
        confirmed: true
      },
      quizId
    );

    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error("Error fetching quiz:", error);
    
    if (error.message === 'Quiz not found') {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    
    if (error.message === 'Cannot access this quiz') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 