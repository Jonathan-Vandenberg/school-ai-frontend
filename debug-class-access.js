const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugClassAccess() {
  try {
    const classId = 'cmcg7oi8j0000ie82dy6y8mr7';
    
    console.log('=== DEBUGGING CLASS ACCESS ===');
    console.log('Class ID:', classId);
    
    // Check if class exists
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      select: { 
        id: true, 
        name: true,
        createdAt: true,
        users: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                username: true,
                customRole: true
              }
            }
          }
        }
      }
    });
    
    if (!classDetails) {
      console.log('❌ Class not found with ID:', classId);
      
      // Check what classes do exist
      const allClasses = await prisma.class.findMany({
        select: { id: true, name: true }
      });
      
      console.log('\n=== AVAILABLE CLASSES ===');
      allClasses.forEach(c => {
        console.log(`- ${c.name} (${c.id})`);
      });
      
      return;
    }
    
    console.log('✅ Class found:', classDetails.name);
    console.log('Created:', classDetails.createdAt);
    
    console.log('\n=== CLASS USERS ===');
    classDetails.users.forEach(u => {
      console.log(`- ${u.user.username} (${u.user.customRole}) - ID: ${u.user.id}`);
    });
    
    // Check current session user (find teacher_johnson)
    const teacherUser = await prisma.user.findFirst({
      where: { username: 'teacher_johnson' },
      select: { id: true, username: true, customRole: true }
    });
    
    console.log('\n=== CURRENT USER (teacher_johnson) ===');
    if (teacherUser) {
      console.log('✅ User found:');
      console.log('- ID:', teacherUser.id);
      console.log('- Username:', teacherUser.username);
      console.log('- Role:', teacherUser.customRole);
      
      // Check if teacher is in this class
      const userInClass = classDetails.users.find(u => u.userId === teacherUser.id);
      if (userInClass) {
        console.log('✅ Teacher has access to this class');
      } else {
        console.log('❌ Teacher does NOT have access to this class');
        console.log('Need to add teacher to class users');
      }
    } else {
      console.log('❌ teacher_johnson user not found');
    }
    
    // Check class statistics
    console.log('\n=== CLASS STATISTICS ===');
    const classStats = await prisma.classStatsDetailed.findUnique({
      where: { classId: classId }
    });
    
    if (classStats) {
      console.log('✅ Class statistics found:');
      console.log('- Average Completion:', classStats.averageCompletion + '%');
      console.log('- Average Score:', classStats.averageScore + '%');
      console.log('- Total Students:', classStats.totalStudents);
      console.log('- Last Updated:', classStats.lastUpdated);
    } else {
      console.log('❌ No class statistics found');
      console.log('Run: npm run initialize-class-stats');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugClassAccess(); 