#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetDatabaseWithAdmin() {
  console.log('🗑️  Starting database reset...')
  
  try {
    // Clear all tables in the correct order (respecting foreign key constraints)
    console.log('Clearing all tables...')
    
    // Clear tables that reference other tables first
    await prisma.studentAssignmentProgress.deleteMany()
    await prisma.quizAnswer.deleteMany()
    await prisma.quizSubmission.deleteMany()
    await prisma.quizLiveStudentProgress.deleteMany()
    await prisma.quizLiveSession.deleteMany()
    await prisma.quizOption.deleteMany()
    await prisma.quizQuestion.deleteMany()
    await prisma.quizStudent.deleteMany()
    await prisma.quizClass.deleteMany()
    await prisma.quiz.deleteMany()
    await prisma.question.deleteMany()
    await prisma.evaluationSettings.deleteMany()
    await prisma.userAssignment.deleteMany()
    await prisma.classAssignment.deleteMany()
    await prisma.assignment.deleteMany()
    await prisma.userClass.deleteMany()
    await prisma.class.deleteMany()
    await prisma.language.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.assignmentCategory.deleteMany()
    await prisma.assignmentGroup.deleteMany()
    await prisma.tool.deleteMany()
    await prisma.studentSprite.deleteMany()
    await prisma.spriteSet.deleteMany()
    await prisma.statsClass.deleteMany()
    await prisma.assignmentStats.deleteMany()
    await prisma.studentStats.deleteMany()
    await prisma.teacherStats.deleteMany()
    await prisma.classStatsDetailed.deleteMany()
    await prisma.schoolStats.deleteMany()
    await prisma.performanceMetric.deleteMany()
    await prisma.dashboardSnapshot.deleteMany()
    await prisma.uploadFile.deleteMany()
    await prisma.uploadFolder.deleteMany()
    await prisma.studentsNeedingHelpClass.deleteMany()
    await prisma.studentsNeedingHelpTeacher.deleteMany()
    await prisma.studentsNeedingHelp.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()
    
    console.log('✅ All tables cleared successfully')
    
    // Create default roles
    console.log('Creating default roles...')
    
    const adminRole = await prisma.role.create({
      data: {
        name: 'ADMIN',
        description: 'Administrator role with full access',
        type: 'ADMIN'
      }
    })
    
    const teacherRole = await prisma.role.create({
      data: {
        name: 'TEACHER',
        description: 'Teacher role with assignment and class management access',
        type: 'TEACHER'
      }
    })
    
    const studentRole = await prisma.role.create({
      data: {
        name: 'STUDENT',
        description: 'Student role with assignment access',
        type: 'STUDENT'
      }
    })
    
    console.log('✅ Default roles created')
    
    // Create permissions
    console.log('Creating permissions...')
    
    const permissions = [
      { action: 'CREATE_USER' },
      { action: 'READ_USER' },
      { action: 'UPDATE_USER' },
      { action: 'DELETE_USER' },
      { action: 'CREATE_CLASS' },
      { action: 'READ_CLASS' },
      { action: 'UPDATE_CLASS' },
      { action: 'DELETE_CLASS' },
      { action: 'CREATE_ASSIGNMENT' },
      { action: 'READ_ASSIGNMENT' },
      { action: 'UPDATE_ASSIGNMENT' },
      { action: 'DELETE_ASSIGNMENT' },
      { action: 'VIEW_ANALYTICS' },
      { action: 'MANAGE_SYSTEM' }
    ]
    
    const createdPermissions = []
    for (const perm of permissions) {
      const permission = await prisma.permission.create({
        data: perm
      })
      createdPermissions.push(permission)
    }
    
    console.log('✅ Permissions created')
    
    // Assign all permissions to admin role
    console.log('Assigning permissions to admin role...')
    
    for (const permission of createdPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      })
    }
    
    // Assign basic permissions to teacher role
    const teacherPermissions = createdPermissions.filter(p => 
      ['CREATE_CLASS', 'READ_CLASS', 'UPDATE_CLASS', 'CREATE_ASSIGNMENT', 'READ_ASSIGNMENT', 'UPDATE_ASSIGNMENT', 'VIEW_ANALYTICS'].includes(p.action)
    )
    
    for (const permission of teacherPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: teacherRole.id,
          permissionId: permission.id
        }
      })
    }
    
    // Assign basic permissions to student role
    const studentPermissions = createdPermissions.filter(p => 
      ['READ_ASSIGNMENT'].includes(p.action)
    )
    
    for (const permission of studentPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: studentRole.id,
          permissionId: permission.id
        }
      })
    }
    
    console.log('✅ Permissions assigned to roles')
    
    // Create default languages
    console.log('Creating default languages...')
    
    await prisma.language.createMany({
      data: [
        { language: 'ENGLISH', code: 'en' },
        { language: 'VIETNAMESE', code: 'vi' },
        { language: 'JAPANESE', code: 'ja' },
        { language: 'SPANISH', code: 'es' },
        { language: 'ITALIAN', code: 'it' },
        { language: 'FRENCH', code: 'fr' },
        { language: 'GERMAN', code: 'de' },
        { language: 'PORTUGESE', code: 'pt' }
      ]
    })
    
    console.log('✅ Default languages created')
    
    // Create admin user
    console.log('Creating admin user...')
    
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@school-ai.com',
        password: hashedPassword,
        customRole: 'ADMIN',
        confirmed: true,
        blocked: false,
        roleId: adminRole.id
      }
    })
    
    console.log('✅ Admin user created')
    console.log('📧 Email: admin@school-ai.com')
    console.log('👤 Username: admin')
    console.log('🔑 Password: admin123')
    console.log('')
    console.log('⚠️  IMPORTANT: Change the admin password immediately after first login!')
    console.log('')
    console.log('🎉 Database reset completed successfully!')
    
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
resetDatabaseWithAdmin()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
