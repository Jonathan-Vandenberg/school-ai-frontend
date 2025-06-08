import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { VideoAssignmentForm } from "@/components/assignments/video-assignment-form";
import { ClassesService } from "@/lib/services/classes.service";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateAssignmentState } from "./state";
import { getServerSession } from "next-auth/next";

export default async function CreateAssignmentPage() {
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Or a more appropriate unauthorized view
    return <p>Not Authorized</p>;
  }

  const languages = await prisma.language.findMany();
  // @ts-ignore
  const { classes } = await ClassesService.listClasses(session.user, { page: 1, limit: 100 }); // Assuming max 100 classes

  const formData = { languages, classes };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Assignment</CardTitle>
          <CardDescription>
            Select the type of assignment you want to create and fill out the
            details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <CreateAssignmentState initialData={formData} />
        </CardContent>
      </Card>
    </div>
  );
} 