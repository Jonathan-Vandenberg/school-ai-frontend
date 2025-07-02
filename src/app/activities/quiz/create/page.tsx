import { QuizForm } from "@/components/activities/quiz-form";
import { ClassesService } from "../../../../../lib/services/classes.service";
import { AuthService } from "../../../../../lib/services/auth.service";
import { notFound, redirect } from "next/navigation";

export default async function CreateQuizPage() {
  try {
    // Get authenticated user using the proper service
    const currentUser = await AuthService.getAuthenticatedUser();
    
    // Ensure user has permission to create quizzes
    AuthService.requireTeacherOrAdmin(currentUser);

    // Fetch classes using the proper service method
    const { classes } = await ClassesService.listClasses(currentUser, { 
      page: 1, 
      limit: 100 
    });

    const formData = { classes };

    return <QuizForm data={formData} />;
  } catch (error: any) {
    console.error('Error in CreateQuizPage:', error);
    
    // Handle specific authentication errors
    if (error.message?.includes('No valid session') || error.message?.includes('not found')) {
      redirect('/auth/signin');
    }
    
    if (error.message?.includes('Insufficient permissions')) {
      return (
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to create quizzes. Only teachers and administrators can create quizzes.
          </p>
        </div>
      );
    }

    // Handle other errors
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground">
          An error occurred while loading the quiz creation page. Please try again later.
        </p>
        <p className="text-sm text-red-600 mt-2">
          {error.message || 'Unknown error'}
        </p>
      </div>
    );
  }
} 