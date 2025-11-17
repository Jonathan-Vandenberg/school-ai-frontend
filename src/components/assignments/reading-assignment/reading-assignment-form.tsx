"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PlusCircle, Trash2, Eye, Clock, Sparkles, Upload, X } from "lucide-react";
import { Class, User } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
// import { VideoAssignmentPreview } from "./video-assignment-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { ReadingAssignmentPreview } from "./reading-assignment-preview";
import { LevelSelector } from "@/components/templates/level-selector";
import { LevelType, CEFRLevel, GradeLevel } from "@prisma/client";

const formSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  description: z.string().optional(),
  questions: z
    .array(
      z.object({
        text: z.string().min(1, "Question text cannot be empty."),
      })
    )
    .min(1, "At least one question is required."),
  classIds: z.array(z.string()).min(1, "At least one class must be selected."),
  studentIds: z.array(z.string()).optional(),
  assignToEntireClass: z.boolean(),
  scheduledPublishAt: z.date().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  hasTranscript: z.boolean().optional(),
  languageId: z.string().optional(),
  vocabularyLevel: z.string().optional(),
  sentencesPerPage: z.number().optional(),
  levels: z.array(z.object({
    levelType: z.nativeEnum(LevelType),
    cefrLevel: z.nativeEnum(CEFRLevel).optional(),
    gradeLevel: z.nativeEnum(GradeLevel).optional(),
  })).min(1, 'At least one level must be selected'),
});

type ReadingFormValues = z.infer<typeof formSchema>;

interface ReadingAssignmentFormProps {
  data: {
    classes: Class[];
  };
  assignmentId?: string;
  initialAssignment?: any;
}

export function ReadingAssignmentForm({ data, assignmentId, initialAssignment }: ReadingAssignmentFormProps) {
  const router = useRouter();
  const { classes } = data;
  const [students, setStudents] = useState<User[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  // Initialize enableSchedule and enableDueDate based on initialAssignment
  const [enableSchedule, setEnableSchedule] = useState(
    !!initialAssignment?.scheduledPublishAt
  );
  const [enableDueDate, setEnableDueDate] = useState(
    !!initialAssignment?.dueDate
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // State for AI generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPassages, setGeneratedPassages] = useState<
    { text: string }[]
  >([]);
  const [selectedPassageIndices, setSelectedPassageIndices] = useState<Set<number>>(new Set());
  const [aiContext, setAiContext] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Initialize form with assignment data if editing
  const getDefaultValues = (): ReadingFormValues => {
    if (initialAssignment) {
      return {
        topic: initialAssignment.topic || "",
        description: initialAssignment.context || "",
        questions: initialAssignment.questions?.map((q: any) => ({
          text: q.textAnswer || q.textQuestion || "",
        })) || [{ text: "" }],
        classIds: initialAssignment.classes?.map((c: any) => c.class.id) || [],
        studentIds: initialAssignment.students?.map((s: any) => s.user.id) || [],
        assignToEntireClass: (initialAssignment.classes?.length || 0) > 0,
        scheduledPublishAt: initialAssignment.scheduledPublishAt ? new Date(initialAssignment.scheduledPublishAt) : null,
        dueDate: initialAssignment.dueDate ? new Date(initialAssignment.dueDate) : null,
        hasTranscript: false,
        languageId: initialAssignment.language?.id || "",
        vocabularyLevel: "5",
        sentencesPerPage: 3,
        levels: initialAssignment.levels?.map((l: any) => ({
          levelType: l.levelType,
          cefrLevel: l.cefrLevel || undefined,
          gradeLevel: l.gradeLevel || undefined,
        })) || [],
      };
    }
    return {
      topic: "",
      description: "",
      questions: [{ text: "" }],
      classIds: [],
      studentIds: [],
      assignToEntireClass: true,
      scheduledPublishAt: null,
      dueDate: null,
      hasTranscript: false,
      languageId: "",
      vocabularyLevel: "5",
      sentencesPerPage: 3,
      levels: [],
    };
  };

  const form = useForm<ReadingFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: getDefaultValues(),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const selectedClasses = form.watch("classIds");
  const assignToEntireClass = form.watch("assignToEntireClass");
  const scheduledPublishAt = form.watch("scheduledPublishAt");
  const dueDate = form.watch("dueDate");

  // Adjust due date if publish date changes and due date would be before it
  useEffect(() => {
    if (scheduledPublishAt && dueDate && dueDate < scheduledPublishAt) {
      // If due date is before publish date, adjust it to 1 minute after publish date
      const minDueDate = new Date(scheduledPublishAt.getTime() + 60000);
      form.setValue("dueDate", minDueDate);
      form.trigger("dueDate");
    }
  }, [scheduledPublishAt, dueDate, form]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (
        selectedClasses &&
        selectedClasses.length > 0 &&
        !assignToEntireClass
      ) {
        setIsLoadingStudents(true);
        try {
          const classId = selectedClasses[0]; // Assuming one class for now
          const response = await fetch(
            `/api/users?classId=${classId}&role=STUDENT`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch students");
          }
          const result = await response.json();
          setStudents(result.data || []);
        } catch (error) {
          console.error(error);
          setStudents([]);
        } finally {
          setIsLoadingStudents(false);
        }
      } else {
        setStudents([]);
        form.setValue("studentIds", []);
      }
    };

    fetchStudents();
  }, [selectedClasses, assignToEntireClass, form]);

  // Check if preview is available - all required fields for API evaluation
  const isPreviewAvailable = () => {
    const data = currentFormData;

    // Basic required fields
    if (!data.topic?.trim()) {
      return false;
    }

    // Must have at least one complete question
    const hasValidQuestions =
      data.questions &&
      data.questions.length > 0 &&
      data.questions.some((q) => q.text?.trim())

    return hasValidQuestions;
  };

  async function onSubmit(values: ReadingFormValues) {
    setIsSubmitting(true);
    setFormMessage(null);
    try {
      const url = assignmentId 
        ? `/api/assignments/${assignmentId}`
        : "/api/assignments/reading";
      const method = assignmentId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignmentId ? {
          topic: values.topic,
          context: values.description,
          scheduledPublishAt: values.scheduledPublishAt ? values.scheduledPublishAt.toISOString() : undefined,
          dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
          classIds: values.classIds,
          studentIds: values.studentIds,
          questions: values.questions.map((q, index) => ({
            id: initialAssignment?.questions?.[index]?.id,
            textQuestion: null,
            textAnswer: q.text,
            order: index,
          })),
          levels: values.levels,
        } : {
          creationType: "READING",
          ...values,
        }), 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      setFormMessage({
        type: "success",
        message: assignmentId ? "Assignment updated! Redirecting..." : "Assignment created! Redirecting...",
      });

      // Redirect after a short delay to allow user to see the message
      setTimeout(() => {
        router.push(assignmentId ? `/assignments/${assignmentId}` : "/assignments");
        router.refresh();
      }, 1500);
    } catch (error) {
      setFormMessage({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
      // Only reset isSubmitting on error, keep it true during success redirect
      setIsSubmitting(false);
    }
  }

  // Function to generate reading passages with AI
  const generatePassagesWithAI = async (existingPassages: { text: string }[] = []) => {
    if (!aiContext.trim() && !uploadedImage) {
      setFormMessage({
        type: "error",
        message: "Please provide context or upload an image for the reading assignment.",
      });
      return;
    }

    setIsGenerating(true);
    setFormMessage(null);

    try {
      const formData = form.getValues();

      // Create FormData to handle both text and image
      const requestData = new FormData();
      requestData.append("context", aiContext);
      requestData.append("numQuestions", numQuestions.toString());
      requestData.append("topic", formData.topic || "Reading Comprehension");
      requestData.append("levels", JSON.stringify(formData.levels || []));
      requestData.append("sentencesPerPage", (formData.sentencesPerPage || 3).toString());
      requestData.append("existingPassages", JSON.stringify(existingPassages));
      
      if (uploadedImage) {
        requestData.append("image", uploadedImage);
      }

      const response = await fetch("/api/generate-reading-assignment", {
        method: "POST",
        body: requestData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.generatedPassages?.passages) {
        // Extract only text from passages, ignoring title if present
        const newPassages = result.generatedPassages.passages.map((p: any) => ({
          text: p.text || p.title || ""
        })).filter((p: any) => p.text.trim());
        
        if (existingPassages.length > 0) {
          // Append new passages to existing ones
          setGeneratedPassages(prev => [...prev, ...newPassages]);
          setFormMessage({
            type: "success",
            message: `Successfully generated ${newPassages.length} additional reading passages.`,
          });
        } else {
          // First generation - replace the list
          setGeneratedPassages(newPassages);
          setFormMessage({
            type: "success",
            message: `Successfully generated ${newPassages.length} reading passages.`,
          });
          // Close the dialog after successful generation
          setIsDialogOpen(false);
        }
      } else {
        throw new Error(result.error || "AI generation failed");
      }
    } catch (error) {
      console.error("Error generating passages:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate AI passages.";
      setFormMessage({ type: "error", message });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyOneGeneratedPassage = (passage: { text: string }) => {
    // Check if the first question is empty and replace it, otherwise append.
    const firstQuestion = form.getValues("questions")[0];
    if (
      form.getValues("questions").length === 1 &&
      !firstQuestion.text
    ) {
      replace([{ text: passage.text }]);
    } else {
      append({ text: passage.text });
    }

    // Remove the used passage from the generated passages list
    setGeneratedPassages((prev) =>
      prev.filter(
        (p) =>
          !(p.text.trim() === passage.text.trim())
      )
    );

    setFormMessage({ type: "success", message: "Passage added." });
  };

  const applyAllGeneratedPassages = () => {
    if (generatedPassages.length === 0) return;
    replace(generatedPassages.map(p => ({ text: p.text })));

    // Clear all generated passages since they've all been applied
    setGeneratedPassages([]);
    setSelectedPassageIndices(new Set());

    setFormMessage({
      type: "success",
      message: "All generated passages have been applied.",
    });
  };

  const togglePassageSelection = (index: number) => {
    const newSelection = new Set(selectedPassageIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedPassageIndices(newSelection);
  };

  const applySelectedPassages = () => {
    if (selectedPassageIndices.size === 0) {
      setFormMessage({ type: "error", message: "Please select at least one passage." });
      return;
    }

    const selectedPassages = Array.from(selectedPassageIndices)
      .sort((a, b) => a - b)
      .map(i => generatedPassages[i]);

    // Get current questions
    const currentQuestions = form.getValues("questions");
    const firstQuestion = currentQuestions[0];

    // If only one empty question exists, replace it with selected passages
    if (
      currentQuestions.length === 1 &&
      !firstQuestion.text
    ) {
      replace(selectedPassages.map(p => ({ text: p.text })));
    } else {
      // Otherwise, append selected passages
      selectedPassages.forEach(p => {
        append({ text: p.text });
      });
    }

    // Remove applied passages from generated list
    const remainingPassages = generatedPassages.filter((_, i) => !selectedPassageIndices.has(i));
    setGeneratedPassages(remainingPassages);
    setSelectedPassageIndices(new Set());

    setFormMessage({
      type: "success",
      message: `${selectedPassageIndices.size} passage(s) added.`,
    });
  };

  // Function to handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setFormMessage({
          type: "error",
          message: "Please upload an image file.",
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setFormMessage({
          type: "error",
          message: "Image file size must be less than 10MB.",
        });
        return;
      }

      setUploadedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to remove uploaded image
  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  const currentFormData = form.watch();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{assignmentId ? 'Edit Reading Assignment' : 'Reading Assignment Details'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Reading assignment topic"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this assignment..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This helps other teachers understand what this assignment is about.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="levels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Educational Levels</FormLabel>
                  <FormControl>
                    <LevelSelector
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Select the CEFR or Grade levels this assignment is appropriate for.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Generation</CardTitle>
            <CardDescription>
              Generate reading passages using AI based on your context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Assignment with AI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Generate Reading Assignment with AI</DialogTitle>
                <DialogDescription>
                  Provide context about what you want the reading assignment to cover, and AI will generate relevant passages for you.
                </DialogDescription>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-context">Context</Label>
                    <Textarea
                      id="ai-context"
                      placeholder="e.g., Create a reading assignment about ancient civilizations, focusing on their daily life, architecture, and cultural achievements. Make it suitable for middle school students."
                      value={aiContext}
                      onChange={(e) => setAiContext(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Image Context (Optional)</Label>
                    <div className="space-y-2">
                      {!imagePreview ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-2">
                            <label htmlFor="image-upload" className="cursor-pointer">
                              <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                Click to upload
                              </span>
                              <span className="text-sm text-gray-500"> or drag and drop</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </div>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Uploaded context"
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={removeImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Upload an image to provide visual context for the AI to generate relevant reading passages.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="num-questions">Number of Passages</Label>
                      <Select value={numQuestions.toString()} onValueChange={(value) => setNumQuestions(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 passages</SelectItem>
                          <SelectItem value="3">3 passages</SelectItem>
                          <SelectItem value="4">4 passages</SelectItem>
                          <SelectItem value="5">5 passages</SelectItem>
                          <SelectItem value="6">6 passages</SelectItem>
                          <SelectItem value="7">7 passages</SelectItem>
                          <SelectItem value="8">8 passages</SelectItem>
                          <SelectItem value="9">9 passages</SelectItem>
                          <SelectItem value="10">10 passages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="sentences-per-page">Sentences per Passage</Label>
                    <FormField
                      control={form.control}
                      name="sentencesPerPage"
                      render={({ field }) => (
                        <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sentences" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 sentences</SelectItem>
                            <SelectItem value="2">2 sentences</SelectItem>
                            <SelectItem value="3">3 sentences</SelectItem>
                            <SelectItem value="4">4 sentences</SelectItem>
                            <SelectItem value="5">5 sentences</SelectItem>
                            <SelectItem value="6">6 sentences</SelectItem>
                            <SelectItem value="7">7 sentences</SelectItem>
                            <SelectItem value="8">8 sentences</SelectItem>
                            <SelectItem value="10">10 sentences</SelectItem>
                            <SelectItem value="12">12 sentences</SelectItem>
                            <SelectItem value="15">15 sentences</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                    <div className="space-y-2">
                      <Label>Educational Levels</Label>
                      <FormField
                        control={form.control}
                        name="levels"
                        render={({ field }) => (
                          <LevelSelector
                            value={field.value || []}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Select the appropriate CEFR or Grade levels for the AI to generate passages at the right difficulty.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        generatePassagesWithAI();
                      }}
                      disabled={isGenerating || (!aiContext.trim() && !uploadedImage)}
                    >
                      {isGenerating ? "Generating..." : "Generate Passages"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {generatedPassages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Passages</CardTitle>
              <CardDescription>
                These passages have been generated by AI based on your context. Select the passages you want to add.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-96 overflow-y-auto pr-4">
                {generatedPassages.map((passage, i) => (
                  <div 
                    key={i} 
                    className={`p-4 border rounded-md transition-colors ${
                      selectedPassageIndices.has(i) ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedPassageIndices.has(i)}
                        onCheckedChange={() => togglePassageSelection(i)}
                      />
                      <div className="flex-1">
                        <p className="text-base">
                          {passage.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedPassageIndices.size} of {generatedPassages.length} selected
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      generatePassagesWithAI(generatedPassages);
                    }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Generating more..." : "Generate More Passages"}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={applySelectedPassages}
                    disabled={selectedPassageIndices.size === 0}
                  >
                    Add Selected ({selectedPassageIndices.size})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Add reading passages that students will read.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-start justify-between w-full gap-4 p-4 border rounded-md"
              >
                <div className="flex-grow gap-4 flex flex-col">
                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passage {index + 1}</FormLabel>
                        <FormDescription>
                          The text that students will read.
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Yesterday morning, I woke up and stretched my arms. I brushed my teeth and washed my face. Then I ate breakfast and drank some juice. After that, I packed my bag and walked to school. In class, I listened to the teacher and wrote in my notebook. At the end of the day, I played with my friends and laughed a lot."
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => remove(index)}
                  className="mt-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ text: "" })}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Passage
            </Button>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Assign To</CardTitle>
            <CardDescription>
              Select which classes or students will receive this assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="classIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classes</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={classes.map((c) => ({
                        label: c.name,
                        value: c.id,
                      }))}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select classes"
                    />
                  </FormControl>
                  <FormDescription>
                    Select one or more classes to assign this to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignToEntireClass"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Assign to Entire Class
                    </FormLabel>
                    <FormDescription>
                      If toggled, the assignment will be given to all students
                      in the selected class(es).
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {!assignToEntireClass && (
              <FormField
                control={form.control}
                name="studentIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Individual Students</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={students.map((student) => ({
                          value: student.id,
                          label: student.username || student.email,
                        }))}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder={
                          isLoadingStudents
                            ? "Loading students..."
                            : "Select students..."
                        }
                        emptyText="No available students for the selected class."
                        disabled={isLoadingStudents || students.length === 0}
                      />
                    </FormControl>
                    <FormDescription>
                      If you don't assign to the entire class, you must select
                      individual students.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduling</CardTitle>
            <CardDescription>
              Optional: Schedule this assignment to be published at a future
              date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Scheduling</FormLabel>
                <FormDescription>
                  If disabled, the assignment will be published immediately. If
                  enabled, you can set a specific date and time for publication.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={enableSchedule}
                  onCheckedChange={(checked) => {
                    setEnableSchedule(checked);
                    if (!checked) {
                      form.setValue("scheduledPublishAt", null);
                    } else if (!scheduledPublishAt) {
                      // If enabling, set to current date and time
                      const now = new Date();
                      form.setValue("scheduledPublishAt", now);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
            {enableSchedule && (
              <FormField
                control={form.control}
                name="scheduledPublishAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Publish Date & Time</FormLabel>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={(date) => {
                              if (date) {
                                const currentTime = field.value || new Date();
                                const newDateTime = new Date(date);
                                newDateTime.setHours(currentTime.getHours());
                                newDateTime.setMinutes(
                                  currentTime.getMinutes()
                                );
                                field.onChange(newDateTime);
                              } else {
                                field.onChange(null);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 opacity-50" />
                        <Input
                          type="time"
                          value={
                            field.value ? format(field.value, "HH:mm") : "09:00"
                          }
                          onChange={(e) => {
                            const timeValue = e.target.value;
                            if (timeValue) {
                              const [hours, minutes] = timeValue
                                .split(":")
                                .map(Number);
                              const currentDate = field.value || new Date();
                              const newDateTime = new Date(currentDate);
                              newDateTime.setHours(hours);
                              newDateTime.setMinutes(minutes);
                              field.onChange(newDateTime);
                            }
                          }}
                          className="w-[120px]"
                        />
                      </div>
                    </div>
                    <FormDescription>
                      Assignment will be published on the selected date and
                      time.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Due Date</CardTitle>
            <CardDescription>
              Optional: Set a due date for when students should complete this
              assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Due Date</FormLabel>
                <FormDescription>
                  If enabled, students will see when the assignment is due.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={enableDueDate}
                  onCheckedChange={(checked) => {
                    setEnableDueDate(checked);
                    if (!checked) {
                      form.setValue("dueDate", null);
                    } else if (!dueDate) {
                      // If enabling, set to current date and time
                      const now = new Date();
                      // Ensure due date is at least after the publish date
                      const publishDate = scheduledPublishAt || new Date();
                      const defaultDueDate = now >= publishDate ? now : new Date(publishDate.getTime() + 60000); // 1 minute after publish date
                      form.setValue("dueDate", defaultDueDate);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
            {enableDueDate && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex-col md:flex">
                    <FormLabel>Due Date & Time</FormLabel>
                    <div className="gap-2 flex-col space-y-4 md:space-y-0 md:flex-row">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={(date) => {
                              if (date) {
                                const currentTime = field.value || new Date();
                                const newDateTime = new Date(date);
                                newDateTime.setHours(currentTime.getHours());
                                newDateTime.setMinutes(
                                  currentTime.getMinutes()
                                );
                                field.onChange(newDateTime);
                              } else {
                                field.onChange(null);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={
                            field.value ? format(field.value, "HH:mm") : format(new Date(), "HH:mm")
                          }
                          onChange={(e) => {
                            const timeValue = e.target.value;
                            if (timeValue) {
                              const [hours, minutes] = timeValue
                                .split(":")
                                .map(Number);
                              const currentDate = field.value || new Date();
                              const newDateTime = new Date(currentDate);
                              newDateTime.setHours(hours);
                              newDateTime.setMinutes(minutes);
                              
                              // Validate that due date is after publish date
                              if (scheduledPublishAt && newDateTime < scheduledPublishAt) {
                                // If due date would be before publish date, set it to 1 minute after publish date
                                const minDueDate = new Date(scheduledPublishAt.getTime() + 60000);
                                field.onChange(minDueDate);
                                form.trigger("dueDate"); // Trigger validation
                              } else {
                                field.onChange(newDateTime);
                              }
                            }
                          }}
                          className="w-[120px]"
                        />
                      </div>
                    </div>
                    <FormDescription>
                      Students will see this due date and be encouraged to
                      complete by this time. Due date must be after the publish date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {formMessage && (
          <Alert
            variant={formMessage.type === "error" ? "destructive" : "default"}
          >
            {formMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {formMessage.type === "success" ? "Success" : "Error"}
            </AlertTitle>
            <AlertDescription>{formMessage.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-4">
          <div className="flex flex-col items-end gap-2">
            {!isPreviewAvailable() && (
              <p className="text-xs text-muted-foreground">
                Preview requires: topic and at least one complete passage
              </p>
            )}
            <div className="flex gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isPreviewAvailable()}
                    title={
                      !isPreviewAvailable()
                        ? "Please fill in topic and at least one complete passage to preview"
                        : "Preview assignment as students will experience it"
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] p-0 sm:max-w-7xl">
                  <div className="flex flex-col h-full max-h-[90vh]">
                    <div className="flex items-center justify-between rounded-lg p-6 border-b flex-shrink-0">
                      <div>
                        <DialogTitle className="text-lg font-semibold">
                          Preview Assignment
                        </DialogTitle>
                        <DialogDescription>
                          Experience the assignment as your students will
                        </DialogDescription>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      <ReadingAssignmentPreview
                        topic={currentFormData.topic}
                        questions={currentFormData.questions}
                        vocabularyLevel={currentFormData.vocabularyLevel}
                        sentencesPerPage={currentFormData.sentencesPerPage}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? (assignmentId ? "Updating..." : "Creating...") 
                  : (assignmentId ? "Save" : "Create Assignment")}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
