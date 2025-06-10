import { AuthService } from "../../../lib/services/auth.service";
import { AssignmentsService } from "../../../lib/services/assignments.service";
import { StudentAssignmentsList } from "@/components/assignments/student-assignments-list";

export default async function AssignmentsPage() {
    const currentUser = await AuthService.getAuthenticatedUser();
      const assignments = await AssignmentsService.getMyAssignments(currentUser);
      
      return (
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Assignments</h1>
            <p className="text-muted-foreground mt-2">
              View and complete your assigned tasks
            </p>
          </div>
          <StudentAssignmentsList assignments={assignments} />
        </div>
      );
}