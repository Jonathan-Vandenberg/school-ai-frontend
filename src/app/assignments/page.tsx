'use client'

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StudentAssignmentsList } from "@/components/assignments/student-assignments-list";
import { AssignmentWithDetails } from "../../../lib/services/assignments.service";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AssignmentsPage() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // Show 12 assignments per page
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  const fetchAssignments = async (page = currentPage) => {
    try {
      setLoading(true);
      
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
      
      // Handle the new response format with success and data properties
      if (result.success && result.data) {
        setAssignments(result.data);
        // Update pagination info if available
        if (result.pagination) {
          setPagination(result.pagination);
        } else {
          // If no pagination info, assume single page
          setPagination({
            page: page,
            limit: pageSize,
            total: result.data.length,
            totalPages: 1
          });
        }
      } else if (Array.isArray(result)) {
        // Handle legacy response format
        setAssignments(result);
        setPagination({
          page: page,
          limit: pageSize,
          total: result.length,
          totalPages: 1
        });
      } else {
        setAssignments(result.data || []);
        setPagination({
          page: page,
          limit: pageSize,
          total: result.data?.length || 0,
          totalPages: 1
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  // Load assignments when page changes (including initial load)
  useEffect(() => {
    fetchAssignments(currentPage);
  }, [currentPage]);

  // Refresh assignments when the user returns to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAssignments(currentPage);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentPage]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // Generate pagination numbers with ellipsis
  const generatePaginationItems = () => {
    const items = []
    const totalPages = pagination.totalPages
    const current = currentPage

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(i)
      }
    } else {
      // Show first page
      items.push(1)
      
      if (current > 4) {
        items.push('ellipsis-start')
      }
      
      // Show pages around current
      const start = Math.max(2, current - 1)
      const end = Math.min(totalPages - 1, current + 1)
      
      for (let i = start; i <= end; i++) {
        items.push(i)
      }
      
      if (current < totalPages - 3) {
        items.push('ellipsis-end')
      }
      
      // Show last page
      if (totalPages > 1) {
        items.push(totalPages)
      }
    }
    
    return items
  };

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
        {pagination.total > 0 && (
          <p className="text-muted-foreground text-sm mt-1">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} assignments
          </p>
        )}
      </div>
      <StudentAssignmentsList assignments={assignments} />
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1) {
                      handlePageChange(currentPage - 1)
                    }
                  }}
                  className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  aria-disabled={currentPage === 1}
                />
              </PaginationItem>
              
              {generatePaginationItems().map((item, index) => (
                <PaginationItem key={index}>
                  {typeof item === 'number' ? (
                    <PaginationLink 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (item !== currentPage) {
                          handlePageChange(item)
                        }
                      }}
                      isActive={currentPage === item}
                      className="cursor-pointer"
                    >
                      {item}
                    </PaginationLink>
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < pagination.totalPages) {
                      handlePageChange(currentPage + 1)
                    }
                  }}
                  className={currentPage === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  aria-disabled={currentPage === pagination.totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}