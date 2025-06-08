import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

async function main() {
  console.log('🌱 Seeding database...')

  // Create languages first
  const englishLanguage = await prisma.language.upsert({
    where: { id: 'english' },
    update: {},
    create: {
      id: 'english',
      language: 'ENGLISH',
      code: 'en',
      publishedAt: new Date(),
    },
  })

  // Create admin user
  const adminPassword = await hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jis.ai' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@jis.ai',
      password: adminPassword,
      customRole: 'ADMIN',
      confirmed: true,
      blocked: false,
      phone: '+1234567890',
      address: 'Tokyo, Japan',
    },
  })

  // Create teacher users
  const teacherPassword = await hashPassword('teacher123')
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@jis.ai' },
    update: {},
    create: {
      username: 'teacher_johnson',
      email: 'teacher1@jis.ai',
      password: teacherPassword,
      customRole: 'TEACHER',
      confirmed: true,
      blocked: false,
      phone: '+1234567891',
      address: 'Tokyo, Japan',
    },
  })

  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@jis.ai' },
    update: {},
    create: {
      username: 'teacher_smith',
      email: 'teacher2@jis.ai',
      password: teacherPassword,
      customRole: 'TEACHER',
      confirmed: true,
      blocked: false,
      phone: '+1234567892',
      address: 'Tokyo, Japan',
    },
  })

  // Create student users
  const studentPassword = await hashPassword('student123')
  const students = []
  
  for (let i = 1; i <= 5; i++) {
    const student = await prisma.user.upsert({
      where: { email: `student${i}@jis.ai` },
      update: {},
      create: {
        username: `student${i}`,
        email: `student${i}@jis.ai`,
        password: studentPassword,
        customRole: 'STUDENT',
        confirmed: true,
        blocked: i === 3 ? true : false, // Block one student for testing
        phone: `+123456789${i}`,
        address: 'Tokyo, Japan',
        isPlayGame: true,
      },
    })
    students.push(student)
  }

  // Create a test class
  const testClass = await prisma.class.create({
    data: {
      name: 'English 101',
      publishedAt: new Date(),
    },
  })

  // Assign users to the class
  await prisma.userClass.createMany({
    data: [
      { userId: teacher1.id, classId: testClass.id },
      { userId: students[0].id, classId: testClass.id },
      { userId: students[1].id, classId: testClass.id },
      { userId: students[3].id, classId: testClass.id }, // Skip blocked student
    ],
  })

  console.log('✅ Database seeded successfully!')
  console.log(`👤 Admin: admin@jis.ai / admin123`)
  console.log(`👨‍🏫 Teacher: teacher1@jis.ai / teacher123`)
  console.log(`👨‍🎓 Students: student1@jis.ai / student123 (and student2, student4, student5)`)
  console.log(`🚫 Blocked Student: student3@jis.ai / student123`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 