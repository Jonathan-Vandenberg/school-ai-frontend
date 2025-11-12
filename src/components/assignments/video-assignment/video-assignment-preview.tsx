"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Mic, Play, Volume2, Loader2, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Progress } from "@/components/ui/progress";
import { AnswerFeedback } from "@/components/ui/answer-feedback";
import IncorrectLottie from "@/components/ui/incorrect-lottie";

interface VideoAssignmentPreviewProps {
  topic: string;
  videoUrl: string;
  questions: { text: string; answer: string }[];
  transcriptContent?: string | null;
  levels?: Array<{
    levelType: string;
    cefrLevel?: string;
    gradeLevel?: string;
  }>;
}

function getYouTubeVideoId(url: string) {
  let videoId = "";
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "youtu.be") {
      videoId = urlObj.pathname.slice(1);
    } else if (
      urlObj.hostname === "www.youtube.com" ||
      urlObj.hostname === "youtube.com"
    ) {
      videoId = urlObj.searchParams.get("v") || "";
    }
  } catch (e) {
    console.error("Invalid URL for YouTube video");
    return null;
  }
  return videoId;
}

export function VideoAssignmentPreview({
  topic,
  videoUrl,
  questions,
  transcriptContent,
  levels = [],
}: VideoAssignmentPreviewProps) {
  const videoId = getYouTubeVideoId(videoUrl);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<
      number,
      {
        transcript: string;
        isCorrect: boolean;
        feedback: string;
        details: string;
        encouragement: string;
      }
    >
  >({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [showIncorrectAnimation, setShowIncorrectAnimation] = useState(false);

  // Submit transcript for evaluation (simulated for preview)
  const submitTranscript = async (transcript: string) => {
    if (!questions[currentIndex]) return;

    setIsEvaluating(true);
    setCurrentTranscript(transcript);

    try {
      const currentQuestion = questions[currentIndex];

      // Simulate AI evaluation for preview mode
      const response = await fetch("/api/evaluate-video-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: transcript,
          videoUrl: videoUrl,
          question: {
            question: currentQuestion.text,
            answer: currentQuestion.answer,
          },
          rules: [],
          feedbackSettings: {
            detailedFeedback: true,
            encouragementEnabled: true,
          },
          transcriptContent: transcriptContent,
          language: {
            code: "en-US",
            name: "English",
          },
          topic: topic,
          levels: levels,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to evaluate answer");
      }

      const { feedback, isCorrect, details, encouragement } =
        await response.json();

      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: {
          transcript,
          isCorrect,
          feedback,
          details,
          encouragement,
        },
      }));

      setShowFeedback(true);
      
      // Show incorrect animation if answer is wrong
      if (!isCorrect) {
        setShowIncorrectAnimation(true);
      }
    } catch (error) {
      console.error("Error evaluating answer:", error);
      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: {
          transcript,
          isCorrect: false,
          feedback: "Error processing your answer in preview mode.",
          details: "",
          encouragement: "Keep practicing!",
        },
      }));
      setShowFeedback(true);
      setShowIncorrectAnimation(true);
    } finally {
      setIsEvaluating(false);
      clearProcessing();
    }
  };

  // Audio recorder hook
  const {
    isRecording,
    isProcessing: recorderIsProcessing,
    toggleRecording,
    audioLevel,
    isSpeaking,
    reset: resetRecorder,
    clearProcessing,
  } = useAudioRecorder({
    languageCode: "en-US",
    onTranscriptionStart: () => {
      setShowFeedback(false);
      setCurrentTranscript("");
    },
    onTranscriptionComplete: (transcript: string) => {
      submitTranscript(transcript);
    },
    onTranscriptionError: (error: Error) => {
      console.error("Transcription error:", error);
      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: {
          transcript: "",
          isCorrect: false,
          feedback: "Voice recognition error. Please try again.",
          details: "",
          encouragement:
            "Make sure your microphone is working and try speaking clearly.",
        },
      }));
      setShowFeedback(true);
    },
  });

  const currentAnswer = answers[currentIndex];
  const isCurrentQuestionComplete = !!currentAnswer;
  const isCurrentQuestionCorrect = currentAnswer?.isCorrect || false;

  // Calculate overall progress
  const completedQuestions = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const overallProgress =
    totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

  const clearFeedbackState = () => {
    setShowFeedback(false);
    setCurrentTranscript("");
    setShowIncorrectAnimation(false);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      clearFeedbackState();
      resetRecorder();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      clearFeedbackState();
      resetRecorder();
    }
  };

  const retryCurrentQuestion = () => {
    setAnswers((prev) => {
      const newAnswers = { ...prev };
      delete newAnswers[currentIndex];
      return newAnswers;
    });
    clearFeedbackState();
    resetRecorder();
  };

  const currentQuestion = questions[currentIndex];
  const isProcessing = recorderIsProcessing || isEvaluating;

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      {/* <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between text-base font-semibold">
              <span className="text-emerald-900 dark:text-emerald-100">Overall Progress</span>
              <span className="text-emerald-700 dark:text-emerald-300">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="w-full h-3" />
          </div>
        </CardContent>
      </Card> */}

      {/* Video Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Assignment Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videoId ? (
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <p className="text-red-500">Invalid YouTube URL provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Current Question */}
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
                disabled={currentIndex >= totalQuestions - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-lg">{currentQuestion?.text}</p>
          </div>

          {/* Voice Recording Interface or Incorrect Animation */}
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

          {/* Current Transcript */}
          {/* {currentTranscript && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Your response:</strong> {currentTranscript}
              </p>
            </div>
          )} */}

        </CardContent>
      </Card>

      {/* Summary */}
      {completedQuestions === totalQuestions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Preview Complete!
            </CardTitle>
            <CardDescription>
              You've experienced all questions in this assignment preview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Questions:</span>{" "}
                {totalQuestions}
              </div>
              <div>
                <span className="font-medium">Completed:</span>{" "}
                {completedQuestions}
              </div>
              <div>
                <span className="font-medium">Correct Answers:</span>{" "}
                {Object.values(answers).filter((a) => a.isCorrect).length}
              </div>
              <div>
                <span className="font-medium">Accuracy:</span>{" "}
                {Math.round(
                  (Object.values(answers).filter((a) => a.isCorrect).length /
                    completedQuestions) *
                    100
                )}
                %
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
