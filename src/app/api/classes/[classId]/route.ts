import { NextRequest, NextResponse } from 'next/server'
import { AuthService, ClassesService, handleServiceError } from '@/lib/services'
import { prisma } from '@/lib/db'

/**
 * GET /api/classes/[classId]
 * Get class details including teachers and students with help status
 * Role-based access: Admins/Teachers see all, Students see only their classes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { classId } = await params

    // Validate classId
    if (!classId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing classId parameter' 
        },
        { status: 400 }
      )
    }

    // Use service to get class details
    const classDetails = await ClassesService.getClassById(currentUser, classId, true)

    // Transform the response to separate teachers and students
    const teachers = classDetails.users?.filter(uc => uc.user.customRole === 'TEACHER').map(uc => uc.user) || []
    const students = classDetails.users?.filter(uc => uc.user.customRole === 'STUDENT').map(uc => uc.user) || []

    // Get students needing help information for this class
    const studentsNeedingHelp = await prisma.studentsNeedingHelp.findMany({
      where: {
        isResolved: false,
        classes: {
          some: {
            classId: classId
          }
        }
      },
      include: {
        student: {
          select: {
            id: true
          }
        }
      }
    })

    // Create a map of student help information
    const helpInfoMap = new Map()
    studentsNeedingHelp.forEach(help => {
      helpInfoMap.set(help.studentId, {
        reasons: help.reasons,
        needsHelpSince: help.needsHelpSince,
        daysNeedingHelp: help.daysNeedingHelp,
        severity: help.severity,
        overdueAssignments: help.overdueAssignments,
        averageScore: help.averageScore,
        completionRate: help.completionRate,
        teacherNotes: help.teacherNotes
      })
    })

    // Add help information to students
    const studentsWithHelpInfo = students.map(student => ({
      ...student,
      needsHelp: helpInfoMap.has(student.id),
      helpInfo: helpInfoMap.get(student.id) || null
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...classDetails,
        teachers,
        students: studentsWithHelpInfo,
        _count: {
          ...classDetails._count,
          teachers: teachers.length,
          students: students.length,
        }
      },
    })
  } catch (error) {
    return handleServiceError(error)
  }
} 