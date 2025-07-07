import { QuizService } from "../../../../../lib/services/quiz.service";
import { AuthService } from "../../../../../lib/services/auth.service";
import { notFound, redirect } from "next/navigation";
import { prisma } from "../../../../../lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  Users, 
  HelpCircle, 
  Brain, 
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Share,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { QuizResultsButton } from "@/components/activities/quiz-results-button";
import { QuizHistoricalResultsButton } from "@/components/activities/quiz-historical-results-button";
import { QuizRestartButton } from "@/components/activities/quiz-restart-button";

interface QuizDetailsPageProps {
  params: Promise<{ quizId: string }>;
}

export default async function QuizDetailsPage({ params }: QuizDetailsPageProps) {
  try {
    // Get authenticated user
    const currentUser = await AuthService.getAuthenticatedUser();
    AuthService.requireTeacherOrAdmin(currentUser);

    const { quizId } = await params;

    // Fetch quiz details
    const quiz = await QuizService.getQuizById(currentUser, quizId);

    // Get submission count to determine if we should show results/restart buttons
    const submissionCount = await prisma.quizSubmission.count({
      where: {
        quizId: quizId,
        isCompleted: true
      }
    });

    const hasSubmissions = submissionCount > 0;

    return (
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{quiz.title}</h1>
              <p className="text-muted-foreground">{quiz.topic}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Quiz
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>

        {/* Quiz Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{quiz.questions.length}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{quiz.classes.length}</p>
                  <p className="text-sm text-muted-foreground">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{submissionCount}</p>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                {quiz.isAIGenerated ? (
                  <Brain className="h-5 w-5 text-purple-500" />
                ) : (
                  <Edit className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {quiz.isAIGenerated ? 'AI Generated' : 'Manual'}
                  </p>
                  <p className="text-sm text-muted-foreground">Creation Type</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quiz Details */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quiz.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{quiz.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Status</h4>
                      <Badge variant={quiz.isActive ? "default" : "secondary"}>
                        {quiz.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Created By</h4>
                      <p className="text-muted-foreground">{quiz.teacher.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {quiz.scheduledPublishAt && (
                      <div>
                        <h4 className="font-medium mb-2">Scheduled For</h4>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(quiz.scheduledPublishAt), "PPP")}
                        </div>
                      </div>
                    )}

                    {quiz.dueDate && (
                      <div>
                        <h4 className="font-medium mb-2">Due Date</h4>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          {format(new Date(quiz.dueDate), "PPP")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  {quiz.questions.length} questions in this quiz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {quiz.questions.map((question, index) => (
                    <Card key={question.id} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Compact question header with Q1: format */}
                          <h4 className="font-semibold text-base">
                            Q{index + 1}: {question.question}
                          </h4>
                          
                          {/* Options in horizontal row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={option.id}
                                className={`p-2 rounded-lg border text-sm ${
                                  option.isCorrect
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>
                                    <strong>{String.fromCharCode(65 + optionIndex)}.</strong> {option.text}
                                  </span>
                                  {option.isCorrect && (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {question.explanation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                              <p className="text-xs">
                                <strong>Explanation:</strong> {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
                        {/* Quick Actions */}
                        <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hasSubmissions ? (
                    <>
                      <QuizResultsButton quizId={quiz.id} />
                      <QuizHistoricalResultsButton quizId={quiz.id} />
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground p-2 bg-gray-50 rounded-lg">
                      No submissions yet. Results will appear after students complete the quiz.
                    </div>
                  )}
                  <Link href={`/activities/quiz/${quiz.id}/live`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="h-4 w-4 mr-2" />
                      Live Session
                    </Button>
                  </Link>
                  {hasSubmissions ? (
                    <div className="pt-2">
                      <QuizRestartButton 
                        quizId={quiz.id}
                        quizTitle={quiz.title}
                        currentSession={quiz.currentSession}
                      />
                    </div>
                  ) : <div></div>}
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Students
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Changes
                  </Button>
                  <Button variant="destructive" className="w-full justify-start">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Delete Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Assigned Classes */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quiz.classes.map((classAssignment) => (
                    <div
                      key={classAssignment.class.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium">{classAssignment.class.name}</span>
                      <Badge variant="outline">Class</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Individual Students (if any) */}
            {quiz.students.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Individual Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {quiz.students.map((studentAssignment) => (
                      <div
                        key={studentAssignment.user.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium">{studentAssignment.user.username}</span>
                        <Badge variant="outline">Student</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Creation Info */}
            <Card>
              <CardHeader>
                <CardTitle>Creation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(quiz.createdAt), "PPP")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated:</span>
                    <span>{format(new Date(quiz.updatedAt), "PPP")}</span>
                  </div>
                  {quiz.publishedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Published:</span>
                      <span>{format(new Date(quiz.publishedAt), "PPP")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link href="/activities">
            <Button variant="outline">
              Back to Activities
            </Button>
          </Link>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Error in QuizDetailsPage:', error);
    
    // Handle specific errors
    if (error.message?.includes('No valid session') || error.message?.includes('not found')) {
      redirect('/auth/signin');
    }
    
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Cannot access')) {
      return (
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this quiz.
          </p>
        </div>
      );
    }

    if (error.message?.includes('Quiz not found')) {
      notFound();
    }

    // Handle other errors
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground">
          An error occurred while loading the quiz details. Please try again later.
        </p>
        <p className="text-sm text-red-600 mt-2">
          {error.message || 'Unknown error'}
        </p>
      </div>
    );
  }
} 