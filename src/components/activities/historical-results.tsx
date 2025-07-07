"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  Award,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  BarChart3
} from "lucide-react";

interface StudentRanking {
  rank: number | null;
  student: {
    id: string;
    username: string;
    email: string;
  };
  score: number;
  totalScore: number;
  percentage: number;
  completedAt: Date | null;
  questionsAnswered: number;
  timeSpent: number | null;
  isIncomplete?: boolean;
}

interface SessionStats {
  totalParticipants: number;
  completedStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  sessionDuration: number | null;
}

interface HistoricalSession {
  sessionNumber: number;
  session: {
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    isActive: boolean;
    timeLimitMinutes: number | null;
  };
  rankings: StudentRanking[];
  incompleteStudents: StudentRanking[];
  stats: SessionStats;
}

interface HistoricalResultsData {
  quiz: {
    id: string;
    title: string;
    topic: string;
    numberOfQuestions: number;
  };
  sessions: HistoricalSession[];
  totalSessions: number;
}

interface HistoricalResultsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
}

export function HistoricalResults({ open, onOpenChange, quizId }: HistoricalResultsProps) {
  const [results, setResults] = useState<HistoricalResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    if (open && quizId) {
      fetchHistoricalResults();
    }
  }, [open, quizId]);

  // Set default selected session when results load
  useEffect(() => {
    if (results && results.sessions.length > 0 && !selectedSession) {
      setSelectedSession(`session-${results.sessions[0].sessionNumber}`);
    }
  }, [results, selectedSession]);

  const fetchHistoricalResults = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/quiz/${quizId}/historical-results`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        // Default to the latest session
        if (data.sessions.length > 0) {
          setSelectedSession(`session-${data.sessions[0].sessionNumber}`);
        }
      }
    } catch (error) {
      console.error('Error fetching historical results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to get medal type based on rank
  const getMedalType = (rank: number | null) => {
    if (!rank) return null;
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return null;
  };

  const getRankIcon = (student: StudentRanking) => {
    const medalType = getMedalType(student.rank);
    
    switch (medalType) {
      case 'gold':
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 'silver':
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 'bronze':
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{student.rank}</span>;
    }
  };

  const getCardStyling = (student: StudentRanking) => {
    const medalType = getMedalType(student.rank);
    switch (medalType) {
      case 'gold':
        return 'border-2 border-yellow-200 bg-yellow-50';
      case 'silver':
        return 'border-2 border-gray-200 bg-gray-50';
      case 'bronze':
        return 'border-2 border-amber-200 bg-amber-50';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Historical Results...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!results || results.sessions.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>No Historical Data</DialogTitle>
            <DialogDescription>
              No quiz sessions have been completed yet.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedSessionData = results.sessions.find(s => selectedSession === `session-${s.sessionNumber}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none max-h-[95vh] overflow-hidden flex flex-col" 
        style={{ width: '98vw', maxWidth: '98vw', height: '95vh' }}
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-center gap-3 text-3xl">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            {results.quiz.title} - Historical Results
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {results.totalSessions} session{results.totalSessions !== 1 ? 's' : ''} completed • {results.quiz.numberOfQuestions} questions each
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedSession || ""} onValueChange={setSelectedSession} className="flex-1 overflow-hidden flex flex-col">
          {/* Session tabs */}
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${results.sessions.length}, 1fr)` }}>
            {results.sessions.map((session) => (
              <TabsTrigger 
                key={session.sessionNumber} 
                value={`session-${session.sessionNumber}`}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <div className="font-semibold">Session {session.sessionNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(session.session.startedAt)}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Session content */}
          <div className="flex-1 overflow-hidden mt-4">
            {results.sessions.map((session) => (
              <TabsContent 
                key={session.sessionNumber} 
                value={`session-${session.sessionNumber}`}
                className="h-full overflow-hidden flex flex-col"
              >
                {/* Session header with stats */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Session {session.sessionNumber} Results</h3>
                    <Badge variant="outline">
                      {session.session.isActive ? "Active" : "Completed"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>Participants: {session.stats.totalParticipants}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-green-500" />
                      <span>Completed: {session.stats.completedStudents}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      <span>Average: {session.stats.averageScore}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span>Duration: {formatTime(session.stats.sessionDuration)}</span>
                    </div>
                  </div>
                </div>

                {/* Results grid */}
                <div className="flex-1 overflow-y-auto">
                  {session.rankings.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground">No students completed this session yet.</p>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`grid gap-3 ${
                        // Dynamic grid based on total student count (completed + incomplete)
                        (() => {
                          const totalStudents = session.rankings.length + session.incompleteStudents.length;
                          if (totalStudents <= 6) return 'grid-cols-2 lg:grid-cols-3';
                          if (totalStudents <= 12) return 'grid-cols-3 lg:grid-cols-4';
                          if (totalStudents <= 20) return 'grid-cols-4 lg:grid-cols-5';
                          if (totalStudents <= 25) return 'grid-cols-5 lg:grid-cols-6';
                          if (totalStudents <= 30) return 'grid-cols-8 lg:grid-cols-10';
                          return 'grid-cols-10 lg:grid-cols-12'; // For 30+ students
                        })()
                      }`}
                    >
                      {/* Completed students */}
                      {session.rankings.map((student, index) => (
                        <Card key={`session-${session.sessionNumber}-completed-${student.student.id}-rank-${student.rank || index}`} className={`${getCardStyling(student)} h-fit`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getRankIcon(student)}
                              </div>
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            </div>
                            
                            <div className="text-center mb-3">
                              <div className="font-bold text-lg truncate" title={student.student.username}>
                                {student.student.username}
                              </div>
                            </div>
                            
                            <div className="text-center mb-3">
                              <div className="text-2xl font-bold text-primary">{student.percentage}%</div>
                              <div className="text-sm text-muted-foreground">{student.score}/{student.totalScore}</div>
                            </div>
                            
                            <div className="text-center text-sm text-muted-foreground">
                              <div>Time: {formatTime(student.timeSpent)}</div>
                              {student.completedAt && (
                                <div>Finished: {formatDate(student.completedAt)}</div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Incomplete students */}
                      {session.incompleteStudents.map((student, index) => (
                        <Card key={`session-${session.sessionNumber}-incomplete-${student.student.id}-idx-${index}`} className="border-orange-200 bg-orange-50/50 h-fit">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-muted-foreground">—</span>
                              </div>
                              <Badge variant="destructive" className="bg-orange-100 text-orange-800">
                                Incomplete
                              </Badge>
                            </div>
                            
                            <div className="text-center mb-3">
                              <div className="font-bold text-lg truncate" title={student.student.username}>
                                {student.student.username}
                              </div>
                            </div>
                            
                            <div className="text-center mb-3">
                              <div className="text-2xl font-bold text-orange-600">
                                {Math.round((student.questionsAnswered / student.totalScore) * 100)}%
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.questionsAnswered}/{student.totalScore} answered
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 