"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VideoAssignmentForm } from "@/components/assignments/video-assignment/video-assignment-form";
import { Language, Class } from "@prisma/client";

interface CreateAssignmentStateProps {
  initialData: {
    languages: Language[];
    classes: Class[];
  };
}

export function CreateAssignmentState({ initialData }: CreateAssignmentStateProps) {
  const [assignmentType, setAssignmentType] = useState("video");

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="assignment-type">Assignment Type</Label>
        <Select value={assignmentType} onValueChange={setAssignmentType}>
          <SelectTrigger id="assignment-type" className="w-[280px]">
            <SelectValue placeholder="Select an assignment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video Assignment</SelectItem>
            <SelectItem value="vocabulary">Vocabulary Quiz</SelectItem>
            <SelectItem value="ielts">IELTS Practice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {assignmentType === "video" && <VideoAssignmentForm data={initialData} />}
    </div>
  );
} 