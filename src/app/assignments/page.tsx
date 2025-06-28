'use client'

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StudentAssignmentsList } from "@/components/assignments/student-assignments-list";
import { AssignmentWithDetails } from "../../../lib/services/assignments.service";

export default function AssignmentsPage() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assignments');
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const data = await response.json();
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Refresh assignments when the user returns to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAssignments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (!session) {
    return <div>Loading...</div>;
  }

  let assignmentText = 'My Assignments';
  if (session.user?.role === 'ADMIN') {
    assignmentText = 'All Assignments';
  } else if (session.user?.role === 'TEACHER') {
    assignmentText = 'Assignments created by me';
  } else if (session.user?.role === 'STUDENT') {
    assignmentText = 'My Assignments';
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{assignmentText}</h1>
          {session.user?.role === 'STUDENT' && (
            <p className="text-muted-foreground mt-2">
              View and complete your assigned tasks
            </p>
          )}
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading assignments...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{assignmentText}</h1>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{assignmentText}</h1>
        {session.user?.role === 'STUDENT' && (
          <p className="text-muted-foreground mt-2">
            View and complete your assigned tasks
          </p>
        )}
      </div>
      <StudentAssignmentsList assignments={assignments} />
    </div>
  );
}