"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, BookOpen, Mic, Image, FileText, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

interface AssignmentType {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
}

const assignmentTypes: AssignmentType[] = [
  {
    id: "video",
    title: "Video Assignment",
    description: "Create assignments based on YouTube videos with auto-generated questions",
    icon: Video,
    color: "text-purple-600",
    gradient: "from-purple-500 to-purple-600"
  },
  {
    id: "reading",
    title: "Reading Assignment",
    description: "Text-based comprehension assignments with customizable questions",
    icon: BookOpen,
    color: "text-blue-600",
    gradient: "from-blue-500 to-blue-600"
  },
  {
    id: "pronunciation",
    title: "Pronunciation Assignment",
    description: "Speaking practice with AI-powered pronunciation feedback",
    icon: Mic,
    color: "text-green-600",
    gradient: "from-green-500 to-green-600"
  },
  {
    id: "image",
    title: "Image Assignment",
    description: "Visual-based assignments using images and descriptions",
    icon: Image,
    color: "text-orange-600",
    gradient: "from-orange-500 to-orange-600"
  },
  {
    id: "ielts",
    title: "IELTS Assignment",
    description: "Specialized assignments for IELTS test preparation",
    icon: FileText,
    color: "text-red-600",
    gradient: "from-red-500 to-red-600"
  },
  {
    id: "custom",
    title: "Custom Assignment",
    description: "Create your own assignment with flexible options",
    icon: Settings,
    color: "text-gray-600",
    gradient: "from-gray-500 to-gray-600"
  }
];

export function AssignmentCreationCards() {
  const router = useRouter();

  const handleCardClick = (type: string) => {
    router.push(`/assignments/create?type=${type}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assignmentTypes.map((assignmentType) => {
        const Icon = assignmentType.icon;
        
        return (
          <Card 
            key={assignmentType.id}
            className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
            onClick={() => handleCardClick(assignmentType.id)}
          >
            <CardHeader className="pb-3">
              <div 
                className={`w-12 h-12 rounded-lg bg-gradient-to-br ${assignmentType.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                {assignmentType.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {assignmentType.description}
              </CardDescription>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              >
                Create Assignment
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 