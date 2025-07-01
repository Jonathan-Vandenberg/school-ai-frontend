import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

async function clearDatabase() {
  console.log('🧹 Clearing database...')
  
  // Delete in order to respect foreign key constraints
  await prisma.studentsNeedingHelpTeacher.deleteMany()
  await prisma.studentsNeedingHelpClass.deleteMany()
  await prisma.studentsNeedingHelp.deleteMany()
  await prisma.dashboardSnapshot.deleteMany()
  await prisma.schoolStats.deleteMany()
  await prisma.classStatsDetailed.deleteMany()
  await prisma.teacherStats.deleteMany()
  await prisma.studentStats.deleteMany()
  await prisma.assignmentStats.deleteMany()
  await prisma.performanceMetric.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.studentAssignmentProgress.deleteMany()
  await prisma.question.deleteMany()
  await prisma.evaluationSettings.deleteMany()
  await prisma.userAssignment.deleteMany()
  await prisma.classAssignment.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.userClass.deleteMany()
  await prisma.class.deleteMany()
  await prisma.language.deleteMany()
  await prisma.studentSprite.deleteMany()
  await prisma.spriteSet.deleteMany()
  await prisma.assignmentGroup.deleteMany()
  await prisma.assignmentCategory.deleteMany()
  await prisma.tool.deleteMany()
  await prisma.statsClass.deleteMany()
  await prisma.uploadFile.deleteMany()
  await prisma.uploadFolder.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  await prisma.user.deleteMany()
  
  console.log('✅ Database cleared successfully!')
}

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Clear the entire database first
  await clearDatabase()
  
  console.log('👤 Creating admin user...')
  
  // Hash the admin password
  const adminPassword = await hashPassword('admin')

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@school.com',
      password: adminPassword,
      customRole: 'ADMIN',
      confirmed: true,
      blocked: false,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('')
  console.log('📋 Admin User Created:')
  console.log('👑 Admin:')
  console.log('   Username: admin')
  console.log('   Email: admin@school.com')
  console.log('   Password: admin')
  console.log('')
  console.log('🚀 You can now log in with these credentials!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 