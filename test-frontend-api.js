const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testFrontendAPI() {
  try {
    console.log('🌐 Testing Frontend API Response...\n')

    // Simulate ADMIN user query
    console.log('👑 Testing ADMIN user perspective:')
    console.log('─'.repeat(50))
    
    const adminData = await prisma.studentsNeedingHelp.findMany({
      where: {
        isResolved: false
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        classes: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        daysNeedingHelp: 'desc'
      }
    })

    console.log(`📊 Admin sees ${adminData.length} students needing help:`)
    adminData.forEach(student => {
      console.log(`  - ${student.student.username}: ${student.daysNeedingHelp} days, Severity: ${student.severity}`)
    })

    // Find teacher_johnson to test teacher perspective
    const teacherJohnson = await prisma.user.findFirst({
      where: { username: 'teacher_johnson' },
      select: { id: true, username: true }
    })

    if (teacherJohnson) {
      console.log(`\n👨‍🏫 Testing TEACHER (${teacherJohnson.username}) perspective:`)
      console.log('─'.repeat(50))
      
      const teacherData = await prisma.studentsNeedingHelp.findMany({
        where: {
          isResolved: false,
          teachers: {
            some: {
              teacherId: teacherJohnson.id
            }
          }
        },
        include: {
          student: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          classes: {
            include: {
              class: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          teachers: {
            include: {
              teacher: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          }
        },
        orderBy: {
          daysNeedingHelp: 'desc'
        }
      })

      console.log(`📊 Teacher sees ${teacherData.length} students needing help:`)
      teacherData.forEach(student => {
        console.log(`  - ${student.student.username}: ${student.daysNeedingHelp} days, Severity: ${student.severity}`)
      })

      // Check which classes appear for teacher
      const teacherClasses = new Set()
      teacherData.forEach(student => {
        student.classes.forEach(({ class: cls }) => {
          teacherClasses.add(cls.name)
        })
      })

      console.log(`\n📚 Classes in teacher's dropdown should be:`)
      Array.from(teacherClasses).forEach(className => {
        console.log(`  - ${className}`)
      })
    }

    // Check Andy specifically
    console.log('\n🔍 Andy\'s specific data:')
    console.log('─'.repeat(50))
    
    const andyData = adminData.find(s => s.student.username === 'Andy')
    if (andyData) {
      console.log(`Student: ${andyData.student.username}`)
      console.log(`Days Needing Help: ${andyData.daysNeedingHelp}`)
      console.log(`Needs Help Since: ${andyData.needsHelpSince.toISOString()}`)
      console.log(`Severity: ${andyData.severity}`)
      console.log(`Reasons: ${andyData.reasons.join(', ')}`)
      console.log(`Overdue Assignments: ${andyData.overdueAssignments}`)
      console.log(`Average Score: ${andyData.averageScore}%`)
      console.log(`Completion Rate: ${andyData.completionRate}%`)
      console.log(`Classes: ${andyData.classes.map(c => c.class.name).join(', ')}`)
      console.log(`Teachers: ${andyData.teachers.map(t => t.teacher.username).join(', ')}`)
      
      // Calculate what frontend should show
      const currentDate = new Date()
      const actualDays = Math.max(1, Math.ceil((currentDate.getTime() - andyData.needsHelpSince.getTime()) / (1000 * 60 * 60 * 24)))
      console.log(`\n🧮 Calculated vs Stored Days:`)
      console.log(`  Calculated from needsHelpSince: ${actualDays} days`)
      console.log(`  Stored daysNeedingHelp: ${andyData.daysNeedingHelp} days`)
      console.log(`  Match: ${actualDays === andyData.daysNeedingHelp ? '✅' : '❌'}`)
    }

    // Test the actual API service logic
    console.log('\n🔧 Testing StudentsNeedingHelpService logic:')
    console.log('─'.repeat(50))
    
    // Simulate admin call
    const adminResult = await getStudentsNeedingHelpSimulated({ customRole: 'ADMIN', id: 'admin' })
    console.log(`Admin API call returns ${adminResult.students.length} students`)
    
    // Simulate teacher call
    if (teacherJohnson) {
      const teacherResult = await getStudentsNeedingHelpSimulated({ customRole: 'TEACHER', id: teacherJohnson.id })
      console.log(`Teacher API call returns ${teacherResult.students.length} students`)
    }

  } catch (error) {
    console.error('❌ Error testing frontend API:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Simulate the StudentsNeedingHelpService.getStudentsNeedingHelp method
async function getStudentsNeedingHelpSimulated(currentUser) {
  // Build where clause based on user role
  let whereClause = {
    isResolved: false
  }

  // If user is a teacher, only show students from their classes
  if (currentUser.customRole === 'TEACHER') {
    whereClause = {
      ...whereClause,
      teachers: {
        some: {
          teacherId: currentUser.id
        }
      }
    }
  }
  // If user is ADMIN, show all students (no additional filter needed)

  // Fetch current students needing help from database
  const studentsNeedingHelp = await prisma.studentsNeedingHelp.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      classes: {
        include: {
          class: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      teachers: {
        include: {
          teacher: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    },
    orderBy: {
      daysNeedingHelp: 'desc'
    }
  })

  const summary = {
    total: studentsNeedingHelp.length,
    critical: studentsNeedingHelp.filter(s => s.severity === 'CRITICAL').length,
    warning: studentsNeedingHelp.filter(s => s.severity === 'WARNING').length,
    recent: studentsNeedingHelp.filter(s => s.severity === 'RECENT').length
  }

  return {
    students: studentsNeedingHelp,
    summary
  }
}

testFrontendAPI() 