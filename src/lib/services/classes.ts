import { prisma } from '@/lib/db'
import { AuthenticatedUser } from './auth'

interface CreateClassData {
  name: string
  description?: string
  teacherIds?: string[]
  studentIds?: string[]
}

interface UpdateClassData {
  name?: string
  description?: string
  teacherIds?: string[]
  studentIds?: string[]
}

export class ClassesService {
  /**
   * Check if user has permission to manage classes
   */
  private static checkClassManagementPermission(user: AuthenticatedUser) {
    if (user.customRole !== 'ADMIN' && user.customRole !== 'TEACHER') {
      throw new Error('Permission denied. Only admins and teachers can manage classes.')
    }
  }

  /**
   * List classes with filtering and pagination
   */
  static async listClasses(
    user: AuthenticatedUser,
    options: {
      page: number
      limit: number
      search?: string
    }
  ) {
    this.checkClassManagementPermission(user)

    const { page, limit, search } = options
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // For teachers, only show their classes
    if (user.customRole === 'TEACHER') {
      where.users = {
        some: {
          userId: user.id,
          user: {
            customRole: 'TEACHER'
          }
        }
      }
    }

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              assignments: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      }),
      prisma.class.count({ where })
    ])

    return {
      classes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get class by ID with teachers and students
   */
  static async getClassById(user: AuthenticatedUser, classId: string) {
    this.checkClassManagementPermission(user)

    const classItem = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                customRole: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            assignments: true
          }
        }
      }
    })

    if (!classItem) {
      throw new Error('Class not found')
    }

    // For teachers, check if they have access to this class
    if (user.customRole === 'TEACHER') {
      const hasAccess = classItem.users.some(userClass => 
        userClass.user.id === user.id && userClass.user.customRole === 'TEACHER'
      )
      if (!hasAccess) {
        throw new Error('Permission denied. You can only view classes you teach.')
      }
    }

    // Separate teachers and students
    const teachers = classItem.users
      .filter(userClass => userClass.user.customRole === 'TEACHER')
      .map(userClass => userClass.user)
    
    const students = classItem.users
      .filter(userClass => userClass.user.customRole === 'STUDENT')
      .map(userClass => userClass.user)

    return {
      ...classItem,
      teachers,
      students
    }
  }

  /**
   * Create a new class
   */
  static async createClass(user: AuthenticatedUser, data: CreateClassData) {
    this.checkClassManagementPermission(user)

    const { name, teacherIds = [], studentIds = [] } = data

    // Validate that at least one teacher is provided
    if (teacherIds.length === 0) {
      throw new Error('At least one teacher is required')
    }

    // For teachers, they must include themselves
    if (user.customRole === 'TEACHER' && !teacherIds.includes(user.id)) {
      teacherIds.push(user.id)
    }

    // Create the class
    const newClass = await prisma.class.create({
      data: {
        name,
        users: {
          create: [
            // Add teachers
            ...teacherIds.map(teacherId => ({
              userId: teacherId
            })),
            // Add students
            ...studentIds.map(studentId => ({
              userId: studentId
            }))
          ]
        }
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                customRole: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            assignments: true
          }
        }
      }
    })

    // Separate teachers and students for response
    const teachers = newClass.users
      .filter(userClass => userClass.user.customRole === 'TEACHER')
      .map(userClass => userClass.user)
    
    const students = newClass.users
      .filter(userClass => userClass.user.customRole === 'STUDENT')
      .map(userClass => userClass.user)

    return {
      ...newClass,
      teachers,
      students
    }
  }

  /**
   * Update a class
   */
  static async updateClass(user: AuthenticatedUser, classId: string, data: UpdateClassData) {
    this.checkClassManagementPermission(user)

    // First check if class exists and user has permission
    const existingClass = await this.getClassById(user, classId)

    const { name, teacherIds, studentIds } = data

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name

    // Handle user relationships if specified
    if (teacherIds !== undefined || studentIds !== undefined) {
      // Validate that at least one teacher is provided
      const finalTeacherIds = teacherIds || existingClass.teachers.map(t => t.id)
      if (finalTeacherIds.length === 0) {
        throw new Error('At least one teacher is required')
      }

      // For teachers, they must include themselves
      if (user.customRole === 'TEACHER' && !finalTeacherIds.includes(user.id)) {
        finalTeacherIds.push(user.id)
      }

      const finalStudentIds = studentIds || existingClass.students.map(s => s.id)

      // Replace all user relationships
      updateData.users = {
        deleteMany: {}, // Remove all existing relationships
        create: [
          // Add teachers
          ...finalTeacherIds.map(teacherId => ({
            userId: teacherId
          })),
          // Add students
          ...finalStudentIds.map(studentId => ({
            userId: studentId
          }))
        ]
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: updateData,
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                customRole: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            assignments: true
          }
        }
      }
    })

    // Separate teachers and students for response
    const teachers = updatedClass.users
      .filter(userClass => userClass.user.customRole === 'TEACHER')
      .map(userClass => userClass.user)
    
    const students = updatedClass.users
      .filter(userClass => userClass.user.customRole === 'STUDENT')
      .map(userClass => userClass.user)

    return {
      ...updatedClass,
      teachers,
      students
    }
  }

  /**
   * Delete a class
   */
  static async deleteClass(user: AuthenticatedUser, classId: string) {
    if (user.customRole !== 'ADMIN') {
      throw new Error('Permission denied. Only admins can delete classes.')
    }

    const existingClass = await prisma.class.findUnique({
      where: { id: classId }
    })

    if (!existingClass) {
      throw new Error('Class not found')
    }

    await prisma.class.delete({
      where: { id: classId }
    })
  }

  /**
   * Get available students for class creation (students not in any class)
   */
  static async getAvailableStudents(user: AuthenticatedUser) {
    this.checkClassManagementPermission(user)

    const students = await prisma.user.findMany({
      where: {
        customRole: 'STUDENT',
        blocked: false,
        confirmed: true,
        classes: {
          none: {} // Students not in any class
        }
      },
      select: {
        id: true,
        username: true,
        email: true
      },
      orderBy: {
        username: 'asc'
      }
    })

    return students
  }

  /**
   * Get all teachers
   */
  static async getAllTeachers(user: AuthenticatedUser) {
    this.checkClassManagementPermission(user)

    const teachers = await prisma.user.findMany({
      where: {
        customRole: 'TEACHER',
        blocked: false,
        confirmed: true
      },
      select: {
        id: true,
        username: true,
        email: true
      },
      orderBy: {
        username: 'asc'
      }
    })

    return teachers
  }

  /**
   * Get available users for a specific class (includes current members + available others)
   */
  static async getAvailableUsersForClass(user: AuthenticatedUser, classId: string) {
    this.checkClassManagementPermission(user)

    // Get current class with its users
    const currentClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                customRole: true
              }
            }
          }
        }
      }
    })

    if (!currentClass) {
      throw new Error('Class not found')
    }

    // Get all available teachers (all teachers)
    const allTeachers = await this.getAllTeachers(user)

    // Get current class students
    const currentStudentIds = currentClass.users
      .filter(userClass => userClass.user.customRole === 'STUDENT')
      .map(userClass => userClass.user.id)

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
} 