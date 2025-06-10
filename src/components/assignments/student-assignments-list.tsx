"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, BookOpen, Mic, Image as ImageIcon, FileText, Settings, Calendar, Clock, Users, User } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { AssignmentWithDetails } from "../../../lib/services/assignments.service";

interface StudentAssignmentsListProps {
  assignments: AssignmentWithDetails[];
}

const getAssignmentIcon = (evaluationType?: string) => {
  switch (evaluationType) {
    case 'VIDEO':
      return Video;
    case 'READING':
      return BookOpen;
    case 'PRONUNCIATION':
      return Mic;
    case 'IMAGE':
      return ImageIcon;
    case 'IELTS':
      return FileText;
    default:
      return Settings;
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

const getAssignmentStatus = (assignment: AssignmentWithDetails) => {
  const now = new Date();
  
  if (assignment.scheduledPublishAt && assignment.scheduledPublishAt > now) {
    return { status: 'scheduled', label: 'Scheduled', variant: 'secondary' as const };
  }
  
  if (!assignment.isActive) {
    return { status: 'inactive', label: 'Inactive', variant: 'secondary' as const };
  }
  
  // Here you would check if the student has completed the assignment
  // For now, we'll assume all active assignments are available
  return { status: 'available', label: 'Available', variant: 'default' as const };
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

  const handleStartAssignment = (assignmentId: string) => {
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
                Your teacher hasn't assigned any tasks yet. Check back later!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const Icon = getAssignmentIcon(assignment.evaluationSettings?.type);
        const statusInfo = getAssignmentStatus(assignment);
        const isVideoAssignment = assignment.evaluationSettings?.type === 'VIDEO' && assignment.videoUrl;
        const thumbnailUrl = isVideoAssignment ? getYouTubeThumbnail(assignment.videoUrl!) : null;
        
        return (
          <Card key={assignment.id} className="overflow-hidden p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Thumbnail/Icon Section - Completely out of flow */}
              <div className="relative aspect-video sm:w-32 md:w-40 flex-shrink-0">
                {isVideoAssignment && thumbnailUrl ? (
                  <VideoThumbnail 
                    src={thumbnailUrl} 
                    alt={`${assignment.topic} video thumbnail`}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center rounded-t-lg sm:rounded-t-none sm:rounded-l-lg">
                    <div className="w-8 h-8 sm:w-8 sm:h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-4 w-4 sm:h-4 sm:w-4 text-primary" />
                    </div>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="flex-1 flex flex-col justify-between p-3 sm:py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-semibold truncate">
                        {assignment.topic}
                      </h3>
                      <Badge variant={statusInfo.variant} className="ml-2 flex-shrink-0 text-xs px-2 py-0.5">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    
                    {/* Assignment metadata - First row */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-1">
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
                    {assignment.questions && assignment.questions.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{assignment.questions.length} question{assignment.questions.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 sm:ml-3">
                    {statusInfo.status === 'available' && (
                      <Button 
                        size="sm"
                        onClick={() => handleStartAssignment(assignment.id)}
                        className="text-xs px-3 py-1.5 h-7 w-full sm:w-auto"
                      >
                        Start Assignment
                      </Button>
                    )}
                    
                    {statusInfo.status === 'scheduled' && (
                      <Button 
                        size="sm"
                        variant="outline" 
                        disabled
                        className="text-xs px-3 py-1.5 h-7 w-full sm:w-auto"
                      >
                        Not Yet Available
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