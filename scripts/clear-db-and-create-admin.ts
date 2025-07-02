import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function clearDatabaseAndCreateAdmin() {
  try {
    console.log('🧹 Clearing entire database...');

    // Delete in the correct order to avoid foreign key constraint issues
    console.log('🗑️  Deleting quiz-related data...');
    await prisma.quizLiveStudentProgress.deleteMany();
    await prisma.quizLiveSession.deleteMany();
    await prisma.quizAnswer.deleteMany();
    await prisma.quizSubmission.deleteMany();
    await prisma.quizStudent.deleteMany();
    await prisma.quizClass.deleteMany();
    await prisma.quizOption.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.quiz.deleteMany();

    console.log('🗑️  Deleting assignment-related data...');
    await prisma.studentAssignmentProgress.deleteMany();
    await prisma.userAssignment.deleteMany();
    await prisma.classAssignment.deleteMany();
    await prisma.question.deleteMany();
    await prisma.evaluationSettings.deleteMany();
    await prisma.assignment.deleteMany();

    console.log('🗑️  Deleting statistics and analytics...');
    await prisma.studentsNeedingHelpTeacher.deleteMany();
    await prisma.studentsNeedingHelpClass.deleteMany();
    await prisma.studentsNeedingHelp.deleteMany();
    await prisma.performanceMetric.deleteMany();
    await prisma.dashboardSnapshot.deleteMany();
    await prisma.classStatsDetailed.deleteMany();
    await prisma.teacherStats.deleteMany();
    await prisma.studentStats.deleteMany();
    await prisma.assignmentStats.deleteMany();
    await prisma.statsClass.deleteMany();
    await prisma.schoolStats.deleteMany();

    console.log('🗑️  Deleting user-related data...');
    await prisma.activityLog.deleteMany();
    await prisma.studentSprite.deleteMany();
    await prisma.userClass.deleteMany();

    console.log('🗑️  Deleting classes and other entities...');
    await prisma.class.deleteMany();
    await prisma.language.deleteMany();
    await prisma.spriteSet.deleteMany();
    await prisma.tool.deleteMany();
    await prisma.assignmentGroup.deleteMany();
    await prisma.assignmentCategory.deleteMany();
    await prisma.uploadFile.deleteMany();
    await prisma.uploadFolder.deleteMany();

    console.log('🗑️  Deleting roles and permissions...');
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();

    console.log('🗑️  Deleting users...');
    await prisma.user.deleteMany();

    console.log('✅ Database completely cleared!');

    console.log('👤 Creating admin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin', 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@schoolai.local',
        password: hashedPassword,
        customRole: 'ADMIN',
        confirmed: true,
        blocked: false
      }
    });

    console.log('✅ Admin user created successfully!');
    
    // Verify the password works
    const verifyPassword = await bcrypt.compare('admin', adminUser.password!);
    console.log('✅ Password verification test:', verifyPassword);

    console.log('🎉 Database reset complete!');
    console.log('🔑 Login credentials:');
    console.log('   Email/Username: admin');
    console.log('   Password: admin');
    console.log('   URL: http://localhost:3000/auth/signin');

  } catch (error) {
    console.error('❌ Error clearing database and creating admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabaseAndCreateAdmin()
  .then(() => {
    console.log('🎉 Database reset and admin creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to reset database:', error);
    process.exit(1);
  }); 