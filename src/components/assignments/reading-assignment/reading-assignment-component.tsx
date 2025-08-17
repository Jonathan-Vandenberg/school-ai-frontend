'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AnswerFeedback } from '@/components/ui/answer-feedback'
import { useAudioAnalysisRecorder } from '@/hooks/use-audio-analysis-recorder'
import { 
  Mic, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Play,
  FileText,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReadingQuestion {
  id: string
  textQuestion?: string | null
  textAnswer: string | null 
}

interface Assignment {
  id: string
  topic: string | null
  evaluationSettings: {
    type: string
    customPrompt: string | null
    rules: any
    acceptableResponses: any
    feedbackSettings: any
  } | null
  questions: ReadingQuestion[]
}

interface StudentProgress {
  questionId: string
  isComplete: boolean
  isCorrect: boolean
  submittedAt: string | null
}

interface ReadingAssignmentProps {
  assignment: Assignment
  studentProgress: StudentProgress[]
  onProgressUpdate: (questionId: string, isCorrect: boolean, result: any, type: 'VIDEO' | 'READING') => Promise<void>
}

export function ReadingAssignment({ 
  assignment, 
  studentProgress,
  onProgressUpdate 
}: ReadingAssignmentProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [details, setDetails] = useState('')
  const [encouragement, setEncouragement] = useState('')
  const [ruleEvaluation, setRuleEvaluation] = useState<Record<string, { passed: boolean; feedback: string }>>({})
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [localProcessing, setLocalProcessing] = useState(false)
  const [hasStartedAnyQuestion, setHasStartedAnyQuestion] = useState(false)
  const [pronunciationResult, setPronunciationResult] = useState<any>(null)

  // Get progress for current question
  const getCurrentQuestionProgress = () => {
    const question = assignment.questions[currentIndex]
    if (!question) return null
    return studentProgress.find(p => p.questionId === question.id)
  }

  const isCurrentQuestionCorrect = getCurrentQuestionProgress()?.isCorrect || false
  const isCurrentQuestionComplete = getCurrentQuestionProgress()?.isComplete || false

  // Calculate overall progress
  const completedQuestions = studentProgress.filter(p => p.isComplete).length
  const totalQuestions = assignment.questions.length
  const overallProgress = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0

  // Submit transcript for pronunciation analysis
  const submitTranscript = async (transcript: string, audioFile: File) => {
    if (!assignment.questions[currentIndex]) return

    setLocalProcessing(true)
    setCurrentTranscript(transcript)
    
    try {
      const currentQuestion = assignment.questions[currentIndex]
      const expectedText = currentQuestion.textAnswer || ''
      
      console.log('Submitting for analysis:', {
        expectedText,
        transcript,
        audioFileSize: audioFile.size
      })
      
      // Use pronunciation analysis for reading assignments (text-only, no audio file needed)
      const response = await fetch('/api/analysis/scripted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          expectedText,
          browserTranscript: transcript
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error('Failed to analyze pronunciation')
      }

      const { analysis } = await response.json()
      
      // Set all the feedback states
      setIsCorrect(analysis.isCorrect)
      setFeedback(analysis.feedback)
      setEncouragement(analysis.encouragement || '')
      setPronunciationResult(analysis.pronunciationResult)
      setShowFeedback(true)
      
      // Update progress
      await onProgressUpdate(currentQuestion.id, analysis.isCorrect, {
        result: analysis,
        timestamp: new Date().toISOString()
      }, 'READING')
      
      // Show confetti for correct answers
      if (analysis.isCorrect) {
        const button = document.querySelector('button[disabled]') as HTMLElement
        if (button) {
          button.style.animation = 'bounce 0.6s ease-in-out'
          setTimeout(() => {
            button.style.animation = ''
          }, 600)
        }
      }
      
    } catch (error) {
      console.error('Error evaluating pronunciation:', error)
      setFeedback('Error processing your pronunciation. Please try again.')
      setIsCorrect(false)
      setShowFeedback(true)
      setPronunciationResult(null)
    } finally {
      setLocalProcessing(false)
      clearProcessing() // Clear the audio recorder processing state
    }
  }

  // Audio recorder hook
  const {
    isRecording,
    isProcessing: recorderIsProcessing,
    toggleRecording,
    audioLevel,
    isSpeaking,
    reset: resetRecorder,
    clearProcessing
  } = useAudioAnalysisRecorder({
    languageCode: 'en-US',
    onTranscriptionStart: () => {
      setShowFeedback(false)
      setFeedback('')
      setPronunciationResult(null)
      // Don't set localProcessing here - wait for transcript completion
    },
    onTranscriptionComplete: (transcript: string, audioFile: File) => {
      const capitalizedTranscript = transcript.charAt(0).toUpperCase() + transcript.slice(1)
      submitTranscript(capitalizedTranscript, audioFile)
    },
    onTranscriptionError: (error) => {
      console.error("Recording error:", error)
      setLocalProcessing(false)
      clearProcessing() // Clear the audio recorder processing state
      alert(error.message || "Error recording audio")
    }
  })

  const isProcessing = recorderIsProcessing || localProcessing

  const clearFeedbackState = () => {
    setFeedback('')
    setShowFeedback(false)
    setIsCorrect(false)
    setDetails('')
    setEncouragement('')
    setRuleEvaluation({})
    setCurrentTranscript('')
    setPronunciationResult(null)
    setLocalProcessing(false) // Reset processing state
  }

  const clearFeedbackAndResetRecorder = () => {
    clearFeedbackState()
    resetRecorder() // Only reset recorder when explicitly needed
  }

  // Reset only feedback states when question changes (not recorder)
  useEffect(() => {
    clearFeedbackState()
  }, [currentIndex])

  const handleNext = () => {
    if (currentIndex < assignment.questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      // Don't call clearFeedbackState here - useEffect will handle it
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      // Don't call clearFeedbackState here - useEffect will handle it
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  if (!assignment || assignment.questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No questions available for this assignment.</p>
            <Button onClick={handleGoBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        {/* <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{assignment.topic}</h1>
            {assignment.language && (
              <p className="text-sm text-muted-foreground">
                Language: {assignment.language.language}
              </p>
            )}
          </div>
        </div> */}

        {/* Overall Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Overall Progress</span>
            <span>{completedQuestions}/{totalQuestions} questions</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Question Navigation */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {assignment.questions.map((question, index) => {
            const progress = studentProgress.find(p => p.questionId === question.id)
            return (
              <button
                key={question.id}
                onClick={() => {
                  setCurrentIndex(index)
                  clearFeedbackAndResetRecorder()
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  progress?.isComplete
                    ? progress.isCorrect
                      ? 'bg-green-500 text-white'
                      : 'bg-red-200 text-red-800'
                    : hasStartedAnyQuestion
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-blue-100 text-blue-800'
                } ${
                  currentIndex === index ? 'ring-4 ring-blue-300' : ''
                }`}
              >
                {progress?.isCorrect ? <Star className="h-4 w-4" fill="currentColor" /> : index + 1}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Question Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Question {currentIndex + 1}: {assignment.questions[currentIndex]?.textQuestion || 'No title available'}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === assignment.questions.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-lg">
                  {assignment.questions[currentIndex]?.textAnswer || 'No question text available'}
                </p>
              </div>

              {/* Microphone Control */}
              <div className="text-center py-6">
                <Button
                  onClick={toggleRecording}
                  disabled={isProcessing || isCurrentQuestionCorrect}
                  className={`w-20 h-20 rounded-full transition-all shadow-lg ${
                    isCurrentQuestionCorrect 
                      ? 'bg-yellow-400 hover:bg-yellow-500'
                      : isRecording 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                        : 'bg-blue-600 hover:bg-blue-700'
                  } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    KhtmlUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    userSelect: 'none',
                  }}
                >
                  {isCurrentQuestionCorrect ? (
                    <Star className="w-8 h-8 text-white" fill="white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </Button>
                
                <p className="text-sm text-muted-foreground mt-2">
                  {isProcessing
                    ? 'Processing your answer...'
                    : isCurrentQuestionCorrect 
                      ? 'Question completed!'
                      : isRecording 
                        ? 'Recording... Click to stop'
                        : 'Click to start recording'
                  }
                </p>
                
                {/* Audio level indicator when recording */}
                {isRecording && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-100"
                        style={{ width: `${Math.min(audioLevel, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback */}
              {(showFeedback || isProcessing) && (
                <AnswerFeedback
                  isCorrect={isCorrect}
                  feedback={feedback}
                  show={showFeedback || isProcessing}
                  isProcessing={isProcessing}
                  details={details}
                  encouragement={encouragement}
                  ruleEvaluation={{}} // Empty for reading assignments - evaluation criteria not used
                  evaluationSettings={assignment.evaluationSettings?.feedbackSettings}
                  userAnswer={currentTranscript}
                />
              )}

              {/* Pronunciation Results */}
              {pronunciationResult && pronunciationResult.words && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Pronunciation Analysis</h3>
                  <div className="space-y-2">
                    {pronunciationResult.words.map((word: any, wordIndex: number) => (
                      <div key={wordIndex} className="flex flex-wrap items-center gap-1">
                        <span className="font-medium text-sm text-gray-600 min-w-0 mr-2">
                          {word.word_text}:
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          {word.phonemes?.map((phoneme: any, phonemeIndex: number) => {
                            // Color coding based on phoneme score
                            let bgColor = 'bg-red-200 text-red-800' // 0-50: Poor
                            if (phoneme.phoneme_score >= 90) {
                              bgColor = 'bg-green-200 text-green-800' // 90-100: Excellent
                            } else if (phoneme.phoneme_score >= 80) {
                              bgColor = 'bg-blue-200 text-blue-800' // 80-89: Very Good
                            } else if (phoneme.phoneme_score >= 70) {
                              bgColor = 'bg-yellow-200 text-yellow-800' // 70-79: Good
                            } else if (phoneme.phoneme_score >= 50) {
                              bgColor = 'bg-orange-200 text-orange-800' // 50-69: Fair
                            }
                            
                            return (
                              <span
                                key={phonemeIndex}
                                className={`inline-block px-2 py-1 rounded text-xs font-mono ${bgColor}`}
                                title={`${phoneme.ipa_label}: ${Math.round(phoneme.phoneme_score)}%`}
                              >
                                {phoneme.ipa_label}
                              </span>
                            )
                          })}
                        </div>
                        <span className="text-xs text-gray-500 ml-2">
                          ({Math.round(word.word_score)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span>Overall Score:</span>
                      <span className="font-semibold">
                        {Math.round(pronunciationResult.overall_score)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Color Legend:</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-block px-2 py-1 rounded bg-green-200 text-green-800">
                        90%+ Excellent
                      </span>
                      <span className="inline-block px-2 py-1 rounded bg-blue-200 text-blue-800">
                        80%+ Very Good
                      </span>
                      <span className="inline-block px-2 py-1 rounded bg-yellow-200 text-yellow-800">
                        70%+ Good
                      </span>
                      <span className="inline-block px-2 py-1 rounded bg-orange-200 text-orange-800">
                        50%+ Fair
                      </span>
                      <span className="inline-block px-2 py-1 rounded bg-red-200 text-red-800">
                        &lt;50% Needs Practice
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <Badge variant="secondary">
                  {completedQuestions}/{totalQuestions}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Correct</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {studentProgress.filter(p => p.isCorrect).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Accuracy</span>
                <Badge variant="outline">
                  {completedQuestions > 0 
                    ? Math.round((studentProgress.filter(p => p.isCorrect).length / completedQuestions) * 100)
                    : 0
                  }%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {assignment.evaluationSettings?.rules && Array.isArray(assignment.evaluationSettings.rules) && assignment.evaluationSettings.rules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {assignment.evaluationSettings.rules.map((rule: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 