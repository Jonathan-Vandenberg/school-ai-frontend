import { IELTSAssignmentForm } from "@/components/assignments/ielts-assignment/ielts-assignment-form";
import { ClassesService } from "../../../../../lib/services/classes.service";
import { AuthService } from "../../../../../lib/services/auth.service";
import { notFound, redirect } from "next/navigation";

interface IELTSAssignmentPageProps {
  searchParams: Promise<{ subtype?: string }>;
}

export default async function IELTSAssignmentPage({ searchParams }: IELTSAssignmentPageProps) {
  const { subtype } = await searchParams;
  
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

    // If no subtype is provided, redirect back to main create page with type=ielts
    // This will show the cards
    if (!subtype) {
      redirect('/assignments/create?type=ielts');
    }

    // Validate subtype
    const validSubtypes = ['reading', 'question-answer', 'pronunciation'];
    if (!validSubtypes.includes(subtype)) {
      redirect('/assignments/create?type=ielts');
    }

    return <IELTSAssignmentForm data={formData} subtype={subtype} />;
    
  } catch (error: any) {
    console.error('Error in IELTSAssignmentPage:', error);
    
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