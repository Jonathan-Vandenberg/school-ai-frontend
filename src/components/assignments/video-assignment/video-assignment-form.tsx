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
import { PlusCircle, Trash2, Eye, Clock } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { VideoAssignmentPreview } from "./video-assignment-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

const formSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  videoUrl: z.string().url("Please enter a valid YouTube URL"),
  questions: z
    .array(
      z.object({
        text: z.string().min(1, "Question text cannot be empty."),
        answer: z.string().min(1, "Answer text cannot be empty."),
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
});

type VideoFormValues = z.infer<typeof formSchema>;

interface VideoAssignmentFormProps {
  data: {
    classes: Class[];
  };
}

export function VideoAssignmentForm({ data }: VideoAssignmentFormProps) {
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

  // State for video transcript checking
  const [videoHasTranscript, setVideoHasTranscript] = useState<boolean | null>(
    null
  );
  const [transcriptContent, setTranscriptContent] = useState<string | null>(
    null
  );
  const [transcriptLanguage, setTranscriptLanguage] = useState<string | null>(
    null
  );
  const [isCheckingTranscript, setIsCheckingTranscript] = useState(false);

  // State for tracking assignment analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [improvedQuestions, setImprovedQuestions] = useState<
    { text: string; answer: string }[]
  >([]);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      videoUrl: "",
      questions: [{ text: "", answer: "" }],
      classIds: [],
      studentIds: [],
      assignToEntireClass: true,
      scheduledPublishAt: null,
      dueDate: null,
      hasTranscript: false,
      languageId: "", // Will default to English on backend
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const selectedClasses = form.watch("classIds");
  const assignToEntireClass = form.watch("assignToEntireClass");
  const videoUrl = form.watch("videoUrl");

  // Check for video transcript when URL changes
  useEffect(() => {
    const checkVideoTranscript = async () => {
      if (!videoUrl || !z.string().url().safeParse(videoUrl).success) {
        // Only reset if we don't have saved transcript data
        if (!sessionStorage.getItem("assignment-transcript-content")) {
          setVideoHasTranscript(null);
          setTranscriptContent(null);
          setTranscriptLanguage(null);
          setImprovedQuestions([]);
        }
        return;
      }

      // Skip API call if we already have transcript data for this URL from restoration
      if (transcriptContent !== null || videoHasTranscript !== null) {
        console.log("Skipping transcript check - data already available");
        return;
      }

      setIsCheckingTranscript(true);
      setImprovedQuestions([]); // Reset improved questions on new URL
      setVideoHasTranscript(null); // Reset transcript state

      try {
        const response = await fetch("/api/check-video-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl }),
        });

        if (!response.ok) {
          throw new Error("Failed to check video transcript");
        }

        const data = await response.json();
        setVideoHasTranscript(data.hasTranscript);
        setTranscriptContent(data.transcriptContent);
        setTranscriptLanguage(data.transcriptLang);
        form.setValue("hasTranscript", data.hasTranscript);
      } catch (error) {
        console.error("Error checking transcript:", error);
        setVideoHasTranscript(false);
        setTranscriptContent(null);
        setTranscriptLanguage(null);
      } finally {
        setIsCheckingTranscript(false);
      }
    };

    const debounceId = setTimeout(() => {
      checkVideoTranscript();
    }, 500); // Reduced debounce time for better responsiveness

    return () => clearTimeout(debounceId);
  }, [videoUrl, form, transcriptContent, videoHasTranscript]);

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

  // Function to analyze transcript and suggest questions
  const suggestQuestionsFromTranscript = async () => {
    if (!transcriptContent) {
      setFormMessage({
        type: "error",
        message: "No transcript available to analyze.",
      });
      return;
    }

    setIsAnalyzing(true);
    setFormMessage(null); // Clear previous messages

    try {
      const formData = form.getValues();

      const response = await fetch("/api/analyze-video-assignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcriptContent,
          topic: formData.topic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.improvedQuestions?.questions) {
        const newQuestions: { text: string; answer: string }[] =
          result.improvedQuestions.questions;

        const existingQuestionsSet = new Set(
          improvedQuestions.map(
            (q) =>
              `${q.text.trim().toLowerCase()}-${q.answer.trim().toLowerCase()}`
          )
        );

        const uniqueNewQuestions = newQuestions.filter((newQ) => {
          const newQKey = `${newQ.text.trim().toLowerCase()}-${newQ.answer
            .trim()
            .toLowerCase()}`;
          return !existingQuestionsSet.has(newQKey);
        });

        if (uniqueNewQuestions.length > 0) {
          setImprovedQuestions((prev) => [...prev, ...uniqueNewQuestions]);
          setFormMessage({
            type: "success",
            message: `Successfully generated ${uniqueNewQuestions.length} new questions.`,
          });
        } else {
          setFormMessage({
            type: "success",
            message: "No new unique questions were found.",
          });
        }
      } else {
        throw new Error(result.error || "AI analysis failed");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate AI questions.";
      setFormMessage({ type: "error", message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyOneImprovedQuestion = (question: {
    text: string;
    answer: string;
  }) => {
    // Check if the first question is empty and replace it, otherwise append.
    const firstQuestion = form.getValues("questions")[0];
    if (
      form.getValues("questions").length === 1 &&
      !firstQuestion.text &&
      !firstQuestion.answer
    ) {
      replace([question]);
    } else {
      append(question);
    }

    // Remove the used question from the improved questions list
    setImprovedQuestions((prev) =>
      prev.filter(
        (q) =>
          !(
            q.text.trim() === question.text.trim() &&
            q.answer.trim() === question.answer.trim()
          )
      )
    );

    setFormMessage({ type: "success", message: "Question added." });
  };

  const applyAllImprovedQuestions = () => {
    if (improvedQuestions.length === 0) return;
    replace(improvedQuestions);

    // Clear all improved questions since they've all been applied
    setImprovedQuestions([]);

    setFormMessage({
      type: "success",
      message: "All suggested questions have been applied.",
    });
  };

  // Check if preview is available - all required fields for API evaluation
  const isPreviewAvailable = () => {
    const data = currentFormData;

    // Basic required fields
    if (!data.topic?.trim() || !data.videoUrl?.trim()) {
      return false;
    }

    // Must have at least one complete question
    const hasValidQuestions =
      data.questions &&
      data.questions.length > 0 &&
      data.questions.some((q) => q.text?.trim() && q.answer?.trim());

    return hasValidQuestions;
  };

  async function onSubmit(values: VideoFormValues) {
    setIsSubmitting(true);
    setFormMessage(null);
    try {
      const response = await fetch("/api/assignments/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creationType: "video",
          ...values,
          videoTranscript: transcriptContent || "",
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

  const currentFormData = form.watch();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Video Assignment Details</CardTitle>
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
                      placeholder="Top 10 things to remember when learning IELTS"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Video URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCheckingTranscript && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Checking...</AlertTitle>
                <AlertDescription>
                  Checking for transcript availability...
                </AlertDescription>
              </Alert>
            )}

            {videoHasTranscript === false && !isCheckingTranscript && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Transcript</AlertTitle>
                <AlertDescription>
                  No transcript is available for this video. Please choose
                  another or add questions manually.
                </AlertDescription>
              </Alert>
            )}

            {videoHasTranscript &&
              transcriptContent &&
              !isCheckingTranscript && (
                <Alert variant="default">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Transcript Available!</AlertTitle>
                  <AlertDescription>
                    <details className="mt-2 cursor-pointer">
                      <summary className="font-semibold">
                        View Transcript
                      </summary>
                      <div className="mt-2 p-2 rounded-md max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {transcriptContent}
                      </div>
                    </details>
                    {improvedQuestions.length === 0 && (
                      <Button
                        type="button"
                        onClick={suggestQuestionsFromTranscript}
                        disabled={isAnalyzing}
                        className="mt-4"
                      >
                        {isAnalyzing
                          ? "Generating..."
                          : "Generate Questions from Transcript"}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>

        {improvedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Suggested Questions</CardTitle>
              <CardDescription>
                These questions have been generated by AI based on the video
                transcript. You can add them individually or all at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-96 overflow-y-auto pr-4">
                {improvedQuestions.map((q, i) => (
                  <div key={i} className="p-4 border rounded-md">
                    <p className="font-semibold">
                      {i + 1}. {q.text}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-semibold">Answer:</span> {q.answer}
                    </p>
                    <div className="flex justify-end mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => applyOneImprovedQuestion(q)}
                      >
                        Use This Question
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 justify-end">
                <Button type="button" onClick={applyAllImprovedQuestions}>
                  Use All Suggested Questions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={suggestQuestionsFromTranscript}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing
                    ? "Generating more..."
                    : "Generate More Questions"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              Add questions that students will answer after watching the video.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-start justify-between w-full gap-4 p-4 border rounded-md"
              >
                <div className="flex-grow gap-4">
                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question {index + 1}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., What did the character do?"
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
              onClick={() => append({ text: "", answer: "" })}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
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
            <div className="flex gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isPreviewAvailable()}
                    title={
                      !isPreviewAvailable()
                        ? "Please fill in topic, video URL, and at least one complete question to preview"
                        : "Preview assignment as students will experience it"
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0">
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
                      <VideoAssignmentPreview
                        topic={currentFormData.topic}
                        videoUrl={currentFormData.videoUrl}
                        questions={currentFormData.questions}
                        transcriptContent={transcriptContent}
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
