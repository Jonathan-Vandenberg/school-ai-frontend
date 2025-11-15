"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, BookOpen, Calendar, Clock, Users, User, School, Star, CheckCircle, Play, ArrowRight, Eye, Lock } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { AssignmentWithDetails } from "../../../lib/services/assignments.service";
import { assignmentTypes, AssignmentTypeDef } from "../../lib/assignment-types";

interface StudentAssignmentsListProps {
  assignments: AssignmentWithDetails[];
}

const getAssignmentCardStyle = (evaluationType?: string) => {
  switch (evaluationType) {
    case 'VIDEO':
      const videoCard = assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'VIDEO')?.colors;
      return {icon: assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'VIDEO')?.icon, color: videoCard};
    case 'READING':
      const readingCard = assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'READING')?.colors;
      return {icon: assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'READING')?.icon, color: readingCard};
    case 'PRONUNCIATION':
      const pronunciationCard = assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'PRONUNCIATION')?.colors;
      return {icon: assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'PRONUNCIATION')?.icon, color: pronunciationCard};
    case 'IMAGE':
      const imageCard = assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'IMAGE')?.colors;
      return {icon: assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'IMAGE')?.icon, color: imageCard};
    case 'IELTS':
      const ieltsCard = assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'IELTS')?.colors;
      return {icon: assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'IELTS')?.icon, color: ieltsCard};
    default:
      const customCard = assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'CUSTOM')?.colors;
      return {icon: assignmentTypes.find((type: AssignmentTypeDef) => type.id === 'CUSTOM')?.icon, color: customCard};
  }
};

const getYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

const getStudentProgress = (assignment: AssignmentWithDetails) => {
  if (!assignment.progresses || !assignment.questions) {
    return {
      completed: 0,
      total: assignment.questions?.length || 0,
      correct: 0,
      accuracy: 0,
      isFullyCompleted: false,
      hasStarted: false
    };
  }

  const totalQuestions = assignment.questions.length;
  const completedProgresses = assignment.progresses.filter(p => p.isComplete);
  
  // Count unique questions answered (not just progress records)
  const uniqueQuestionsAnswered = new Set(completedProgresses.map(p => p.questionId)).size;
  const correctProgresses = assignment.progresses.filter(p => p.isComplete && p.isCorrect);
  
  const completed = uniqueQuestionsAnswered;
  const correct = correctProgresses.length;
  
  // Calculate accuracy based on assignment type
  let accuracy = 0;
  const assignmentType = assignment.evaluationSettings?.type;
  
  if ((assignmentType === 'PRONUNCIATION' || assignmentType === 'READING') && completedProgresses.length > 0) {
    // Calculate average score from actual API results
    let totalScore = 0;
    let scoreCount = 0;
    
    completedProgresses.forEach(progress => {
      const actualScore = progress.languageConfidenceResponse?.result?.actualScore;
      if (typeof actualScore === 'number') {
        totalScore += actualScore;
        scoreCount++;
      } else {
        // Fallback to stored result data
        const overallScore = progress.languageConfidenceResponse?.result?.result?.pronunciationResult?.overall_score;
        if (typeof overallScore === 'number') {
          totalScore += overallScore;
          scoreCount++;
        }
      }
    });
    
    accuracy = scoreCount > 0 ? Math.round(totalScore / scoreCount) : Math.round((correct / completed) * 100);
  } else {
    // Use binary correct/incorrect for other assignment types
    accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0;
  }
  const isFullyCompleted = completed >= totalQuestions;
  const hasStarted = assignment.progresses.length > 0;

  return {
    completed,
    total: totalQuestions,
    correct,
    accuracy,
    isFullyCompleted,
    isPerfectScore: isFullyCompleted && accuracy === 100,
    hasStarted
  };
};

const getAssignmentStatus = (assignment: AssignmentWithDetails, isStudent: boolean = false) => {
  const now = new Date();

  // Determine the case for switch statement
  const getStatusCase = (): string => {
    if (assignment.scheduledPublishAt && assignment.scheduledPublishAt > now) {
      return 'scheduled';
    }
    
    if (!assignment.isActive) {
      return 'inactive';
    }

    if (isStudent) {
      const progress = getStudentProgress(assignment);
      
      if (progress.isPerfectScore) {
        return 'perfect';
      } else if (progress.isFullyCompleted) {
        return 'completed';
      } else if (progress.hasStarted) {
        return 'inProgress';
      } else {
        return 'notStarted';
      }
    }
    
    return 'available';
  };

  const statusCase = getStatusCase();

  switch (statusCase) {
    case 'scheduled':
      return { status: 'scheduled', label: 'Scheduled', variant: 'scheduled' as const };
    
    case 'inactive':
      return { status: 'inactive', label: 'Inactive', variant: 'inactive' as const };
    
    case 'perfect':
      return { status: 'perfect', label: 'Perfect', variant: 'perfect' as const };
    
    case 'completed':
      return { status: 'completed', label: 'Completed', variant: 'completed' as const };
    
    case 'inProgress':
      return { status: 'inProgress', label: 'In Progress', variant: 'inProgress' as const };
    
    case 'notStarted':
      return { status: 'notStarted', label: 'Not Started', variant: 'notStarted' as const };
    
    case 'available':
    default:
      return { status: 'available', label: 'Available', variant: 'available' as const };
  }
};

const getButtonConfig = (assignment: AssignmentWithDetails, statusInfo: ReturnType<typeof getAssignmentStatus>, progress: ReturnType<typeof getStudentProgress> | null) => {
  if (statusInfo.status === 'scheduled') {
    return {
      text: 'Scheduled',
      icon: Lock,
      variant: 'outline' as const,
      className: 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed',
      disabled: true
    };
  }

  if (statusInfo.status === 'inactive') {
    return {
      text: 'Inactive',
      icon: Lock,
      variant: 'outline' as const,
      className: 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed',
      disabled: true
    };
  }

  if (progress?.isPerfectScore) {
    return {
      text: 'Review Assignment',
      icon: Eye,
      variant: 'default' as const,
      className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
      disabled: false
    };
  }

  if (progress?.isFullyCompleted) {
    return {
      text: 'View Results',
      icon: CheckCircle,
      variant: 'default' as const,
      className: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600',
      disabled: false
    };
  }

  if (progress?.hasStarted) {
    return {
      text: 'Continue',
      icon: Play,
      variant: 'default' as const,
      className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
      disabled: false
    };
  }

  return {
    text: 'Start Assignment',
    icon: ArrowRight,
    variant: 'default' as const,
    className: 'bg-gray-900 hover:bg-gray-800 text-white border-gray-900',
    disabled: false
  };
};

function VideoThumbnail({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center rounded-t-lg sm:rounded-t-none sm:rounded-l-lg">
        <Video className="h-6 w-6 text-white" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden rounded-t-lg sm:rounded-t-none sm:rounded-l-lg">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 224px, (max-width: 1024px) 256px, 288px"
        onError={() => setImageError(true)}
        priority={false}
      />
    </div>
  );
}

export function StudentAssignmentsList({ assignments }: StudentAssignmentsListProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleAssignmentClick = (assignmentId: string) => {
    router.push(`/assignments/${assignmentId}`);
  };

  const handleStartAssignment = (e: React.MouseEvent, assignmentId: string) => {
    e.stopPropagation(); // Prevent the card click from firing
    router.push(`/assignments/${assignmentId}`);
  };

  if (assignments.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold">No assignments yet</h3>
              <p className="text-sm text-muted-foreground">
                {session?.user?.role === 'STUDENT' 
                  ? "Your teacher hasn't assigned any tasks yet. Check back later!"
                  : "No assignments have been created yet."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isTeacherOrAdmin = session?.user?.role === 'TEACHER' || session?.user?.role === 'ADMIN';

  return (
    <div className="space-y-4 mx-auto">
      {assignments.map((assignment: AssignmentWithDetails) => {
        const cardStyle = getAssignmentCardStyle(assignment.evaluationSettings?.type);
        const isStudent = session?.user?.role === 'STUDENT';
        const statusInfo = getAssignmentStatus(assignment, isStudent);
        const progress = isStudent ? getStudentProgress(assignment) : null;
        const isVideoAssignment = assignment.evaluationSettings?.type === 'VIDEO' && assignment.videoUrl;
        const thumbnailUrl = isVideoAssignment ? getYouTubeThumbnail(assignment.videoUrl!) : null;
        
        return (
          <div 
            key={assignment.id} 
            className={`overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300 transition-all ${isTeacherOrAdmin ? 'cursor-pointer hover:shadow-lg' : ''}`}
            onClick={isTeacherOrAdmin ? () => handleAssignmentClick(assignment.id) : undefined}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Thumbnail/Icon Section */}
              <div className="relative w-full aspect-video sm:w-64 md:w-80 lg:w-96 flex-shrink-0 sm:self-start">
                {isVideoAssignment && thumbnailUrl ? (
                  <VideoThumbnail 
                    src={thumbnailUrl} 
                    alt={`${assignment.topic} video thumbnail`}
                  />
                ) : (
                  <div className={`${cardStyle?.color?.bg} absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-t-lg sm:rounded-t-none sm:rounded-l-lg`}>
                    <div className={`${cardStyle?.color?.iconBg} w-10 h-10 rounded-full flex items-center justify-center shadow-sm`}>
                      {cardStyle?.icon && (
                        <cardStyle.icon className={`h-5 w-5 ${cardStyle?.color?.iconColor}`} />
                      )}
                    </div>
                    <p className={`${cardStyle?.color?.iconColor} text-xs font-semibold uppercase tracking-wide`}>
                      {assignment.evaluationSettings?.type}
                    </p>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="flex-1 flex flex-col p-4">
                {/* Header */}
                <div className="mb-2">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 mb-0.5 line-clamp-2">
                        {assignment.topic}
                      </h3>
                      {progress?.isPerfectScore && (
                        <div className="flex items-center gap-1 text-yellow-600 mt-0.5">
                          <Star className="h-3 w-3 fill-yellow-600" />
                          <span className="text-xs font-medium">Perfect Score</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar - Show for students with progress */}
                  {isStudent && progress && progress.total > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span className="font-medium">Progress</span>
                        <span className="font-semibold">{progress.completed}/{progress.total} questions</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            progress.isPerfectScore 
                              ? 'bg-emerald-600' 
                              : progress.isFullyCompleted 
                                ? 'bg-indigo-600' 
                                : progress.hasStarted 
                                  ? 'bg-blue-600' 
                                  : 'bg-gray-300'
                          }`}
                          style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                        />
                      </div>
                      {progress.completed > 0 && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">{progress.accuracy}%</span> accuracy
                          </span>
                          {progress.correct > 0 && (
                            <span className="text-gray-600">
                              <span className="font-semibold text-gray-900">{progress.correct}</span> correct
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-1.5 mb-2 text-sm text-gray-600">
                  <div className="flex flex-wrap items-center gap-3">
                    {assignment.classes && assignment.classes.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <School className="h-3 w-3 text-gray-400" />
                        <span className="text-xs">
                          {assignment.classes.length === 1 
                            ? assignment.classes[0].class.name
                            : `${assignment.classes.length} classes`
                          }
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-xs">{assignment.teacher?.username}</span>
                    </div>
                    
                    {assignment.type === 'CLASS' && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-xs">Class Assignment</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {assignment.publishedAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>Published {format(new Date(assignment.publishedAt), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    
                    {assignment.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <Clock className={`h-3 w-3 ${new Date(assignment.dueDate) < new Date() && !progress?.isFullyCompleted ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={new Date(assignment.dueDate) < new Date() && !progress?.isFullyCompleted ? 'text-red-600 font-medium' : ''}>
                          Due {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-auto pt-2">
                  {session?.user?.role === 'STUDENT' ? (
                    (() => {
                      const buttonConfig = getButtonConfig(assignment, statusInfo, progress);
                      const IconComponent = buttonConfig.icon;
                      return (
                        <Button 
                          size="sm"
                          variant={buttonConfig.variant}
                          onClick={(e) => !buttonConfig.disabled && handleStartAssignment(e, assignment.id)}
                          disabled={buttonConfig.disabled}
                          className={`w-full sm:w-auto ${buttonConfig.className} font-medium`}
                        >
                          <IconComponent className="h-3.5 w-3.5 mr-1.5" />
                          {buttonConfig.text}
                        </Button>
                      );
                    })()
                  ) : (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleStartAssignment(e, assignment.id)}
                      className="w-full sm:w-auto border-gray-300 hover:bg-gray-50 font-medium"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View Progress
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 