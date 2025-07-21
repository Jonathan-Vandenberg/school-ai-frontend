import { VideoAssignmentForm } from "@/components/assignments/video-assignment/video-assignment-form";
import { IELTSAssignmentCards } from "@/components/assignments/ielts-assignment/ielts-assignment-cards";
import { ClassesService } from "../../../../lib/services/classes.service";
import { AuthService } from "../../../../lib/services/auth.service";
import { notFound, redirect } from "next/navigation";

interface CreateAssignmentPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function CreateAssignmentPage({ searchParams }: CreateAssignmentPageProps) {
  const { type } = await searchParams;
  
  try {
    // Get authenticated user using the proper service
    const currentUser = await AuthService.getAuthenticatedUser();
    
    // Ensure user has permission to create assignments
    AuthService.requireTeacherOrAdmin(currentUser);

    // Fetch classes using the proper service method
    const { classes } = await ClassesService.listClasses(currentUser, { 
      page: 1, 
      limit: 100 
    });

    const formData = { classes };

    switch (type) {
      case "video":
        return <VideoAssignmentForm data={formData} />;
      case "reading":
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Create Reading Assignment</h1>
            <p className="text-muted-foreground">
              Reading assignment creation is coming soon. Please check back later.
            </p>
          </div>
        );
      case "pronunciation":
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Create Pronunciation Assignment</h1>
            <p className="text-muted-foreground">
              Pronunciation assignment creation is coming soon. Please check back later.
            </p>
          </div>
        );
      case "image":
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Create Image Assignment</h1>
            <p className="text-muted-foreground">
              Image assignment creation is coming soon. Please check back later.
            </p>
          </div>
        );
      case "ielts":
        return <IELTSAssignmentCards data={formData} />;
      case "custom":
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Create Custom Assignment</h1>
            <p className="text-muted-foreground">
              Custom assignment creation is coming soon. Please check back later.
            </p>
          </div>
        );
      default:
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Create Assignment</h1>
            <p className="text-muted-foreground">
              Please select an assignment type from the previous page, or the assignment type "{type}" is not yet supported.
            </p>
          </div>
        );
    }
  } catch (error: any) {
    console.error('Error in CreateAssignmentPage:', error);
    
    // Handle specific authentication errors
    if (error.message?.includes('No valid session') || error.message?.includes('not found')) {
      redirect('/auth/signin');
    }
    
    if (error.message?.includes('Insufficient permissions')) {
      return (
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to create assignments. Only teachers and administrators can create assignments.
          </p>
        </div>
      );
    }

    // Handle other errors
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground">
          An error occurred while loading the assignment creation page. Please try again later.
        </p>
        <p className="text-sm text-red-600 mt-2">
          {error.message || 'Unknown error'}
        </p>
      </div>
    );
  }
} 