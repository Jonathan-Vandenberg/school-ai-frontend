import { ActivityLogType, PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with sample data...')

  try {
    // Create languages
    console.log('📚 Creating languages...')
    let english = await prisma.language.findFirst({
      where: { code: 'en-US' }
    })
    if (!english) {
      english = await prisma.language.create({
        data: {
          language: 'ENGLISH',
          code: 'en-US',
          publishedAt: new Date(),
        },
      })
    }

    let japanese = await prisma.language.findFirst({
      where: { code: 'ja-JP' }
    })
    if (!japanese) {
      japanese = await prisma.language.create({
        data: {
          language: 'JAPANESE',
          code: 'ja-JP',
          publishedAt: new Date(),
        },
      })
    }

    // Create admin user
    console.log('👤 Creating admin user...')
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@schoolai.local' }
    })
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@schoolai.local',
          password: await hashPassword('admin123'),
          confirmed: true,
          customRole: 'ADMIN',
          phone: '+1-555-0001',
          address: '123 Admin Street, Education City',
        },
      })
    }

    // Create teachers
    console.log('👨‍🏫 Creating teachers...')
    let teacher1 = await prisma.user.findUnique({
      where: { email: 'teacher1@schoolai.local' }
    })
    if (!teacher1) {
      teacher1 = await prisma.user.create({
        data: {
          username: 'teacher_smith',
          email: 'teacher1@schoolai.local',
          password: await hashPassword('teacher123'),
          confirmed: true,
          customRole: 'TEACHER',
          phone: '+1-555-0002',
          address: '456 Teacher Avenue, Education City',
        },
      })
    }

    let teacher2 = await prisma.user.findUnique({
      where: { email: 'teacher2@schoolai.local' }
    })
    if (!teacher2) {
      teacher2 = await prisma.user.create({
        data: {
          username: 'teacher_johnson',
          email: 'teacher2@schoolai.local',
          password: await hashPassword('teacher123'),
          confirmed: true,
          customRole: 'TEACHER',
          phone: '+1-555-0003',
          address: '789 Education Boulevard, Education City',
        },
      })
    }

    // Create students
    console.log('👨‍🎓 Creating students...')
    const students = []
    for (let i = 1; i <= 5; i++) {
      let student = await prisma.user.findUnique({
        where: { email: `student${i}@schoolai.local` }
      })
      if (!student) {
        student = await prisma.user.create({
          data: {
            username: `student_${String(i).padStart(3, '0')}`,
            email: `student${i}@schoolai.local`,
            password: await hashPassword('student123'),
            confirmed: true,
            customRole: 'STUDENT',
            phone: `+1-555-100${i}`,
            address: `${100 + i} Student Lane, Education City`,
            isPlayGame: true,
          },
        })
      }
      students.push(student)
    }

    // Create classes
    console.log('🏫 Creating classes...')
    let class1 = await prisma.class.findFirst({
      where: { name: 'English Beginners A1' }
    })
    if (!class1) {
      class1 = await prisma.class.create({
        data: {
          name: 'English Beginners A1',
          publishedAt: new Date(),
        },
      })
    }

    let class2 = await prisma.class.findFirst({
      where: { name: 'Japanese Intermediate B1' }
    })
    if (!class2) {
      class2 = await prisma.class.create({
        data: {
          name: 'Japanese Intermediate B1',
          publishedAt: new Date(),
        },
      })
    }

    // Assign students to classes (skip if already exists)
    console.log('👥 Assigning students to classes...')
    for (const assignment of [
      { userId: students[0].id, classId: class1.id },
      { userId: students[1].id, classId: class1.id },
      { userId: students[2].id, classId: class1.id },
      { userId: students[3].id, classId: class2.id },
      { userId: students[4].id, classId: class2.id },
    ]) {
      const existing = await prisma.userClass.findUnique({
        where: {
          userId_classId: {
            userId: assignment.userId,
            classId: assignment.classId,
          }
        }
      })
      if (!existing) {
        await prisma.userClass.create({ data: assignment })
      }
    }

    // Create assignments (some active, some scheduled)
    console.log('📝 Creating assignments...')
    
    // Active assignment
    let activeAssignment = await prisma.assignment.findFirst({
      where: { topic: 'Basic Vocabulary: Colors and Shapes' }
    })
    if (!activeAssignment) {
      activeAssignment = await prisma.assignment.create({
        data: {
          topic: 'Basic Vocabulary: Colors and Shapes',
          type: 'CLASS',
          color: '#4ECDC4',
          isActive: true,
          teacherId: teacher1.id,
          languageId: english.id,
          vocabularyItems: [
            { word: 'red', definition: 'A bright warm color', pronunciation: '/red/' },
            { word: 'blue', definition: 'A cool color like the sky', pronunciation: '/bluː/' },
            { word: 'circle', definition: 'A round shape', pronunciation: '/ˈsɜːrkəl/' },
            { word: 'square', definition: 'A shape with four equal sides', pronunciation: '/skwer/' },
          ],
          context: 'Learn basic vocabulary for colors and shapes through interactive exercises.',
          publishedAt: new Date(),
          evaluationSettings: {
            create: {
              type: 'Q_AND_A',
              customPrompt: 'Evaluate student responses on vocabulary understanding',
              rules: {
                requireCorrectPronunciation: true,
                allowPartialCredit: true,
                minimumScore: 70,
              },
              feedbackSettings: {
                providePronunciationHelp: true,
                showCorrectAnswer: true,
                encouragingMessages: true,
              },
            },
          },
        },
      })
    }

    // Scheduled assignment for 2 minutes from now
    const scheduledTime1 = new Date()
    scheduledTime1.setMinutes(scheduledTime1.getMinutes() + 2)

    let scheduledAssignment1 = await prisma.assignment.findFirst({
      where: { topic: 'Video Assignment: Introducing Yourself' }
    })
    if (!scheduledAssignment1) {
      scheduledAssignment1 = await prisma.assignment.create({
        data: {
          topic: 'Video Assignment: Introducing Yourself',
          type: 'CLASS',
          color: '#FF6B6B',
          isActive: false,
          scheduledPublishAt: scheduledTime1,
          teacherId: teacher1.id,
          languageId: english.id,
          videoUrl: 'https://example.com/intro-video.mp4',
          videoTranscript: 'Hello, my name is Sarah. I am from Tokyo, Japan. I like reading books and playing tennis.',
          languageAssessmentType: 'SCRIPTED_US',
          context: 'Watch the video and practice introducing yourself in English.',
          publishedAt: new Date(),
          evaluationSettings: {
            create: {
              type: 'VIDEO',
              customPrompt: 'Evaluate student video introduction for fluency and content',
              rules: {
                requireVideoResponse: true,
                minimumDuration: 30,
                maximumDuration: 120,
              },
              feedbackSettings: {
                provideFluencyFeedback: true,
                highlightGrammarErrors: true,
                suggestImprovements: true,
              },
            },
          },
        },
      })
    }

    // Scheduled assignment for 5 minutes from now
    const scheduledTime2 = new Date()
    scheduledTime2.setMinutes(scheduledTime2.getMinutes() + 5)

    let scheduledAssignment2 = await prisma.assignment.findFirst({
      where: { topic: 'IELTS Speaking Practice: Describe Your Hometown' }
    })
    if (!scheduledAssignment2) {
      scheduledAssignment2 = await prisma.assignment.create({
        data: {
          topic: 'IELTS Speaking Practice: Describe Your Hometown',
          type: 'INDIVIDUAL',
          color: '#45B7D1',
          isActive: false,
          scheduledPublishAt: scheduledTime2,
          teacherId: teacher2.id,
          languageId: english.id,
          isIELTS: true,
          languageAssessmentType: 'UNSCRIPTED_UK',
          context: 'IELTS Speaking Part 2: Describe your hometown. You have 2 minutes to speak.',
          publishedAt: new Date(),
          evaluationSettings: {
            create: {
              type: 'PRONUNCIATION',
              customPrompt: 'Evaluate IELTS speaking response for fluency, coherence, vocabulary, and grammar',
              rules: {
                ieltsScoring: true,
                timeLimit: 120,
                requireStructuredResponse: true,
              },
              feedbackSettings: {
                provideIELTSBandScore: true,
                detailedFeedback: true,
                improvementSuggestions: true,
              },
            },
          },
        },
      })
    }

    // Create questions for the assignments
    console.log('❓ Creating questions...')
    const questionData = [
      {
        assignmentId: activeAssignment.id,
        textQuestion: 'What color is the sky on a clear day?',
        textAnswer: 'blue',
      },
      {
        assignmentId: activeAssignment.id,
        textQuestion: 'What shape has four equal sides?',
        textAnswer: 'square',
      },
      {
        assignmentId: activeAssignment.id,
        textQuestion: 'Name a warm color that is often associated with fire.',
        textAnswer: 'red',
      },
      {
        assignmentId: scheduledAssignment1.id,
        textQuestion: 'Record yourself introducing yourself in English (30-60 seconds)',
      },
      {
        assignmentId: scheduledAssignment2.id,
        textQuestion: 'Describe your hometown for 2 minutes, covering location, population, and what makes it special.',
      },
    ]

    for (const question of questionData) {
      const existing = await prisma.question.findFirst({
        where: {
          assignmentId: question.assignmentId,
          textQuestion: question.textQuestion,
        }
      })
      if (!existing) {
        await prisma.question.create({
          data: {
            ...question,
            publishedAt: new Date(),
          }
        })
      }
    }

    // Assign class assignments to classes
    console.log('🔗 Linking assignments to classes...')
    const classAssignments = [
      { classId: class1.id, assignmentId: activeAssignment.id },
      { classId: class1.id, assignmentId: scheduledAssignment1.id },
    ]

    for (const assignment of classAssignments) {
      const existing = await prisma.classAssignment.findUnique({
        where: {
          classId_assignmentId: {
            classId: assignment.classId,
            assignmentId: assignment.assignmentId,
          }
        }
      })
      if (!existing) {
        await prisma.classAssignment.create({ data: assignment })
      }
    }

    // Assign individual assignment to specific students
    const userAssignments = [
      { userId: students[3].id, assignmentId: scheduledAssignment2.id },
      { userId: students[4].id, assignmentId: scheduledAssignment2.id },
    ]

    for (const assignment of userAssignments) {
      const existing = await prisma.userAssignment.findUnique({
        where: {
          userId_assignmentId: {
            userId: assignment.userId,
            assignmentId: assignment.assignmentId,
          }
        }
      })
      if (!existing) {
        await prisma.userAssignment.create({ data: assignment })
      }
    }

    // Create some student progress for the active assignment
    console.log('📊 Creating sample student progress...')
    const questions = await prisma.question.findMany({
      where: { assignmentId: activeAssignment.id },
    })

    // Student 1: Completed 2/3 questions correctly
    const progressData = [
      {
        studentId: students[0].id,
        assignmentId: activeAssignment.id,
        questionId: questions[0]?.id,
        isComplete: true,
        isCorrect: true,
      },
      {
        studentId: students[0].id,
        assignmentId: activeAssignment.id,
        questionId: questions[1]?.id,
        isComplete: true,
        isCorrect: true,
      },
      {
        studentId: students[0].id,
        assignmentId: activeAssignment.id,
        questionId: questions[2]?.id,
        isComplete: true,
        isCorrect: false,
      },
      // Student 2: Completed 1/3 questions correctly
      {
        studentId: students[1].id,
        assignmentId: activeAssignment.id,
        questionId: questions[0]?.id,
        isComplete: true,
        isCorrect: true,
      },
    ]

    for (const progress of progressData) {
      if (progress.questionId) {
        const existing = await prisma.studentAssignmentProgress.findFirst({
          where: {
            studentId: progress.studentId,
            assignmentId: progress.assignmentId,
            questionId: progress.questionId,
          }
        })
        if (!existing) {
          await prisma.studentAssignmentProgress.create({
            data: {
              ...progress,
              publishedAt: new Date(),
            }
          })
        }
      }
    }

    // Create activity logs
    console.log('📋 Creating activity logs...')
    const activityData = [
      {
        type: 'ASSIGNMENT_CREATED',
        userId: teacher1.id,
        assignmentId: activeAssignment.id,
      },
      {
        type: 'ASSIGNMENT_CREATED',
        userId: teacher1.id,
        assignmentId: scheduledAssignment1.id,
      },
      {
        type: 'ASSIGNMENT_CREATED',
        userId: teacher2.id,
        assignmentId: scheduledAssignment2.id,
      },
      {
        type: 'CLASS_CREATED',
        userId: admin.id,
        classId: class1.id,
      },
      {
        type: 'CLASS_CREATED',
        userId: admin.id,
        classId: class2.id,
      },
    ]

    for (const activity of activityData) {
      const existing = await prisma.activityLog.findFirst({
        where: {
          type: activity.type as ActivityLogType,
          userId: activity.userId,
          assignmentId: activity.assignmentId,
          classId: activity.classId,
        }
      })
      if (!existing) {
        await prisma.activityLog.create({
          data: {
            ...activity,
            type: activity.type as ActivityLogType,
            publishedAt: new Date(),
          }
        })
      }
    }

    // Create sprite sets for gamification
    console.log('🎮 Creating sprite sets for gamification...')
    let spriteSet = await prisma.spriteSet.findFirst({
      where: { name: 'Language Learning Journey' }
    })
    if (!spriteSet) {
      spriteSet = await prisma.spriteSet.create({
        data: {
          name: 'Language Learning Journey',
          description: 'Progress through different stages as you master languages',
          difficulty: 1,
          order: 1,
          stages: [
            { name: 'Beginner', description: 'Just starting out', requiredAssignments: 1 },
            { name: 'Learner', description: 'Making progress', requiredAssignments: 3 },
            { name: 'Student', description: 'Building skills', requiredAssignments: 5 },
            { name: 'Scholar', description: 'Advanced learner', requiredAssignments: 10 },
            { name: 'Master', description: 'Language expert', requiredAssignments: 20 },
          ],
          publishedAt: new Date(),
        },
      })
    }

    // Create student sprites
    console.log('🦸 Creating student sprites...')
    for (const student of students.slice(0, 3)) {
      const existing = await prisma.studentSprite.findUnique({
        where: { studentId: student.id }
      })
      if (!existing) {
        await prisma.studentSprite.create({
          data: {
            studentId: student.id,
            currentEvolutionStage: Math.floor(Math.random() * 3),
            completedAssignmentsCount: Math.floor(Math.random() * 5),
            currentSpriteSetIndex: 0,
            completedSpriteSets: [],
            spriteSetId: spriteSet.id,
            publishedAt: new Date(),
          },
        })
      }
    }

    console.log('\n✅ Database seeded successfully!')
    console.log('\n📊 Summary:')
    console.log(`   👤 Users: 1 admin, 2 teachers, 5 students`)
    console.log(`   🏫 Classes: 2 classes with student assignments`)
    console.log(`   📝 Assignments: 1 active, 2 scheduled`)
    console.log(`   ❓ Questions: 5 questions across assignments`)
    console.log(`   📊 Progress: Sample student progress recorded`)
    console.log(`   🎮 Gamification: Sprite sets and student sprites created`)
    console.log('\n🔮 Scheduled Assignments:')
    console.log(`   📺 Video assignment: ${scheduledTime1.toLocaleTimeString()} (in ~2 min)`)
    console.log(`   🗣️  IELTS assignment: ${scheduledTime2.toLocaleTimeString()} (in ~5 min)`)
    console.log('\n🔑 Login Credentials:')
    console.log('   Admin: admin@schoolai.local / admin123')
    console.log('   Teacher 1: teacher1@schoolai.local / teacher123')
    console.log('   Teacher 2: teacher2@schoolai.local / teacher123')
    console.log('   Students: student1@schoolai.local / student123 (etc.)')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 