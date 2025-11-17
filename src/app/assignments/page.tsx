'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { StudentAssignmentsList } from "@/components/assignments/student-assignments-list";
import { AssignmentWithDetails } from "../../../lib/services/assignments.service";
import { Loader2 } from "lucide-react";

export default function AssignmentsPage() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const pageSize = 12; // Show 12 assignments per page
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchAssignments = useCallback(async (page: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Add pagination parameters to the API call
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      
      const response = await fetch(`/api/assignments?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const result = await response.json();
      
      let newAssignments: AssignmentWithDetails[] = [];
      let paginationInfo = null;
      
      // Handle the new response format with success and data properties
      if (result.success && result.data) {
        newAssignments = result.data;
        paginationInfo = result.pagination;
      } else if (Array.isArray(result)) {
        // Handle legacy response format
        newAssignments = result;
      } else {
        newAssignments = result.data || [];
      }
      
      if (append) {
        // Append new assignments to existing ones
        setAssignments(prev => {
          const updated = [...prev, ...newAssignments];
          // Update total if no pagination info
          if (!paginationInfo) {
            setTotal(updated.length);
          }
          return updated;
        });
      } else {
        // Replace assignments for initial load
        setAssignments(newAssignments);
        if (!paginationInfo) {
          setTotal(newAssignments.length);
        }
      }
      
      // Update pagination info
      if (paginationInfo) {
        setTotal(paginationInfo.total);
        setHasMore(page < paginationInfo.totalPages);
        setCurrentPage(page);
      } else {
        // If no pagination info, check if we got a full page
        setHasMore(newAssignments.length === pageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pageSize]);

  // Initial load
  useEffect(() => {
    if (session?.user) {
      fetchAssignments(1, false);
    }
  }, [session, fetchAssignments]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchAssignments(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, currentPage, fetchAssignments]);

  // Refresh assignments when the user returns to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && assignments.length > 0) {
        // Reset and reload from page 1
        setAssignments([]);
        setCurrentPage(1);
        setHasMore(true);
        fetchAssignments(1, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [assignments.length, fetchAssignments]);

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
      <div>
        <div className="mb-8 md:container mx-auto md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold">{assignmentText}</h1>
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
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{assignmentText}</h1>
        {session.user?.role === 'STUDENT' && (
          <p className="text-muted-foreground mt-2">
            View and complete your assigned tasks
          </p>
        )}
        {total > 0 && (
          <p className="text-muted-foreground text-sm mt-1">
            {assignments.length} of {total} assignments
          </p>
        )}
      </div>
      <StudentAssignmentsList assignments={assignments} />
      
      {/* Infinite scroll trigger and loading indicator */}
      <div ref={observerTarget} className="flex items-center justify-center py-8">
        {loadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more assignments...</span>
          </div>
        )}
        {!hasMore && assignments.length > 0 && (
          <p className="text-muted-foreground text-sm">
            You've reached the end of the list
          </p>
        )}
      </div>
    </div>
  );
}