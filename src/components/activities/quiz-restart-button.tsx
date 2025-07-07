"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { QuizRestartDialog } from "./quiz-restart-dialog";

interface QuizRestartButtonProps {
  quizId: string;
  quizTitle: string;
  currentSession: number;
}

export function QuizRestartButton({ quizId, quizTitle, currentSession }: QuizRestartButtonProps) {
  const [showRestartDialog, setShowRestartDialog] = useState(false);

  const handleRestart = () => {
    // Refresh the page after restart
    window.location.reload();
  };

  return (
    <div>
      <Button 
        onClick={() => setShowRestartDialog(true)}
        variant="outline" 
        className="w-full justify-start"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Restart Quiz
      </Button>
      
      <QuizRestartDialog
        open={showRestartDialog}
        onOpenChange={setShowRestartDialog}
        quizId={quizId}
        quizTitle={quizTitle}
        currentSession={currentSession}
        onRestart={handleRestart}
      />
    </div>
  );
} 