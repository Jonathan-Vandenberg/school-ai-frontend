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
  DialogTitle,
} from "@/components/ui/dialog";
// import { VideoAssignmentPreview } from "./video-assignment-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { LevelSelector } from "@/components/templates/level-selector";
import { LevelType, CEFRLevel, GradeLevel } from "@prisma/client";

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
  levels: z.array(z.object({
    levelType: z.nativeEnum(LevelType),
    cefrLevel: z.nativeEnum(CEFRLevel).optional(),
    gradeLevel: z.nativeEnum(GradeLevel).optional(),
  })).min(1, 'At least one level must be selected'),
});

type PronunciationFormValues = z.infer<typeof formSchema>;

interface PronunciationAssignmentFormProps {
  data: {
    classes: Class[];
  };
}

export function PronunciationAssignmentForm({ data }: PronunciationAssignmentFormProps) {
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

  const form = useForm<PronunciationFormValues>({
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
      levels: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
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

  async function onSubmit(values: PronunciationFormValues) {
    setIsSubmitting(true);
    setFormMessage(null);
    try {
      const response = await fetch("/api/assignments/pronunciation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creationType: "PRONUNCIATION",
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

  const currentFormData = form.watch();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Pronunciation Assignment Details</CardTitle>
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
                      placeholder="Consonant clusters"
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
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Add words that students will pronounce.
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
                          <Input placeholder="The 'st' sound" {...field} />
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
                            placeholder="The star shines in the sky.
                                          A little cat sits on the step.
                                          We stop to see the street.
                                          I like sticky sweets."
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
            <CardTitle>Educational Levels</CardTitle>
            <CardDescription>
              Select the CEFR or Grade levels this assignment is appropriate for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="levels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Levels</FormLabel>
                  <FormControl>
                    <LevelSelector
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Select at least one educational level for this assignment.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            {/* {!isPreviewAvailable() && (
              <p className="text-xs text-muted-foreground">
                Preview requires: topic, video URL, and at least one complete
                question
              </p>
            )} */}
            <div className="flex gap-4">
              <Dialog>
                {/* <DialogTrigger asChild>
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
                </DialogTrigger> */}
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
                      {/* <VideoAssignmentPreview
                        topic={currentFormData.topic}
                        videoUrl={currentFormData.videoUrl}
                        questions={currentFormData.questions}
                        transcriptContent={transcriptContent}
                      /> */}
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
