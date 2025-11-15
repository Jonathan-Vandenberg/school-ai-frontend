"use client";

import React, { useState, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAudioAnalysisRecorder } from "@/hooks/use-audio-analysis-recorder";
import { 
  Mic, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Volume2,
  Loader2,
} from "lucide-react";

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

interface ReadingAssignmentPreviewProps {
  topic: string;
  questions: { text: string; title?: string }[];
  vocabularyLevel?: string;
  sentencesPerPage?: number;
}

export function ReadingAssignmentPreview({
  topic,
  questions,
  vocabularyLevel = "5",
  sentencesPerPage = 3,
}: ReadingAssignmentPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctQuestions, setCorrectQuestions] = useState<Set<number>>(new Set());
  const [incorrectQuestions, setIncorrectQuestions] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [details, setDetails] = useState('');
  const [encouragement, setEncouragement] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [localProcessing, setLocalProcessing] = useState(false);
  const [hasStartedAnyQuestion, setHasStartedAnyQuestion] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<any>(null);
  const [pronunciationResultsByQuestion, setPronunciationResultsByQuestion] = useState<Map<number, any>>(new Map());
  
  // Full text audio states
  const [fullTextAudioSrc, setFullTextAudioSrc] = useState<{[key: string]: string}>({});
  const [isPlayingFullText, setIsPlayingFullText] = useState(false);
  const fullTextAudioRef = useRef<HTMLAudioElement>(null);

  // Submit transcript for pronunciation analysis
  const submitTranscript = async (transcript: string, audioFile: File) => {
    console.log('📖 [READING PREVIEW] Starting submitTranscript')
    
    if (!questions[currentIndex]) {
      console.error('📖 [READING PREVIEW] No current question found')
      return
    }

    setLocalProcessing(true)
    setCurrentTranscript(transcript)
    
    try {
      const currentQuestion = questions[currentIndex]
      const expectedText = currentQuestion.text || ''
      
      console.log('📖 [READING PREVIEW] Question details:', {
        expectedTextLength: expectedText.length,
        transcript: transcript
      })
      
      let finalTranscript = transcript
      
      // If browser transcript is empty, get transcript from Whisper first
      if (!transcript || transcript.trim().length === 0) {
        console.log('📖 [READING PREVIEW] Browser transcript empty, getting Whisper transcript first')
        
        try {
          const whisperFormData = new FormData()
          whisperFormData.append('audioFile', audioFile)
          whisperFormData.append('languageCode', 'en-US')
          
          console.log('📖 [READING PREVIEW] Calling Whisper API for transcription')
          const whisperResponse = await fetch('/api/transcribe-whisper', {
            method: 'POST',
            body: whisperFormData,
          })
          
          if (whisperResponse.ok) {
            const whisperResult = await whisperResponse.json()
            finalTranscript = whisperResult.transcript || ''
            console.log('📖 [READING PREVIEW] Whisper transcript received:', {
              length: finalTranscript.length,
              preview: finalTranscript.substring(0, 50) + '...'
            })
          } else {
            console.error('📖 [READING PREVIEW] Whisper API failed:', whisperResponse.status)
            throw new Error('Failed to get Whisper transcript')
          }
        } catch (whisperError) {
          console.error('📖 [READING PREVIEW] Whisper transcription error:', whisperError)
          throw new Error('Speech recognition failed and Whisper fallback also failed')
        }
      }
      
      // Now send the final transcript (either browser or Whisper) to analysis
      console.log('📖 [READING PREVIEW] Sending analysis request with final transcript:', {
        transcriptSource: transcript.trim().length > 0 ? 'browser' : 'whisper',
        transcriptLength: finalTranscript.length
      })
      
      const formData = new FormData()
      formData.append('audioFile', audioFile)
      formData.append('browserTranscript', finalTranscript)
      formData.append('analysisType', 'READING')
      formData.append('expectedText', expectedText)
      
      console.log('📖 [READING PREVIEW] Making API call to /api/analysis/scripted with final transcript')
      const response = await fetch('/api/analysis/scripted', {
        method: 'POST',
        body: formData,
      })

      console.log('📖 [READING PREVIEW] API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('📖 [READING PREVIEW] API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error('Failed to analyze pronunciation')
      }

      const responseData = await response.json()
      console.log('📖 [READING PREVIEW] API response received:', {
        hasAnalysis: !!responseData.analysis,
        analysisKeys: responseData.analysis ? Object.keys(responseData.analysis) : []
      })
      
      const { analysis } = responseData
      
      // Determine correctness based on actual score instead of binary flag
      const actualScore = analysis.pronunciationResult?.overall_score || 0
      const isCorrectBasedOnScore = actualScore >= 80 // 80% threshold for "correct"
      
      console.log('📖 [READING PREVIEW] Processing analysis results:', {
        actualScore: actualScore,
        isCorrectBasedOnScore: isCorrectBasedOnScore,
        feedbackLength: analysis.feedback?.length || 0,
        hasEncouragement: !!analysis.encouragement,
        hasPronunciationResult: !!analysis.pronunciationResult
      })
      
      // Set all the feedback states
      setIsCorrect(isCorrectBasedOnScore)
      // Track which questions are correct or incorrect
      if (isCorrectBasedOnScore) {
        setCorrectQuestions(prev => new Set(prev).add(currentIndex))
        // Remove from incorrect if it was there
        setIncorrectQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(currentIndex)
          return newSet
        })
      } else {
        setIncorrectQuestions(prev => new Set(prev).add(currentIndex))
        // Remove from correct if it was there
        setCorrectQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(currentIndex)
          return newSet
        })
      }
      setFeedback(analysis.feedback)
      setEncouragement(analysis.encouragement || '')
      setPronunciationResult(analysis.pronunciationResult)
      // Store pronunciation result for this question so it persists when switching
      setPronunciationResultsByQuestion(prev => new Map(prev).set(currentIndex, analysis.pronunciationResult))
      setShowFeedback(true)
      setHasStartedAnyQuestion(true)
      
      console.log('📖 [READING PREVIEW] Analysis completed successfully')
      
      // Show confetti for correct answers
      if (isCorrectBasedOnScore) {
        console.log('📖 [READING PREVIEW] Triggering success animation for correct answer')
        const button = document.querySelector('button[disabled]') as HTMLElement
        if (button) {
          button.style.animation = 'bounce 0.6s ease-in-out'
          setTimeout(() => {
            button.style.animation = ''
          }, 600)
        }
      }
      
    } catch (error) {
      console.error('📖 [READING PREVIEW] Error in submitTranscript:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      setFeedback('Error processing your pronunciation. Please try again.')
      setIsCorrect(false)
      setShowFeedback(true)
      setPronunciationResult(null)
    } finally {
      console.log('📖 [READING PREVIEW] submitTranscript completed, clearing processing states')
      setLocalProcessing(false)
      clearProcessing() // Clear the audio recorder processing state
    }
  }

  // Function to play the full correct answer
  const playFullCorrectAnswer = async () => {
    try {
      const currentQuestion = questions[currentIndex]
      const questionText = currentQuestion?.text || ''
      
      if (!questionText.trim()) return
      
      // If already playing, don't start again
      if (isPlayingFullText) return
      
      // Create a cache key for this question
      const cacheKey = `question_${currentIndex}`
      
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
    clearProcessing,
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
    // Don't reset isCorrect here - it should reflect the current question's status
    setDetails('')
    setEncouragement('')
    setCurrentTranscript('')
    // Don't reset pronunciationResult here - restore it from stored results if available
    setLocalProcessing(false) // Reset processing state
  }

  const clearFeedbackAndResetRecorder = () => {
    clearFeedbackState()
    resetRecorder() // Only reset recorder when explicitly needed
  }

  // Reset only feedback states when question changes (not recorder)
  useEffect(() => {
    clearFeedbackState()
    // Update isCorrect to reflect the current question's status
    setIsCorrect(correctQuestions.has(currentIndex))
    // Restore pronunciation result for this question if it exists
    const storedResult = pronunciationResultsByQuestion.get(currentIndex)
    if (storedResult) {
      setPronunciationResult(storedResult)
      setShowFeedback(true)
    } else {
      setPronunciationResult(null)
    }
  }, [currentIndex, correctQuestions, pronunciationResultsByQuestion])

  // Debug: Log audio level changes
  useEffect(() => {
    if (isRecording) {
      console.log('Preview audioLevel:', audioLevel?.toFixed(1) || 'undefined', '%', 'Type:', typeof audioLevel)
    }
  }, [audioLevel, isRecording])

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
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

  if (!questions || questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No passages available for this assignment.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get vocabulary level description
  const getVocabularyLevelDescription = (level: string) => {
    const levels: Record<string, string> = {
      "1": "Kindergarten",
      "2": "Grade 1",
      "3": "Grade 2",
      "4": "Grade 3-4",
      "5": "Grade 5-6",
      "6": "Grade 7-8",
      "7": "Grade 9-10",
      "8": "Grade 11-12",
      "9": "College Prep",
      "10": "Advanced",
    };
    return levels[level] || "Grade 5-6";
  };

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="mb-6">
        {/* Overall Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Overall Progress</span>
            <span>{currentIndex + 1}/{questions.length} passages</span>
          </div>
          <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
        </div>

        {/* Question Navigation */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {questions.map((question, index) => {
            const isQuestionCorrect = correctQuestions.has(index)
            const isQuestionIncorrect = incorrectQuestions.has(index)
            return (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  clearFeedbackAndResetRecorder()
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  isQuestionCorrect
                    ? 'bg-green-500 text-white'
                    : isQuestionIncorrect
                      ? 'bg-red-200 text-red-700'
                      : hasStartedAnyQuestion
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-blue-100 text-blue-800'
                } ${
                  currentIndex === index ? 'ring-4 ring-blue-300' : ''
                }`}
              >
                {isQuestionCorrect ? <Star className="h-4 w-4" fill="currentColor" /> : index + 1}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-4 space-y-6">
          {/* Question Card */}
          <div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Passage {currentIndex + 1}</span>
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
                    disabled={currentIndex === questions.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg relative">
                <p className="text-lg">
                  {questions[currentIndex]?.text || 'No passage text available'}
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
                    isCorrect 
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
              <CardTitle>Preview Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between px-4">
                <span className="text-sm">Current Passage</span>
                <Badge variant="secondary">
                  {currentIndex + 1}/{questions.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-4">
                <span className="text-sm">Status</span>
                <Badge variant={isCorrect ? "default" : "outline"} className={isCorrect ? "bg-green-100 text-green-800" : ""}>
                  {isCorrect ? "Completed" : "In Progress"}
                </Badge>
              </div>
              {pronunciationResult && (
                <div className="flex items-center justify-between px-4">
                  <span className="text-sm">Score</span>
                  <Badge variant="outline">
                    {Math.round(pronunciationResult.overall_score)}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
