"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Users, BarChart3, Medal, Award, Clock, Star, Target } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CountdownTimer } from "@/components/ui/countdown-timer";


interface Quiz {
  id: string;
  title: string;
  topic: string;
  numberOfQuestions: number;
  timeLimitMinutes: number | null;
  isLiveSession: boolean;
  currentSession: number;
}

interface LiveSession {
  id: string;
  startedAt: string;
  timeLimitMinutes: number | null;
  isActive: boolean;
}

interface StudentRanking {
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
}

interface SessionStats {
  totalParticipants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

interface SessionResult {
  sessionNumber: number;
  rankings: StudentRanking[];
  stats: SessionStats;
  isCurrentSession: boolean;
}

interface QuizResults {
  success: boolean;
  quiz: Quiz;
  liveSession: LiveSession | null;
  sessionResults: SessionResult[];
  hasResults: boolean;
}

export default function QuizLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const quizId = params.quizId as string;

  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch quiz results
  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        const response = await fetch(`/api/activities/quiz/${quizId}/results`);
        if (!response.ok) {
          if (response.status === 403) {
            setError("You don't have access to this quiz leaderboard.");
          } else if (response.status === 404) {
            setError("Quiz not found.");
          } else {
            setError("Failed to load quiz leaderboard.");
          }
          return;
        }
        const data = await response.json();
        setQuizResults(data);
      } catch (error) {
        console.error('Error fetching quiz results:', error);
        setError("Failed to load quiz leaderboard.");
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId && session?.user?.id) {
      fetchQuizResults();
    }
  }, [quizId, session?.user?.id]);

  // Redirect non-students away from this page
  useEffect(() => {
    if (session?.user?.customRole !== 'STUDENT') {
      router.push(`/activities/quiz/${quizId}/live`);
    }
  }, [session?.user?.customRole, router, quizId]);

  // Helper functions
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/activities')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizResults) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">The quiz you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => router.push('/activities')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quiz, liveSession, sessionResults, hasResults } = quizResults;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" asChild>
            <Link href="/activities">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activities
            </Link>
          </Button>
          {liveSession && liveSession.isActive && (
            <Badge variant="default" className="bg-red-500 text-white animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
        
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          {quiz.title} - Leaderboard
        </h1>
        <p className="text-muted-foreground mt-2">{quiz.topic}</p>
        
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">{quiz.numberOfQuestions} questions</span>
          </div>
          {quiz.timeLimitMinutes && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{quiz.timeLimitMinutes} minutes</span>
            </div>
          )}
          {quiz.currentSession > 1 && (
            <Badge variant="outline">
              Session {quiz.currentSession}
            </Badge>
          )}
          {liveSession && liveSession.isActive && liveSession.timeLimitMinutes && (
            <CountdownTimer
              startedAt={liveSession.startedAt}
              timeLimitMinutes={liveSession.timeLimitMinutes}
              isActive={liveSession.isActive}
              className="text-lg font-mono"
              warningThreshold={300}
            />
          )}
        </div>
      </div>

      {/* Live Session Alert */}
      {liveSession && liveSession.isActive && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-red-800 font-medium">
                Live session is currently active! Results are updating in real-time.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!hasResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Quiz Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Results Yet</p>
              <p className="text-muted-foreground mb-6">
                Results will appear here once students complete the quiz
              </p>
              <Button onClick={() => router.push('/activities')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Results */}
      {hasResults && sessionResults.length > 0 && (
        <Tabs defaultValue={sessionResults[0].sessionNumber.toString()} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {sessionResults.map(session => (
              <TabsTrigger 
                key={session.sessionNumber} 
                value={session.sessionNumber.toString()}
                className="flex items-center gap-2"
              >
                Session {session.sessionNumber}
                {session.isCurrentSession && (
                  <Badge variant="secondary" className="text-xs">Current</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {sessionResults.map(session => (
            <TabsContent key={session.sessionNumber} value={session.sessionNumber.toString()}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Statistics */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Session Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Participants</span>
                        <span className="font-medium">{session.stats.totalParticipants}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average Score</span>
                        <span className="font-medium">{session.stats.averageScore.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Highest Score</span>
                        <span className="font-medium text-green-600">{session.stats.highestScore.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Lowest Score</span>
                        <span className="font-medium text-red-600">{session.stats.lowestScore.toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Leaderboard */}
                <div className="lg:col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Session {session.sessionNumber} Results
                      </CardTitle>
                      <CardDescription>
                        Rankings for all participants in this session
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {session.rankings.map((student, index) => (
                          <div 
                            key={student.student.id}
                            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                              student.isCurrentUser 
                                ? 'border-blue-200 bg-blue-50' 
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-10">
                                {getMedalIcon(student.rank)}
                              </div>
                              
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {student.student.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {student.student.username}
                                  </span>
                                  {student.isCurrentUser && (
                                    <Badge variant="outline" className="text-xs">You</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {student.score}/{student.totalScore} correct
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getScoreColor(student.percentage)}`}>
                                {student.percentage.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(student.completedAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
} 