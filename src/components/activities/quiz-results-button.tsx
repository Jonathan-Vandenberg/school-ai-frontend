"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { QuizLeaderboard } from "./quiz-leaderboard";

interface QuizResultsButtonProps {
  quizId: string;
}

export function QuizResultsButton({ quizId }: QuizResultsButtonProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full justify-start"
        onClick={() => setShowLeaderboard(true)}
      >
        <Trophy className="h-4 w-4 mr-2" />
        View Results
      </Button>

      <QuizLeaderboard
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
        quizId={quizId}
      />
    </>
  );
} 