// Authentication and base services
export { 
  AuthService, 
  type AuthenticatedUser, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError, 
  ValidationError, 
  handleServiceError 
} from './auth.service'

// User management
export { 
  UsersService, 
  type CreateUserData, 
  type UpdateUserData, 
  type UserWithDetails, 
  type UserListParams 
} from './users.service'

// Assignment management
export { 
  AssignmentsService, 
  type CreateAssignmentData, 
  type UpdateAssignmentData, 
  type AssignmentWithDetails, 
  type AssignmentListParams,
  type CreateVideoAssignmentDto,
  type CreateReadingAssignmentDto,
  type CreatePronunciationAssignmentDto,
  IELTSAssignmentsService,
  type CreateIELTSAssignmentDto
} from './assignments.service'

// Class management
export { 
  ClassesService, 
  type CreateClassData, 
  type UpdateClassData, 
  type ClassWithDetails, 
  type ClassListParams, 
  type AssignUsersData 
} from './classes.service'

// Question management
export { 
  QuestionsService, 
  type CreateQuestionData, 
  type UpdateQuestionData, 
  type QuestionWithDetails, 
  type QuestionListParams 
} from './questions.service'

// Activity logging
export { 
  ActivityLogService, 
  type ActivityLogData, 
  type ActivityLogEntry 
} from './activity-log.service'

// Students needing help
export { 
  StudentsNeedingHelpService, 
  type StudentNeedingHelpData, 
  type StudentsNeedingHelpSummary 
} from './students-needing-help.service'

// Import for ServiceFactory only (these must be value imports, not type imports)
import { AuthService } from './auth.service'
import { UsersService } from './users.service'
import { AssignmentsService, IELTSAssignmentsService } from './assignments.service'
import { ClassesService } from './classes.service'
import { QuestionsService } from './questions.service'
import { ActivityLogService } from './activity-log.service'
import { StudentsNeedingHelpService } from './students-needing-help.service'

/**
 * Service Factory
 * Provides a centralized way to access all services
 */
export class ServiceFactory {
  static get auth() {
    return AuthService
  }

  static get users() {
    return UsersService
  }

  static get assignments() {
    return AssignmentsService
  }

  static get classes() {
    return ClassesService
  }

  static get questions() {
    return QuestionsService
  }

  static get activityLog() {
    return ActivityLogService
  }

  static get studentsNeedingHelp() {
    return StudentsNeedingHelpService
  }

  static get ieltsAssignments() {
    return IELTSAssignmentsService
  }
}

/**
 * Re-export common types for convenience
 */
export type ServiceError = {
  message: string
  code: string
  statusCode: number
}

export type PaginationParams = {
  page?: number
  limit?: number
}

export type PaginationResult<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
} 