import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../lib/services/auth.service'
import { AssignmentsService } from '../../../../../lib/services/assignments.service'
import { StatisticsService } from '../../../../../lib/services/statistics.service'
import { handleServiceError } from '../../../../../lib/services/auth.service'
import { z } from 'zod'
import { ensurePronunciationReference } from '@/app/lib/tenant-api'
import { LevelType, CEFRLevel, GradeLevel } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * GET /api/assignments/[assignmentId]
 * Get a specific assignment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { assignmentId } = await params
    
    // Get assignment by ID
    const assignment = await AssignmentsService.getAssignmentById(
      currentUser,
      assignmentId
    )

    return NextResponse.json({
      success: true,
      data: assignment,
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * PUT /api/assignments/[assignmentId]
 * Update a specific assignment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { assignmentId } = await params
    
    // Parse request body
    const body = await request.json()
    
    // Validate request data
    const updateSchema = z.object({
      topic: z.string().min(1, 'Topic is required'),
      videoUrl: z.string().url().optional().nullable(),
      context: z.string().optional().nullable(),
      videoTranscript: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      scheduledPublishAt: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      type: z.enum(['CLASS', 'INDIVIDUAL']).optional(),
      classIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      questions: z.array(z.object({
        id: z.string().optional(),
        textQuestion: z.string().nullable().optional(),
        textAnswer: z.string().optional()
      })).min(1, 'At least one question is required'),
      levels: z.array(z.object({
        levelType: z.nativeEnum(LevelType),
        cefrLevel: z.nativeEnum(CEFRLevel).optional(),
        gradeLevel: z.nativeEnum(GradeLevel).optional(),
      })).optional()
    })

    const validatedData = updateSchema.parse(body)

    // Transform questions to ensure textQuestion is always string | null (not undefined)
    const questions = validatedData.questions.map(q => ({
      id: q.id,
      textQuestion: q.textQuestion ?? null,
      textAnswer: q.textAnswer || ''
    }))

    // Update assignment with questions
    const updatedAssignment = await AssignmentsService.updateAssignment(
      currentUser,
      assignmentId,
      {
        topic: validatedData.topic,
        videoUrl: validatedData.videoUrl || undefined,
        context: validatedData.context || undefined,
        videoTranscript: validatedData.videoTranscript || undefined,
        isActive: validatedData.isActive,
        scheduledPublishAt: validatedData.scheduledPublishAt ? new Date(validatedData.scheduledPublishAt) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        type: validatedData.type,
        classIds: validatedData.classIds,
        studentIds: validatedData.studentIds,
        levels: validatedData.levels,
      },
      questions
    )

    if (updatedAssignment?.evaluationSettings?.type === 'PRONUNCIATION') {
      const syncTargets = updatedAssignment.questions?.filter((q) => q.id && q.textAnswer?.trim()) || []
      if (syncTargets.length > 0) {
        const syncResults = await Promise.allSettled(
          syncTargets.map((question) =>
            ensurePronunciationReference(question.id, question.textAnswer!, { forceRegenerate: true })
          )
        )
        const failures = syncResults.filter((res) => res.status === 'rejected')
        if (failures.length > 0) {
          console.error('Pronunciation reference regeneration failed during assignment update', failures)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
      message: 'Assignment updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Validation failed',
        details: error.errors 
      }, { status: 400 })
    }
    return handleServiceError(error)
  }
}

/**
 * DELETE /api/assignments/[assignmentId]
 * Delete a specific assignment and recalculate affected statistics
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { assignmentId } = await params
    
    // Check permissions first
    const canManage = await AuthService.canManageAssignment(currentUser, assignmentId)
    if (!canManage) {
      // Get assignment owner's name for better error message
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          teacher: {
            select: {
              username: true,
              email: true
            }
          }
        }
      })

      if (!assignment) {
        return NextResponse.json({
          success: false,
          error: 'Assignment not found'
        }, { status: 404 })
      }

      const ownerName = assignment.teacher?.username || assignment.teacher?.email || 'the assignment owner'
      return NextResponse.json({
        success: false,
        error: `Only ${ownerName} can delete this assignment.`
      }, { status: 403 })
    }
    
    // Get assignment details before deletion to identify affected students and classes
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        classes: {
          include: {
            class: {
              include: {
                users: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        customRole: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        students: {
          select: {
            userId: true
          }
        },
        progresses: {
          select: {
            studentId: true
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({
        success: false,
        error: 'Assignment not found'
      }, { status: 404 })
    }

    // Collect all affected student IDs
    const affectedStudentIds = new Set<string>()
    
    // Add students from class assignments
    assignment.classes.forEach(classAssignment => {
      classAssignment.class.users.forEach(userClass => {
        if (userClass.user.customRole === 'STUDENT') {
          affectedStudentIds.add(userClass.userId)
        }
      })
    })
    
    // Add students from individual assignments
    assignment.students.forEach(studentAssignment => {
      affectedStudentIds.add(studentAssignment.userId)
    })
    
    // Add students who have progress on this assignment
    assignment.progresses.forEach(progress => {
      affectedStudentIds.add(progress.studentId)
    })

    // Collect all affected class IDs
    const affectedClassIds = assignment.classes.map(ca => ca.classId)

    // Delete the assignment (this will cascade delete AssignmentStats and StudentAssignmentProgress)
    await AssignmentsService.deleteAssignment(currentUser, assignmentId)

    // Recalculate statistics for affected students FIRST (class stats depend on student stats)
    console.log(`🔄 Recalculating statistics for ${affectedStudentIds.size} affected students...`)
    const studentRecalcPromises = Array.from(affectedStudentIds).map(async (studentId) => {
      try {
        await StatisticsService.recalculateStudentStatistics(studentId)
        console.log(`✅ Recalculated statistics for student ${studentId}`)
      } catch (error) {
        console.error(`❌ Failed to recalculate statistics for student ${studentId}:`, error)
      }
    })
    // Wait for all student statistics to complete before updating class statistics
    await Promise.all(studentRecalcPromises)

    // Recalculate statistics for affected classes AFTER student stats are updated
    console.log(`🔄 Recalculating statistics for ${affectedClassIds.length} affected classes...`)
    if (affectedClassIds.length > 0) {
      const classRecalcPromises = affectedClassIds.map(async (classId) => {
        try {
          console.log(`  → Updating statistics for class ${classId}...`)
          await StatisticsService.updateClassStatistics(classId)
          console.log(`✅ Recalculated statistics for class ${classId}`)
        } catch (error) {
          console.error(`❌ Failed to recalculate statistics for class ${classId}:`, error)
          // Log detailed error for debugging
          if (error instanceof Error) {
            console.error(`  Error details: ${error.message}`, error.stack)
          }
        }
      })
      await Promise.allSettled(classRecalcPromises)
    } else {
      console.log('⚠️ No classes found for this assignment, skipping class statistics update')
    }

    // Recalculate school-wide statistics
    console.log('🔄 Recalculating school-wide statistics...')
    try {
      await StatisticsService.updateSchoolStatistics()
      console.log('✅ Recalculated school-wide statistics')
    } catch (error) {
      console.error('❌ Failed to recalculate school-wide statistics:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully. Statistics have been recalculated.',
    })
  } catch (error) {
    return handleServiceError(error)
  }
}
