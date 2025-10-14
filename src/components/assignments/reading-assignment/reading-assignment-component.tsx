'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  ArrowLeft,
  Volume2,
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// Enhanced Word Display Component with hover tooltips and speaker functionality
function WordDisplayWithTooltip({ word, accent = 'US', assignmentType = 'READING' }: { word: any, accent?: string, assignmentType?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const wordRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get word container color based on word score
  const getWordContainerColor = () => {
    const score = word.word_score || 0;
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // Get color for an individual phoneme
  const getPhonemeColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const score = word.word_score || 0;
  const wordText = word.word_text || '';
  const phonemes = word.phonemes || [];

  // Position the tooltip when visible
  useEffect(() => {
    if (showTooltip && wordRef.current) {
      const rect = wordRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10, // Position above the word
        left: rect.left + rect.width / 2 // Center horizontally
      });
    }
  }, [showTooltip]);

  // Function to play the word pronunciation
  const playWordPronunciation = async () => {
    try {
      // If already playing, don't start again
      if (isPlaying) return;
      
      // If we already have the audio, just play it
      if (audioSrc && audioRef.current) {
        console.log('Playing cached audio for:', wordText);
        audioRef.current.src = audioSrc;
        audioRef.current.currentTime = 0;
        setIsPlaying(true);
        
        try {
          await audioRef.current.play();
          
          // Set a timeout as fallback in case onEnded doesn't fire
          timeoutRef.current = setTimeout(() => {
            setIsPlaying(false);
          }, 10000); // 10 second timeout
        } catch (error) {
          console.error("Play failed:", error);
          setIsPlaying(false);
        }
        return;
      }
      
      // Set playing state before fetching to show loading indicator
      setIsPlaying(true);
      
      const response = await fetch('/api/text-to-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: wordText,
          accent: accent
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get audio');
      }
      
      const data = await response.json();
      
      // Create URL directly from base64 data
      const url = `data:audio/mp3;base64,${data.audio}`;
      setAudioSrc(url);
      
      // Play the audio directly
      if (audioRef.current) {
        const audio = audioRef.current;
        audio.src = url;
        
        // Use a promise to handle the play operation
        try {
          await audio.play();
          
          // Set a timeout as fallback in case onEnded doesn't fire
          timeoutRef.current = setTimeout(() => {
            console.log('Audio timeout for word:', wordText);
            setIsPlaying(false);
          }, 10000); // 10 second timeout
        } catch (err) {
          console.error("Error playing audio:", err);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('Error playing word pronunciation:', error);
      setIsPlaying(false);
    }
  };

  // Handle audio end
  const handleAudioEnd = () => {
    setIsPlaying(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Custom speaker cursor styles
  const microphoneCursorStyle = {
    cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07'></path></svg>"), pointer`,
  };

  return (
    <>
      <div 
        ref={wordRef}
        className={`text-sm border px-3 py-2 rounded-md relative group ${getWordContainerColor()} hover:bg-opacity-80 transition-all`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={playWordPronunciation}
        style={microphoneCursorStyle}
      >
        <span className="font-medium">{wordText}</span>
        {assignmentType !== 'READING' && <span className="text-xs text-gray-500 ml-1">
          ({Math.round(score)}%)
        </span>}
        
        {/* Hidden audio element */}
        <audio 
          ref={audioRef}
          onEnded={handleAudioEnd}
          onError={handleAudioEnd}
          preload="none"
          className="hidden"
        />
      </div>

      {/* Tooltip */}
      {showTooltip && assignmentType !== 'READING' && (
        <div 
          className="fixed bg-gray-800 text-white p-0 rounded-lg text-xs z-[9999] w-48 shadow-lg"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex flex-col max-h-[300px] overflow-y-auto">
            <div className="p-3 pb-2">
              <span className="font-semibold">Word Score: {Math.round(score)}%</span>
              
              {phonemes.length > 0 && (
                <>
                  <span className="block mt-2 font-semibold">Phoneme Scores:</span>
                  <div className="flex flex-col space-y-1 mt-1">
                    {phonemes.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={getPhonemeColor(p.phoneme_score)}>{p.ipa_label}</span>
                        <span>{Math.round(p.phoneme_score)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {isPlaying && (
                <div className="text-blue-300 flex items-center gap-1 mt-2 animate-pulse">
                  <Volume2 size={14} />
                  <span>Playing...</span>
                </div>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-t-8 border-l-8 border-r-8 border-gray-800 border-l-transparent border-r-transparent"></div>
        </div>
      )}
    </>
  );
}

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
  languageConfidenceResponse: any
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
  
  // Full text audio states
  const [fullTextAudioSrc, setFullTextAudioSrc] = useState<{[key: string]: string}>({})
  const [isPlayingFullText, setIsPlayingFullText] = useState(false)
  const fullTextAudioRef = useRef<HTMLAudioElement>(null)

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
    console.log('📖 [READING] Starting submitTranscript')
    console.log('📖 [READING] Input parameters:', {
      transcriptLength: transcript.length,
      audioFileSize: audioFile.size,
      audioFileName: audioFile.name,
      audioFileType: audioFile.type
    })
    
    if (!assignment.questions[currentIndex]) {
      console.error('📖 [READING] No current question found')
      return
    }

    setLocalProcessing(true)
    setCurrentTranscript(transcript)
    
    try {
      const currentQuestion = assignment.questions[currentIndex]
      const expectedText = currentQuestion.textAnswer || ''
      
      console.log('📖 [READING] Question details:', {
        questionId: currentQuestion.id,
        expectedTextLength: expectedText.length,
        transcript: transcript
      })
      
      let finalTranscript = transcript
      
      // If browser transcript is empty, get transcript from Whisper first
      if (!transcript || transcript.trim().length === 0) {
        console.log('📖 [READING] Browser transcript empty, getting Whisper transcript first')
        
        try {
          const whisperFormData = new FormData()
          whisperFormData.append('audioFile', audioFile)
          whisperFormData.append('languageCode', 'en-US')
          
          console.log('📖 [READING] Calling Whisper API for transcription')
          const whisperResponse = await fetch('/api/transcribe-whisper', {
            method: 'POST',
            body: whisperFormData,
          })
          
          if (whisperResponse.ok) {
            const whisperResult = await whisperResponse.json()
            finalTranscript = whisperResult.transcript || ''
            console.log('📖 [READING] Whisper transcript received:', {
              length: finalTranscript.length,
              preview: finalTranscript.substring(0, 50) + '...'
            })
          } else {
            console.error('📖 [READING] Whisper API failed:', whisperResponse.status)
            throw new Error('Failed to get Whisper transcript')
          }
        } catch (whisperError) {
          console.error('📖 [READING] Whisper transcription error:', whisperError)
          throw new Error('Speech recognition failed and Whisper fallback also failed')
        }
      }
      
      // Now send the final transcript (either browser or Whisper) to analysis
      console.log('📖 [READING] Sending analysis request with final transcript:', {
        transcriptSource: transcript.trim().length > 0 ? 'browser' : 'whisper',
        transcriptLength: finalTranscript.length
      })
      
      const formData = new FormData()
      formData.append('audioFile', audioFile)
      formData.append('browserTranscript', finalTranscript)
      formData.append('analysisType', 'READING')
      formData.append('expectedText', expectedText)
      
      console.log('📖 [READING] Making API call to /api/analysis/scripted with final transcript')
      const response = await fetch('/api/analysis/scripted', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type for FormData - let browser set it with boundary
      })

      console.log('📖 [READING] API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('📖 [READING] API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error('Failed to analyze pronunciation')
      }

      const responseData = await response.json()
      console.log('📖 [READING] API response received:', {
        hasAnalysis: !!responseData.analysis,
        analysisKeys: responseData.analysis ? Object.keys(responseData.analysis) : []
      })
      
      const { analysis } = responseData
      
      // Determine correctness based on actual score instead of binary flag
      const actualScore = analysis.pronunciationResult?.overall_score || 0
      const isCorrectBasedOnScore = actualScore >= 80 // 80% threshold for "correct"
      
      console.log('📖 [READING] Processing analysis results:', {
        actualScore: actualScore,
        isCorrectBasedOnScore: isCorrectBasedOnScore,
        feedbackLength: analysis.feedback?.length || 0,
        hasEncouragement: !!analysis.encouragement,
        hasPronunciationResult: !!analysis.pronunciationResult
      })
      
      // Set all the feedback states
      setIsCorrect(isCorrectBasedOnScore)
      setFeedback(analysis.feedback)
      setEncouragement(analysis.encouragement || '')
      setPronunciationResult(analysis.pronunciationResult)
      setShowFeedback(true)
      
      console.log('📖 [READING] Updating progress for question:', currentQuestion.id)
      
      // Update progress with score-based correctness
      await onProgressUpdate(currentQuestion.id, isCorrectBasedOnScore, {
        result: analysis,
        actualScore: actualScore, // Include actual score in the result
        timestamp: new Date().toISOString()
      }, 'READING')
      
      console.log('📖 [READING] Progress update completed')
      
      // Show confetti for correct answers
      if (isCorrectBasedOnScore) {
        console.log('📖 [READING] Triggering success animation for correct answer')
        const button = document.querySelector('button[disabled]') as HTMLElement
        if (button) {
          button.style.animation = 'bounce 0.6s ease-in-out'
          setTimeout(() => {
            button.style.animation = ''
          }, 600)
        }
      }
      
    } catch (error) {
      console.error('📖 [READING] Error in submitTranscript:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      setFeedback('Error processing your pronunciation. Please try again.')
      setIsCorrect(false)
      setShowFeedback(true)
      setPronunciationResult(null)
    } finally {
      console.log('📖 [READING] submitTranscript completed, clearing processing states')
      setLocalProcessing(false)
      clearProcessing() // Clear the audio recorder processing state
    }
  }

  // Function to play the full correct answer
  const playFullCorrectAnswer = async () => {
    try {
      const currentQuestion = assignment.questions[currentIndex]
      const questionText = currentQuestion?.textAnswer || ''
      
      if (!questionText.trim()) return
      
      // If already playing, don't start again
      if (isPlayingFullText) return
      
      // Create a cache key for this question
      const cacheKey = `question_${currentQuestion.id}`
      
      // If we already have the audio cached, just play it
      if (fullTextAudioSrc[cacheKey] && fullTextAudioRef.current) {
        fullTextAudioRef.current.src = fullTextAudioSrc[cacheKey]
        fullTextAudioRef.current.currentTime = 0
        setIsPlayingFullText(true)
        
        const playPromise = fullTextAudioRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Playback started successfully
            })
            .catch(error => {
              console.error("Play failed:", error)
              setIsPlayingFullText(false)
            })
        }
        return
      }
      
      // Set playing state before fetching
      setIsPlayingFullText(true)
      
      const response = await fetch('/api/text-to-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: questionText,
          accent: 'US'
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to get audio')
      }
      
      const data = await response.json()
      
      // Create URL directly from base64 data
      const url = `data:audio/mp3;base64,${data.audio}`
      
      // Cache the audio
      setFullTextAudioSrc(prev => ({
        ...prev,
        [cacheKey]: url
      }))
      
      // Play the audio
      if (fullTextAudioRef.current) {
        const audio = fullTextAudioRef.current
        audio.src = url
        
        const playWhenReady = () => {
          audio.play().catch(err => {
            console.error("Error playing audio:", err)
            setIsPlayingFullText(false)
          })
          audio.removeEventListener('canplaythrough', playWhenReady)
        }
        
        audio.addEventListener('canplaythrough', playWhenReady)
        audio.load()
      }
    } catch (error) {
      console.error('Error playing full correct answer:', error)
      setIsPlayingFullText(false)
    }
  }

  // Handle full text audio end
  const handleFullTextAudioEnd = () => {
    setIsPlayingFullText(false)
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
    
    // Load saved results if this question was already completed
    const currentQuestion = assignment.questions[currentIndex]
    const savedProgress = studentProgress.find(p => p.questionId === currentQuestion.id)
    
    if (savedProgress?.languageConfidenceResponse?.result?.result) {
      const savedResult = savedProgress.languageConfidenceResponse.result.result
      
      // Load saved analysis data
      setIsCorrect(savedResult.isCorrect || false)
      setFeedback(savedResult.feedback || '')
      setEncouragement(savedResult.encouragement || '')
      setPronunciationResult(savedResult.pronunciationResult || null)
      setCurrentTranscript(savedResult.predictedText || '')
      setShowFeedback(true)
    }
  }, [currentIndex, assignment.questions, studentProgress])

  // Debug: Log audio level changes
  useEffect(() => {
    if (isRecording) {
      console.log('Component audioLevel:', audioLevel?.toFixed(1) || 'undefined', '%', 'Type:', typeof audioLevel)
    }
  }, [audioLevel, isRecording])

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
        <div className="lg:col-span-2 space-y-6">
          {/* Question Card */}
          <div>
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
              <div className="p-4 bg-blue-50 rounded-lg relative">
                <p className="text-lg">
                  {assignment.questions[currentIndex]?.textAnswer || 'No question text available'}
                </p>
                
                {/* Speaker icon for full text - only show if answer is correct */}
                {isCorrect && (
                  <button
                    onClick={playFullCorrectAnswer}
                    disabled={isPlayingFullText}
                    className={`absolute bottom-2 right-2 p-2 rounded-full transition-all ${
                      isPlayingFullText 
                        ? 'bg-blue-200 text-blue-600 animate-pulse' 
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                    }`}
                    title="Listen to correct pronunciation"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
                
                {/* Hidden audio element for full text */}
                <audio 
                  ref={fullTextAudioRef}
                  onEnded={handleFullTextAudioEnd}
                  onError={handleFullTextAudioEnd}
                  preload="auto"
                  className="hidden"
                />
              </div>

              {/* Microphone Control */}
              <div className="text-center py-6">
                <div
                  onClick={isProcessing || pronunciationResult?.overall_score && Math.round(pronunciationResult?.overall_score) >= 95 ? undefined : toggleRecording}
                  className={`w-20 h-20 rounded-full transition-all shadow-lg flex items-center justify-center mx-auto ${
                    isCurrentQuestionCorrect 
                      ? 'bg-yellow-300'
                      : isRecording 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                        : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
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
                  {pronunciationResult?.overall_score && Math.round(pronunciationResult?.overall_score) >= 95 ? (
                    <Star className="w-8 h-8 text-white" fill="white" />
                  ) : isProcessing ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Mic className="w-8 h-8 text-white cursor-pointer" />
                  )}
                </div>
                
                {/* Audio level indicator when recording */}
                {isRecording && (
                  <div className="mt-3 flex justify-center items-center">
                    <div className="relative w-32 h-4 bg-gray-200 rounded-full border border-gray-300">
                      <div 
                        className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                        style={{ 
                          width: `${Math.max(0, Math.min(audioLevel || 0, 100))}%`,
                          transition: 'width 0.1s ease-out'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback */}
              {/* {(showFeedback || isProcessing) && (!pronunciationResult && !pronunciationResult?.words) && (
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
              )} */}

              {/* Pronunciation Results */}
              {pronunciationResult && pronunciationResult.words && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 px-4 md:px-0">Word-Level Analysis</h4>
                  <div className="bg-white rounded-lg md:border md:border-gray-200 shadow-sm p-4">
                    {/* Overall Score */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg md:border md:border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Overall Reading Score</span>
                        <span className="text-xl font-bold text-gray-800">
                          {Math.round(pronunciationResult.overall_score)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Word Display */}
                    <div className="flex flex-wrap gap-2">
                      {pronunciationResult.words.map((word: any, wordIndex: number) => (
                        <WordDisplayWithTooltip 
                          key={wordIndex} 
                          word={word} 
                          accent="US"
                          assignmentType="READING"
                        />
                      ))}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Score Range:</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-block px-2 py-1 rounded bg-green-50 border border-green-200 text-green-700">
                          80%+ Good
                        </span>
                        <span className="inline-block px-2 py-1 rounded bg-yellow-50 border border-yellow-200 text-yellow-700">
                          60-79% Fair
                        </span>
                        <span className="inline-block px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700">
                          &lt;60% Needs Practice
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
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