"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Mic, Volume2, Upload } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import IELTSResults from './ielts-results';

interface IELTSAssignmentPreviewProps {
  data: {
    topic: string;
    accent: string;
    subtype: string;
    questions?: Array<{
      text: string;
      topic?: string;
      expectedLevel: string;
    }>;
    passages?: Array<{
      text: string;
      title?: string;
    }>;
    context?: string;
  };
  onBack: () => void;
  onAccept: () => void;
}

export function IELTSAssignmentPreview({ data, onBack, onAccept }: IELTSAssignmentPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { 
    analysisResult: any; 
    isComplete: boolean; 
    audioUrl?: string;
  }>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [rawTranscription, setRawTranscription] = useState<string>('');
  const [speechRecognitionStatus, setSpeechRecognitionStatus] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Get all content items (questions or passages)
  const contentItems = data.subtype === 'question-answer' ? data.questions || [] : data.passages || [];
  const totalItems = contentItems.length;

  // Initialize Speech Recognition for raw transcription
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('🎤 Speech recognition not supported in this browser');
      setSpeechRecognitionStatus('Speech recognition not supported');
      return false;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setSpeechRecognitionStatus('Listening for raw transcription...');
        setRawTranscription('');
      };
      
      recognition.onresult = (event: any) => {
        console.log('🎤 Speech recognition result received', event);
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Keep all transcribed text (including filler words, hesitations)
        const newTranscription = finalTranscript + interimTranscript;
        if (newTranscription.trim()) {
          setRawTranscription(prev => {
            const updated = prev + finalTranscript + interimTranscript;
            console.log('🎤 Updated raw transcription:', updated);
            return updated;
          });
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('🎤 Speech recognition error:', event.error);
        setSpeechRecognitionStatus(`Speech recognition error: ${event.error}`);
        
        // Handle specific errors
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access for speech recognition.');
        } else if (event.error === 'network') {
          console.warn('🎤 Network error - speech recognition may not work offline');
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setSpeechRecognitionStatus('Speech recognition completed');
      };
      
      speechRecognitionRef.current = recognition;
      console.log('🎤 Speech recognition initialized successfully');
      return true;
    } catch (error) {
      console.error('🎤 Failed to initialize speech recognition:', error);
      setSpeechRecognitionStatus('Speech recognition initialization failed');
      return false;
    }
  }, []);

  const startSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        console.log('🎤 Starting speech recognition...');
        speechRecognitionRef.current.start();
      } catch (error) {
        console.error('🎤 Failed to start speech recognition:', error);
        setSpeechRecognitionStatus('Failed to start speech recognition');
      }
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        console.log('🎤 Stopping speech recognition...');
        speechRecognitionRef.current.stop();
      } catch (error) {
        console.error('🎤 Failed to stop speech recognition:', error);
      }
    }
  }, []);

  // Submit audio for analysis
  const submitForAnalysis = useCallback(async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setShowResults(false);

    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Determine the analysis endpoint and payload based on assignment type
      let endpoint = '';
      let payload: any = {
        audio_base64: base64Audio,
        audio_format: 'webm',
        accent: data.accent,
        raw_transcription: rawTranscription.trim() || '', // Include browser raw transcription
      };

      console.log('🎤 Raw transcription from browser:', rawTranscription.trim());

      if (data.subtype === 'question-answer') {
        endpoint = '/api/ielts/question-and-answer/analyze';
        const currentQuestion = data.questions?.[currentIndex];
        if (currentQuestion) {
          payload.question = currentQuestion.text;
          payload.expected_language_level = currentQuestion.expectedLevel;
        }
      } else if (data.subtype === 'pronunciation' || data.subtype === 'reading') {
        endpoint = `/api/ielts/${data.subtype}/analyze`;
        const currentPassage = data.passages?.[currentIndex];
        if (currentPassage) {
          payload.expected_text = currentPassage.text;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Store the result for this question/passage
      setAnswers(prev => ({
        ...prev,
        [currentIndex]: {
          analysisResult: result.data,
          isComplete: true,
          audioUrl: URL.createObjectURL(audioBlob)
        }
      }));

      setShowResults(true);
    } catch (error) {
      console.error('Error analyzing audio:', error);
      // Store error state
      setAnswers(prev => ({
        ...prev,
        [currentIndex]: {
          analysisResult: { error: 'Analysis failed. Please try again.' },
          isComplete: false,
        }
      }));
      setShowResults(true);
    } finally {
      setIsAnalyzing(false);
      clearProcessing();
    }
  }, [data, currentIndex]);

  // For IELTS, we need to handle audio capture manually since useAudioRecorder is designed for transcription
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const level = (average / 255) * 100;
          
          setAudioLevel(level);
          setIsSpeaking(level > 5);
          
          if (isRecording) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        }
      };

      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      // Reset transcription at the start of each recording
      setRawTranscription('');
      setSpeechRecognitionStatus('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      startAudioAnalysis(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop analysis and cleanup
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        stream.getTracks().forEach(track => track.stop());
        
        // Submit for analysis
        submitForAnalysis(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowResults(false);
      
      // Initialize and start speech recognition for raw transcription
      console.log('🎤 Initializing speech recognition...');
      if (initializeSpeechRecognition()) {
        setTimeout(() => {
          console.log('🎤 Starting speech recognition after delay...');
          startSpeechRecognition();
        }, 1000); // Small delay to ensure microphone is ready
      } else {
        console.warn('🎤 Speech recognition not available, continuing without raw transcription');
      }
      
      // Auto-stop recording after 2 minutes to prevent infinite recording
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Auto-stopping recording after 2 minutes');
          stopRecording();
        }
      }, 120000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setSpeechRecognitionStatus('Microphone access failed');
      alert('Error accessing microphone. Please check your permissions.');
    }
  }, [startAudioAnalysis, submitForAnalysis, initializeSpeechRecognition, startSpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop speech recognition
      stopSpeechRecognition();
      
      console.log('🎤 Final raw transcription:', rawTranscription);
    }
  }, [isRecording, stopSpeechRecognition, rawTranscription]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const resetRecorder = useCallback(() => {
    setIsRecording(false);
    setAudioLevel(0);
    setIsSpeaking(false);
    setRawTranscription('');
    setSpeechRecognitionStatus('');
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);

  const clearProcessing = useCallback(() => {
    // This is for compatibility with the video assignment pattern
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      submitForAnalysis(file);
    } else {
      alert('Please select a valid audio file.');
    }
  };

  // Navigation functions
  const handleNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowResults(false);
      resetRecorder();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowResults(false);
      resetRecorder();
    }
  };

  const retryCurrentQuestion = () => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[currentIndex];
      return newAnswers;
    });
    setShowResults(false);
    resetRecorder();
  };

  // Get current content
  const currentQuestion = data.subtype === 'question-answer' ? data.questions?.[currentIndex] : null;
  const currentPassage = (data.subtype === 'pronunciation' || data.subtype === 'reading') ? data.passages?.[currentIndex] : null;
  const currentAnswer = answers[currentIndex];
  const isCurrentQuestionComplete = !!currentAnswer?.isComplete;
  const isProcessing = isAnalyzing;

  // Calculate overall progress
  const completedQuestions = Object.keys(answers).length;
  const overallProgress = totalItems > 0 ? (completedQuestions / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Overall Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="w-full" />
      </div>

      {/* Assignment Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Preview: {data.topic}</span>
            <Button
              variant="ghost"
              onClick={onBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Form
            </Button>
          </CardTitle>
          <CardDescription>
            Test your assignment by recording yourself and seeing the analysis results.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Question/Passage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {data.subtype === 'question-answer' ? 'Question' : 'Passage'} {currentIndex + 1} of {totalItems}
            </span>
            <div className="flex items-center gap-2">
              {isCurrentQuestionComplete && (
                <Badge variant="default" className="text-xs">
                  Complete
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {data.subtype === 'question-answer' 
              ? 'Answer the question by speaking clearly.'
              : 'Read the passage aloud clearly and naturally.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Context for Q&A */}
          {data.subtype === 'question-answer' && data.context && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-1">Context</h4>
              <p className="text-sm text-blue-700">{data.context}</p>
            </div>
          )}

          {/* Question Content */}
          <div className="p-4 bg-secondary/50 rounded-lg">
            {currentQuestion && (
              <>
                <p className="font-medium text-lg">{currentQuestion.text}</p>
                {currentQuestion.expectedLevel && (
                  <p className="text-sm text-gray-600 mt-2">
                    Expected Level: {currentQuestion.expectedLevel}
                  </p>
                )}
              </>
            )}
            {currentPassage && (
              <>
                {currentPassage.title && (
                  <h4 className="font-medium text-lg mb-2">{currentPassage.title}</h4>
                )}
                <p className="text-gray-800 whitespace-pre-wrap">{currentPassage.text}</p>
              </>
            )}
          </div>

          {/* Voice Recording Interface */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Button
                onClick={toggleRecording}
                disabled={isAnalyzing}
                size="lg"
                className={`w-20 h-20 rounded-full transition-all duration-200 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-primary hover:bg-primary/90'
                } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Mic className="h-8 w-8" />
              </Button>
              
              {/* Audio Level Indicator */}
              {isRecording && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-white rounded-full transition-all duration-100 ${
                          audioLevel > (i * 20) ? 'h-3' : 'h-1'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              {isRecording && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Recording...</span>
                    {isSpeaking && <Volume2 className="h-4 w-4" />}
                  </div>
                  
                  {/* Speech Recognition Status */}
                  {speechRecognitionStatus && (
                    <div className="text-xs text-blue-600">
                      {speechRecognitionStatus}
                    </div>
                  )}
                  
                  {/* Raw Transcription Preview */}
                  {rawTranscription && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-w-md mx-auto">
                      <div className="font-medium mb-1">Live Transcription:</div>
                      <div className="text-left">{rawTranscription}</div>
                    </div>
                  )}
                </div>
              )}
              
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Analyzing...</span>
                </div>
              )}

              {!isRecording && !isAnalyzing && (
                <p className="text-sm text-muted-foreground">
                  {isCurrentQuestionComplete 
                    ? "Click the microphone to record a new answer" 
                    : "Click the microphone to record your answer"
                  }
                </p>
              )}
            </div>

            {/* File Upload Option */}
            <div className="text-center">
              <span className="text-sm text-gray-500">or</span>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Audio
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Results */}
          {showResults && currentAnswer && (
            <div className="space-y-3">
              {currentAnswer.analysisResult?.error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{currentAnswer.analysisResult.error}</p>
                </div>
              ) : (
                <IELTSResults
                  response={currentAnswer.analysisResult}
                  type={data.subtype as 'question-answer' | 'pronunciation' | 'reading'}
                  accent={data.accent}
                  className="border rounded-lg p-4"
                />
              )}
              
              <Button 
                variant="outline" 
                onClick={retryCurrentQuestion}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              {data.subtype === 'question-answer' ? 'Question' : 'Passage'} {currentIndex + 1} of {totalItems}
            </div>

            <Button 
              onClick={handleNext}
              disabled={currentIndex >= totalItems - 1}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {completedQuestions === totalItems && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-5 h-5 text-green-600">✓</div>
              Preview Complete!
            </CardTitle>
            <CardDescription>
              You've tested all {data.subtype === 'question-answer' ? 'questions' : 'passages'} in this assignment preview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="font-medium">Total {data.subtype === 'question-answer' ? 'Questions' : 'Passages'}:</span> {totalItems}
              </div>
              <div>
                <span className="font-medium">Completed:</span> {completedQuestions}
              </div>
            </div>
            <Button onClick={onAccept} className="w-full" size="lg">
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {completedQuestions < totalItems && (
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            size="lg"
          >
            Back to Edit
          </Button>
          <Button
            onClick={onAccept}
            size="lg"
          >
            Create Assignment
          </Button>
        </div>
      )}
    </div>
  );
}
