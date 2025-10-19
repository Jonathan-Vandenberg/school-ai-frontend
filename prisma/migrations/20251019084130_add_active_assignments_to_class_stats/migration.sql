-- CreateEnum
CREATE TYPE "public"."PerformanceMetricType" AS ENUM ('COMPLETION_RATE', 'ACCURACY_RATE', 'AVERAGE_SCORE', 'ACTIVE_USERS', 'QUESTIONS_ANSWERED', 'TIME_SPENT', 'LOGIN_COUNT', 'ASSIGNMENT_SUBMISSIONS');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('SCHOOL', 'CLASS', 'TEACHER', 'STUDENT', 'ASSIGNMENT', 'QUESTION');

-- CreateEnum
CREATE TYPE "public"."TimeFrame" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_CREATED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_UPDATED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_DELETED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_BLOCKED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_UNBLOCKED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_CONFIRMED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_PASSWORD_CHANGED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_ROLE_CHANGED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'CLASS_UPDATED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'CLASS_DELETED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'CLASS_USERS_ADDED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'CLASS_USERS_REMOVED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'ASSIGNMENT_UPDATED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'ASSIGNMENT_DELETED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'ASSIGNMENT_PUBLISHED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'ASSIGNMENT_ARCHIVED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'INDIVIDUAL_ASSIGNMENT_DELETED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_LOGIN';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_LOGOUT';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'USER_LOGIN_FAILED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'SYSTEM_BACKUP_CREATED';
ALTER TYPE "public"."ActivityLogType" ADD VALUE 'SYSTEM_MAINTENANCE';

-- AlterTable
ALTER TABLE "public"."activity_logs" ADD COLUMN     "action" TEXT,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "quizId" TEXT;

-- AlterTable
ALTER TABLE "public"."assignments" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."quizzes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "numberOfQuestions" INTEGER NOT NULL,
    "numberOfOptions" INTEGER NOT NULL DEFAULT 4,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timeLimitMinutes" INTEGER,
    "isLiveSession" BOOLEAN NOT NULL DEFAULT false,
    "liveSessionStartedAt" TIMESTAMP(3),
    "liveSessionEndedAt" TIMESTAMP(3),
    "scheduledPublishAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "currentSession" INTEGER NOT NULL DEFAULT 1,
    "allowMultipleSessions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_options" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_classes" (
    "quizId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "quiz_classes_pkey" PRIMARY KEY ("quizId","classId")
);

-- CreateTable
CREATE TABLE "public"."quiz_students" (
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "quiz_students_pkey" PRIMARY KEY ("quizId","userId")
);

-- CreateTable
CREATE TABLE "public"."quiz_submissions" (
    "id" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL DEFAULT 1,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "quiz_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_answers" (
    "id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_live_sessions" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "timeLimitMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "quiz_live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_live_student_progress" (
    "id" TEXT NOT NULL,
    "currentQuestion" INTEGER NOT NULL DEFAULT 1,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "quiz_live_student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignment_stats" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "completedStudents" INTEGER NOT NULL DEFAULT 0,
    "inProgressStudents" INTEGER NOT NULL DEFAULT 0,
    "notStartedStudents" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student_stats" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "totalAssignments" INTEGER NOT NULL DEFAULT 0,
    "completedAssignments" INTEGER NOT NULL DEFAULT 0,
    "inProgressAssignments" INTEGER NOT NULL DEFAULT 0,
    "notStartedAssignments" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastActivityDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teacher_stats" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "totalAssignments" INTEGER NOT NULL DEFAULT 0,
    "totalClasses" INTEGER NOT NULL DEFAULT 0,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "averageClassCompletion" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageClassScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "activeAssignments" INTEGER NOT NULL DEFAULT 0,
    "scheduledAssignments" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."class_stats_detailed" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalAssignments" INTEGER NOT NULL DEFAULT 0,
    "activeAssignments" INTEGER NOT NULL DEFAULT 0,
    "averageCompletion" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "activeStudents" INTEGER NOT NULL DEFAULT 0,
    "studentsNeedingHelp" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_stats_detailed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."school_stats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalTeachers" INTEGER NOT NULL DEFAULT 0,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalClasses" INTEGER NOT NULL DEFAULT 0,
    "totalAssignments" INTEGER NOT NULL DEFAULT 0,
    "activeAssignments" INTEGER NOT NULL DEFAULT 0,
    "scheduledAssignments" INTEGER NOT NULL DEFAULT 0,
    "completedAssignments" INTEGER NOT NULL DEFAULT 0,
    "averageCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "studentsNeedingHelp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedStudents" INTEGER NOT NULL DEFAULT 0,
    "inProgressStudents" INTEGER NOT NULL DEFAULT 0,
    "notStartedStudents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "school_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_metrics" (
    "id" TEXT NOT NULL,
    "metricType" "public"."PerformanceMetricType" NOT NULL,
    "entityType" "public"."EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "timeFrame" "public"."TimeFrame" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hour" INTEGER,
    "value" DOUBLE PRECISION NOT NULL,
    "additionalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."students_needing_help" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "needsHelpSince" TIMESTAMP(3) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "overdueAssignments" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "daysNeedingHelp" INTEGER NOT NULL DEFAULT 0,
    "severity" TEXT NOT NULL DEFAULT 'MODERATE',
    "teacherNotes" TEXT,
    "actionsTaken" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_needing_help_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."students_needing_help_classes" (
    "studentNeedingHelpId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "students_needing_help_classes_pkey" PRIMARY KEY ("studentNeedingHelpId","classId")
);

-- CreateTable
CREATE TABLE "public"."students_needing_help_teachers" (
    "studentNeedingHelpId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "students_needing_help_teachers_pkey" PRIMARY KEY ("studentNeedingHelpId","teacherId")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_submissions_quizId_studentId_sessionNumber_key" ON "public"."quiz_submissions"("quizId", "studentId", "sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_submissionId_questionId_key" ON "public"."quiz_answers"("submissionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_live_student_progress_sessionId_studentId_key" ON "public"."quiz_live_student_progress"("sessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_stats_assignmentId_key" ON "public"."assignment_stats"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_stats_studentId_key" ON "public"."student_stats"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_stats_teacherId_key" ON "public"."teacher_stats"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "class_stats_detailed_classId_key" ON "public"."class_stats_detailed"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "school_stats_date_key" ON "public"."school_stats"("date");

-- CreateIndex
CREATE INDEX "performance_metrics_entityType_entityId_timeFrame_date_idx" ON "public"."performance_metrics"("entityType", "entityId", "timeFrame", "date");

-- CreateIndex
CREATE UNIQUE INDEX "students_needing_help_studentId_key" ON "public"."students_needing_help"("studentId");

-- AddForeignKey
ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_options" ADD CONSTRAINT "quiz_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_classes" ADD CONSTRAINT "quiz_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_classes" ADD CONSTRAINT "quiz_classes_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_students" ADD CONSTRAINT "quiz_students_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_students" ADD CONSTRAINT "quiz_students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_submissions" ADD CONSTRAINT "quiz_submissions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_submissions" ADD CONSTRAINT "quiz_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_answers" ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_answers" ADD CONSTRAINT "quiz_answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."quiz_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_live_sessions" ADD CONSTRAINT "quiz_live_sessions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_live_sessions" ADD CONSTRAINT "quiz_live_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_live_student_progress" ADD CONSTRAINT "quiz_live_student_progress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."quiz_live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_live_student_progress" ADD CONSTRAINT "quiz_live_student_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_stats" ADD CONSTRAINT "assignment_stats_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_stats" ADD CONSTRAINT "student_stats_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_stats" ADD CONSTRAINT "teacher_stats_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_stats_detailed" ADD CONSTRAINT "class_stats_detailed_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students_needing_help" ADD CONSTRAINT "students_needing_help_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students_needing_help_classes" ADD CONSTRAINT "students_needing_help_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students_needing_help_classes" ADD CONSTRAINT "students_needing_help_classes_studentNeedingHelpId_fkey" FOREIGN KEY ("studentNeedingHelpId") REFERENCES "public"."students_needing_help"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students_needing_help_teachers" ADD CONSTRAINT "students_needing_help_teachers_studentNeedingHelpId_fkey" FOREIGN KEY ("studentNeedingHelpId") REFERENCES "public"."students_needing_help"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students_needing_help_teachers" ADD CONSTRAINT "students_needing_help_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
