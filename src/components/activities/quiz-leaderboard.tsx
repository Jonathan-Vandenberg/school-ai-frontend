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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  Award,
  Clock,
  Users,
  BarChart3,
  Download,
  ChevronRight,
  Star,
  Target,
  TrendingUp,
  AlertCircle
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
  joinedAt: Date | null;
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

interface SessionResults {
  session: {
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    isActive: boolean;
    timeLimitMinutes: number | null;
  };
  quiz: {
    id: string;
    title: string;
    topic: string;
    numberOfQuestions: number;
  };
  rankings: StudentRanking[];
  incompleteStudents: StudentRanking[];
  stats: SessionStats;
}

interface QuizLeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
}

export function QuizLeaderboard({ open, onOpenChange, quizId }: QuizLeaderboardProps) {
  const [results, setResults] = useState<SessionResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && quizId) {
      fetchResults();
    }
  }, [open, quizId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/quiz/${quizId}/live-session/results`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
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

  // Helper function to get unique score percentages in descending order
  const getScoreTiers = () => {
    if (!results) return [];
    const uniqueScores = [...new Set(results.rankings.map(s => s.percentage))];
    return uniqueScores.sort((a, b) => b - a); // Descending order
  };

  // Helper function to determine medal type based on score percentage
  const getMedalType = (percentage: number) => {
    const scoreTiers = getScoreTiers();
    if (scoreTiers.length === 0) return null;
    
    if (percentage === scoreTiers[0]) return 'gold';
    if (scoreTiers.length > 1 && percentage === scoreTiers[1]) return 'silver';
    if (scoreTiers.length > 2 && percentage === scoreTiers[2]) return 'bronze';
    return null;
  };

  const getRankIcon = (student: StudentRanking, totalStudents?: number) => {
    const medalType = getMedalType(student.percentage);
    const isUltraCompact = totalStudents && totalStudents > 30;
    const isVeryCompact = totalStudents && totalStudents > 25;
    const iconSize = isUltraCompact ? "h-5 w-5" : isVeryCompact ? "h-6 w-6" : "h-7 w-7";
    const textSize = isUltraCompact ? "text-sm" : isVeryCompact ? "text-base" : "text-lg";
    
    switch (medalType) {
      case 'gold':
        return <Trophy className={`${iconSize} text-yellow-500`} />;
      case 'silver':
        return <Medal className={`${iconSize} text-gray-400`} />;
      case 'bronze':
        return <Award className={`${iconSize} text-amber-600`} />;
      default:
        return <span className={`${textSize} font-bold text-muted-foreground`}>#{student.rank}</span>;
    }
  };

  const getRankBadge = (student: StudentRanking, totalStudents?: number) => {
    const medalType = getMedalType(student.percentage);
    const isVeryCompact = totalStudents && totalStudents > 25;
    const badgeClass = isVeryCompact ? "text-xs px-1 py-0" : "";
    
    switch (medalType) {
      case 'gold':
        return <Badge className={`bg-yellow-500 text-white ${badgeClass}`}>🥇 {isVeryCompact ? '' : 'Gold Medal'}</Badge>;
      case 'silver':
        return <Badge className={`bg-gray-400 text-white ${badgeClass}`}>🥈 {isVeryCompact ? '' : 'Silver Medal'}</Badge>;
      case 'bronze':
        return <Badge className={`bg-amber-600 text-white ${badgeClass}`}>🥉 {isVeryCompact ? '' : 'Bronze Medal'}</Badge>;
      default:
        return <Badge variant="outline" className={badgeClass}>#{student.rank}</Badge>;
    }
  };

  // Helper function to get card styling based on medal type
  const getCardStyling = (student: StudentRanking) => {
    const medalType = getMedalType(student.percentage);
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Results...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!results) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>No Results Found</DialogTitle>
            <DialogDescription>
              Could not load session results. Please try again.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none max-h-[95vh] overflow-hidden" 
        style={{ width: '98vw', maxWidth: '98vw', height: '95vh' }}
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-center gap-3 text-3xl">
            <Trophy className="h-8 w-8 text-yellow-500" />
            {results.quiz.title} - Results
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {results.stats.completedStudents} of {results.stats.totalParticipants} students completed • Average: {results.stats.averageScore}%
          </DialogDescription>
        </DialogHeader>

        {/* Compact Grid Layout for All Students */}
        <div className="flex-1 overflow-hidden">
          {results.rankings.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">No students completed the quiz yet.</p>
              </div>
            </div>
          ) : (
            <div 
              className={`grid gap-3 h-full overflow-hidden ${
                // Dynamic grid based on total student count (completed + incomplete)
                (() => {
                  const totalStudents = results.rankings.length + results.incompleteStudents.length;
                  if (totalStudents <= 6) return 'grid-cols-2 lg:grid-cols-3';
                  if (totalStudents <= 12) return 'grid-cols-3 lg:grid-cols-4';
                  if (totalStudents <= 20) return 'grid-cols-4 lg:grid-cols-5';
                  if (totalStudents <= 25) return 'grid-cols-5 lg:grid-cols-6';
                  if (totalStudents <= 30) return 'grid-cols-8 lg:grid-cols-10';
                  return 'grid-cols-10 lg:grid-cols-12'; // For 30+ students
                })()
              }`}
            >
                              {results.rankings.map((student, index) => {
                  const totalStudents = results.rankings.length + results.incompleteStudents.length;
                  const isCompact = totalStudents > 15;
                  const isVeryCompact = totalStudents > 25;
                  const isUltraCompact = totalStudents > 30;
                  
                  return (
                    <Card key={student.student.id} className={`${getCardStyling(student)} h-fit`}>
                      <CardContent className={isUltraCompact ? "p-1" : isVeryCompact ? "p-1" : "p-2"}>
                        {/* Centered rank icon */}
                        <div className={`flex justify-center ${isCompact ? 'mb-1' : 'mb-2'}`}>
                          <div className={`flex items-center justify-center ${isUltraCompact ? 'w-8 h-8' : isVeryCompact ? 'w-10 h-10' : 'w-12 h-12'}`}>
                            {student.rank ? getRankIcon(student, totalStudents) : null}
                          </div>
                        </div>
                        
                        {/* Student name - prominent */}
                        <div className={`text-center ${isUltraCompact ? 'mb-0' : isCompact ? 'mb-1' : 'mb-2'}`}>
                          <div className={`font-bold truncate ${isUltraCompact ? 'text-xs' : isVeryCompact ? 'text-xs' : isCompact ? 'text-sm' : 'text-base'}`} title={student.student.username}>
                            {student.student.username}
                          </div>
                        </div>
                        
                        {/* Score - very prominent */}
                        <div className={`text-center ${isUltraCompact ? 'mb-0' : isCompact ? 'mb-1' : 'mb-2'}`}>
                          <div className={`font-bold text-primary ${isUltraCompact ? 'text-lg' : isVeryCompact ? 'text-xl' : isCompact ? 'text-2xl' : 'text-3xl'}`}>{student.percentage}%</div>
                          <div className={`text-muted-foreground ${isUltraCompact ? 'text-xs' : isVeryCompact ? 'text-xs' : 'text-sm'}`}>{student.score}/{student.totalScore}</div>
                        </div>
                        
                        {/* Time - compact - hide in ultra compact mode */}
                        {!isUltraCompact && (
                          <div className={`text-center ${isVeryCompact ? 'text-xs' : 'text-sm'}`}>
                            <div className="text-muted-foreground">Time: <span className="font-medium">{formatTime(student.timeSpent)}</span></div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              
                             {/* Show incomplete students in a more subtle way */}
               {results.incompleteStudents.map((student) => {
                 const totalStudents = results.rankings.length + results.incompleteStudents.length;
                 const isCompact = totalStudents > 15;
                 const isVeryCompact = totalStudents > 25;
                 const isUltraCompact = totalStudents > 30;
                 
                 return (
                   <Card key={`incomplete-${student.student.id}`} className="border-orange-200 bg-orange-50/50 h-fit opacity-75">
                     <CardContent className={isUltraCompact ? "p-1" : isVeryCompact ? "p-1" : "p-2"}>
                       {/* Centered dash icon */}
                       <div className={`flex justify-center ${isCompact ? 'mb-1' : 'mb-2'}`}>
                         <div className={`flex items-center justify-center ${isUltraCompact ? 'w-8 h-8' : isVeryCompact ? 'w-10 h-10' : 'w-12 h-12'}`}>
                           <span className={`font-bold text-muted-foreground ${isUltraCompact ? 'text-sm' : isVeryCompact ? 'text-base' : 'text-lg'}`}>—</span>
                         </div>
                       </div>
                       
                       <div className={`text-center ${isUltraCompact ? 'mb-0' : isCompact ? 'mb-1' : 'mb-2'}`}>
                         <div className={`font-bold truncate ${isUltraCompact ? 'text-xs' : isVeryCompact ? 'text-xs' : isCompact ? 'text-sm' : 'text-base'}`} title={student.student.username}>
                           {student.student.username}
                         </div>
                       </div>
                       
                       <div className={`text-center ${isUltraCompact ? 'mb-0' : isCompact ? 'mb-1' : 'mb-2'}`}>
                         <div className={`font-bold text-orange-600 ${isUltraCompact ? 'text-lg' : isVeryCompact ? 'text-xl' : isCompact ? 'text-2xl' : 'text-2xl'}`}>
                           {Math.round((student.questionsAnswered / student.totalScore) * 100)}%
                         </div>
                         <div className={`text-muted-foreground ${isUltraCompact ? 'text-xs' : isVeryCompact ? 'text-xs' : 'text-xs'}`}>{student.questionsAnswered}/{student.totalScore}</div>
                       </div>
                     </CardContent>
                   </Card>
                 );
               })}
            </div>
          )}
        </div>

        {/* Bottom stats bar */}
        <div className="flex justify-center items-center gap-8 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Total: {results.stats.totalParticipants}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            <span>Completed: {results.stats.completedStudents}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span>Average: {results.stats.averageScore}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Duration: {formatTime(results.stats.sessionDuration)}</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-8">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 