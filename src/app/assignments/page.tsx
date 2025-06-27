import { AuthService } from "../../../lib/services/auth.service";
import { AssignmentsService } from "../../../lib/services/assignments.service";
import { StudentAssignmentsList } from "@/components/assignments/student-assignments-list";

export default async function AssignmentsPage() {
    const currentUser = await AuthService.getAuthenticatedUser();
      const assignments = await AssignmentsService.getMyAssignments(currentUser);
      let assignmnetText = 'My Assignments';

      if (currentUser.customRole === 'ADMIN') {
        assignmnetText = 'All Assignments';
      } else if (currentUser.customRole === 'TEACHER') {
        assignmnetText = 'Assignments created by me';
      } else if (currentUser.customRole === 'STUDENT') {
        assignmnetText = 'My Assignments';
      }
      
      
      return (
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{assignmnetText}</h1>
            {currentUser.customRole === 'STUDENT' && <p className="text-muted-foreground mt-2">
              View and complete your assigned tasks
            </p>}
          </div>
          <StudentAssignmentsList assignments={assignments} />
        </div>
      );
}