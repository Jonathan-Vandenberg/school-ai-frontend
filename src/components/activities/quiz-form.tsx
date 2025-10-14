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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Trash2, Eye, Clock, Sparkles, Brain, HelpCircle, Upload } from "lucide-react";
import { Class, User } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

const questionSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty."),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty."),
  options: z.array(z.string().min(1, "Option cannot be empty.")).min(2, "At least 2 options required."),
  explanation: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  topic: z.string().min(1, "Topic is required"),
  description: z.string().optional(),
  numberOfQuestions: z.number().min(1, "At least 1 question is required").max(50, "Maximum 50 questions allowed"),
  numberOfOptions: z.number().min(2, "At least 2 options required").max(8, "Maximum 8 options allowed"),
  timeLimitMinutes: z.number().min(1, "Timer must be at least 1 minute").max(180, "Timer cannot exceed 180 minutes").optional().nullable(),
  classIds: z.array(z.string()).min(1, "At least one class must be selected."),
  studentIds: z.array(z.string()).optional(),
  assignToEntireClass: z.boolean(),
  scheduledPublishAt: z.date().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  useAI: z.boolean(),
  questions: z.array(questionSchema).optional(),
});

type QuizFormValues = z.infer<typeof formSchema>;

interface QuizFormProps {
  data: {
    classes: Class[];
  };
}

export function QuizForm({ data }: QuizFormProps) {
  const router = useRouter();
  const { classes } = data;
  const [students, setStudents] = useState<User[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [enableDueDate, setEnableDueDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // State for AI generation
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<boolean[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      topic: "",
      description: "",
      numberOfQuestions: 5,
      numberOfOptions: 4,
      timeLimitMinutes: 30,
      classIds: [],
      studentIds: [],
      assignToEntireClass: true,
      scheduledPublishAt: null,
      dueDate: null,
      useAI: true,
      questions: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  const selectedClasses = form.watch("classIds");
  const assignToEntireClass = form.watch("assignToEntireClass");
  const useAI = form.watch("useAI");
  const numberOfOptions = form.watch("numberOfOptions");
  const topic = form.watch("topic");
  const title = form.watch("title");
  const description = form.watch("description");

  // Fetch students when classes change and not assigning to entire class
  useEffect(() => {
    const fetchStudents = async () => {
      if (selectedClasses && selectedClasses.length > 0 && !assignToEntireClass) {
        setIsLoadingStudents(true);
        try {
          const classId = selectedClasses[0]; // Assuming one class for now
          const response = await fetch(`/api/users?classId=${classId}&role=STUDENT`);
          if (!response.ok) {
            throw new Error('Failed to fetch students');
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
        form.setValue('studentIds', []);
      }
    };

    fetchStudents();
  }, [selectedClasses, assignToEntireClass, form]);

  // Note: Manual questions are now added individually using the "Add Question" button
  // No need to pre-fill with empty questions

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('Files selected:', files?.length || 0);
    
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    setIsUploading(true);
    setFormMessage(null);
    const newImageUrls: string[] = [];

    try {
      for (const file of files) {
        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        console.log('Upload response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Upload failed:', errorData);
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const data = await response.json();
        console.log('Upload success:', data);
        newImageUrls.push(data.url);
      }

      console.log('All uploads successful, updating state with URLs:', newImageUrls);
      setUploadedImages(prev => {
        const updated = [...prev, ...newImageUrls];
        console.log('Updated image URLs:', updated);
        return updated;
      });
      setFormMessage({ type: 'success', message: `Uploaded ${newImageUrls.length} image(s) successfully!` });
    } catch (error) {
      console.error('Error uploading images:', error);
      setFormMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to upload images. Please try again.' 
      });
    } finally {
      setIsUploading(false);
      // Reset the input value so the same file can be selected again
      event.target.value = '';
    }
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Generate questions with AI
  const generateQuestionsWithAI = async () => {
    if (!topic.trim()) {
      setFormMessage({ type: 'error', message: 'Please enter a topic first.' });
      return;
    }

    setIsGeneratingQuestions(true);
    setFormMessage(null);

    try {
      // Get existing questions (both generated and manually created)
      const existingQuestions = [
        ...generatedQuestions,
        ...fields.map(field => ({
          question: field.question,
          options: field.options,
          correctAnswer: field.correctAnswer,
          explanation: field.explanation
        }))
      ].filter(q => q.question && q.question.trim());

      const response = await fetch('/api/activities/quiz/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          title: title?.trim() || undefined,
          description: description?.trim() || undefined,
          numberOfQuestions: 5, // Generate 5 questions at a time
          numberOfOptions,
          imageUrls: uploadedImages.length > 0 ? uploadedImages : undefined,
          existingQuestions: existingQuestions.length > 0 ? existingQuestions : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      
      // Add new questions to existing ones (don't replace)
      setGeneratedQuestions(prev => [...prev, ...data.questions]);
      
      // Initialize selection state for new questions (all selected by default)
      setSelectedQuestions(prev => [...prev, ...new Array(data.questions.length).fill(true)]);
      
      setFormMessage({ type: 'success', message: `Generated ${data.questions.length} additional questions successfully!` });
    } catch (error) {
      console.error('Error generating questions:', error);
      setFormMessage({ 
        type: 'error', 
        message: 'Failed to generate questions. Please try again or create questions manually.' 
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Apply selected questions to form
  const applySelectedQuestions = () => {
    const selectedQuestionsData = generatedQuestions
      .filter((_, index) => selectedQuestions[index])
      .map(q => ({
        question: q.question,
        correctAnswer: q.correctAnswer,
        options: q.options,
        explanation: q.explanation || "",
      }));
    
    // Add to existing questions instead of replacing
    selectedQuestionsData.forEach(q => append(q));
    
    // Switch to manual mode to show the applied questions
    form.setValue('useAI', false);
    
    // Clear generated questions and selection state
    setGeneratedQuestions([]);
    setSelectedQuestions([]);
    setShowPreview(false);
    
    const selectedCount = selectedQuestionsData.length;
    setFormMessage({ type: 'success', message: `Applied ${selectedCount} selected question${selectedCount !== 1 ? 's' : ''} to quiz! You can now see and edit them below.` });
  };

  // Clear all generated questions
  const clearGeneratedQuestions = () => {
    setGeneratedQuestions([]);
    setSelectedQuestions([]);
    setShowPreview(false);
  };

  // Add a new manual question
  const addQuestion = () => {
    append({
      question: "",
      correctAnswer: "",
      options: Array.from({ length: numberOfOptions }, () => ""),
      explanation: "",
    });
  };

  // Remove a question
  const removeQuestion = (index: number) => {
    remove(index);
  };

  // Submit form
  async function onSubmit(values: QuizFormValues) {
    setIsSubmitting(true);
    setFormMessage(null);

    try {
      // DEBUG: Log the form values
      console.log('🐛 Form values before submission:', JSON.stringify(values, null, 2));
      console.log('🐛 timeLimitMinutes specifically:', values.timeLimitMinutes, typeof values.timeLimitMinutes);
      
      const actualQuestions = useAI ? generatedQuestions : values.questions;
      
      // Calculate numberOfQuestions from actual questions array
      const calculatedNumberOfQuestions = actualQuestions ? actualQuestions.length : 0;
      
      if (calculatedNumberOfQuestions === 0) {
        throw new Error('At least one question is required');
      }

      const quizData = {
        ...values,
        numberOfQuestions: calculatedNumberOfQuestions,
        questions: actualQuestions,
        isAIGenerated: useAI,
      };
      
      // DEBUG: Log the final data being sent
      console.log('🐛 Final quiz data being sent:', JSON.stringify(quizData, null, 2));

      const response = await fetch('/api/activities/quiz/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quizData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create quiz');
      }

      const result = await response.json();
      setFormMessage({ type: 'success', message: 'Quiz created successfully!' });
      
      // Redirect to quiz details or list after success
      setTimeout(() => {
        router.push(`/activities/quiz/${result.quiz.id}`);
      }, 2000);
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      setFormMessage({ type: 'error', message: error.message || 'Failed to create quiz' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto md:p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Quiz</h1>
        <p className="text-muted-foreground">
          Create an interactive quiz for your students with AI assistance or manually
        </p>
      </div>

      {formMessage && (
        <Alert className={`mb-6 ${formMessage.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
          {formMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertTitle>{formMessage.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{formMessage.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details for your quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quiz Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter quiz title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter quiz topic..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter quiz description..."
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Number of Questions is now calculated automatically from actual questions */}
                
                <FormField
                  control={form.control}
                  name="numberOfOptions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options per Question</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value.toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Options</SelectItem>
                            <SelectItem value="3">3 Options</SelectItem>
                            <SelectItem value="4">4 Options</SelectItem>
                            <SelectItem value="5">5 Options</SelectItem>
                            <SelectItem value="6">6 Options</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {useAI ? generatedQuestions.length : (fields.length || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Questions Added</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Settings</CardTitle>
              <CardDescription>Choose which classes and students will take this quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="classIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Classes</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={classes.map(cls => ({ label: cls.name, value: cls.id }))}
                        onChange={field.onChange}
                        selected={field.value}
                        placeholder="Select classes..."
                      />
                    </FormControl>
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
                      <FormLabel className="text-base">Assign to Entire Class</FormLabel>
                      <FormDescription>
                        All students in selected classes will receive this quiz
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
                      <FormLabel>Select Individual Students</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={students.map(student => ({ 
                            label: student.username, 
                            value: student.id 
                          }))}
                          onChange={field.onChange}
                          selected={field.value || []}
                          placeholder={isLoadingStudents ? "Loading students..." : "Select students..."}
                          disabled={isLoadingStudents}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Timing</CardTitle>
              <CardDescription>Set when the quiz should be published and due</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="timeLimitMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Limit (minutes)</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          value={field.value !== null && field.value !== undefined ? field.value : ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? parseInt(value) : null);
                          }}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Set a time limit for live quiz sessions. Leave empty for no time limit.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <Switch
                  id="schedule-publish"
                  checked={enableSchedule}
                  onCheckedChange={setEnableSchedule}
                />
                <label htmlFor="schedule-publish" className="text-sm font-medium">
                  Schedule for later
                </label>
              </div>

              {enableSchedule && (
                <FormField
                  control={form.control}
                  name="scheduledPublishAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Publish Date</FormLabel>
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
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="due-date"
                  checked={enableDueDate}
                  onCheckedChange={setEnableDueDate}
                />
                <label htmlFor="due-date" className="text-sm font-medium">
                  Set due date
                </label>
              </div>

              {enableDueDate && (
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
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
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Question Generation Method */}
          <Card>
            <CardHeader>
              <CardTitle>Question Generation</CardTitle>
              <CardDescription>Choose how you want to create your quiz questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="useAI"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Generate with AI
                      </FormLabel>
                      <FormDescription>
                        Let AI create questions and answers based on your title, topic, and description
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

              {useAI && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    💡 <strong>Tip:</strong> Fill in the title and description above for more relevant AI-generated questions. Upload images to provide visual context for AI - the AI will analyze the images and generate text-based questions about them.
                  </div>

                  {/* Show applied questions summary */}
                  {fields.length > 0 && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>Questions Already Added</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue('useAI', false)}
                          className="text-xs"
                        >
                          View & Edit Questions
                        </Button>
                      </AlertTitle>
                      <AlertDescription>
                        You have {fields.length} question{fields.length !== 1 ? 's' : ''} in your quiz. 
                        Generate more questions to add to this collection, or click above to edit existing ones.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Image Upload Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label 
                        htmlFor="image-upload" 
                        className={`flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer transition-colors ${
                          isUploading 
                            ? 'border-blue-300 bg-blue-50 text-blue-700' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Upload className={`h-4 w-4 ${isUploading ? 'animate-pulse' : ''}`} />
                        {isUploading ? 'Uploading...' : 'Upload Images'}
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      {isUploading && (
                        <div className="text-sm text-blue-600">
                          Please wait...
                        </div>
                      )}
                    </div>

                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {uploadedImages.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Uploaded ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={generateQuestionsWithAI}
                      disabled={isGeneratingQuestions || !topic.trim()}
                      className="flex items-center gap-2"
                    >
                      {isGeneratingQuestions ? (
                        <Brain className="h-4 w-4 animate-pulse" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isGeneratingQuestions 
                        ? 'Generating...' 
                        : generatedQuestions.length > 0 
                          ? 'Generate More Questions' 
                          : 'Generate Questions'
                      }
                    </Button>

                    {generatedQuestions.length > 0 && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPreview(true)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Manage Questions ({generatedQuestions.length})
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={clearGeneratedQuestions}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear All
                        </Button>
                      </>
                    )}
                  </div>

                                     {uploadedImages.length > 0 && (
                     <Alert>
                       <Upload className="h-4 w-4" />
                       <AlertTitle>Images Ready for AI Analysis</AlertTitle>
                       <AlertDescription>
                         {uploadedImages.length} image(s) uploaded. AI will analyze these images and generate text-based questions about the content. Students will only see the text questions, not the images.
                       </AlertDescription>
                     </Alert>
                   )}

                  {generatedQuestions.length > 0 && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Questions Ready</AlertTitle>
                      <AlertDescription>
                        {generatedQuestions.length} questions have been generated and are ready for review. 
                        Use "Manage Questions" to select, edit, and apply them to your quiz.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Questions */}
          {!useAI && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Manual Questions ({fields.length})
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('useAI', true)}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Switch to AI Mode
                  </Button>
                </CardTitle>
                <CardDescription>
                  Review and edit your quiz questions. You can switch back to AI mode to generate more questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {fields.map((field, index) => (
                  <Card key={field.id} className="border-dashed">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`questions.${index}.question`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your question..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: numberOfOptions }).map((_, optionIndex) => (
                          <FormField
                            key={optionIndex}
                            control={form.control}
                            name={`questions.${index}.options.${optionIndex}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Option {optionIndex + 1}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={`Enter option ${optionIndex + 1}...`}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>

                      <FormField
                        control={form.control}
                        name={`questions.${index}.correctAnswer`}
                        render={({ field }) => {
                          // Watch the current question's options for reactive updates
                          const currentOptions = form.watch(`questions.${index}.options`) || [];
                          
                          return (
                            <FormItem>
                              <FormLabel>Correct Answer</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select the correct answer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: numberOfOptions }).map((_, optionIndex) => {
                                      const optionValue = currentOptions[optionIndex] || '';
                                      const hasValue = optionValue && optionValue.trim();
                                      
                                      // Only render SelectItem if there's actual content
                                      if (!hasValue) {
                                        return (
                                          <SelectItem 
                                            key={optionIndex} 
                                            value={`__empty_option_${optionIndex}__`}
                                            disabled={true}
                                          >
                                            Option {optionIndex + 1} (empty)
                                          </SelectItem>
                                        );
                                      }
                                      
                                      return (
                                        <SelectItem 
                                          key={optionIndex} 
                                          value={optionValue}
                                        >
                                          {optionValue}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name={`questions.${index}.explanation`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Explanation (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Explain why this is the correct answer..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuestion}
                  className="w-full border-dashed"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Another Question
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6">
            <Button 
              type="submit" 
              disabled={isSubmitting || (useAI && fields.length === 0)}
              className="flex-1"
            >
              {isSubmitting ? 'Creating Quiz...' : 'Create Quiz'}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      {/* Advanced Question Management Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Manage Generated Questions ({generatedQuestions.length})</span>
              <div className="flex items-center gap-2 text-sm font-normal">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allSelected = selectedQuestions.every(Boolean);
                    setSelectedQuestions(new Array(generatedQuestions.length).fill(!allSelected));
                  }}
                >
                  {selectedQuestions.every(Boolean) ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-muted-foreground">
                  {selectedQuestions.filter(Boolean).length} of {generatedQuestions.length} selected
                </span>
              </div>
            </DialogTitle>
            <DialogDescription>
              Review, edit, and select questions to add to your quiz. Only selected questions will be applied.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {generatedQuestions.map((question, index) => (
              <Card key={index} className={`${selectedQuestions[index] ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions[index] || false}
                        onChange={(e) => {
                          const newSelected = [...selectedQuestions];
                          newSelected[index] = e.target.checked;
                          setSelectedQuestions(newSelected);
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingQuestion(editingQuestion === index ? null : index)}
                      >
                        {editingQuestion === index ? 'Cancel' : 'Edit'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newQuestions = generatedQuestions.filter((_, i) => i !== index);
                          const newSelected = selectedQuestions.filter((_, i) => i !== index);
                          setGeneratedQuestions(newQuestions);
                          setSelectedQuestions(newSelected);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingQuestion === index ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Question</label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => {
                            const newQuestions = [...generatedQuestions];
                            newQuestions[index] = { ...newQuestions[index], question: e.target.value };
                            setGeneratedQuestions(newQuestions);
                          }}
                          className="min-h-20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Options</label>
                        <div className="space-y-2">
                          {question.options.map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <span className="text-sm font-medium w-6">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newQuestions = [...generatedQuestions];
                                  const newOptions = [...newQuestions[index].options];
                                  newOptions[optionIndex] = e.target.value;
                                  newQuestions[index] = { ...newQuestions[index], options: newOptions };
                                  setGeneratedQuestions(newQuestions);
                                }}
                                className="flex-1"
                              />
                              <input
                                type="radio"
                                name={`correct-${index}`}
                                checked={option === question.correctAnswer}
                                onChange={() => {
                                  const newQuestions = [...generatedQuestions];
                                  newQuestions[index] = { ...newQuestions[index], correctAnswer: option };
                                  setGeneratedQuestions(newQuestions);
                                }}
                                className="h-4 w-4 text-blue-600"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Explanation</label>
                        <Textarea
                          value={question.explanation || ''}
                          onChange={(e) => {
                            const newQuestions = [...generatedQuestions];
                            newQuestions[index] = { ...newQuestions[index], explanation: e.target.value };
                            setGeneratedQuestions(newQuestions);
                          }}
                          placeholder="Optional explanation..."
                        />
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <p className="font-medium mb-4">{question.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        {question.options.map((option: string, optionIndex: number) => (
                          <div 
                            key={optionIndex}
                            className={`p-3 rounded-lg border ${
                              option === question.correctAnswer 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <span className="font-medium">
                              {String.fromCharCode(65 + optionIndex)}. 
                            </span>
                            {option}
                            {option === question.correctAnswer && (
                              <span className="text-green-600 ml-2">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applySelectedQuestions}
              disabled={selectedQuestions.filter(Boolean).length === 0}
            >
              Apply Selected Questions ({selectedQuestions.filter(Boolean).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 