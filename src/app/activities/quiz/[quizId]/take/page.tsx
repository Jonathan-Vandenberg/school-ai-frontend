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
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
          // Check if quiz is completed
          if (result.progress.isCompleted) {
            // Fetch final submission data
            const quizResponse = await fetch(`/api/activities/quiz/${quizId}`);
            if (quizResponse.ok) {
              const quizData = await quizResponse.json();
              setExistingSubmission(quizData.submission);
              setQuizCompleted(true);
            }
          }
        }
      } catch (error) {
        console.error('Error updating live progress:', error);
        // Don't block the user if progress update fails
      }
    } else if (quiz) {
      // For non-live quizzes, check if all questions are answered
      if (Object.keys(updatedAnswers).length === quiz.questions.length) {
        // Auto-complete the quiz
        handleAutoComplete(updatedAnswers);
      }
    }
  };

  const handleAutoComplete = async (finalAnswers: Record<string, number>) => {
    if (!quiz) return;
    
    setSubmitting(true);
    
    try {
      // Create a mock submission for display
      const correctAnswers = quiz.questions.filter(q => 
        finalAnswers[q.id] === q.correctAnswer
      ).length;
      
      const percentage = (correctAnswers / quiz.questions.length) * 100;
      
      const mockSubmission = {
        id: 'auto-complete',
        isCompleted: true,
        percentage: percentage,
        completedAt: new Date().toISOString()
      };
      
      setExistingSubmission(mockSubmission);
      setQuizCompleted(true);
      
    } catch (error) {
      console.error('Error auto-completing quiz:', error);
      setError('Failed to complete quiz');
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
      <div className="container mx-auto p-6 max-w-2xl">
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
              
              {liveSession && (
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/activities/quiz/${quizId}/live`)}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Live Leaderboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show existing submission results
  if (existingSubmission && !liveSession) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Already Completed</CardTitle>
            <CardDescription>
              You have already completed this quiz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div className="font-semibold">Your Score</div>
                <div className="text-sm text-muted-foreground">
                  Completed on {new Date(existingSubmission.completedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(existingSubmission.percentage)}%
              </div>
            </div>
            
            <Button 
              onClick={() => router.push('/activities')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-quiz screen
  if (!quizStarted) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
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
          {timeRemaining !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={`font-mono text-base ${timeRemaining < 300 ? 'text-red-500' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
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
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === index 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => handleAnswerChange(currentQuestion.id, index)}
                >
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name={`question-${currentQuestion.id}`}
                    value={index}
                    checked={answers[currentQuestion.id] === index}
                    onChange={() => handleAnswerChange(currentQuestion.id, index)}
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
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="space-x-2">
          {!isLastQuestion && (
            <Button onClick={handleNextQuestion}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {isLastQuestion && (
            <div className="text-sm text-muted-foreground">
              Quiz will complete automatically when all questions are answered
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 