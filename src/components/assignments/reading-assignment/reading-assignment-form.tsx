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

const formSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  questions: z
    .array(
      z.object({
        text: z.string().min(1, "Question text cannot be empty."),
        title: z.string().optional(),
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
});

type ReadingFormValues = z.infer<typeof formSchema>;

interface ReadingAssignmentFormProps {
  data: {
    classes: Class[];
  };
}

export function ReadingAssignmentForm({ data }: ReadingAssignmentFormProps) {
  const router = useRouter();
  const { classes } = data;
  const [students, setStudents] = useState<User[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [enableDueDate, setEnableDueDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // State for AI generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPassages, setGeneratedPassages] = useState<
    { title: string; text: string }[]
  >([]);
  const [aiContext, setAiContext] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ReadingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      questions: [{ text: "", title: "" }],
      classIds: [],
      studentIds: [],
      assignToEntireClass: true,
      scheduledPublishAt: null,
      dueDate: null,
      hasTranscript: false,
      languageId: "", // Will default to English on backend
      vocabularyLevel: "5", // Default to middle school level
      sentencesPerPage: 3,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const selectedClasses = form.watch("classIds");
  const assignToEntireClass = form.watch("assignToEntireClass");

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
      const response = await fetch("/api/assignments/reading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        message: "Assignment created! Redirecting...",
      });

      // Redirect after a short delay to allow user to see the message
      setTimeout(() => {
        router.push("/assignments");
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
    } finally {
      setIsSubmitting(false);
    }
  }

  // Function to generate reading passages with AI
  const generatePassagesWithAI = async (existingPassages: { title: string; text: string }[] = []) => {
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
      requestData.append("vocabularyLevel", formData.vocabularyLevel || "5");
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
        const newPassages = result.generatedPassages.passages;
        
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

  const applyOneGeneratedPassage = (passage: { title: string; text: string }) => {
    // Check if the first question is empty and replace it, otherwise append.
    const firstQuestion = form.getValues("questions")[0];
    if (
      form.getValues("questions").length === 1 &&
      !firstQuestion.text &&
      !firstQuestion.title
    ) {
      replace([{ title: passage.title || "", text: passage.text }]);
    } else {
      append({ title: passage.title || "", text: passage.text });
    }

    // Remove the used passage from the generated passages list
    setGeneratedPassages((prev) =>
      prev.filter(
        (p) =>
          !(
            p.text.trim() === passage.text.trim() &&
            p.title.trim() === passage.title.trim()
          )
      )
    );

    setFormMessage({ type: "success", message: "Passage added." });
  };

  const applyAllGeneratedPassages = () => {
    if (generatedPassages.length === 0) return;
    replace(generatedPassages.map(p => ({ title: p.title || "", text: p.text })));

    // Clear all generated passages since they've all been applied
    setGeneratedPassages([]);

    setFormMessage({
      type: "success",
      message: "All generated passages have been applied.",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Reading Assignment Details</CardTitle>
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
              <DialogContent className="max-w-2xl">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="vocabulary-level">Vocabulary Level</Label>
                      <FormField
                        control={form.control}
                        name="vocabularyLevel"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Level 1 - Kindergarten</SelectItem>
                              <SelectItem value="2">Level 2 - Grade 1</SelectItem>
                              <SelectItem value="3">Level 3 - Grade 2</SelectItem>
                              <SelectItem value="4">Level 4 - Grade 3-4</SelectItem>
                              <SelectItem value="5">Level 5 - Grade 5-6</SelectItem>
                              <SelectItem value="6">Level 6 - Grade 7-8</SelectItem>
                              <SelectItem value="7">Level 7 - Grade 9-10</SelectItem>
                              <SelectItem value="8">Level 8 - Grade 11-12</SelectItem>
                              <SelectItem value="9">Level 9 - College Prep</SelectItem>
                              <SelectItem value="10">Level 10 - Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
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
                These passages have been generated by AI based on your context. You can add them individually or all at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-96 overflow-y-auto pr-4">
                {generatedPassages.map((passage, i) => (
                  <div key={i} className="p-4 border rounded-md">
                    {passage.title && (
                      <p className="font-semibold text-lg mb-2">{passage.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-3">
                      {passage.text}
                    </p>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => applyOneGeneratedPassage(passage)}
                      >
                        Use This Passage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 justify-end">
                <Button type="button" onClick={applyAllGeneratedPassages}>
                  Use All Generated Passages
                </Button>
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
                    name={`questions.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passage Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Past Tense Verbs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            rows={2}
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
                  <Select
                    onValueChange={(value) => field.onChange([value])}
                    defaultValue={field.value?.[0]}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  onCheckedChange={setEnableSchedule}
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
                  onCheckedChange={setEnableDueDate}
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
                            field.value ? format(field.value, "HH:mm") : "23:59"
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
                      Students will see this due date and be encouraged to
                      complete by this time.
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
                {isSubmitting ? "Creating..." : "Create Assignment"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
