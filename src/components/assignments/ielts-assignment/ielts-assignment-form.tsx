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
import { PlusCircle, Trash2, Eye, ArrowLeft, BookOpen, MessageCircle, Volume2 } from "lucide-react";
import { Class, User } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MultiSelect } from "@/components/ui/multi-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { IELTSAssignmentPreview } from "./ielts-assignment-preview";

// Unified form schema for all IELTS assignment types
const formSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  classIds: z.array(z.string()).min(1, "At least one class must be selected."),
  studentIds: z.array(z.string()).optional(),
  assignToEntireClass: z.boolean(),
  accent: z.enum(["us", "uk"]),
  
  // For reading and pronunciation assignments
  passages: z.array(z.object({
    text: z.string().min(1, "Passage text cannot be empty."),
    title: z.string().optional(),
  })).optional(),
  
  // For question-answer assignments
  questions: z.array(z.object({
    text: z.string().min(1, "Question text cannot be empty."),
    topic: z.string().optional(),
    expectedLevel: z.enum(["beginner", "intermediate", "advanced"]),
  })).optional(),
  context: z.string().optional(),
}).refine((data) => {
  // Custom validation logic will be handled in the component
  return true;
}, { message: "Invalid form data" });

type FormValues = z.infer<typeof formSchema>;

interface IELTSAssignmentFormProps {
  data: {
    classes: Class[];
  };
  subtype: string;
}

export function IELTSAssignmentForm({ data, subtype }: IELTSAssignmentFormProps) {
  const router = useRouter();
  const { classes } = data;
  const [students, setStudents] = useState<User[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const getDefaultValues = (): FormValues => {
    const base = {
      topic: "",
      classIds: [],
      studentIds: [],
      assignToEntireClass: true,
      accent: "us" as const,
    };

    if (subtype === "reading" || subtype === "pronunciation") {
      return {
        ...base,
        passages: [{ text: "", title: "" }],
        questions: undefined,
        context: undefined,
      };
    } else if (subtype === "question-answer") {
      return {
        ...base,
        passages: undefined,
        questions: [{ text: "", topic: "", expectedLevel: "intermediate" as const }],
        context: "",
      };
    }

    return {
      ...base,
      passages: undefined,
      questions: undefined,
      context: undefined,
    };
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Field arrays for dynamic content
  const passagesFieldArray = (subtype === "reading" || subtype === "pronunciation") ? 
    useFieldArray({
      control: form.control,
      name: "passages",
    }) : null;

  const questionsFieldArray = subtype === "question-answer" ? 
    useFieldArray({
      control: form.control,
      name: "questions",
    }) : null;

  const selectedClasses = form.watch("classIds");
  const assignToEntireClass = form.watch("assignToEntireClass");

  // Fetch students for selected classes
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

  // Handle preview
  function onPreview(values: FormValues) {
    const previewFormData = {
      ...values,
      subtype,
    };
    setPreviewData(previewFormData);
    setIsPreviewMode(true);
  }

  // Handle back from preview
  function handleBackFromPreview() {
    setIsPreviewMode(false);
  }

  // Handle accept from preview (actually create the assignment)
  async function handleAcceptFromPreview() {
    if (!previewData) return;

    setIsSubmitting(true);
    setFormMessage(null);
    
    try {
      // Determine the correct API endpoint based on subtype
      let apiEndpoint = '';
      switch (subtype) {
        case 'question-answer':
          apiEndpoint = '/api/ielts/question-and-answer';
          break;
        case 'pronunciation':
          apiEndpoint = '/api/ielts/pronunciation';
          break;
        case 'reading':
          apiEndpoint = '/api/ielts/reading';
          break;
        default:
          throw new Error('Invalid assignment subtype');
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }
      
      setFormMessage({ type: 'success', message: 'Assignment created! Redirecting...' });

      // Redirect after a short delay to allow user to see the message
      setTimeout(() => {
        router.push('/assignments');
        router.refresh();
      }, 1500);

    } catch (error) {
      setFormMessage({ type: 'error', message: error instanceof Error ? error.message : 'An unexpected error occurred.' });
      setIsPreviewMode(false); // Go back to form on error
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(values: FormValues) {
    // For now, always go to preview mode instead of directly creating
    onPreview(values);
  }

  const getAssignmentTypeInfo = () => {
    switch (subtype) {
      case "reading":
        return {
          title: "Reading Assignment",
          description: "Students will read the provided text aloud and receive pronunciation assessment",
          icon: BookOpen,
          color: "text-blue-600",
        };
      case "question-answer":
        return {
          title: "Question & Answer Assignment", 
          description: "Students will answer open-ended questions with comprehensive language analysis",
          icon: MessageCircle,
          color: "text-green-600",
        };
      case "pronunciation":
        return {
          title: "Pronunciation Assignment",
          description: "Students will practice pronunciation with detailed phoneme-level feedback",
          icon: Volume2,
          color: "text-purple-600",
        };
      default:
        return {
          title: "IELTS Assignment",
          description: "Create an IELTS speaking practice assignment",
          icon: BookOpen,
          color: "text-gray-600",
        };
    }
  };

  const typeInfo = getAssignmentTypeInfo();
  const Icon = typeInfo.icon;

  // If preview mode is active, show the preview component
  if (isPreviewMode && previewData) {
    return (
      <IELTSAssignmentPreview
        data={previewData}
        onBack={handleBackFromPreview}
        onAccept={handleAcceptFromPreview}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/assignments/create?type=ielts')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to IELTS Types
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`h-8 w-8 ${typeInfo.color}`} />
          <h1 className="text-3xl font-bold">{typeInfo.title}</h1>
        </div>
        <p className="text-muted-foreground">{typeInfo.description}</p>
      </div>

      {formMessage && (
        <Alert className={`mb-6 ${formMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{formMessage.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{formMessage.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter assignment title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select accent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="us">US English</SelectItem>
                        <SelectItem value="uk">UK English</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Content Section - Changes based on subtype */}
          {(subtype === "reading" || subtype === "pronunciation") && passagesFieldArray && (
            <Card>
              <CardHeader>
                <CardTitle>Reading Passages</CardTitle>
                <CardDescription>
                  Add text passages that students will read aloud
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passagesFieldArray.fields.map((field, index) => (
                  <div key={field.id} className="flex items-start justify-between w-full gap-4 p-4 border rounded-md">
                    <div className="flex-grow space-y-4">
                                             <FormField
                         control={form.control}
                         name={`passages.${index}.title`}
                         render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passage Title (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Environmental Protection" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                                             <FormField
                         control={form.control}
                         name={`passages.${index}.text`}
                         render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passage Text</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter the text that students should read aloud..."
                                {...field}
                                rows={6}
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
                      onClick={() => passagesFieldArray.remove(index)}
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
                  onClick={() => passagesFieldArray.append({ text: "", title: "" })}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Passage
                </Button>
              </CardContent>
            </Card>
          )}

          {subtype === "question-answer" && questionsFieldArray && (
            <>
              {/* Context for Q&A */}
              <Card>
                <CardHeader>
                  <CardTitle>Context (Optional)</CardTitle>
                  <CardDescription>
                    Provide background information or context for the questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="context"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Enter context information that students should consider when answering..."
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    Add open-ended questions for students to answer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {questionsFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="flex items-start justify-between w-full gap-4 p-4 border rounded-md">
                      <div className="flex-grow space-y-4">
                                                 <FormField
                           control={form.control}
                           name={`questions.${index}.topic`}
                           render={({ field }) => (
                            <FormItem>
                              <FormLabel>Topic (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Technology, Environment, Education" {...field} />
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
                              <FormLabel>Question</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter an open-ended question for students to answer..."
                                  {...field}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                                                 <FormField
                           control={form.control}
                           name={`questions.${index}.expectedLevel`}
                           render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expected Language Level</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select expected level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="beginner">Beginner (A1-A2)</SelectItem>
                                  <SelectItem value="intermediate">Intermediate (B1-B2)</SelectItem>
                                  <SelectItem value="advanced">Advanced (C1-C2)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => questionsFieldArray.remove(index)}
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
                    onClick={() => questionsFieldArray.append({ text: "", topic: "", expectedLevel: "intermediate" })}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Assignment Target */}
          <Card>
            <CardHeader>
              <CardTitle>Assign To</CardTitle>
              <CardDescription>Select which classes or students will receive this assignment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="classIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classes</FormLabel>
                    <Select onValueChange={(value) => field.onChange([value])} defaultValue={field.value?.[0]}>
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
                      <FormLabel className="text-base">Assign to Entire Class</FormLabel>
                      <FormDescription>
                        If toggled, the assignment will be given to all students in the selected class(es).
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
                          options={students.map(student => ({
                            value: student.id,
                            label: student.username || student.email,
                          }))}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder={isLoadingStudents ? "Loading students..." : "Select students..."}
                          emptyText="No available students for the selected class."
                          disabled={isLoadingStudents || students.length === 0}
                        />
                      </FormControl>
                      <FormDescription>
                        If you don't assign to the entire class, you must select individual students.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? "Creating..." : `Preview ${typeInfo.title}`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
