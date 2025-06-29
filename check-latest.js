import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLatestProgress() {
  console.log('Checking most recent assignment completion...');
  
  const student = await prisma.user.findFirst({
    where: { username: 'student' },
    select: { id: true, username: true }
  });
  
  // Get the most recent progress submission
  const latestProgress = await prisma.studentAssignmentProgress.findFirst({
    where: {
      studentId: student.id,
      isComplete: true
    },
    include: {
      assignment: {
        select: { id: true, topic: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  if (latestProgress) {
    console.log('Latest progress:');
    console.log(`  Assignment: ${latestProgress.assignment.topic}`);
    console.log(`  Updated at: ${latestProgress.updatedAt}`);
    console.log(`  Assignment ID: ${latestProgress.assignment.id}`);
    
    // Check current student stats
    const studentStats = await prisma.studentStats.findUnique({
      where: { studentId: student.id },
      select: {
        totalAssignments: true,
        completedAssignments: true,
        averageScore: true,
        lastUpdated: true
      }
    });
    
    console.log('Current student stats:');
    console.log(`  Total assignments: ${studentStats?.totalAssignments}`);
    console.log(`  Completed: ${studentStats?.completedAssignments}`);
    console.log(`  Average score: ${studentStats?.averageScore}`);
    console.log(`  Last updated: ${studentStats?.lastUpdated}`);
    
    // Check if stats were updated after the progress
    if (studentStats?.lastUpdated && latestProgress.updatedAt) {
      const statsUpdatedAfter = studentStats.lastUpdated >= latestProgress.updatedAt;
      console.log(`Stats updated after progress: ${statsUpdatedAfter}`);
      
      if (!statsUpdatedAfter) {
        console.log('❌ PROBLEM: Stats were NOT updated after progress submission!');
      } else {
        console.log('✅ Stats were updated after progress submission');
      }
    }
  } else {
    console.log('No progress found');
  }
}

checkLatestProgress().catch(console.error).finally(() => prisma.$disconnect()); 