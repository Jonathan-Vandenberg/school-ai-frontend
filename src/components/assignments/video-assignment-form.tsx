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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Trash2, Eye } from "lucide-react";
import { Class, Language, User } from "@prisma/client";
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
  DialogClose,
} from "@/components/ui/dialog";
import { VideoAssignmentPreview } from "./video-assignment-preview";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  videoUrl: z.string().url("Please enter a valid YouTube URL"),
  languageId: z.string().min(1, "Language is required"),
  questions: z.array(z.object({
    text: z.string().min(1, "Question text cannot be empty."),
    answer: z.string().min(1, "Answer text cannot be empty."),
  })).min(1, "At least one question is required."),
  classIds: z.array(z.string()).min(1, "At least one class must be selected."),
  studentIds: z.array(z.string()).optional(),
  assignToEntireClass: z.boolean(),
  scheduledPublishAt: z.date().optional().nullable(),
});

type VideoFormValues = z.infer<typeof formSchema>;

interface VideoAssignmentFormProps {
  data: {
    languages: Language[];
    classes: Class[];
  };
}

export function VideoAssignmentForm({ data }: VideoAssignmentFormProps) {
  const router = useRouter();
  const { languages, classes } = data;
  const [students, setStudents] = useState<User[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      videoUrl: "",
      languageId: "",
      questions: [{ text: "", answer: "" }],
      classIds: [],
      studentIds: [],
      assignToEntireClass: true,
      scheduledPublishAt: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  const selectedClasses = form.watch("classIds");
  const assignToEntireClass = form.watch("assignToEntireClass");

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

  async function onSubmit(values: VideoFormValues) {
    setIsSubmitting(true);
    setFormMessage(null);
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creationType: 'video',
          ...values,
        }),
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
                    <Input placeholder="e.g., The Past Tense" {...field} />
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
                    <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="languageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

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
                    {isLoadingStudents ? <p>Loading students...</p> : (
                      <Select onValueChange={(value) => field.onChange([...(field.value || []), value])}>
                         <FormControl>
                           <SelectTrigger>
                             <SelectValue placeholder="Select students" />
                           </SelectTrigger>
                         </FormControl>
                         <SelectContent>
                           {students.map((s) => (
                             <SelectItem key={s.id} value={s.id}>
                               {s.username}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              Add questions that students will answer after watching the video.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md">
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question {index + 1}</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., What did the character do?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`questions.${index}.answer`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Answer</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., They went to the park." {...field} />
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
            <CardTitle>Scheduling</CardTitle>
            <CardDescription>
              Optional: Schedule this assignment to be published at a future date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Scheduling</FormLabel>
                <FormDescription>
                  If disabled, the assignment will be published immediately.
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
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
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

        {formMessage && (
          <Alert variant={formMessage.type === 'error' ? 'destructive' : 'default'}>
            {formMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{formMessage.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>
              {formMessage.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Assignment Preview</DialogTitle>
                <DialogDescription>
                  This is how the assignment will appear to students.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto p-4">
                <VideoAssignmentPreview
                  topic={currentFormData.topic}
                  videoUrl={currentFormData.videoUrl}
                  questions={currentFormData.questions}
                />
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Assignment"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 