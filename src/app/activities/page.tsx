import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle,
  BookOpen, 
  Users, 
  Target,
  Brain,
  PlusCircle,
  Calendar,
  Clock,
  Eye,
  Play,
  Trophy
} from "lucide-react";
import { prisma } from "@/lib/db";
import { QuizCardActions } from "@/components/activities/quiz-card-actions";

const activityTypes = [
  {
    id: 'quiz',
    title: 'Quiz',
    description: 'Create interactive multiple-choice quizzes for your students with AI assistance',
    icon: HelpCircle,
    href: '/activities/quiz/create',
    colors: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-100',
      iconBg: 'bg-emerald-100 group-hover:bg-emerald-200',
      iconColor: 'text-emerald-600',
      border: 'hover:border-emerald-200'
    }
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Design vocabulary and concept flashcards for effective memorization',
    icon: BookOpen,
    href: '/activities/flashcards/create',
    colors: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      iconBg: 'bg-blue-100 group-hover:bg-blue-200',
      iconColor: 'text-blue-600',
      border: 'hover:border-blue-200'
    }
  },
  {
    id: 'group-work',
    title: 'Group Work',
    description: 'Organize collaborative activities and group projects for students',
    icon: Users,
    href: '/activities/group-work/create',
    colors: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-100',
      iconBg: 'bg-purple-100 group-hover:bg-purple-200',
      iconColor: 'text-purple-600',
      border: 'hover:border-purple-200'
    }
  },
  {
    id: 'games',
    title: 'Educational Games',
    description: 'Create fun and engaging educational games and challenges',
    icon: Target,
    href: '/activities/games/create',
    colors: {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-100',
      iconBg: 'bg-orange-100 group-hover:bg-orange-200',
      iconColor: 'text-orange-600',
      border: 'hover:border-orange-200'
    }
  },
  {
    id: 'brain-teasers',
    title: 'Brain Teasers',
    description: 'Challenge students with puzzles and critical thinking exercises',
    icon: Brain,
    href: '/activities/brain-teasers/create',
    colors: {
      bg: 'bg-gradient-to-br from-pink-50 to-rose-100',
      iconBg: 'bg-pink-100 group-hover:bg-pink-200',
      iconColor: 'text-pink-600',
      border: 'hover:border-pink-200'
    }
  },
  {
    id: 'custom',
    title: 'Custom Activity',
    description: 'Create your own custom activity type tailored to your needs',
    icon: PlusCircle,
    href: '/activities/custom/create',
    colors: {
      bg: 'bg-gradient-to-br from-slate-50 to-gray-100',
      iconBg: 'bg-slate-100 group-hover:bg-slate-200',
      iconColor: 'text-slate-600',
      border: 'hover:border-slate-200'
    }
  },
];

export default async function ActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <p>Not Authorized</p>;
  }

  const userRole = session.user.customRole;

  // Teacher/Admin view - fetch created quizzes
  let myQuizzes: any[] = [];
  let studentQuizzes: any[] = [];
  let liveQuizzes: any[] = [];

  if (userRole === 'TEACHER' || userRole === 'ADMIN') {
    myQuizzes = await prisma.quiz.findMany({
      where: {
        teacherId: session.user.id
      },
      include: {
        _count: {
          select: {
            questions: true,
            submissions: true
          }
        },
        classes: {
          include: {
            class: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 6 // Show last 6 quizzes
    });
  } else if (userRole === 'STUDENT') {
    // Student view - fetch assigned quizzes
    const userClasses = await prisma.userClass.findMany({
      where: { userId: session.user.id },
      select: { classId: true }
    });

    const classIds = userClasses.map(uc => uc.classId);

    // Get live quizzes first
    liveQuizzes = await prisma.quiz.findMany({
      where: {
        isLiveSession: true,
        isActive: true,
        classes: {
          some: {
            classId: { in: classIds }
          }
        }
      },
      include: {
        teacher: { select: { username: true } },
        _count: {
          select: { questions: true }
        },
        classes: {
          include: {
            class: { select: { name: true } }
          }
        },
        liveSessions: {
          where: { isActive: true },
          select: {
            id: true,
            timeLimitMinutes: true,
            startedAt: true
          }
        }
      },
      orderBy: { liveSessionStartedAt: 'desc' }
    });

    // Get all available quizzes
    studentQuizzes = await prisma.quiz.findMany({
      where: {
        isActive: true,
        classes: {
          some: {
            classId: { in: classIds }
          }
        }
      },
      include: {
        teacher: { select: { username: true } },
        _count: {
          select: { questions: true }
        },
        classes: {
          include: {
            class: { select: { name: true } }
          }
        },
        submissions: {
          where: { studentId: session.user.id },
          select: {
            id: true,
            isCompleted: true,
            percentage: true,
            completedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Activities</h1>
        <p className="text-muted-foreground">
          {userRole === 'STUDENT' 
            ? 'Available activities and live sessions' 
            : 'Manage your activities and create new ones'}
        </p>
      </div>

      {/* Live Activities Section (Students Only) */}
      {userRole === 'STUDENT' && liveQuizzes.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-semibold text-red-600">LIVE NOW</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveQuizzes.map((quiz: any) => (
              <Card key={quiz.id} className="border-red-200 bg-red-50 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight text-red-800">{quiz.title}</CardTitle>
                      <CardDescription className="mt-1 text-red-600">{quiz.topic}</CardDescription>
                    </div>
                    <Badge className="bg-red-500 text-white animate-pulse">
                      LIVE
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-red-600">
                    <div className="flex items-center gap-1">
                      <HelpCircle className="h-4 w-4" />
                      <span>{quiz._count.questions} questions</span>
                    </div>
                    {quiz.liveSessions[0]?.timeLimitMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{quiz.liveSessions[0].timeLimitMinutes} min</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Teacher: </span>
                    {quiz.teacher.username}
                  </div>
                  
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Classes: </span>
                    {quiz.classes.map((qc: any) => qc.class.name).join(", ")}
                  </div>
                  
                  <div className="pt-2">
                    <Button asChild className="w-full bg-red-600 hover:bg-red-700" size="sm">
                      <Link href={`/activities/quiz/${quiz.id}/take`}>
                        <Play className="h-4 w-4 mr-2" />
                        Join Live Quiz
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Separator className="mt-8" />
        </div>
      )}

      {/* Student Available Activities */}
      {userRole === 'STUDENT' && studentQuizzes.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Available Activities</h2>
              <p className="text-muted-foreground">Quizzes and activities assigned to you</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentQuizzes.map((quiz: any) => {
              const submission = quiz.submissions[0];
              return (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">{quiz.title}</CardTitle>
                        <CardDescription className="mt-1">{quiz.topic}</CardDescription>
                      </div>
                      {submission?.isCompleted ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Available
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" />
                        <span>{quiz._count.questions} questions</span>
                      </div>
                      {submission?.isCompleted && (
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          <span>{Math.round(submission.percentage)}%</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Teacher: </span>
                      {quiz.teacher.username}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Classes: </span>
                      {quiz.classes.map((qc: any) => qc.class.name).join(", ")}
                    </div>
                    
                    {submission?.completedAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Completed {new Date(submission.completedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <Button asChild className="w-full" size="sm">
                        <Link href={`/activities/quiz/${quiz.id}/take`}>
                          {submission?.isCompleted ? (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View Results
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start Quiz
                            </>
                          )}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <Separator className="mt-8" />
        </div>
      )}

      {/* Teacher's My Quizzes Section */}
      {(userRole === 'TEACHER' || userRole === 'ADMIN') && myQuizzes.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">My Quizzes</h2>
              <p className="text-muted-foreground">Your recently created quizzes</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/activities/quiz">View All Quizzes</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myQuizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight">{quiz.title}</CardTitle>
                      <CardDescription className="mt-1">{quiz.topic}</CardDescription>
                    </div>
                    <Badge variant={quiz.isActive ? "default" : "secondary"}>
                      {quiz.isActive ? "Active" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <HelpCircle className="h-4 w-4" />
                      <span>{quiz._count.questions} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{quiz._count.submissions} submissions</span>
                    </div>
                  </div>
                  
                  {quiz.classes.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Classes: </span>
                      {quiz.classes.map((qc: any) => qc.class.name).join(", ")}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <QuizCardActions 
                    quizId={quiz.id} 
                    quizTitle={quiz.title}
                    currentSession={quiz.currentSession}
                    hasSubmissions={quiz._count.submissions > 0}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Separator className="mt-8" />
        </div>
      )}

      {/* Create New Activity Section - Teachers/Admins Only */}
      {(userRole === 'TEACHER' || userRole === 'ADMIN') && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">Create New Activity</h2>
            <p className="text-muted-foreground">Choose the type of activity you want to create for your students</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activityTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Link key={type.id} href={type.href}>
                  <Card className={`h-full transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer group border-0 ${type.colors.bg} ${type.colors.border}`}>
                    <CardHeader className="text-center">
                      <div className={`mx-auto mb-4 p-3 rounded-full w-fit transition-colors ${type.colors.iconBg}`}>
                        <IconComponent className={`h-8 w-8 ${type.colors.iconColor}`} />
                      </div>
                      <CardTitle className="text-xl text-gray-800">{type.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-gray-600">
                        {type.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
      
      {/* Empty state for students with no activities */}
      {userRole === 'STUDENT' && liveQuizzes.length === 0 && studentQuizzes.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Activities Available</h3>
          <p className="text-muted-foreground">
            There are no activities available for you at the moment. Check back later or contact your teacher.
          </p>
        </div>
      )}
    </div>
  );
} 