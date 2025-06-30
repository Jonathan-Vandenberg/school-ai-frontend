const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAndyHelpDates() {
  try {
    console.log('🔍 Checking Andy\'s help record dates...\n')

    // Find Andy
    const andy = await prisma.user.findFirst({
      where: { username: 'Andy' },
      select: { id: true, username: true }
    })

    if (!andy) {
      console.log('❌ Andy not found')
      return
    }

    console.log(`👤 Found Andy: ${andy.username} (ID: ${andy.id})`)

    // Get Andy's help record
    const helpRecord = await prisma.studentsNeedingHelp.findUnique({
      where: { studentId: andy.id },
      include: {
        student: {
          select: {
            username: true
          }
        }
      }
    })

    if (!helpRecord) {
      console.log('❌ No help record found for Andy')
      return
    }

    console.log('\n📊 Andy\'s Help Record:')
    console.log('─'.repeat(50))
    console.log(`Student: ${helpRecord.student.username}`)
    console.log(`Reasons: ${helpRecord.reasons.join(', ')}`)
    console.log(`Needs Help Since: ${helpRecord.needsHelpSince.toISOString()}`)
    console.log(`Days Needing Help: ${helpRecord.daysNeedingHelp}`)
    console.log(`Overdue Assignments: ${helpRecord.overdueAssignments}`)
    console.log(`Average Score: ${helpRecord.averageScore.toFixed(1)}%`)
    console.log(`Completion Rate: ${helpRecord.completionRate.toFixed(1)}%`)
    console.log(`Severity: ${helpRecord.severity}`)
    console.log(`Is Resolved: ${helpRecord.isResolved}`)
    console.log(`Created At: ${helpRecord.createdAt.toISOString()}`)
    console.log(`Updated At: ${helpRecord.updatedAt.toISOString()}`)
    if (helpRecord.resolvedAt) {
      console.log(`Resolved At: ${helpRecord.resolvedAt.toISOString()}`)
    }

    // Calculate expected days needing help
    const currentDate = new Date()
    const expectedDays = Math.max(1, Math.ceil((currentDate.getTime() - helpRecord.needsHelpSince.getTime()) / (1000 * 60 * 60 * 24)))
    
    console.log('\n🧮 Date Calculations:')
    console.log('─'.repeat(50))
    console.log(`Current Date: ${currentDate.toISOString()}`)
    console.log(`Time Difference: ${(currentDate.getTime() - helpRecord.needsHelpSince.getTime()) / (1000 * 60 * 60 * 24)} days`)
    console.log(`Expected Days Needing Help: ${expectedDays}`)
    console.log(`Recorded Days Needing Help: ${helpRecord.daysNeedingHelp}`)
    console.log(`Match: ${expectedDays === helpRecord.daysNeedingHelp ? '✅' : '❌'}`)

    // Check if record was updated recently
    const timeSinceUpdate = (currentDate.getTime() - helpRecord.updatedAt.getTime()) / (1000 * 60)
    console.log(`\n⏰ Last Update: ${timeSinceUpdate.toFixed(1)} minutes ago`)

    // Test the frontend API call
    console.log('\n🌐 Testing Frontend API Call...')
    console.log('─'.repeat(50))
    
    // Simulate what the frontend gets
    const frontendData = await prisma.studentsNeedingHelp.findMany({
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

    const andyFrontendData = frontendData.find(s => s.student.username === 'Andy')
    
    if (andyFrontendData) {
      console.log('✅ Andy found in frontend data:')
      console.log(`  Days Needing Help: ${andyFrontendData.daysNeedingHelp}`)
      console.log(`  Needs Help Since: ${andyFrontendData.needsHelpSince.toISOString()}`)
      console.log(`  Severity: ${andyFrontendData.severity}`)
      console.log(`  Classes: ${andyFrontendData.classes.map(c => c.class.name).join(', ')}`)
      console.log(`  Teachers: ${andyFrontendData.teachers.map(t => t.teacher.username).join(', ')}`)
    } else {
      console.log('❌ Andy not found in frontend data')
    }

  } catch (error) {
    console.error('❌ Error checking Andy\'s help dates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndyHelpDates() 