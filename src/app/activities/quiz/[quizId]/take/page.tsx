"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Play,
  Trophy,
  Eye,
  Users,
  AlertCircle,
  FileCheck,
  X
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  topic: string;
  description?: string;
  timeLimitMinutes?: number;
  isLiveSession: boolean;
  questions: Question[];
  teacher: {
    username: string;
  };
  classes: Array<{
    class: {
      name: string;
    };
  }>;
}

interface LiveSession {
  id: string;
  timeLimitMinutes: number;
  startedAt: string;
  isActive: boolean;
}

interface Submission {
  id: string;
  isCompleted: boolean;
  percentage: number;
  completedAt: string;
}

interface QuizResults {
  success: boolean;
  quiz: {
    id: string;
    title: string;
    topic: string;
    numberOfQuestions: number;
    currentSession: number;
    isLiveSession: boolean;
  };
  liveSession: {
    id: string;
    startedAt: string;
    timeLimitMinutes: number | null;
    isActive: boolean;
  } | null;
  sessionResults: {
    sessionNumber: number;
    rankings: {
      rank: number;
      student: {
        id: string;
        username: string;
        email: string;
      };
      score: number;
      totalScore: number;
      percentage: number;
      completedAt: string;
      isCurrentUser: boolean;
    }[];
    stats: {
      totalParticipants: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
    };
    isCurrentSession: boolean;
  }[];
  hasResults: boolean;
}

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const quizId = params?.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

  // Leaderboard state
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Fetch quiz data
  useEffect(() => {
    if (!quizId || !session?.user?.id) return;

    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/activities/quiz/${quizId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch quiz');
        }
        const data = await response.json();
        setQuiz(data.quiz);
        setLiveSession(data.liveSession);
        setExistingSubmission(data.submission);

        // If it's a live session, start immediately
        if (data.liveSession?.isActive) {
          setQuizStarted(true);
          const sessionStartTime = new Date(data.liveSession.startedAt).getTime();
          const sessionDuration = data.liveSession.timeLimitMinutes * 60 * 1000;
          const elapsed = Date.now() - sessionStartTime;
          const remaining = Math.max(0, sessionDuration - elapsed);
          setTimeRemaining(Math.floor(remaining / 1000));
          
          // Send initial join update for live session
          try {
            await fetch(`/api/activities/quiz/${quizId}/live-progress`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                questionIndex: 0,
                timeSpent: 0
              }),
            });
          } catch (error) {
            console.error('Error sending initial live progress:', error);
          }
        } else if (data.quiz.timeLimitMinutes) {
          setTimeRemaining(data.quiz.timeLimitMinutes * 60);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId, session?.user?.id]);

  // Fetch quiz results for leaderboard
  const fetchQuizResults = async () => {
    if (!quizId || !session?.user?.id) return;

    setLoadingResults(true);
    try {
      const response = await fetch(`/api/activities/quiz/${quizId}/results`);
      if (response.ok) {
        const data = await response.json();
        setQuizResults(data);
      }
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  // Fetch results when quiz is completed or when viewing completed quiz
  useEffect(() => {
    if ((existingSubmission && existingSubmission.isCompleted) || quizCompleted) {
      fetchQuizResults();
    }
  }, [existingSubmission?.isCompleted, quizCompleted, quizId, session?.user?.id]);

  // Also fetch results on pre-quiz screen to show previous session data
  useEffect(() => {
    if (quiz && !quizStarted && !existingSubmission?.isCompleted) {
      fetchQuizResults();
    }
  }, [quiz, quizStarted, existingSubmission?.isCompleted, quizId, session?.user?.id]);

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || !timeRemaining || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Auto-complete when time runs out
          if (quiz) {
            handleAutoComplete(answers);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining]);

  const startQuiz = async () => {
    setQuizStarted(true);
    
    // Send initial progress update if it's a live session
    if (liveSession) {
      try {
        await fetch(`/api/activities/quiz/${quizId}/live-progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionIndex: 0,
            timeSpent: 0
          }),
        });
      } catch (error) {
        console.error('Error sending initial progress:', error);
      }
    }
  };

  const handleAnswerChange = async (questionId: string, answerIndex: number) => {
    // Prevent changes if quiz is already completed
    if (quizCompleted || (existingSubmission && existingSubmission.isCompleted)) {
      console.warn('Attempted to change answer after quiz completion');
      return;
    }

    const updatedAnswers = {
      ...answers,
      [questionId]: answerIndex
    };
    
    setAnswers(updatedAnswers);

    // For live sessions, send real-time progress update
    if (liveSession && quiz) {
      try {
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const isCorrect = answerIndex === currentQuestion.correctAnswer;

        const response = await fetch(`/api/activities/quiz/${quizId}/live-progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionIndex: currentQuestionIndex,
            questionId: questionId,
            selectedAnswer: answerIndex,
            isCorrect: isCorrect,
            timeSpent: 0 // Could be enhanced to track actual time spent
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // Note: Removed auto-completion logic for live sessions too
          // Students must explicitly click FINISHED button even in live sessions
        }
      } catch (error) {
        console.error('Error updating live progress:', error);
        // Don't block the user if progress update fails
      }
    }
    // Note: Removed auto-completion logic - students must explicitly finish the quiz
  };

  const handleAutoComplete = async (finalAnswers: Record<string, number>) => {
    if (!quiz) return;
    
    setSubmitting(true);
    
    try {
      // Submit the quiz answers to the API (same as manual submission)
      const response = await fetch(`/api/activities/quiz/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: finalAnswers,
          timeSpent: timeRemaining ? (quiz.timeLimitMinutes || 0) * 60 - timeRemaining : (quiz.timeLimitMinutes || 0) * 60,
          isLiveSession: !!liveSession,
          liveSessionId: liveSession?.id,
          autoSubmit: true // Flag to indicate this was auto-submitted due to time expiration
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to auto-submit quiz');
      }

      const result = await response.json();
      setExistingSubmission(result.submission);
      setQuizCompleted(true);
      
    } catch (error) {
      console.error('Error auto-completing quiz:', error);
      setError('Failed to submit quiz when time expired. Please try manually submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateLiveProgress = async (questionIndex: number) => {
    if (liveSession && quiz) {
      try {
        await fetch(`/api/activities/quiz/${quizId}/live-progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionIndex: questionIndex,
            // No answer data for navigation
            timeSpent: 0
          }),
        });
      } catch (error) {
        console.error('Error updating navigation progress:', error);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz!.questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      updateLiveProgress(newIndex);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      updateLiveProgress(newIndex);
    }
  };



  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!quiz) return 0;
    return ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  };

  const getAnsweredCount = () => {
    if (!quiz) return 0;
    return quiz.questions.filter(q => answers[q.id] !== undefined).length;
  };

  const areAllQuestionsAnswered = () => {
    if (!quiz) return false;
    return quiz.questions.every(q => answers[q.id] !== undefined);
  };

  const handleShowReview = () => {
    setShowReview(true);
  };

  const handleBackToQuiz = () => {
    setShowReview(false);
  };

  const handleRequestFinish = () => {
    setShowFinishConfirmation(true);
  };

  const handleCancelFinish = () => {
    setShowFinishConfirmation(false);
  };

  const handleConfirmFinish = async () => {
    if (!quiz) return;
    
    setSubmitting(true);
    setShowFinishConfirmation(false);
    
    try {
      // Submit the quiz answers
      const response = await fetch(`/api/activities/quiz/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: answers,
          timeSpent: timeRemaining ? (quiz.timeLimitMinutes || 0) * 60 - timeRemaining : 0,
          isLiveSession: !!liveSession, // Include live session flag
          liveSessionId: liveSession?.id // Include live session ID if available
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const result = await response.json();
      setExistingSubmission(result.submission);
      setQuizCompleted(true);
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions for leaderboard display
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  // Render leaderboard component
  const renderLeaderboard = () => {
    if (!quizResults || !quizResults.hasResults) {
      return (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              No results available yet. Complete the quiz to see rankings!
            </p>
          </CardContent>
        </Card>
      );
    }

    const latestSession = quizResults.sessionResults[0]; // Most recent session
    const userRanking = latestSession?.rankings.find(r => r.isCurrentUser);

    return (
      <div className="mt-6 space-y-4">
        {/* User's position highlight */}
        {userRanking && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getMedalIcon(userRanking.rank)}</div>
                  <div>
                    <div className="font-semibold">Your Position</div>
                    <div className="text-sm text-muted-foreground">
                      {userRanking.score}/{userRanking.totalScore} correct
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(userRanking.percentage)}`}>
                    #{userRanking.rank}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {userRanking.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
              {latestSession && (
                <Badge variant="outline" className="ml-2">
                  Session {latestSession.sessionNumber}
                </Badge>
              )}
            </CardTitle>
            {latestSession && (
              <CardDescription>
                {latestSession.stats.totalParticipants} participants • 
                Average score: {latestSession.stats.averageScore.toFixed(1)}%
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loadingResults ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading leaderboard...</p>
              </div>
            ) : latestSession ? (
              <div className="space-y-2">
                {latestSession.rankings.slice(0, 10).map((student) => (
                  <div 
                    key={student.student.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      student.isCurrentUser 
                        ? 'bg-blue-100 border border-blue-200' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center">
                        {getMedalIcon(student.rank)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {student.student.username}
                          {student.isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.score}/{student.totalScore} correct
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${getScoreColor(student.percentage)}`}>
                        {student.percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(student.completedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {latestSession.rankings.length > 10 && (
                  <div className="text-center py-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/activities/quiz/${quizId}/leaderboard`)}
                    >
                      View Full Leaderboard ({latestSession.rankings.length} total)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No rankings available yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live session info */}
        {quizResults.liveSession && quizResults.liveSession.isActive && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-800 font-medium">Live session active</span>
                <Badge variant="destructive" className="ml-2">LIVE</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Multiple sessions info */}
        {quizResults.sessionResults.length > 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Multiple Sessions Available</div>
                  <div className="text-sm text-muted-foreground">
                    {quizResults.sessionResults.length} quiz sessions completed
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/activities/quiz/${quizId}/leaderboard`)}
                >
                  View All Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Quiz not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show results if quiz is completed
  if (quizCompleted && existingSubmission) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
            <CardDescription>
              You have successfully completed "{quiz.title}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Math.round(existingSubmission.percentage)}%
                </div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {getAnsweredCount()}
                </div>
                <div className="text-sm text-muted-foreground">Questions Answered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {quiz.questions.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Questions</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Button 
                onClick={() => router.push('/activities')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Activities
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => router.push(`/activities/quiz/${quizId}/leaderboard`)}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                View Full Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Show leaderboard results */}
        {renderLeaderboard()}
      </div>
    );
  }

  // Show existing submission results - prevent any changes after completion
  // Check if quiz is completed regardless of whether it's a live session or not
  if (existingSubmission && existingSubmission.isCompleted) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Quiz Already Completed
            </CardTitle>
            <CardDescription>
              You have officially completed and submitted this quiz. Your answers are final and cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div className="font-semibold">Your Final Score</div>
                <div className="text-sm text-muted-foreground">
                  Completed on {new Date(existingSubmission.completedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(existingSubmission.percentage)}%
              </div>
            </div>
            
                         <Alert>
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>
                 This quiz has been officially completed and submitted. No retakes or changes are allowed.
               </AlertDescription>
             </Alert>
            
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/activities')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Activities
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => router.push(`/activities/quiz/${quizId}/leaderboard`)}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                View Full Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Show leaderboard results */}
        {renderLeaderboard()}
      </div>
    );
  }

  // Pre-quiz screen
  if (!quizStarted) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <CardDescription className="mt-2">{quiz.topic}</CardDescription>
              </div>
              {liveSession && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {quiz.description && (
              <p className="text-muted-foreground">{quiz.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                <span>{quiz.questions.length} questions</span>
              </div>
              {timeRemaining && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span>{formatTime(timeRemaining)} time limit</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-500" />
                <span>Teacher: {quiz.teacher.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <span>Classes: {quiz.classes.map(qc => qc.class.name).join(", ")}</span>
              </div>
            </div>

            {liveSession && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This is a live quiz session. Your answers will be submitted in real-time and 
                  you can see your position on the leaderboard after completion.
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={startQuiz} className="w-full" size="lg">
              <Play className="h-5 w-5 mr-2" />
              Start Quiz
            </Button>
          </CardContent>
        </Card>

        {/* Show previous session results if available */}
        {quizResults && quizResults.hasResults && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Previous Results
              </CardTitle>
              <CardDescription>
                Your performance from previous quiz sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizResults.sessionResults.map((session) => {
                const userResult = session.rankings.find(r => r.isCurrentUser);
                if (!userResult) return null;
                
                return (
                  <div key={session.sessionNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-lg">{getMedalIcon(userResult.rank)}</div>
                      <div>
                        <div className="font-medium">Session {session.sessionNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          Rank #{userResult.rank} of {session.stats.totalParticipants}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(userResult.percentage)}`}>
                        {userResult.percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {userResult.score}/{userResult.totalScore} correct
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {quizResults.sessionResults.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/activities/quiz/${quizId}/leaderboard`)}
                  className="w-full mt-3"
                >
                  View Full Leaderboard History
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Quiz taking interface
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">{quiz.topic}</p>
          </div>
          {liveSession ? (
            liveSession.timeLimitMinutes && liveSession.timeLimitMinutes > 0 && timeRemaining !== null ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className={`font-mono text-base ${timeRemaining < 300 ? 'text-red-500' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-base">No Time Limit</span>
              </div>
            )
          ) : (
            timeRemaining !== null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className={`font-mono text-base ${timeRemaining < 300 ? 'text-red-500' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            <span>{getAnsweredCount()} answered</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>
      </div>

            {/* Question */}
      <Card className="mb-4">
        <CardContent className="p-4">
          {/* Question with Q1: format */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3">
              Q{currentQuestionIndex + 1}: {currentQuestion.text}
            </h3>
            
            {/* Answer options in horizontal row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentQuestion.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                    quizCompleted || Boolean(existingSubmission && existingSubmission.isCompleted)
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-gray-50'
                  } ${
                    answers[currentQuestion.id] === index 
                      ? 'bg-primary/10 border-primary' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => {
                    if (!quizCompleted && !Boolean(existingSubmission && existingSubmission.isCompleted)) {
                      handleAnswerChange(currentQuestion.id, index);
                    }
                  }}
                >
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name={`question-${currentQuestion.id}`}
                    value={index}
                    checked={answers[currentQuestion.id] === index}
                    onChange={() => handleAnswerChange(currentQuestion.id, index)}
                    disabled={quizCompleted || Boolean(existingSubmission && existingSubmission.isCompleted)}
                    className="h-4 w-4 text-primary"
                  />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-sm">
                    <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center space-x-3">
          {/* Show progress indicator */}
          <div className="text-sm text-muted-foreground">
            {getAnsweredCount()} of {quiz.questions.length} answered
          </div>
          
          {/* Navigation buttons */}
          <div className="space-x-2">
            {!isLastQuestion && (
              <Button onClick={handleNextQuestion}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {/* Review and Finish buttons - only show when all questions answered */}
            {areAllQuestionsAnswered() && (
              <>
                <Button variant="outline" onClick={handleShowReview}>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Review Answers
                </Button>
                <Button 
                  onClick={handleRequestFinish}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "FINISHED"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Review Screen */}
      {showReview && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Review Your Answers</h2>
              <p className="text-muted-foreground">
                Review all your answers before submitting the quiz
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {quiz.questions.map((question, index) => (
                <Card key={question.id} className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">
                      Q{index + 1}: {question.text}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = answers[question.id] === optionIndex;
                        return (
                          <div
                            key={optionIndex}
                            className={`p-2 rounded border text-sm cursor-pointer transition-colors hover:bg-gray-100 ${
                              isSelected
                                ? 'bg-primary/10 border-primary font-medium'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => handleAnswerChange(question.id, optionIndex)}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`review-option-${question.id}-${optionIndex}`}
                                name={`review-question-${question.id}`}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(question.id, optionIndex)}
                                className="h-3 w-3 text-primary"
                              />
                              <label 
                                htmlFor={`review-option-${question.id}-${optionIndex}`}
                                className="flex-1 cursor-pointer"
                              >
                                <span className="font-medium">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>{' '}
                                {option}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {answers[question.id] === undefined && (
                      <div className="text-orange-600 text-sm font-medium">
                        ⚠ Not answered
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-between sticky bottom-0 bg-white py-4 border-t">
              <Button variant="outline" onClick={handleBackToQuiz}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quiz
              </Button>
              <Button
                onClick={handleRequestFinish}
                className="bg-green-600 hover:bg-green-700"
                disabled={!areAllQuestionsAnswered() || submitting}
              >
                {submitting ? "Submitting..." : "FINISHED"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showFinishConfirmation} onOpenChange={setShowFinishConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your quiz? Once submitted, you will not be able to change your answers.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Quiz Summary:</h4>
              <div className="text-sm space-y-1">
                <div>Questions answered: {getAnsweredCount()} of {quiz.questions.length}</div>
                <div>Quiz: {quiz.title}</div>
                {timeRemaining && (
                  <div>Time remaining: {formatTime(timeRemaining)}</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelFinish}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmFinish}
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 