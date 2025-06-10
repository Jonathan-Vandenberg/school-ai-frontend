import { PrismaClient } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
import { ActivityLogService } from './activity-log.service'
import { withTransaction } from '../db'

const prisma = new PrismaClient()

export interface CreateClassData {
  name: string
  description?: string
  studentIds?: string[]
  teacherIds?: string[]
}

export interface UpdateClassData {
  name?: string
  description?: string
  teacherIds?: string[]
  studentIds?: string[]
}

export interface ClassWithDetails {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  _count?: {
    users: number
    teachers: number
    students: number
    assignments: number
  }
  users?: Array<{
    user: {
      id: string
      username: string
      email: string
      customRole: string
    }
  }>
}

export interface ClassListParams {
  page?: number
  limit?: number
  search?: string
}

export interface AssignUsersData {
  userIds: string[]
}

/**
 * Classes Service
 * Handles all class-related database operations with authentication and activity logging
 */
export class ClassesService {
  /**
   * Create a new class
   * Only admins and teachers can create classes
   */
  static async createClass(
    currentUser: AuthenticatedUser,
    classData: CreateClassData
  ): Promise<ClassWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    // Validate class name uniqueness
    const existingClass = await prisma.class.findFirst({
      where: { name: classData.name }
    })

    if (existingClass) {
      throw new ValidationError('Class name already exists')
    }

    // Require at least one teacher
    if (!classData.teacherIds || classData.teacherIds.length === 0) {
      throw new ValidationError('At least one teacher is required for a class')
    }

    // Validate that students aren't already in another class
    if (classData.studentIds && classData.studentIds.length > 0) {
      const studentsInClasses = await prisma.userClass.findMany({
        where: {
          userId: { in: classData.studentIds },
          user: { customRole: 'STUDENT' }
        },
        include: {
          user: { select: { username: true } },
          class: { select: { name: true } }
        }
      })

      if (studentsInClasses.length > 0) {
        const conflictNames = studentsInClasses.map(sc => 
          `${sc.user.username} (already in ${sc.class.name})`
        ).join(', ')
        throw new ValidationError(`Students already in classes: ${conflictNames}`)
      }
    }

    // Validate that all users exist and have correct roles
    if (classData.studentIds && classData.studentIds.length > 0) {
      const students = await prisma.user.findMany({
        where: { 
          id: { in: classData.studentIds },
          customRole: 'STUDENT'
        }
      })
      if (students.length !== classData.studentIds.length) {
        throw new ValidationError('One or more selected students not found or invalid')
      }
    }

    // Validate teachers exist and have correct role
    const teachers = await prisma.user.findMany({
      where: { 
        id: { in: classData.teacherIds },
        customRole: 'TEACHER'
      }
    })
    if (teachers.length !== classData.teacherIds.length) {
      throw new ValidationError('One or more selected teachers not found or invalid')
    }

    return withTransaction(async (tx) => {
      const newClass = await tx.class.create({
        data: {
          name: classData.name,
          publishedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          _count: {
            select: {
              users: true,
              assignments: true,
            },
          },
        },
      })

      // Assign teachers to the class (required)
      await tx.userClass.createMany({
        data: classData.teacherIds!.map(userId => ({
          userId,
          classId: newClass.id,
        }))
      })

      // Assign students to the class (optional)
      if (classData.studentIds && classData.studentIds.length > 0) {
        await tx.userClass.createMany({
          data: classData.studentIds.map(userId => ({
            userId,
            classId: newClass.id,
          }))
        })
      }

      // Log the activity using the comprehensive ActivityLogService
      try {
        await ActivityLogService.logClassCreated(
          currentUser,
          {
            id: newClass.id,
            name: newClass.name
          },
          classData.teacherIds!,
          classData.studentIds || [],
          {
            createdBy: currentUser.customRole,
            creatorId: currentUser.id,
            creatorUsername: currentUser.username,
            teacherCount: classData.teacherIds!.length,
            studentCount: classData.studentIds?.length || 0
          }
        )
      } catch (logError) {
        // Log the error but don't fail class creation
        console.error('Failed to log class creation activity:', logError)
      }

      return newClass as ClassWithDetails
    })
  }

  /**
   * Get class by ID
   * Teachers and admins can access any class, students can only access their own classes
   */
  static async getClassById(
    currentUser: AuthenticatedUser,
    classId: string,
    includeUsers: boolean = false
  ): Promise<ClassWithDetails> {
    let classData: any

    if (includeUsers) {
      classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          _count: {
            select: {
              users: true,
              assignments: true,
            },
          },
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  customRole: true,
                },
              },
            },
          },
        },
      })
    } else {
      classData = await prisma.class.findUnique({
        where: { id: classId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          _count: {
            select: {
              users: true,
              assignments: true,
            },
          },
        },
      })
    }

    if (!classData) {
      throw new NotFoundError('Class not found')
    }

    // Check permissions for students
    if (currentUser.customRole === 'STUDENT') {
      const userInClass = await prisma.userClass.findUnique({
        where: {
          userId_classId: {
            userId: currentUser.id,
            classId: classId,
          },
        },
      })

      if (!userInClass) {
        throw new ForbiddenError('You can only access classes you are enrolled in')
      }
    }

    return classData as ClassWithDetails
  }

  /**
   * Update class
   * Only admins and teachers can update classes
   */
  static async updateClass(
    currentUser: AuthenticatedUser,
    classId: string,
    updateData: UpdateClassData
  ): Promise<ClassWithDetails> {
    AuthService.requireTeacherOrAdmin(currentUser)

    await this.verifyClassExists(classId)

    // Get current class data for comparison and logging
    const currentClassData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        users: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                username: true,
                customRole: true
              }
            }
          }
        }
      }
    })

    if (!currentClassData) {
      throw new NotFoundError('Class not found')
    }

    // Validate class name uniqueness if changing name
    if (updateData.name) {
      const existingClass = await prisma.class.findFirst({
        where: {
          name: updateData.name,
          id: { not: classId }
        }
      })

      if (existingClass) {
        throw new ValidationError('Class name already exists')
      }
    }

    // Validate teacher and student assignments if provided
    if (updateData.teacherIds !== undefined) {
      // Require at least one teacher
      if (updateData.teacherIds.length === 0) {
        throw new ValidationError('At least one teacher is required for a class')
      }

      // Validate teachers exist and have correct role
      const teachers = await prisma.user.findMany({
        where: { 
          id: { in: updateData.teacherIds },
          customRole: 'TEACHER'
        }
      })
      if (teachers.length !== updateData.teacherIds.length) {
        throw new ValidationError('One or more selected teachers not found or invalid')
      }
    }

    if (updateData.studentIds !== undefined) {
      // Validate students exist and have correct role
      if (updateData.studentIds.length > 0) {
        const students = await prisma.user.findMany({
          where: { 
            id: { in: updateData.studentIds },
            customRole: 'STUDENT'
          }
        })
        if (students.length !== updateData.studentIds.length) {
          throw new ValidationError('One or more selected students not found or invalid')
        }

        // Check if students are already in other classes (excluding current class)
        const studentsInOtherClasses = await prisma.userClass.findMany({
          where: {
            userId: { in: updateData.studentIds },
            classId: { not: classId },
            user: { customRole: 'STUDENT' }
          },
          include: {
            user: { select: { username: true } },
            class: { select: { name: true } }
          }
        })

        if (studentsInOtherClasses.length > 0) {
          const conflictNames = studentsInOtherClasses.map(sc => 
            `${sc.user.username} (already in ${sc.class.name})`
          ).join(', ')
          throw new ValidationError(`Students already in other classes: ${conflictNames}`)
        }
      }
    }

    return withTransaction(async (tx) => {
      // Track what changed for activity logging
      const changedFields: string[] = []
      const logDetails: any = {
        updatedBy: currentUser.customRole,
        updatedById: currentUser.id,
        updatedByUsername: currentUser.username
      }

      // Update basic class information
      const classUpdateData: any = {}
      if (updateData.name !== undefined && updateData.name !== currentClassData.name) {
        classUpdateData.name = updateData.name
        changedFields.push('name')
        logDetails.oldName = currentClassData.name
        logDetails.newName = updateData.name
      }

      const updatedClass = await tx.class.update({
      where: { id: classId },
        data: classUpdateData,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        _count: {
          select: {
            users: true,
            assignments: true,
          },
        },
      },
    })

      // Track user assignment changes
      let addedTeachers: string[] = []
      let removedTeachers: string[] = []
      let addedStudents: string[] = []
      let removedStudents: string[] = []

      // Update user assignments if provided
      if (updateData.teacherIds !== undefined || updateData.studentIds !== undefined) {
        const currentTeachers = currentClassData.users
          .filter(u => u.user.customRole === 'TEACHER')
          .map(u => u.userId)
        const currentStudents = currentClassData.users
          .filter(u => u.user.customRole === 'STUDENT')
          .map(u => u.userId)

        // Calculate changes
        if (updateData.teacherIds !== undefined) {
          addedTeachers = updateData.teacherIds.filter(id => !currentTeachers.includes(id))
          removedTeachers = currentTeachers.filter(id => !updateData.teacherIds!.includes(id))
        }

        if (updateData.studentIds !== undefined) {
          addedStudents = updateData.studentIds.filter(id => !currentStudents.includes(id))
          removedStudents = currentStudents.filter(id => !updateData.studentIds!.includes(id))
        }

        // Remove all existing user assignments
        await tx.userClass.deleteMany({
          where: { classId }
        })

        // Add teachers
        if (updateData.teacherIds && updateData.teacherIds.length > 0) {
          await tx.userClass.createMany({
            data: updateData.teacherIds.map(userId => ({
              userId,
              classId,
            }))
          })
        }

        // Add students
        if (updateData.studentIds && updateData.studentIds.length > 0) {
          await tx.userClass.createMany({
            data: updateData.studentIds.map(userId => ({
              userId,
              classId,
            }))
          })
        }

        changedFields.push('userAssignments')
      }

      // Log general class update if basic fields changed
      if (changedFields.length > 0) {
        await ActivityLogService.logClassUpdated(
          currentUser,
          {
            id: updatedClass.id,
            name: updatedClass.name
          },
          changedFields,
          logDetails
        )
      }

      // Log specific user assignment changes
      if (addedTeachers.length > 0) {
        await ActivityLogService.logClassUsersAdded(
          currentUser,
          {
            id: updatedClass.id,
            name: updatedClass.name
          },
          addedTeachers,
          'teachers',
          {
            updateType: 'teacher_assignment',
            addedCount: addedTeachers.length
          }
        )
      }

      if (removedTeachers.length > 0) {
        await ActivityLogService.logClassUsersRemoved(
          currentUser,
          {
            id: updatedClass.id,
            name: updatedClass.name
          },
          removedTeachers,
          'teachers',
          {
            updateType: 'teacher_assignment',
            removedCount: removedTeachers.length
          }
        )
      }

      if (addedStudents.length > 0) {
        await ActivityLogService.logClassUsersAdded(
          currentUser,
          {
            id: updatedClass.id,
            name: updatedClass.name
          },
          addedStudents,
          'students',
          {
            updateType: 'student_assignment',
            addedCount: addedStudents.length
          }
        )
      }

      if (removedStudents.length > 0) {
        await ActivityLogService.logClassUsersRemoved(
          currentUser,
          {
            id: updatedClass.id,
            name: updatedClass.name
          },
          removedStudents,
          'students',
          {
            updateType: 'student_assignment',
            removedCount: removedStudents.length
          }
        )
      }

    return updatedClass as ClassWithDetails
    })
  }

  /**
   * Delete class
   * Only admins can delete classes
   */
  static async deleteClass(
    currentUser: AuthenticatedUser,
    classId: string
  ): Promise<void> {
    AuthService.requireAdmin(currentUser)

    await this.verifyClassExists(classId)

    // Get class data before deletion for logging
    const classToDelete = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
            assignments: true
          }
        }
      }
    })

    if (!classToDelete) {
      throw new NotFoundError('Class not found')
    }

    await withTransaction(async (tx) => {
      // Log the deletion before actually deleting
      await ActivityLogService.logClassDeleted(
        currentUser,
        {
          id: classToDelete.id,
          name: classToDelete.name
        },
        {
          deletedByAdmin: true,
          adminId: currentUser.id,
          adminUsername: currentUser.username,
          userCount: classToDelete._count.users,
          assignmentCount: classToDelete._count.assignments
        }
      )

      // The foreign key constraints with onDelete: Cascade will handle
      // cleaning up related records (user_classes, class_assignments, etc.)
      await tx.class.delete({
        where: { id: classId }
      })
    })
  }

  /**
   * List classes with filtering and pagination
   * Role-based filtering: Admins/Teachers see all, Students see only their classes
   */
  static async listClasses(
    currentUser: AuthenticatedUser,
    params: ClassListParams = {}
  ): Promise<{
    classes: ClassWithDetails[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const {
      page = 1,
      limit = 20,
      search
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    let where: any = {}

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    // Students can only see their own classes
    if (currentUser.customRole === 'STUDENT') {
      where.users = {
        some: { userId: currentUser.id }
      }
    }

    const [classesWithUsers, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          _count: {
            select: {
              users: true,
              assignments: true,
            },
          },
          users: {
            select: {
              user: {
                select: {
                  customRole: true,
                }
              }
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' },
          { name: 'asc' }
        ]
      }),
      prisma.class.count({ where })
    ])

    // Transform the data to include separate teacher/student counts
    const classes = classesWithUsers.map(classItem => ({
      id: classItem.id,
      name: classItem.name,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
      publishedAt: classItem.publishedAt,
      _count: {
        users: classItem._count.users,
        teachers: classItem.users.filter(u => u.user.customRole === 'TEACHER').length,
        students: classItem.users.filter(u => u.user.customRole === 'STUDENT').length,
        assignments: classItem._count.assignments,
      }
    }))

    return {
      classes: classes as ClassWithDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Assign users to a class
   * Only admins and teachers can assign users
   */
  static async assignUsersToClass(
    currentUser: AuthenticatedUser,
    classId: string,
    userData: AssignUsersData
  ): Promise<void> {
    AuthService.requireTeacherOrAdmin(currentUser)

    await this.verifyClassExists(classId)

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: userData.userIds } },
      select: { id: true }
    })

    if (users.length !== userData.userIds.length) {
      throw new ValidationError('One or more users not found')
    }

    await withTransaction(async (tx) => {
      // Create user-class assignments (upsert to handle duplicates)
      for (const userId of userData.userIds) {
        await tx.userClass.upsert({
          where: {
            userId_classId: {
              userId,
              classId,
            },
          },
          update: {}, // Do nothing if already exists
          create: {
            userId,
            classId,
          },
        })
      }
    })
  }

  /**
   * Remove users from a class
   * Only admins and teachers can remove users
   */
  static async removeUsersFromClass(
    currentUser: AuthenticatedUser,
    classId: string,
    userData: AssignUsersData
  ): Promise<void> {
    AuthService.requireTeacherOrAdmin(currentUser)

    await this.verifyClassExists(classId)

    await withTransaction(async (tx) => {
      await tx.userClass.deleteMany({
        where: {
          classId,
          userId: { in: userData.userIds },
        },
      })
    })
  }

  /**
   * Get users in a class
   * Teachers and admins can see all users, students can see classmates
   */
  static async getClassUsers(
    currentUser: AuthenticatedUser,
    classId: string
  ): Promise<Array<{
    id: string
    username: string
    email: string
    customRole: string
    assignedAt: Date
  }>> {
    await this.getClassById(currentUser, classId) // This handles permission checking

    const userClasses = await prisma.userClass.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            customRole: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { user: { customRole: 'asc' } },
        { user: { username: 'asc' } }
      ]
    })

    return userClasses.map(uc => ({
      id: uc.user.id,
      username: uc.user.username,
      email: uc.user.email,
      customRole: uc.user.customRole,
      assignedAt: uc.user.createdAt, // Using user creation date as placeholder
    }))
  }

  /**
   * Get classes for current user
   * Returns classes the user is enrolled in or teaches
   */
  static async getCurrentUserClasses(
    currentUser: AuthenticatedUser
  ): Promise<ClassWithDetails[]> {
    const classes = await prisma.class.findMany({
      where: {
        users: {
          some: { userId: currentUser.id }
        }
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        _count: {
          select: {
            users: true,
            assignments: true,
          },
        },
      },
      orderBy: { name: 'asc' }
    })

    return classes as ClassWithDetails[]
  }

  /**
   * Get available students (not already in a class)
   * Only admins and teachers can access this
   */
  static async getAvailableStudents(
    currentUser: AuthenticatedUser
  ): Promise<Array<{
    id: string
    username: string
    email: string
  }>> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const availableStudents = await prisma.user.findMany({
      where: {
        customRole: 'STUDENT',
        blocked: false,
        confirmed: true,
        classes: {
          none: {} // Students with no class assignments
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: { username: 'asc' }
    })

    return availableStudents
  }

  /**
   * Get all teachers
   * Only admins and teachers can access this
   */
  static async getAllTeachers(
    currentUser: AuthenticatedUser
  ): Promise<Array<{
    id: string
    username: string
    email: string
  }>> {
    AuthService.requireTeacherOrAdmin(currentUser)

    const teachers = await prisma.user.findMany({
      where: {
        customRole: 'TEACHER',
        blocked: false,
        confirmed: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: {
        username: 'asc',
      },
    })

    return teachers
  }

  /**
   * Get available users for a specific class (includes current members + available others)
   * Only admins and teachers can access this
   */
  static async getAvailableUsersForClass(
    currentUser: AuthenticatedUser,
    classId: string
  ): Promise<{
    teachers: Array<{
      id: string
      username: string
      email: string
    }>
    students: Array<{
      id: string
      username: string
      email: string
    }>
  }> {
    AuthService.requireTeacherOrAdmin(currentUser)

    await this.verifyClassExists(classId)

    // Get all available teachers (all teachers)
    const allTeachers = await this.getAllTeachers(currentUser)

    // Get current class students
    const currentClassUsers = await prisma.userClass.findMany({
      where: { 
        classId,
        user: { customRole: 'STUDENT' }
      },
      select: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    })

    const currentStudentIds = currentClassUsers.map(uc => uc.user.id)

    // Build the where clause for available students
    const studentWhereClause: any = {
      customRole: 'STUDENT',
      blocked: false,
      confirmed: true,
    }

    // If there are current students, include them OR students not in any class
    if (currentStudentIds.length > 0) {
      studentWhereClause.OR = [
        { id: { in: currentStudentIds } }, // Current class students
        { 
          classes: {
            none: {} // Students not in any class
          }
        }
      ]
    } else {
      // If no current students, just get students not in any class
      studentWhereClause.classes = {
        none: {} // Students not in any class
      }
    }

    // Get available students
    const availableStudents = await prisma.user.findMany({
      where: studentWhereClause,
      select: {
        id: true,
        username: true,
        email: true
      },
      orderBy: {
        username: 'asc'
      }
    })

    return {
      teachers: allTeachers,
      students: availableStudents
    }
  }

  /**
   * Helper method to verify class exists
   */
  private static async verifyClassExists(classId: string): Promise<void> {
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true }
    })

    if (!classExists) {
      throw new NotFoundError('Class not found')
    }
  }
} 