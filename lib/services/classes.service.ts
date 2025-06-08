import { PrismaClient } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
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
 * Handles all class-related database operations with authentication
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

      // Log the activity
      await tx.activityLog.create({
        data: {
          type: 'CLASS_CREATED',
          userId: currentUser.id,
          classId: newClass.id,
          publishedAt: new Date(),
        },
      })

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

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: updateData,
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

    return updatedClass as ClassWithDetails
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

    await withTransaction(async (tx) => {
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
      orderBy: { username: 'asc' }
    })

    return teachers
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