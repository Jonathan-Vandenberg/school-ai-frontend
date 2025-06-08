import { PrismaClient } from '@prisma/client'
import { taskManager } from '../lib/scheduled-tasks'

const prisma = new PrismaClient()

interface ScheduledAssignment {
  id: string
  topic: string | null
  scheduledPublishAt: Date | null
  isActive: boolean | null
  teacher: {
    username: string
  } | null
}

interface ActivityLogWithRelations {
  id: string
  type: string
  createdAt: Date
  user: {
    username: string
    customRole: string | null
  } | null
  assignment: {
    topic: string | null
  } | null
}

async function testScheduledTasks() {
  console.log('🧪 Testing Scheduled Tasks System...\n')

  try {
    // 1. Check scheduled assignments
    console.log('1️⃣  Checking scheduled assignments...')
    const scheduledAssignments: ScheduledAssignment[] = await prisma.assignment.findMany({
      where: {
        isActive: false,
        scheduledPublishAt: {
          not: null
        }
      },
      select: {
        id: true,
        topic: true,  
        scheduledPublishAt: true,
        isActive: true,
        teacher: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        scheduledPublishAt: 'asc'
      }
    })

    if (scheduledAssignments.length > 0) {
      console.log(`✅ Found ${scheduledAssignments.length} scheduled assignments:`)
      scheduledAssignments.forEach((assignment: ScheduledAssignment, index: number) => {
        const timeUntil = assignment.scheduledPublishAt ? 
          Math.round((assignment.scheduledPublishAt.getTime() - new Date().getTime()) / 1000) : 0
        console.log(`   ${index + 1}. "${assignment.topic}"`)
        console.log(`      📅 Scheduled: ${assignment.scheduledPublishAt?.toLocaleString()}`)
        console.log(`      ⏰ Time until activation: ${timeUntil > 0 ? `${timeUntil}s` : 'READY TO ACTIVATE'}`)
        console.log(`      👨‍🏫 Teacher: ${assignment.teacher?.username}`)
        console.log(`      🔄 Status: ${assignment.isActive ? 'ACTIVE' : 'SCHEDULED'}\n`)
      })
    } else {
      console.log('❌ No scheduled assignments found')
    }

    // 2. Test task manager status
    console.log('2️⃣  Testing task manager...')
    const tasks = taskManager.getTaskStatus()
    console.log(`✅ Task Manager Status:`)
    console.log(`   📝 Total Tasks: ${tasks.length}`)
    
    tasks.forEach((task, index: number) => {
      console.log(`   ${index + 1}. ${task.name}: ${task.isActive ? '🟢 Running' : '🔴 Stopped'}`)
    })

    // 3. Start task manager if no tasks are running
    const activeTasks = tasks.filter(t => t.isActive).length
    if (activeTasks === 0) {
      console.log('\n3️⃣  Starting task manager...')
      await taskManager.startAllTasks()
      console.log('✅ Task manager started!')
    } else {
      console.log('\n3️⃣  Task manager already running ✅')
    }

    // 4. Check database activity logs
    console.log('\n4️⃣  Recent activity logs...')
    const recentLogs: ActivityLogWithRelations[] = await prisma.activityLog.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            username: true,
            customRole: true
          }
        },
        assignment: {
          select: {
            topic: true
          }
        }
      }
    })

    if (recentLogs.length > 0) {
      console.log(`✅ Found ${recentLogs.length} recent activities:`)
      recentLogs.forEach((log: ActivityLogWithRelations, index: number) => {
        console.log(`   ${index + 1}. ${log.type} by ${log.user?.username} (${log.user?.customRole})`)
        if (log.assignment) {
          console.log(`      📝 Assignment: "${log.assignment.topic}"`)
        }
        console.log(`      🕐 ${log.createdAt.toLocaleString()}\n`)
      })
    }

    // 5. Test dashboard snapshot creation
    console.log('5️⃣  Testing dashboard analytics...')
    const totalClasses = await prisma.class.count()
    const totalStudents = await prisma.user.count({
      where: { customRole: 'STUDENT' }
    })
    const totalTeachers = await prisma.user.count({
      where: { customRole: 'TEACHER' }  
    })
    const totalAssignments = await prisma.assignment.count()

    console.log('✅ Current system metrics:')
    console.log(`   🏫 Classes: ${totalClasses}`)
    console.log(`   👨‍🎓 Students: ${totalStudents}`)
    console.log(`   👨‍🏫 Teachers: ${totalTeachers}`)
    console.log(`   📝 Assignments: ${totalAssignments}`)

    // 6. Show instructions for monitoring
    console.log('\n📋 Next Steps:')
    console.log('   1. Keep this terminal open to monitor the scheduled tasks')
    console.log('   2. Assignments will automatically activate when scheduled time arrives')
    console.log('   3. Watch for "Assignment published" messages in the logs')
    console.log('   4. Check the admin panel at http://localhost:3000/admin for task status')
    console.log('   5. Database admin available at http://localhost:5050')

    const nextActivation = scheduledAssignments.find((a: ScheduledAssignment) => a.scheduledPublishAt && a.scheduledPublishAt > new Date())
    if (nextActivation && nextActivation.scheduledPublishAt) {
      const timeUntil = Math.round((nextActivation.scheduledPublishAt.getTime() - new Date().getTime()) / 1000)
      console.log(`\n⏰ Next assignment activation in ${timeUntil} seconds: "${nextActivation.topic}"`)
    }

  } catch (error) {
    console.error('❌ Error testing scheduled tasks:', error)
    throw error
  }
}

testScheduledTasks()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n🎉 Scheduled tasks test completed successfully!')
    
    // Keep the process running to monitor tasks
    console.log('\n📡 Monitoring scheduled tasks... Press Ctrl+C to stop')
    
    // Monitor for assignment activations
    setInterval(async () => {
      try {
        const justActivated = await prisma.assignment.findMany({
          where: {
            isActive: true,
            scheduledPublishAt: {
              gte: new Date(Date.now() - 60000), // Last minute
            }
          },
          select: {
            topic: true,
            scheduledPublishAt: true
          }
        })

        if (justActivated.length > 0) {
          console.log(`\n🎉 ${justActivated.length} assignment(s) just activated:`)
          justActivated.forEach((assignment: { topic: string | null, scheduledPublishAt: Date | null }) => {
            console.log(`   ✅ "${assignment.topic}" - activated at ${assignment.scheduledPublishAt?.toLocaleString()}`)
          })
        }
      } catch (error) {
        console.error('Error monitoring assignments:', error)
      }
    }, 10000) // Check every 10 seconds

  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 