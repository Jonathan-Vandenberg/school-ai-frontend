"use client";

import { useState } from "react";
import { LiveQuizCard } from "./live-quiz-card";
import { Separator } from "@/components/ui/separator";

interface LiveQuizzesSectionProps {
  liveQuizzes: Array<{
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
  }>;
}

export function LiveQuizzesSection({ liveQuizzes }: LiveQuizzesSectionProps) {
  const [expiredQuizIds, setExpiredQuizIds] = useState<Set<string>>(new Set());

  const handleQuizExpired = (quizId: string) => {
    setExpiredQuizIds(prev => new Set(prev).add(quizId));
  };

  // Filter out expired quizzes
  const activeQuizzes = liveQuizzes.filter(quiz => !expiredQuizIds.has(quiz.id));

  // Don't render the section if no active quizzes
  if (activeQuizzes.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <h2 className="text-2xl font-semibold text-red-600">LIVE NOW</h2>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {liveQuizzes.map((quiz) => (
          <LiveQuizCard 
            key={quiz.id} 
            quiz={quiz} 
            onExpired={() => handleQuizExpired(quiz.id)}
          />
        ))}
      </div>
      
      <Separator className="mt-8" />
    </div>
  );
} 