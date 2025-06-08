-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEACHER', 'ADMIN', 'STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "LanguageType" AS ENUM ('ENGLISH', 'VIETNAMESE', 'JAPANESE', 'SPANISH', 'ITALIAN', 'FRENCH', 'GERMAN', 'PORTUGESE');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('CLASS', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "LanguageAssessmentType" AS ENUM ('SCRIPTED_US', 'SCRIPTED_UK', 'UNSCRIPTED_US', 'UNSCRIPTED_UK', 'PRONUNCIATION_US', 'PRONUNCIATION_UK');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('CUSTOM', 'IMAGE', 'VIDEO', 'Q_AND_A', 'READING', 'PRONUNCIATION');

-- CreateEnum
CREATE TYPE "ActivityLogType" AS ENUM ('STUDENT_CREATED', 'TEACHER_CREATED', 'CLASS_CREATED', 'ASSIGNMENT_CREATED', 'INDIVIDUAL_ASSIGNMENT_CREATED');

-- CreateEnum
CREATE TYPE "AssignmentCategoryType" AS ENUM ('IMAGE', 'VIDEO', 'Q_AND_A', 'CUSTOM', 'READING', 'PRONUNCIATION', 'Q_AND_A_IMAGE');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('PLANNING', 'ASSESSMENT', 'RESOURCES', 'ADMIN', 'PUPIL_REPORTS', 'LEADERSHIP', 'WELLBEING');

-- CreateEnum
CREATE TYPE "DashboardSnapshotType" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "provider" TEXT,
    "password" TEXT,
    "resetPasswordToken" TEXT,
    "confirmationToken" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "customRole" "UserRole" NOT NULL,
    "address" TEXT,
    "customImage" TEXT,
    "phone" TEXT,
    "isPlayGame" BOOLEAN DEFAULT false,
    "theme" TEXT DEFAULT 'system',
    "averageScoreOfCompleted" DOUBLE PRECISION,
    "totalAssignments" INTEGER DEFAULT 0,
    "totalAssignmentsCompleted" INTEGER DEFAULT 0,
    "averageCompletionPercentage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_classes" (
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "user_classes_pkey" PRIMARY KEY ("userId","classId")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "language" "LanguageType" NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "topic" TEXT,
    "color" TEXT,
    "vocabularyItems" JSONB,
    "scheduledPublishAt" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "type" "AssignmentType",
    "videoUrl" TEXT,
    "videoTranscript" TEXT,
    "languageAssessmentType" "LanguageAssessmentType",
    "isIELTS" BOOLEAN DEFAULT false,
    "context" TEXT,
    "totalStudentsInScope" INTEGER DEFAULT 0,
    "completedStudentsCount" INTEGER DEFAULT 0,
    "completionRate" DOUBLE PRECISION,
    "averageScoreOfCompleted" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "teacherId" TEXT,
    "languageId" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_assignments" (
    "classId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,

    CONSTRAINT "class_assignments_pkey" PRIMARY KEY ("classId","assignmentId")
);

-- CreateTable
CREATE TABLE "user_assignments" (
    "userId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,

    CONSTRAINT "user_assignments_pkey" PRIMARY KEY ("userId","assignmentId")
);

-- CreateTable
CREATE TABLE "evaluation_settings" (
    "id" TEXT NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "customPrompt" TEXT,
    "rules" JSONB,
    "acceptableResponses" JSONB,
    "feedbackSettings" JSONB NOT NULL DEFAULT '{}',
    "assignmentId" TEXT NOT NULL,

    CONSTRAINT "evaluation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "image" TEXT,
    "textQuestion" TEXT,
    "videoUrl" TEXT,
    "textAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "assignmentId" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assignment_progress" (
    "id" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "languageConfidenceResponse" JSONB,
    "grammarCorrected" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionId" TEXT,

    CONSTRAINT "student_assignment_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "type" "ActivityLogType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "userId" TEXT,
    "classId" TEXT,
    "assignmentId" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssignmentCategoryType",
    "description" TEXT,
    "defaultPrompt" TEXT,
    "defaultRules" JSONB,
    "defaultFeedbackSettings" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isIELTS" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "assignmentGroupId" TEXT,

    CONSTRAINT "assignment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "assignment_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "type" "ToolType" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprite_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" INTEGER,
    "order" INTEGER NOT NULL,
    "stages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "sprite_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_sprites" (
    "id" TEXT NOT NULL,
    "currentEvolutionStage" INTEGER NOT NULL DEFAULT 0,
    "completedAssignmentsCount" INTEGER NOT NULL DEFAULT 0,
    "currentSpriteSetIndex" INTEGER NOT NULL DEFAULT 0,
    "completedSpriteSets" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "studentId" TEXT NOT NULL,
    "spriteSetId" TEXT,

    CONSTRAINT "student_sprites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_classes" (
    "id" TEXT NOT NULL,
    "averageCompletion" DOUBLE PRECISION,
    "averageScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "classId" TEXT NOT NULL,

    CONSTRAINT "stats_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_snapshots" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "snapshotType" "DashboardSnapshotType" NOT NULL,
    "totalClasses" INTEGER,
    "totalTeachers" INTEGER,
    "totalStudents" INTEGER,
    "totalAssignments" INTEGER,
    "classAssignments" INTEGER,
    "individualAssignments" INTEGER,
    "averageCompletionRate" INTEGER,
    "averageSuccessRate" INTEGER,
    "studentsNeedingAttention" INTEGER,
    "recentActivities" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alternativeText" TEXT,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "formats" JSONB,
    "hash" TEXT NOT NULL,
    "ext" TEXT,
    "mime" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "url" TEXT NOT NULL,
    "previewUrl" TEXT,
    "provider" TEXT NOT NULL,
    "providerMetadata" JSONB,
    "folderPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "folderId" TEXT,

    CONSTRAINT "upload_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pathId" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "upload_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_settings_assignmentId_key" ON "evaluation_settings"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_sprites_studentId_key" ON "student_sprites"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "stats_classes_classId_key" ON "stats_classes"("classId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_classes" ADD CONSTRAINT "user_classes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_classes" ADD CONSTRAINT "user_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_settings" ADD CONSTRAINT "evaluation_settings_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignment_progress" ADD CONSTRAINT "student_assignment_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignment_progress" ADD CONSTRAINT "student_assignment_progress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignment_progress" ADD CONSTRAINT "student_assignment_progress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_categories" ADD CONSTRAINT "assignment_categories_assignmentGroupId_fkey" FOREIGN KEY ("assignmentGroupId") REFERENCES "assignment_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_sprites" ADD CONSTRAINT "student_sprites_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_sprites" ADD CONSTRAINT "student_sprites_spriteSetId_fkey" FOREIGN KEY ("spriteSetId") REFERENCES "sprite_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stats_classes" ADD CONSTRAINT "stats_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_files" ADD CONSTRAINT "upload_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "upload_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_folders" ADD CONSTRAINT "upload_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "upload_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
