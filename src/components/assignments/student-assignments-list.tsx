"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, BookOpen, FileText, Calendar, Clock, Users, User, School, Star, CheckCircle } from "lucide-react";
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
  const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0;
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
  
  if (assignment.scheduledPublishAt && assignment.scheduledPublishAt > now) {
    return { status: 'scheduled', label: 'Scheduled', variant: 'secondary' as const };
  }
  
  if (!assignment.isActive) {
    return { status: 'inactive', label: 'Inactive', variant: 'secondary' as const };
  }

  if (isStudent) {
    const progress = getStudentProgress(assignment);
    
    if (progress.isFullyCompleted) {
      return { status: 'completed', label: 'Completed', variant: 'default' as const };
    } else if (progress.hasStarted) {
      return { status: 'in-progress', label: 'In Progress', variant: 'secondary' as const };
    }
  }
  
  return { status: 'available', label: 'Available', variant: 'default' as const };
};

const getButtonTextForStudent = (assignment: AssignmentWithDetails) => {
  const progress = getStudentProgress(assignment);
  if(progress.isPerfectScore) {
    return 'Review';
  } else if (progress.isFullyCompleted) {
    return 'Improve';
  } else if (progress.hasStarted) {
    return 'Continue';
  } else {
    return 'Start Assignment';
  }
};

function VideoThumbnail({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center rounded-l-lg">
        <Video className="h-6 w-6 text-white" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black rounded-t-lg sm:rounded-t-none sm:rounded-l-lg">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="128px"
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
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const cardStyle = getAssignmentCardStyle(assignment.evaluationSettings?.type);
        const isStudent = session?.user?.role === 'STUDENT';
        const statusInfo = getAssignmentStatus(assignment, isStudent);
        const progress = isStudent ? getStudentProgress(assignment) : null;
        const isVideoAssignment = assignment.evaluationSettings?.type === 'VIDEO' && assignment.videoUrl;
        const thumbnailUrl = isVideoAssignment ? getYouTubeThumbnail(assignment.videoUrl!) : null;
        
        return (
          <Card 
            key={assignment.id} 
            className={`overflow-hidden p-0 ${isTeacherOrAdmin ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={isTeacherOrAdmin ? () => handleAssignmentClick(assignment.id) : undefined}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Thumbnail/Icon Section - Completely out of flow */}
              <div className="relative aspect-video sm:w-32 md:w-40 flex-shrink-0">
                {isVideoAssignment && thumbnailUrl ? (
                  <VideoThumbnail 
                    src={thumbnailUrl} 
                    alt={`${assignment.topic} video thumbnail`}
                  />
                ) : (
                  <div className={`${cardStyle?.color?.bg} absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-t-lg sm:rounded-t-none sm:rounded-l-lg`}>
                    <div className={`${cardStyle?.color?.iconBg} w-10 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center`}>
                      {cardStyle?.icon && (
                        <cardStyle.icon className={`h-6 w-6 sm:h-6 sm:w-6 ${cardStyle?.color?.iconColor}`} />
                      )}
                    </div>
                    <p className={`${cardStyle?.color?.iconColor} text-sm font-medium`}>
                      {assignment.evaluationSettings?.type}
                    </p>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="flex-1 flex flex-col justify-between p-3 sm:py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold truncate">
                          {assignment.topic}
                        </h3>
                        {/* Gold star for perfect score (100% accuracy) */}
                        {progress?.isPerfectScore && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <Badge variant={statusInfo.variant} className="ml-2 flex-shrink-0 text-xs px-2 py-0.5">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    
                    {/* Assignment metadata - First row */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-1">
                    {assignment.classes && assignment.classes.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <School className="h-3 w-3" />
                          <span className="font-medium">
                            {assignment.classes.length === 1 
                              ? assignment.classes[0].class.name
                              : `${assignment.classes.length} classes`
                            }
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">{assignment.teacher?.username}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {assignment.type === 'CLASS' ? (
                          <>
                            <Users className="h-3 w-3" />
                            <span>Class Assignment</span>
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            <span>Individual</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Student Progress - Show for students only */}
                    {isStudent && progress && (
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs mb-1">
                        <div className="flex items-center space-x-1 text-blue-600">
                          <CheckCircle className="h-3 w-3" />
                          <span className="font-medium">
                            Progress: {progress.completed}/{progress.total} questions
                          </span>
                        </div>
                        {progress.completed > 0 && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <Star className="h-3 w-3" />
                            <span className="font-medium">
                              Accuracy: {progress.accuracy}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom row with dates and action button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                    {assignment.publishedAt && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Published {format(new Date(assignment.publishedAt), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {assignment.scheduledPublishAt && assignment.scheduledPublishAt > new Date() && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Available {format(new Date(assignment.scheduledPublishAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    )}
                    {assignment.dueDate && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span className={`${new Date(assignment.dueDate) < new Date() && !progress?.isFullyCompleted ? 'text-red-600 font-medium' : ''}`}>
                          Due {format(new Date(assignment.dueDate), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    )}
                    {assignment.questions && assignment.questions.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{assignment.questions.length} question{assignment.questions.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Show different buttons based on user role */}
                  <div className="flex-shrink-0 sm:ml-3">
                    {session?.user?.role === 'STUDENT' ? (
                      <>
                        {statusInfo.status === 'scheduled' ? (
                          <Button 
                            size="sm"
                            variant="outline" 
                            disabled
                            className="text-xs px-3 py-1.5 h-7 w-full sm:w-auto"
                          >
                            Not Yet Available
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={(e) => handleStartAssignment(e, assignment.id)}
                            className="text-xs px-3 py-1.5 h-7 w-full sm:w-auto"
                            variant={progress?.isFullyCompleted ? "outline" : "default"}
                          >
                            {getButtonTextForStudent(assignment)}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleStartAssignment(e, assignment.id)}
                        className="text-xs px-3 py-1.5 h-7 w-full sm:w-auto"
                      >
                        View Progress
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
} 