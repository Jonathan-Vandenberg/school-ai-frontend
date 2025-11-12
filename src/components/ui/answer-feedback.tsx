'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface AnswerFeedbackProps {
  isCorrect: boolean
  feedback: string
  show: boolean
  isProcessing: boolean
  details?: string
  encouragement?: string
  ruleEvaluation?: Record<string, { passed: boolean; feedback: string }>
  evaluationSettings?: {
    detailedFeedback?: boolean
    encouragementEnabled?: boolean
  }
  userAnswer?: string
}

export function AnswerFeedback({
  isCorrect,
  feedback,
  show,
  isProcessing,
  details,
  encouragement,
  ruleEvaluation,
  evaluationSettings,
  userAnswer
}: AnswerFeedbackProps) {
  if (!show && !isProcessing) return null

  return (
    <Card className={`${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <CardContent className="p-4 space-y-3">
            {/* Main Feedback */}
            <div className="flex items-start gap-2">
              {isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {feedback}
                </p>
              </div>
            </div>

            {/* User Answer */}
            {/* {userAnswer && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Your Answer:</h4>
                <p className="text-sm bg-white rounded p-2 border">{userAnswer}</p>
              </div>
            )} */}

            {/* Detailed Feedback */}
            {/* {details && evaluationSettings?.detailedFeedback && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Detailed Feedback:</h4>
                <p className="text-sm text-gray-700">{details}</p>
              </div>
            )} */}

            {/* Rule Evaluation */}
            {ruleEvaluation && Object.keys(ruleEvaluation).length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Evaluation Criteria:</h4>
                <div className="space-y-2">
                  {Object.entries(ruleEvaluation).map(([ruleName, result]) => (
                    <div key={ruleName} className="flex items-start gap-2">
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <Badge 
                          variant={result.passed ? 'default' : 'destructive'} 
                          className={`text-xs mb-1 ${
                            result.passed 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {ruleName}
                        </Badge>
                        <p className="text-xs text-gray-600">{result.feedback}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encouragement */}
            {encouragement && evaluationSettings?.encouragementEnabled && (
              <div className="border-t pt-3">
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800 font-medium">{encouragement}</p>
                </div>
              </div>
            )}
      </CardContent>
    </Card>
  )
} 