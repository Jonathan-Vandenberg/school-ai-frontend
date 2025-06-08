import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    // Find the admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        customRole: 'ADMIN'
      }
    })

    if (!adminUser) {
      console.log('❌ No admin user found in database')
      return
    }

    // New password
    const newPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update the admin password
    const updatedUser = await prisma.user.update({
      where: {
        id: adminUser.id
      },
      data: {
        password: hashedPassword,
        confirmed: true,
        blocked: false
      }
    })

    console.log('🎉 Admin password reset successfully!')
    console.log('📋 Login credentials:')
    console.log(`📧 Email: ${updatedUser.email}`)
    console.log(`👤 Username: ${updatedUser.username}`)
    console.log(`🔑 Password: ${newPassword}`)
    console.log(`🔐 Role: ${updatedUser.customRole}`)
    console.log(`✅ Confirmed: ${updatedUser.confirmed}`)
    console.log(`🚫 Blocked: ${updatedUser.blocked}`)
    console.log('')
    console.log('🔗 Use these credentials to sign in at: http://localhost:3000/auth/signin')

  } catch (error) {
    console.error('❌ Error resetting admin password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword() 