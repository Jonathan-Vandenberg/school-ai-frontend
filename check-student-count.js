const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkStudentCount() {
  try {
    console.log('👥 Checking actual student count in database...\n')

    // Count total students
    const totalStudents = await prisma.user.count({
      where: { customRole: 'STUDENT' }
    })

    console.log(`📊 Total students in database: ${totalStudents}`)

    // Get all students with details
    const students = await prisma.user.findMany({
      where: { customRole: 'STUDENT' },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        customRole: true
      },
      orderBy: { username: 'asc' }
    })

    console.log('\n📝 List of all students:')
    console.log('─'.repeat(60))
    students.forEach((student, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${student.username.padEnd(15, ' ')} | ${student.email || 'No email'} | Created: ${student.createdAt.toISOString().split('T')[0]}`)
    })

    // Check for duplicates
    const usernames = students.map(s => s.username)
    const duplicateUsernames = usernames.filter((username, index) => usernames.indexOf(username) !== index)
    
    if (duplicateUsernames.length > 0) {
      console.log('\n⚠️  Duplicate usernames found:')
      duplicateUsernames.forEach(username => {
        console.log(`  - ${username}`)
      })
    }

    // Check role distribution
    console.log('\n📊 Role Distribution:')
    console.log('─'.repeat(30))
    
    const roleCounts = await prisma.user.groupBy({
      by: ['customRole'],
      _count: {
        id: true
      }
    })

    roleCounts.forEach(role => {
      console.log(`${role.customRole}: ${role._count.id}`)
    })

    // Check for students with null or undefined customRole
    const usersWithoutRole = await prisma.user.findMany({
      where: {
        OR: [
          { customRole: null },
          { customRole: '' }
        ]
      },
      select: { id: true, username: true, email: true, customRole: true }
    })

    if (usersWithoutRole.length > 0) {
      console.log(`\n⚠️  Users without role: ${usersWithoutRole.length}`)
      
      usersWithoutRole.forEach(user => {
        console.log(`  - ${user.username}: role = "${user.customRole}"`)
      })
    } else {
      console.log('\n✅ All users have roles assigned')
    }

    // Check what the cron job query would return
    console.log('\n🔍 What the cron job query returns:')
    console.log('─'.repeat(40))
    
    const cronJobStudents = await prisma.user.findMany({
      where: { customRole: 'STUDENT' },
      select: { id: true, username: true, email: true }
    })

    console.log(`Cron job would process: ${cronJobStudents.length} students`)
    
    if (cronJobStudents.length !== totalStudents) {
      console.log('❌ Mismatch between count and findMany results!')
    } else {
      console.log('✅ Count matches findMany results')
    }

  } catch (error) {
    console.error('❌ Error checking student count:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStudentCount() 