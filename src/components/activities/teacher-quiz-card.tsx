"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuizCardActions } from "./quiz-card-actions";
import {
  HelpCircle,
  Users,
  Calendar
} from "lucide-react";

interface TeacherQuizCardProps {
  quiz: {
    id: string;
    title: string;
    topic: string;
    isLiveSession: boolean;
    isActive: boolean;
    createdAt: string;
    currentSession: number;
    _count: {
      questions: number;
      submissions: number;
    };
    classes: Array<{
      class: {
        name: string;
      };
    }>;
    liveSessions?: Array<{
      id: string;
      timeLimitMinutes: number;
      startedAt: string;
      isActive: boolean;
    }>;
  };
}

export function TeacherQuizCard({ quiz }: TeacherQuizCardProps) {
  const [isLiveSessionExpired, setIsLiveSessionExpired] = useState(false);

  // Check if live session has expired
  useEffect(() => {
    if (quiz.isLiveSession && quiz.liveSessions && quiz.liveSessions.length > 0) {
      const liveSession = quiz.liveSessions.find(session => session.isActive);
      
      if (liveSession?.timeLimitMinutes && liveSession.timeLimitMinutes > 0) {
        const sessionStartTime = new Date(liveSession.startedAt).getTime();
        const sessionDuration = liveSession.timeLimitMinutes * 60 * 1000;
        const elapsed = Date.now() - sessionStartTime;
        const remaining = Math.max(0, sessionDuration - elapsed);
        
        if (remaining <= 0) {
          setIsLiveSessionExpired(true);
        } else {
          // Set a timer to update when the session expires
          const timer = setTimeout(() => {
            setIsLiveSessionExpired(true);
          }, remaining);
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [quiz.isLiveSession, quiz.liveSessions]);

  // Determine if quiz is actually live (not expired)
  const isActuallyLive = quiz.isLiveSession && !isLiveSessionExpired;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg leading-tight">{quiz.title}</CardTitle>
              {isActuallyLive && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Live Session Active"></div>
              )}
            </div>
            <CardDescription className="mt-1">{quiz.topic}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isActuallyLive ? (
              <Badge variant="destructive" className="animate-pulse">
                LIVE
              </Badge>
            ) : (
              <Badge variant={
                !quiz.isActive ? "secondary" : 
                quiz._count.submissions > 0 ? "default" : 
                "outline"
              }
              className={
                quiz._count.submissions > 0 && quiz.isActive 
                  ? "bg-green-100 text-green-800 border-green-200" 
                  : ""
              }>
                {!quiz.isActive ? "Draft" : 
                 quiz._count.submissions > 0 ? "Completed" : 
                 "Active"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            <span>{quiz._count.questions} questions</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{quiz._count.submissions} submissions</span>
          </div>
        </div>
        
        {quiz.classes.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Classes: </span>
            {quiz.classes.map((qc: any) => qc.class.name).join(", ")}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
        </div>
        
        <QuizCardActions 
          quizId={quiz.id} 
          quizTitle={quiz.title}
          currentSession={quiz.currentSession}
          hasSubmissions={quiz._count.submissions > 0}
        />
      </CardContent>
    </Card>
  );
} 