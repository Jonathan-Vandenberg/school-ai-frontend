-- CreateEnum
CREATE TYPE "public"."LevelType" AS ENUM ('CEFR', 'GRADE');

-- CreateEnum
CREATE TYPE "public"."CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "public"."GradeLevel" AS ENUM ('PRE_K', 'KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12');

-- CreateTable
CREATE TABLE "public"."assignment_templates" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "vocabularyItems" JSONB,
    "videoUrl" TEXT,
    "videoTranscript" TEXT,
    "languageAssessmentType" "public"."LanguageAssessmentType",
    "isIELTS" BOOLEAN DEFAULT false,
    "context" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,
    "languageId" TEXT,

    CONSTRAINT "assignment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."template_evaluation_settings" (
    "id" TEXT NOT NULL,
    "type" "public"."EvaluationType" NOT NULL,
    "customPrompt" TEXT,
    "rules" JSONB,
    "acceptableResponses" JSONB,
    "feedbackSettings" JSONB NOT NULL DEFAULT '{}',
    "templateId" TEXT NOT NULL,

    CONSTRAINT "template_evaluation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."template_questions" (
    "id" TEXT NOT NULL,
    "image" TEXT,
    "textQuestion" TEXT,
    "videoUrl" TEXT,
    "textAnswer" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "template_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignment_template_levels" (
    "id" TEXT NOT NULL,
    "levelType" "public"."LevelType" NOT NULL,
    "cefrLevel" "public"."CEFRLevel",
    "gradeLevel" "public"."GradeLevel",
    "templateId" TEXT NOT NULL,

    CONSTRAINT "assignment_template_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_evaluation_settings_templateId_key" ON "public"."template_evaluation_settings"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_template_levels_templateId_levelType_cefrLevel_g_key" ON "public"."assignment_template_levels"("templateId", "levelType", "cefrLevel", "gradeLevel");

-- AddForeignKey
ALTER TABLE "public"."assignment_templates" ADD CONSTRAINT "assignment_templates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_templates" ADD CONSTRAINT "assignment_templates_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "public"."languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."template_evaluation_settings" ADD CONSTRAINT "template_evaluation_settings_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."assignment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."template_questions" ADD CONSTRAINT "template_questions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."assignment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignment_template_levels" ADD CONSTRAINT "assignment_template_levels_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."assignment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
