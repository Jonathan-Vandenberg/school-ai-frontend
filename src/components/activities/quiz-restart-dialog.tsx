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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  Users, 
  Trophy, 
  RefreshCw,
  Info
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
  const [action, setAction] = useState<'restart' | 'reset' | null>(null);

  const handleRestart = async (clearResults: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/quiz/${quizId}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearPreviousResults: clearResults
        })
      });

      const data = await response.json();

      if (response.ok) {
        onRestart();
        onOpenChange(false);
        setAction(null);
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

  if (action) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm {action === 'restart' ? 'Restart' : 'Reset'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {action === 'restart' ? 'restart' : 'reset'} "{quizTitle}"?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {action === 'restart' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>Previous results will be preserved as historical data</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4 text-green-500" />
                  <span>Students can take the quiz again in session {currentSession + 1}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>All previous submissions will be permanently deleted</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <RotateCcw className="h-4 w-4 text-blue-500" />
                  <span>Quiz will reset to session 1</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setAction(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant={action === 'reset' ? 'destructive' : 'default'}
              onClick={() => handleRestart(action === 'reset')}
              disabled={loading}
            >
              {loading ? 'Processing...' : `Confirm ${action === 'restart' ? 'Restart' : 'Reset'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-500" />
            Restart Quiz
          </DialogTitle>
          <DialogDescription>
            Choose how you want to restart "{quizTitle}" for your students
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Session {currentSession}</Badge>
            <span>Currently active</span>
          </div>

          <Separator />

          <div className="grid gap-4">
            <Card className="border-green-200 hover:border-green-300 cursor-pointer transition-colors"
                  onClick={() => setAction('restart')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <RefreshCw className="h-5 w-5" />
                  Restart Quiz (Recommended)
                </CardTitle>
                <CardDescription>
                  Start a new session while keeping previous results as historical data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-500" />
                    <span>Previous results preserved for analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <span>Students can take the quiz again</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      New Session: {currentSession + 1}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 hover:border-red-300 cursor-pointer transition-colors"
                  onClick={() => setAction('reset')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <Trash2 className="h-5 w-5" />
                  Reset Quiz
                </CardTitle>
                <CardDescription>
                  Clear all previous results and start completely fresh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>All previous submissions will be deleted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-blue-500" />
                    <span>Quiz resets to session 1</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <Badge variant="destructive" className="text-xs">
                      Permanent Action
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 