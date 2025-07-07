"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RotateCcw, 
  RefreshCw
} from "lucide-react";

interface QuizRestartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  quizTitle: string;
  currentSession: number;
  onRestart: () => void;
}

export function QuizRestartDialog({ 
  open, 
  onOpenChange, 
  quizId, 
  quizTitle, 
  currentSession,
  onRestart 
}: QuizRestartDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleRestart = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/quiz/${quizId}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearPreviousResults: false // Always preserve previous results
        })
      });

      const data = await response.json();

      if (response.ok) {
        onRestart();
        onOpenChange(false);
        // Redirect to live session page
        window.location.href = `/activities/quiz/${quizId}/live`;
      } else {
        console.error('Failed to restart quiz:', data.error);
      }
    } catch (error) {
      console.error('Error restarting quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-500" />
            Restart Quiz
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to restart "{quizTitle}" for your students?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">Session {currentSession}</Badge>
              <span>Currently active</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 text-green-500" />
              <span>Will start session {currentSession + 1}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRestart}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Restart Quiz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 