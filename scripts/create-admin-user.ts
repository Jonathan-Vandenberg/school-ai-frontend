import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@jis-ai.com' },
          { username: 'admin' }
        ]
      }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists:')
      console.log(`📧 Email: ${existingAdmin.email}`)
      console.log(`👤 Username: ${existingAdmin.username}`)
      console.log(`🔐 Role: ${existingAdmin.customRole}`)
      return
    }

    // Hash the password
    const password = 'admin123'
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@jis-ai.com',
        password: hashedPassword,
        customRole: 'ADMIN',
        confirmed: true,
        blocked: false,
        averageScoreOfCompleted: 0,
        totalAssignments: 0,
        totalAssignmentsCompleted: 0,
        averageCompletionPercentage: 0
      }
    })

    console.log('🎉 Admin user created successfully!')
    console.log('📋 Login credentials:')
    console.log(`📧 Email: ${adminUser.email}`)
    console.log(`👤 Username: ${adminUser.username}`)
    console.log(`🔑 Password: ${password}`)
    console.log(`🔐 Role: ${adminUser.customRole}`)
    console.log(`✅ Confirmed: ${adminUser.confirmed}`)
    console.log(`🚫 Blocked: ${adminUser.blocked}`)

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser() 