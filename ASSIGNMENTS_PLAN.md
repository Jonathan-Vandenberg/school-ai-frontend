# Video Assignment Creation Plan

This document outlines the plan for implementing the video assignment creation feature.

## Phase 1: Core Component and UI Setup

-   **Component Structure:**
    -   Create a new directory `src/app/dashboard/assignments/create`.
    -   Create the main component `page.tsx` within this directory. This will be the page for creating a new assignment, with a selector for the assignment type (e.g., Video).
-   **Form Setup:**
    -   Use `react-hook-form` for form state management.
    -   Define the form schema using `zod` for validation.
        -   Fields to include: `topic`, `videoUrl`, `languageId`, `assignmentType`.
-   **UI Implementation (Shadcn/ui):**
    -   Use `Card` components for structuring the form sections.
    -   Use `Input` for text fields (Topic, Video URL).
    -   Use `Select` for language selection and assignment type.
    -   Use `Button` for form actions (Create, Preview).

## Phase 2: Question Management

-   **Dynamic Fields:**
    -   Use `useFieldArray` from `react-hook-form` to manage a dynamic list of questions.
-   **UI for Questions:**
    -   Create a section where teachers can add, edit, and remove questions.
    -   Each question will have an `Input` for the question text and an `Input` for the expected answer.
    -   Use `Button` with icons (`Plus`, `Trash`) for adding and removing questions.

## Phase 3: Data Fetching for the Form

-   **Service Layer Integration:**
    -   The frontend will call server actions or dedicated API routes to fetch initial data for the form.
    -   **Fetch Classes:** Use `classesService.findMany({ where: { teachers: { some: { id: currentUserId } } } })` to populate the class selection dropdown.
    -   **Fetch Students:** When a class is selected, use `usersService.findMany({ where: { role: 'STUDENT', classes: { some: { id: classId } } } })` to fetch students for the student selection component.
    -   **Fetch Languages:** Fetch all available `Language` records from the database to populate the language selector.

## Phase 4: Scheduling

-   **UI for Scheduling:**
    -   Add a `Switch` to enable or disable scheduling.
    -   When enabled, show a `Calendar` and time input fields for selecting the publish date and time.
-   **Form State:**
    -   Add `scheduledPublishAt` to the form schema, which will be a `Date` object or `null`.

## Phase 5: Preview Mode

-   **Preview Component:**
    -   Create a new component `VideoAssignmentPreview.tsx` in `src/components/assignments/`.
    -   This component will receive the current form data as props.
-   **Display Logic:**
    -   The preview component will render a non-interactive view of the assignment, simulating how a student would see it.
-   **Modal/Dialog:**
    -   The preview will be displayed inside a `Dialog` or `Sheet` component that overlays the creation form.
    -   A "Preview" button on the form will trigger the dialog.

## Phase 6: Backend Integration & Service Layer Logic

-   **`assignments.service.ts` Modifications:**
    -   **New Method:** `createVideoAssignment(data: CreateVideoAssignmentDto, actorId: string)`
    -   **DTO Definition (`CreateVideoAssignmentDto`):** This data transfer object will define the shape of the data required to create a video assignment.
        ```typescript
        interface QuestionData {
          text: string;
          answer: string;
        }

        interface CreateVideoAssignmentDto {
          topic: string;
          videoUrl: string;
          languageId: string;
          questions: QuestionData[];
          classIds: string[];
          studentIds?: string[];
          assignToEntireClass: boolean;
          scheduledPublishAt?: Date | null;
        }
        ```
    -   **Transaction Logic:** The method will use `this.db.$transaction` to ensure all database operations are atomic.
    -   **Steps within transaction:**
        1.  Create the main `Assignment` record with `type: 'VIDEO'`, status (`DRAFT` or `SCHEDULED`), and other base data.
        2.  Call `questionsService.createManyForAssignment` with the `questions` data and the new `assignmentId`.
        3.  Handle assignment linkage to classes and students.
        4.  Create an `ActivityLog` entry using `activityLogService.create` for auditing purposes.
    -   **Return Value:** The newly created `Assignment` object.

-   **`questions.service.ts` Modifications:**
    -   **New Method:** `createManyForAssignment(questions: QuestionData[], assignmentId: string, tx: Prisma.TransactionClient)`
    -   **Logic:** This method will efficiently bulk-create all questions for the assignment using `tx.question.createMany`. It must accept the Prisma transaction client to be part of the parent transaction in `assignments.service.ts`.

-   **API Route `POST /api/assignments` Enhancement:**
    -   The route handler will validate the request body against a Zod schema that matches the `CreateVideoAssignmentDto`.
    -   It will retrieve the current user's ID to pass as `actorId`.
    -   It will call `assignmentsService.createVideoAssignment(validatedData, userId)`.
    -   It will return a `201 Created` response with the new assignment data or an appropriate error response.

## Phase 7: Advanced Features (Future Enhancement)

-   **YouTube Transcript Analysis:**
    -   Create a new API route `/api/youtube/transcript`.
    -   This route will fetch the transcript of a YouTube video.
-   **AI-Powered Question Generation:**
    -   Create an API route `/api/ai/generate-questions`.
    -   This route will take a transcript and use an AI service to generate questions.
    -   Add a "Suggest Questions" button to the UI to trigger this.
