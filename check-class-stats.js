const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClassStats() {
  try {
    const classId = 'cmcg7oi8j0000ie82dy6y8mr7';
    
    console.log('=== CHECKING CLASS STATS ===');
    console.log('Class ID:', classId);
    
    // Check if class exists
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true }
    });
    
    if (!classDetails) {
      console.log('❌ Class not found');
      return;
    }
    
    console.log('✅ Class found:', classDetails.name);
    
    // Check ClassStatsDetailed table
    const classStats = await prisma.classStatsDetailed.findUnique({
      where: { classId: classId }
    });
    
    console.log('\n=== CLASS STATS DETAILED ===');
    if (classStats) {
      console.log('✅ Stats found in ClassStatsDetailed table:');
      console.log('- Total Students:', classStats.totalStudents);
      console.log('- Total Assignments:', classStats.totalAssignments);
      console.log('- Average Completion:', classStats.averageCompletion + '%');
      console.log('- Average Score:', classStats.averageScore + '%');
      console.log('- Total Questions:', classStats.totalQuestions);
      console.log('- Total Answers:', classStats.totalAnswers);
      console.log('- Correct Answers:', classStats.totalCorrectAnswers);
      console.log('- Accuracy Rate:', classStats.accuracyRate + '%');
      console.log('- Active Students:', classStats.activeStudents);
      console.log('- Last Updated:', classStats.lastUpdated);
    } else {
      console.log('❌ No stats found in ClassStatsDetailed table');
      console.log('This might be why the API is returning N/A values');
    }
    
    // Check students needing help for this class
    const studentsNeedingHelp = await prisma.studentsNeedingHelp.count({
      where: {
        isResolved: false,
        classes: {
          some: {
            classId: classId
          }
        }
      }
    });
    
    console.log('\n=== STUDENTS NEEDING HELP ===');
    console.log('Count:', studentsNeedingHelp);
    
    // Check class assignments and student count manually
    console.log('\n=== MANUAL CALCULATION ===');
    
    const assignments = await prisma.assignment.count({
      where: {
        classes: {
          some: { classId: classId }
        }
      }
    });
    
    const students = await prisma.user.count({
      where: {
        customRole: 'STUDENT',
        classes: {
          some: { classId: classId }
        }
      }
    });
    
    console.log('- Manual Assignment Count:', assignments);
    console.log('- Manual Student Count:', students);
    
    if (students > 0) {
      // Calculate some basic stats
      const studentIds = await prisma.user.findMany({
        where: {
          customRole: 'STUDENT',
          classes: {
            some: { classId: classId }
          }
        },
        select: { id: true }
      });
      
      let totalCompletionRate = 0;
      let totalAverageScore = 0;
      let validStudents = 0;
      
      for (const student of studentIds) {
        const studentStats = await prisma.studentStats.findUnique({
          where: { studentId: student.id }
        });
        
        if (studentStats) {
          totalCompletionRate += studentStats.completionRate;
          totalAverageScore += studentStats.averageScore;
          validStudents++;
        }
      }
      
      if (validStudents > 0) {
        const avgCompletion = totalCompletionRate / validStudents;
        const avgScore = totalAverageScore / validStudents;
        
        console.log('- Calculated Average Completion:', avgCompletion.toFixed(1) + '%');
        console.log('- Calculated Average Score:', avgScore.toFixed(1) + '%');
        console.log('- Students with Stats:', validStudents);
      } else {
        console.log('- No student statistics found');
      }
    }
    
    console.log('\n=== RECOMMENDATION ===');
    if (!classStats) {
      console.log('🔧 Need to run class statistics initialization');
      console.log('   Run: npm run tsx scripts/initialize-class-stats.ts');
    } else {
      console.log('🤔 Stats exist but may not be loading correctly in the API');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClassStats(); 