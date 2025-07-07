"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { HistoricalResults } from "./historical-results";

interface QuizHistoricalResultsButtonProps {
  quizId: string;
}

export function QuizHistoricalResultsButton({ quizId }: QuizHistoricalResultsButtonProps) {
  const [showHistoricalResults, setShowHistoricalResults] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full justify-start"
        onClick={() => setShowHistoricalResults(true)}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Historical Results
      </Button>

      <HistoricalResults
        open={showHistoricalResults}
        onOpenChange={setShowHistoricalResults}
        quizId={quizId}
      />
    </>
  );
} 