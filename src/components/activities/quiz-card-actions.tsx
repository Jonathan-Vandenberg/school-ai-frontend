"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Clock, Trophy, RotateCcw, BarChart3 } from "lucide-react";
import { QuizLeaderboard } from "./quiz-leaderboard";
import { QuizRestartDialog } from "./quiz-restart-dialog";
import { HistoricalResults } from "./historical-results";

interface QuizCardActionsProps {
  quizId: string;
  quizTitle: string;
  currentSession: number;
  hasSubmissions: boolean;
  onRefresh?: () => void;
}

export function QuizCardActions({ quizId, quizTitle, currentSession, hasSubmissions, onRefresh }: QuizCardActionsProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showHistoricalResults, setShowHistoricalResults] = useState(false);

  return (
    <>
      <div className="pt-2 space-y-2">
        <Button asChild className="w-full" size="sm">
          <Link href={`/activities/quiz/${quizId}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Quiz
          </Link>
        </Button>
        
        {hasSubmissions ? (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowLeaderboard(true)}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Results
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowHistoricalResults(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Historical
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/activities/quiz/${quizId}/live`}>
                  <Clock className="h-4 w-4 mr-2" />
                  LIVE
                </Link>
              </Button>
              
              <Button 
                onClick={() => setShowRestartDialog(true)}
                variant="outline" 
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </div>
          </>
        ) : (
          <Button asChild variant="secondary" size="sm" className="w-full">
            <Link href={`/activities/quiz/${quizId}/live`}>
              <Clock className="h-4 w-4 mr-2" />
              Start Live Session
            </Link>
          </Button>
        )}
      </div>

      {hasSubmissions && (
        <>
          <QuizLeaderboard
            open={showLeaderboard}
            onOpenChange={setShowLeaderboard}
            quizId={quizId}
          />
          
          <HistoricalResults
            open={showHistoricalResults}
            onOpenChange={setShowHistoricalResults}
            quizId={quizId}
          />
          
          <QuizRestartDialog
            open={showRestartDialog}
            onOpenChange={setShowRestartDialog}
            quizId={quizId}
            quizTitle={quizTitle}
            currentSession={currentSession}
            onRestart={() => {
              if (onRefresh) onRefresh();
            }}
          />
        </>
      )}
    </>
  );
} 