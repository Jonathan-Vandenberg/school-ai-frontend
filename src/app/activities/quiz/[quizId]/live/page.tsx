"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Play,
  Pause,
  Square,
  Timer,
  Users,
  Trophy,
  BarChart3,
  Settings,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { QuizLeaderboard } from "@/components/activities/quiz-leaderboard";

interface Quiz {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  numberOfQuestions: number;
  timeLimitMinutes: number | null;
  isLiveSession: boolean;
  liveSessionStartedAt: Date | null;
  hasSubmissions: boolean;
  currentSession: number;
  questions: Array<{
    id: string;
    question: string;
    order: number;
  }>;
  classes: Array<{
    class: {
      id: string;
      name: string;
    };
  }>;
}

interface LiveStudent {
  id: string;
  username: string;
  email: string;
  currentQuestion: number;
  questionsAnswered: number;
  totalQuestions: number;
  progressPercentage: number;
  isCompleted: boolean;
  joinedAt: Date;
  lastActivity: Date;
  score: number;
  totalScore: number;
  scorePercentage: number;
  hasSubmission: boolean;
}

interface LiveSession {
  id: string;
  startedAt: Date;
  timeLimitMinutes: number | null;
  isActive: boolean;
}

interface LiveSessionData {
  success: boolean;
  liveSession: LiveSession;
  quiz: {
    id: string;
    title: string;
    topic: string;
    totalQuestions: number;
  };
  students: LiveStudent[];
  summary: {
    totalStudents: number;
    activeStudents: number;
    completedStudents: number;
    averageProgress: number;
  };
}

export default function QuizLivePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [liveSessionData, setLiveSessionData] = useState<LiveSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/activities/quiz/${quizId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch quiz');
        }
        const data = await response.json();
        setQuiz(data);
      } catch (error) {
        console.error('Error fetching quiz:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  // Poll for live session updates
  useEffect(() => {
    if (!quiz || !quiz.isLiveSession) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/activities/quiz/${quizId}/live-session/students`);
        if (response.ok) {
          const data = await response.json();
          setLiveSessionData(data);
        }
      } catch (error) {
        console.error('Error polling live session:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [quiz, quizId]);

  // Timer countdown
  useEffect(() => {
    if (!liveSessionData || !liveSessionData.liveSession || !liveSessionData.liveSession.timeLimitMinutes || !liveSessionData.liveSession.isActive) {
      setTimeRemaining(null);
      return;
    }

    const startTime = new Date(liveSessionData.liveSession.startedAt).getTime();
    const endTime = startTime + (liveSessionData.liveSession.timeLimitMinutes * 60 * 1000);

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        // Auto-end session when time is up (show leaderboard first)
        endSession();
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [liveSessionData]);

  const startSession = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(`/api/activities/quiz/${quizId}/live-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeLimitMinutes: quiz?.timeLimitMinutes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start live session');
      }

      const data = await response.json();
      // Fetch the updated live session data with student progress
      const studentResponse = await fetch(`/api/activities/quiz/${quizId}/live-session/students`);
      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        setLiveSessionData(studentData);
      }
      setQuiz(prev => prev ? { ...prev, isLiveSession: true, liveSessionStartedAt: new Date() } : null);
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const endSession = async () => {
    // Show leaderboard first
    setShowLeaderboard(true);
  };

  const finalizeEndSession = async () => {
    if (isEnding) return;
    
    setIsEnding(true);
    try {
      const response = await fetch(`/api/activities/quiz/${quizId}/live-session`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to end live session');
      }

      setLiveSessionData(null);
      setQuiz(prev => prev ? { ...prev, isLiveSession: false, liveSessionStartedAt: null } : null);
      setTimeRemaining(null);
      setShowLeaderboard(false);
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      setIsEnding(false);
    }
  };

  const handleLeaderboardClose = () => {
    setShowLeaderboard(false);
    // When leaderboard is closed, finalize ending the session
    finalizeEndSession();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (student: LiveStudent) => {
    return student.progressPercentage;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">Quiz not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" asChild>
            <Link href={`/activities/quiz/${quizId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quiz
            </Link>
          </Button>
          <Badge variant={quiz.isLiveSession ? "default" : "secondary"}>
            {quiz.isLiveSession ? "LIVE" : "Not Live"}
          </Badge>
        </div>
        
        <h1 className="text-3xl font-bold">{quiz.title}</h1>
        <p className="text-muted-foreground">{quiz.topic}</p>
        
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {quiz.classes.map(qc => qc.class.name).join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">{quiz.numberOfQuestions} questions</span>
          </div>
          {quiz.timeLimitMinutes && (
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span className="text-sm">{quiz.timeLimitMinutes} minutes</span>
            </div>
          )}
        </div>
      </div>

      {/* Session Control */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Session Control
          </CardTitle>
          <CardDescription>
            {quiz.hasSubmissions 
              ? "Restart the quiz session for students to participate again"
              : "Start a live quiz session for students to participate in real-time"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!quiz.isLiveSession ? (
            <div className="space-y-4">
              {quiz.hasSubmissions && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This quiz has been taken before (Session {quiz.currentSession}). 
                    Use the "Restart" button below to allow students to take it again.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                {quiz.hasSubmissions 
                  ? "Click restart to begin a new session. Students will be able to join and answer questions in real-time."
                  : "Click the start button to begin a live quiz session. Students will be able to join and answer questions in real-time."
                }
              </p>
              
              <Button 
                onClick={startSession} 
                disabled={isStarting}
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4 mr-2" />
                {isStarting 
                  ? (quiz.hasSubmissions ? "Restarting..." : "Starting...") 
                  : (quiz.hasSubmissions ? "Restart Live Session" : "Start Live Session")
                }
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="animate-pulse">
                    LIVE SESSION ACTIVE
                  </Badge>
                  {quiz.hasSubmissions && (
                    <Badge variant="outline">
                      Session {quiz.currentSession}
                    </Badge>
                  )}
                  {timeRemaining !== null && (
                    <div className="flex items-center gap-2 text-lg font-mono">
                      <Clock className="h-4 w-4" />
                      <span className={timeRemaining < 300 ? "text-red-500" : ""}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={endSession} 
                  variant="destructive"
                  disabled={isEnding}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {isEnding ? "Ending..." : "End Session"}
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Session started at {new Date(quiz.liveSessionStartedAt!).toLocaleTimeString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Session Summary */}
      {quiz.isLiveSession && liveSessionData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{liveSessionData.summary.totalStudents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              <Play className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{liveSessionData.summary.activeStudents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{liveSessionData.summary.completedStudents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{liveSessionData.summary.averageProgress}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Students Progress */}
      {quiz.isLiveSession && liveSessionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Progress ({liveSessionData.students.length} joined)
            </CardTitle>
            <CardDescription>
              Real-time progress of students taking the quiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {liveSessionData.students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students have joined yet. Share the quiz link with your students.
              </div>
            ) : (
              <div className="space-y-4">
                {liveSessionData.students.map((student: LiveStudent) => (
                  <div key={student.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Avatar>
                      <AvatarFallback>
                        {student.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{student.username}</div>
                          <div className="text-sm text-muted-foreground">
                            Question {student.currentQuestion} of {student.totalQuestions}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {student.isCompleted ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {Math.round(student.scorePercentage)}%
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              In Progress
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{student.questionsAnswered}/{student.totalQuestions}</span>
                        </div>
                        <Progress value={getProgressPercentage(student)} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Modal */}
      <QuizLeaderboard
        open={showLeaderboard}
        onOpenChange={handleLeaderboardClose}
        quizId={quizId}
      />
    </div>
  );
} 