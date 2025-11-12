'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AnswerFeedback } from '@/components/ui/answer-feedback'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import IncorrectLottie from '@/components/ui/incorrect-lottie'
import { 
  Mic, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Play,
  FileText,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface VideoQuestion {
  id: string
  textQuestion: string | null
  textAnswer: string | null // Expected answer
  image: string | null
  videoUrl: string | null
}

interface Assignment {
  id: string
  topic: string | null
  videoUrl: string | null
  videoTranscript: string | null
  language: {
    id: string
    language: string
    code: string
  } | null
  evaluationSettings: {
    type: string
    customPrompt: string | null
    rules: any
    acceptableResponses: any
    feedbackSettings: any
  } | null
  questions: VideoQuestion[]
}

interface StudentProgress {
  questionId: string
  isComplete: boolean
  isCorrect: boolean
  submittedAt: string | null
}

interface VideoAssignmentPlayerProps {
  assignment: Assignment
  studentProgress: StudentProgress[]
  onProgressUpdate: (questionId: string, isCorrect: boolean, result: any, type: 'VIDEO' | 'READING') => Promise<void>
  isViewingOnly?: boolean
}

export function VideoAssignmentPlayer({ 
  assignment, 
  studentProgress,
  onProgressUpdate,
  isViewingOnly = false
}: VideoAssignmentPlayerProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [details, setDetails] = useState('')
  const [encouragement, setEncouragement] = useState('')
  // const [ruleEvaluation, setRuleEvaluation] = useState<Record<string, { passed: boolean; feedback: string }>>({})
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [showVideoTranscript, setShowVideoTranscript] = useState(false)
  const [localProcessing, setLocalProcessing] = useState(false)
  const [hasStartedAnyQuestion, setHasStartedAnyQuestion] = useState(false)
  const [videoIsPaused, setVideoIsPaused] = useState(false)
  const [showIncorrectAnimation, setShowIncorrectAnimation] = useState(false)
  const playerRef = useRef<any>(null)

  // Get YouTube video ID for embedded player
  const getYouTubeVideoId = (url: string) => {
    if (!url) return ''
    
    let videoId = ''
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url)
      videoId = urlObj.searchParams.get('v') || ''
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('/')
      videoId = parts[parts.length - 1].split('?')[0]
    }
    return videoId
  }

  const videoId = getYouTubeVideoId(assignment.videoUrl || '')

  // Initialize YouTube Player API
  useEffect(() => {
    if (typeof window !== 'undefined' && videoId) {
      // Load YouTube API if not already loaded
      if (!(window as any).YT) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.body.appendChild(script)
        
        ;(window as any).onYouTubeIframeAPIReady = () => {
          initializePlayer()
        }
      } else {
        initializePlayer()
      }
    }
  }, [videoId])

  const initializePlayer = () => {
    if (videoId && (window as any).YT) {
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          controls: 1,
        },
      })
    }
  }

  // Control video playback based on recording state
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      if (videoIsPaused) {
        playerRef.current.pauseVideo()
      }
      // Note: We don't auto-resume to avoid interrupting user's video position
    }
  }, [videoIsPaused])

  // Get progress for current question
  const getCurrentQuestionProgress = () => {
    const question = assignment.questions[currentIndex]
    if (!question) return null
    return studentProgress.find(p => p.questionId === question.id)
  }

  const isCurrentQuestionCorrect = getCurrentQuestionProgress()?.isCorrect || false
  // const isCurrentQuestionComplete = getCurrentQuestionProgress()?.isComplete || false

  // Calculate overall progress
  const completedQuestions = studentProgress.filter(p => p.isComplete).length
  const totalQuestions = assignment.questions.length
  const overallProgress = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0

  // Submit transcript for evaluation
  const submitTranscript = async (transcript: string) => {
    if (!assignment.questions[currentIndex]) return

    setLocalProcessing(true)
    setCurrentTranscript(transcript)
    
    try {
      const currentQuestion = assignment.questions[currentIndex]
      
      const response = await fetch('/api/evaluate-video-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          answer: transcript,
          videoUrl: assignment.videoUrl,
          question: {
            question: currentQuestion.textQuestion || '',
            answer: currentQuestion.textAnswer || ''
          },
          rules: assignment.evaluationSettings?.rules || [],
          feedbackSettings: assignment.evaluationSettings?.feedbackSettings || {},
          transcriptContent: assignment.videoTranscript,
          language: assignment.language ? {
            code: assignment.language.code,
            name: assignment.language.language
          } : null,
          topic: assignment.topic || ''
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to evaluate answer')
      }

      const { 
        feedback: newFeedback, 
        isCorrect: newIsCorrect,
        details: newDetails,
        encouragement: newEncouragement,
        ruleEvaluation: newRuleEvaluation
      } = await response.json()
      
      setFeedback(newFeedback)
      setIsCorrect(newIsCorrect)
      setDetails(newDetails)
      setEncouragement(newEncouragement)
      // setRuleEvaluation(newRuleEvaluation)
      setShowFeedback(true)
      setHasStartedAnyQuestion(true)

      // Show incorrect animation if answer is wrong
      if (!newIsCorrect) {
        setShowIncorrectAnimation(true)
      }

      // Update progress
      await onProgressUpdate(currentQuestion.id, newIsCorrect, {
        transcript,
        timestamp: new Date().toISOString()
      }, 'VIDEO')
      
      // Show confetti for correct answers (similar to original)
      if (newIsCorrect) {
        // Simple confetti effect using CSS animation
        const button = document.querySelector('button[disabled]') as HTMLElement
        if (button) {
          button.style.animation = 'bounce 0.6s ease-in-out'
          setTimeout(() => {
            button.style.animation = ''
          }, 600)
        }
      }
      
    } catch (error) {
      console.error('Error evaluating answer:', error)
      setFeedback('Error processing your answer. Please try again.')
      setIsCorrect(false)
      setShowFeedback(true)
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
  } = useAudioRecorder({
    languageCode: assignment.language?.code || 'en-US',
    onTranscriptionStart: () => {
      setShowFeedback(false)
      setFeedback('')
      setVideoIsPaused(true) // Pause video when recording starts
      // Don't set localProcessing here - wait for transcript completion
    },
    onTranscriptionComplete: (transcript) => {
      const capitalizedTranscript = transcript.charAt(0).toUpperCase() + transcript.slice(1)
      setVideoIsPaused(false) // Resume video when recording completes
      submitTranscript(capitalizedTranscript)
    },
    onTranscriptionError: (error) => {
      console.error("Recording error:", error)
      setLocalProcessing(false)
      setVideoIsPaused(false) // Resume video on error
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
    // setRuleEvaluation({})
    setCurrentTranscript('')
    setLocalProcessing(false) // Reset processing state
    setShowIncorrectAnimation(false) // Reset incorrect animation
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
    <div className="container mx-auto md:p-6 max-w-4xl">
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
        <div className="mb-4 px-4 md:px-0">
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
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-6">
          {videoId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Assignment Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
                  <div
                    id="youtube-player"
                    className="absolute top-0 left-0 w-full h-full"
                  />
                  
                  {/* Video pause overlay when recording */}
                  {videoIsPaused && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg z-10">
                      <div className="text-center text-white p-6">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                          <Mic className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Recording in Progress</h3>
                      </div>
                    </div>
                  )}
                </div>
                
                {assignment.videoTranscript && (
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowVideoTranscript(!showVideoTranscript)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {showVideoTranscript ? 'Hide' : 'Show'} Transcript
                    </Button>
                    
                    {showVideoTranscript && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                        <h4 className="font-medium mb-2">Video Transcript</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {assignment.videoTranscript}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Question Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Question {currentIndex + 1}</span>
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
                  {assignment.questions[currentIndex]?.textQuestion || 'No question text available'}
                </p>
              </div>

              {/* Microphone Control or Incorrect Animation - Hidden in viewing mode */}
              {!isViewingOnly && (
                <div className="flex items-center flex-col justify-center py-6">
                  {showIncorrectAnimation ? (
                    // Show incorrect Lottie animation instead of microphone
                    <IncorrectLottie onComplete={() => setShowIncorrectAnimation(false)} />
                  ) : (
                    // Show microphone button
                    <button
                      onClick={toggleRecording}
                      disabled={isProcessing || isCurrentQuestionCorrect}
                      className={`w-20 h-20 rounded-full transition-all shadow-lg flex items-center justify-center border-none ${
                        isCurrentQuestionCorrect 
                          ? 'bg-yellow-400 hover:bg-yellow-500'
                          : isRecording 
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                            : 'bg-blue-600 hover:bg-blue-700'
                      } ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      style={{
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        KhtmlUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <div className="flex items-center justify-center w-full h-full">
                        {isCurrentQuestionCorrect ? (
                          <Star className="w-10 h-10 text-white" fill="white" />
                        ) : isProcessing ? (
                          <Loader2 className="w-10 h-10 text-white animate-spin" />
                        ) : (
                          <Mic className="w-10 h-10 text-white" />
                        )}
                      </div>
                    </button>
                  )}
                  
                  {/* Audio level indicator when recording */}
                  {/* {isRecording && (
                    <div className="mt-4 flex flex-col items-center">
                      <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden border">
                        <div 
                          className="h-full bg-green-500 transition-all duration-100"
                          style={{ width: `${Math.min(audioLevel || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )} */}
                </div>
              )}

              {/* Feedback */}
              {/* {(showFeedback || isProcessing) && (
                              <AnswerFeedback
                isCorrect={isCorrect}
                feedback={feedback}
                show={showFeedback || isProcessing}
                isProcessing={isProcessing}
                details={details}
                encouragement={encouragement}
                ruleEvaluation={{}} // Empty for video assignments - evaluation criteria not used
                evaluationSettings={assignment.evaluationSettings?.feedbackSettings}
                userAnswer={currentTranscript}
              />
              )} */}
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
              <div className="flex items-center justify-between px-4">
                <span className="text-sm">Completed</span>
                <Badge variant="secondary">
                  {completedQuestions}/{totalQuestions}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-4">
                <span className="text-sm">Correct</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {studentProgress.filter(p => p.isCorrect).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-4">
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