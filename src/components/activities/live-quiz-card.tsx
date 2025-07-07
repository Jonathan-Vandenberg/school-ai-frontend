"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import {
  HelpCircle,
  Clock,
  Play
} from "lucide-react";
import { useState, useEffect } from "react";

interface LiveQuizCardProps {
  quiz: {
    id: string;
    title: string;
    topic: string;
    _count: {
      questions: number;
    };
    teacher: {
      username: string;
    };
    classes: Array<{
      class: {
        name: string;
      };
    }>;
    liveSessions: Array<{
      id: string;
      timeLimitMinutes: number;
      startedAt: string;
    }>;
  };
  onExpired?: () => void;
}

export function LiveQuizCard({ quiz, onExpired }: LiveQuizCardProps) {
  const liveSession = quiz.liveSessions[0];
  const [isExpired, setIsExpired] = useState(false);

  // Check if session is expired on initial load
  useEffect(() => {
    if (liveSession?.timeLimitMinutes && liveSession.timeLimitMinutes > 0) {
      const sessionStartTime = new Date(liveSession.startedAt).getTime();
      const sessionDuration = liveSession.timeLimitMinutes * 60 * 1000;
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, sessionDuration - elapsed);
      
      if (remaining <= 0) {
        setIsExpired(true);
        onExpired?.();
      }
    }
  }, [liveSession, onExpired]);

  const handleTimeUp = () => {
    setIsExpired(true);
    onExpired?.();
  };

  // Don't render expired sessions
  if (isExpired) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-white hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">{quiz.title}</CardTitle>
            <CardDescription className="mt-1">{quiz.topic}</CardDescription>
          </div>
          <Badge className="bg-red-500 text-white animate-pulse">
            LIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            <span>{quiz._count.questions} questions</span>
          </div>
          {liveSession?.timeLimitMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{liveSession.timeLimitMinutes} min</span>
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        {liveSession && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-900">
                {liveSession.timeLimitMinutes && liveSession.timeLimitMinutes > 0 ? "Time Remaining:" : "Status:"}
              </span>
              {liveSession.timeLimitMinutes && liveSession.timeLimitMinutes > 0 ? (
                <CountdownTimer
                  startedAt={liveSession.startedAt}
                  timeLimitMinutes={liveSession.timeLimitMinutes}
                  isActive={true}
                  className="text-orange-900 font-mono font-bold"
                  warningThreshold={300}
                  onTimeUp={handleTimeUp}
                />
              ) : (
                <span className="text-sm font-medium text-orange-900">No Time Limit</span>
              )}
            </div>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Teacher: </span>
          {quiz.teacher.username}
        </div>
        
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Classes: </span>
          {quiz.classes.map((qc: any) => qc.class.name).join(", ")}
        </div>
        
        <div className="pt-2">
          <Button asChild className="w-full bg-red-600 hover:bg-red-700" size="sm">
            <Link href={`/activities/quiz/${quiz.id}/take`}>
              <Play className="h-4 w-4 mr-2" />
              Join Live Quiz
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 