import { AssignmentsService, CreateVideoAssignmentDto } from '../../../lib/services/assignments.service';
import { AuthService } from '../../../lib/services/auth.service';

export interface VideoAssignmentFormData {
  topic: string;
  videoUrl: string;
  videoTranscript?: string;
  hasTranscript?: boolean;
  language: string; // language ID
  questions: Array<{
    question: string;
    answer: string;
  }>;
  classId: string[];
  studentIds: string[];
  assignToEntireClass: boolean;
  scheduledPublishAt?: Date | string | null;
  color?: string;
  rules?: string[];
  feedbackSettings?: {
    detailedFeedback: boolean;
    encouragementEnabled: boolean;
  };
  totalStudentsInScope?: number;
  analysisResult?: any;
}

/**
 * Video Assignment Service for Frontend
 * Provides a bridge between the frontend VideoAssignmentCreator and backend AssignmentsService
 */
export class VideoAssignmentService {
  /**
   * Create a video assignment from frontend form data
   */
  static async createFromFormData(formData: VideoAssignmentFormData) {
    const currentUser = await AuthService.getAuthenticatedUser();

    // Convert form data to backend DTO format
    const createDto: CreateVideoAssignmentDto = {
      topic: formData.topic,
      videoUrl: formData.videoUrl,
      videoTranscript: formData.videoTranscript,
      hasTranscript: formData.hasTranscript,
      languageId: formData.language,
      questions: formData.questions.map(q => ({
        question: q.question,
        answer: q.answer
      })),
      classIds: formData.classId,
      studentIds: formData.assignToEntireClass ? [] : formData.studentIds,
      assignToEntireClass: formData.assignToEntireClass,
      scheduledPublishAt: formData.scheduledPublishAt ? 
        (typeof formData.scheduledPublishAt === 'string' ? 
          new Date(formData.scheduledPublishAt) : 
          formData.scheduledPublishAt) : 
        null,
      color: formData.color,
      rules: formData.rules,
      feedbackSettings: formData.feedbackSettings,
      evaluationSettings: {
        type: 'VIDEO',
        customPrompt: '',
        rules: formData.rules || [],
        acceptableResponses: [],
        feedbackSettings: formData.feedbackSettings || {
          detailedFeedback: true,
          encouragementEnabled: true
        }
      },
      totalStudentsInScope: formData.totalStudentsInScope,
      analysisResult: formData.analysisResult
    };

    // Use the backend service to create the assignment
    return await AssignmentsService.createVideoAssignment(currentUser, createDto);
  }

  /**
   * Create assignment using the structure expected by VideoAssignmentCreator
   * This matches the createAssignment hook structure
   */
  static async createAssignment(assignmentData: {
    topic: string;
    color: string;
    questions: any[];
    vocabularyItems: any[];
    classes: string[];
    students: string[];
    language: string;
    userId: string;
    teacher: string;
    evaluationSettings: any;
    publishedAt: string;
    scheduledPublishAt: string | null;
    isActive: boolean;
    videoUrl: string;
    videoTranscript: string;
    totalStudentsInScope: number;
    completedStudentsCount: number;
    completionRate: number;
    averageScoreOfCompleted: number;
  }) {
    const currentUser = await AuthService.getAuthenticatedUser();

    // Convert to our DTO format
    const createDto: CreateVideoAssignmentDto = {
      topic: assignmentData.topic,
      videoUrl: assignmentData.videoUrl,
      videoTranscript: assignmentData.videoTranscript,
      hasTranscript: !!assignmentData.videoTranscript,
      languageId: assignmentData.language,
      questions: [], // Questions will be created separately
      classIds: assignmentData.classes,
      studentIds: assignmentData.students,
      assignToEntireClass: assignmentData.classes.length > 0,
      scheduledPublishAt: assignmentData.scheduledPublishAt ? new Date(assignmentData.scheduledPublishAt) : null,
      color: assignmentData.color,
      rules: assignmentData.evaluationSettings?.rules || [],
      feedbackSettings: assignmentData.evaluationSettings?.feedbackSettings,
      evaluationSettings: {
        type: 'VIDEO',
        customPrompt: assignmentData.evaluationSettings?.customPrompt || '',
        rules: assignmentData.evaluationSettings?.rules || [],
        acceptableResponses: assignmentData.evaluationSettings?.acceptableResponses || [],
        feedbackSettings: assignmentData.evaluationSettings?.feedbackSettings || {
          detailedFeedback: true,
          encouragementEnabled: true
        }
      },
      totalStudentsInScope: assignmentData.totalStudentsInScope,
      analysisResult: assignmentData.evaluationSettings?.acceptableResponses?.[0] ? 
        JSON.parse(assignmentData.evaluationSettings.acceptableResponses[0]) : 
        null
    };

    return await AssignmentsService.createVideoAssignment(currentUser, createDto);
  }
} 