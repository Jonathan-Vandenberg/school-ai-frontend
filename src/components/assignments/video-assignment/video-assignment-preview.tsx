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
import { CheckCircle2, AlertCircle, Mic, Play, Volume2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Progress } from "@/components/ui/progress";
import { AnswerFeedback } from "@/components/ui/answer-feedback";

interface VideoAssignmentPreviewProps {
  topic: string;
  videoUrl: string;
  questions: { text: string; answer: string }[];
  transcriptContent?: string | null;
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
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Overall Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="w-full" />
      </div>

      {/* Video Player */}
      <Card>
        <CardHeader>
          <CardTitle>{topic}</CardTitle>
          <CardDescription>
            Watch the video below and answer the questions by speaking your
            responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videoId ? (
            <AspectRatio ratio={16 / 9}>
              <iframe
                className="rounded-lg w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </AspectRatio>
          ) : (
            <p className="text-red-500">Invalid YouTube URL provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <div className="flex items-center gap-2">
              {isCurrentQuestionComplete && (
                <Badge
                  variant={isCurrentQuestionCorrect ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isCurrentQuestionCorrect ? "Correct" : "Needs Improvement"}
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Speak your answer clearly. The system will record and evaluate your
            response.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg">
            <p className="font-medium text-lg">{currentQuestion?.text}</p>
          </div>

          {/* Voice Recording Interface */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Button
                onClick={toggleRecording}
                disabled={isProcessing}
                size="lg"
                className={`w-20 h-20 rounded-full transition-all duration-200 ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-primary hover:bg-primary/90"
                } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
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
                          audioLevel > i * 20 ? "h-3" : "h-1"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              {isRecording && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Recording...</span>
                  {isSpeaking && <Volume2 className="h-4 w-4" />}
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {recorderIsProcessing
                      ? "Processing speech..."
                      : "Evaluating answer..."}
                  </span>
                </div>
              )}

              {!isRecording && !isProcessing && (
                <p className="text-sm text-muted-foreground">
                  {isCurrentQuestionComplete
                    ? "Click the microphone to record a new answer"
                    : "Click the microphone to record your answer"}
                </p>
              )}
            </div>
          </div>

          {/* Current Transcript */}
          {currentTranscript && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Your response:</strong> {currentTranscript}
              </p>
            </div>
          )}

          {/* Answer Feedback */}
          {showFeedback && currentAnswer && (
            <div className="space-y-3">
              <AnswerFeedback
                isCorrect={currentAnswer.isCorrect}
                feedback={currentAnswer.feedback}
                show={showFeedback}
                isProcessing={false}
                details={currentAnswer.details}
                encouragement={currentAnswer.encouragement}
                ruleEvaluation={{}}
                evaluationSettings={{
                  detailedFeedback: true,
                  encouragementEnabled: true,
                }}
                userAnswer={currentAnswer.transcript}
              />
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
              Question {currentIndex + 1} of {totalQuestions}
            </div>

            <Button
              onClick={handleNext}
              disabled={currentIndex >= totalQuestions - 1}
            >
              Next
            </Button>
          </div>
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
