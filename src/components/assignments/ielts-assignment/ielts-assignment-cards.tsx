"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageCircle, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface IELTSAssignmentCardsProps {
  data: {
    classes: any[];
  };
}

export function IELTSAssignmentCards({ data }: IELTSAssignmentCardsProps) {
  const router = useRouter();

  const assignmentTypes = [
    {
      id: "reading",
      title: "Reading",
      description: "Students read provided text aloud with pronunciation assessment",
      icon: BookOpen,
      color: "from-blue-50 to-blue-100 border-blue-200",
      iconColor: "text-blue-600",
      features: [
        "Pronunciation assessment",
        "Fluency analysis", 
        "Reading comprehension",
        "Audio recording feedback"
      ]
    },
    {
      id: "question-answer", 
      title: "Question & Answer",
      description: "Open-ended speaking practice with comprehensive language analysis",
      icon: MessageCircle,
      color: "from-green-50 to-green-100 border-green-200",
      iconColor: "text-green-600", 
      features: [
        "Grammar analysis",
        "Vocabulary assessment",
        "IELTS band scoring",
        "Relevance evaluation"
      ]
    },
    {
      id: "pronunciation",
      title: "Pronunciation",
      description: "Focused pronunciation practice with detailed phoneme feedback",
      icon: Volume2,
      color: "from-purple-50 to-purple-100 border-purple-200", 
      iconColor: "text-purple-600",
      features: [
        "Phoneme-level scoring",
        "Word accuracy analysis",
        "Speech rate measurement",
        "Fluency metrics"
      ]
    }
  ];

  const handleCardClick = (typeId: string) => {
    // Navigate to the form with the selected type
    router.push(`/assignments/create/ielts?subtype=${typeId}`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Create IELTS Assignment</h1>
        <p className="text-muted-foreground">
          Choose the type of IELTS speaking practice assignment you want to create
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {assignmentTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-gradient-to-br ${type.color}`}
              onClick={() => handleCardClick(type.id)}
            >
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto mb-4 p-3 rounded-full bg-white shadow-sm w-fit`}>
                  <Icon className={`h-8 w-8 ${type.iconColor}`} />
                </div>
                <CardTitle className="text-xl mb-2">{type.title}</CardTitle>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-6">
                  {type.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-muted-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${type.iconColor.replace('text-', 'bg-')} mr-2`} />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(type.id);
                  }}
                >
                  Create {type.title} Assignment
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 