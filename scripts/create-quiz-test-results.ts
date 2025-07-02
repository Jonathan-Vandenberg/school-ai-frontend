import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const QUIZ_ID = 'cmcli1wwx001yiecl5wyqdaig';

// Medal distribution: 1 gold, 12 silver, 2 bronze, 13 no medals
const STUDENTS_DATA = [
  // 1 Gold Medal (95-100%)
  { username: 'alice_gold', email: 'alice.gold@test.com', percentage: 98 },
  
  // 12 Silver Medals (85-90%)
  { username: 'bob_silver1', email: 'bob.silver1@test.com', percentage: 89 },
  { username: 'carol_silver2', email: 'carol.silver2@test.com', percentage: 88 },
  { username: 'david_silver3', email: 'david.silver3@test.com', percentage: 87 },
  { username: 'emma_silver4', email: 'emma.silver4@test.com', percentage: 86 },
  { username: 'frank_silver5', email: 'frank.silver5@test.com', percentage: 89 },
  { username: 'grace_silver6', email: 'grace.silver6@test.com', percentage: 88 },
  { username: 'henry_silver7', email: 'henry.silver7@test.com', percentage: 87 },
  { username: 'iris_silver8', email: 'iris.silver8@test.com', percentage: 86 },
  { username: 'jack_silver9', email: 'jack.silver9@test.com', percentage: 89 },
  { username: 'kate_silver10', email: 'kate.silver10@test.com', percentage: 88 },
  { username: 'liam_silver11', email: 'liam.silver11@test.com', percentage: 87 },
  { username: 'maya_silver12', email: 'maya.silver12@test.com', percentage: 86 },
  
  // 2 Bronze Medals (75-80%)
  { username: 'noah_bronze1', email: 'noah.bronze1@test.com', percentage: 78 },
  { username: 'olivia_bronze2', email: 'olivia.bronze2@test.com', percentage: 77 },
  
  // 13 No Medals (50-70%)
  { username: 'peter_student1', email: 'peter.student1@test.com', percentage: 68 },
  { username: 'quinn_student2', email: 'quinn.student2@test.com', percentage: 65 },
  { username: 'ruby_student3', email: 'ruby.student3@test.com', percentage: 62 },
  { username: 'sam_student4', email: 'sam.student4@test.com', percentage: 59 },
  { username: 'tina_student5', email: 'tina.student5@test.com', percentage: 56 },
  { username: 'victor_student6', email: 'victor.student6@test.com', percentage: 53 },
  { username: 'wendy_student7', email: 'wendy.student7@test.com', percentage: 67 },
  { username: 'xavier_student8', email: 'xavier.student8@test.com', percentage: 64 },
  { username: 'yara_student9', email: 'yara.student9@test.com', percentage: 61 },
  { username: 'zane_student10', email: 'zane.student10@test.com', percentage: 58 },
  { username: 'amy_student11', email: 'amy.student11@test.com', percentage: 55 },
  { username: 'ben_student12', email: 'ben.student12@test.com', percentage: 52 },
  { username: 'chloe_student13', email: 'chloe.student13@test.com', percentage: 50 }
];

async function main() {
  console.log('🚀 Creating 28 test students with quiz results...');

  // First, get the quiz to understand its structure
  const quiz = await prisma.quiz.findUnique({
    where: { id: QUIZ_ID },
    include: { questions: true }
  });

  if (!quiz) {
    throw new Error(`Quiz with ID ${QUIZ_ID} not found`);
  }

  console.log(`📋 Found quiz: "${quiz.title}" with ${quiz.questions.length} questions`);

  const totalQuestions = quiz.questions.length;
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create students and their quiz results
  for (let i = 0; i < STUDENTS_DATA.length; i++) {
    const studentData = STUDENTS_DATA[i];
    
    console.log(`👤 Creating student ${i + 1}/28: ${studentData.username} (${studentData.percentage}%)`);

    // Create the student user
    const student = await prisma.user.create({
      data: {
        username: studentData.username,
        email: studentData.email,
        password: hashedPassword,
        customRole: 'STUDENT',
        confirmed: true
      }
    });

    // Assign student to the quiz
    await prisma.quizStudent.create({
      data: {
        quizId: QUIZ_ID,
        userId: student.id
      }
    });

    // Calculate scores based on percentage
    const correctAnswers = Math.round((studentData.percentage / 100) * totalQuestions);
    const score = correctAnswers;
    const percentage = (score / totalQuestions) * 100;

    // Create quiz submission
    const submission = await prisma.quizSubmission.create({
      data: {
        quizId: QUIZ_ID,
        studentId: student.id,
        sessionNumber: 1,
        score: score,
        totalScore: totalQuestions,
        percentage: Math.round(percentage),
        isCompleted: true,
        startedAt: new Date(Date.now() - Math.random() * 1800000), // Random start time in last 30 mins
        completedAt: new Date(Date.now() - Math.random() * 300000)  // Random completion time in last 5 mins
      }
    });

    // Create quiz answers for each question
    for (let j = 0; j < totalQuestions; j++) {
      const question = quiz.questions[j];
      const isCorrect = j < correctAnswers; // First 'correctAnswers' questions are correct
      
      await prisma.quizAnswer.create({
        data: {
          submissionId: submission.id,
          questionId: question.id,
          answer: isCorrect ? question.correctAnswer : 'Wrong Answer',
          isCorrect: isCorrect
        }
      });
    }
  }

  console.log('✅ Test data created successfully!');
  console.log('📊 Medal distribution:');
  console.log('🥇 Gold (95-100%): 1 student');
  console.log('🥈 Silver (85-90%): 12 students');  
  console.log('🥉 Bronze (75-80%): 2 students');
  console.log('🔹 No Medal (50-70%): 13 students');
  console.log(`🎯 Visit: http://localhost:3000/activities/quiz/${QUIZ_ID}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 