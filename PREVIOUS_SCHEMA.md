Below is the origional strapi schema, some tables have been updated in the prisma version. Refer to /prisma/schema for the updated database schema.



# The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
scalar JSON

# A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
scalar DateTime

# The `Upload` scalar type represents a file upload.
scalar Upload

type Pagination {
  total: Int!
  page: Int!
  pageSize: Int!
  pageCount: Int!
}

type ResponseCollectionMeta {
  pagination: Pagination!
}

enum PublicationState {
  LIVE
  PREVIEW
}

input IDFilterInput {
  and: [ID]
  or: [ID]
  not: IDFilterInput
  eq: ID
  eqi: ID
  ne: ID
  nei: ID
  startsWith: ID
  endsWith: ID
  contains: ID
  notContains: ID
  containsi: ID
  notContainsi: ID
  gt: ID
  gte: ID
  lt: ID
  lte: ID
  null: Boolean
  notNull: Boolean
  in: [ID]
  notIn: [ID]
  between: [ID]
}

input BooleanFilterInput {
  and: [Boolean]
  or: [Boolean]
  not: BooleanFilterInput
  eq: Boolean
  eqi: Boolean
  ne: Boolean
  nei: Boolean
  startsWith: Boolean
  endsWith: Boolean
  contains: Boolean
  notContains: Boolean
  containsi: Boolean
  notContainsi: Boolean
  gt: Boolean
  gte: Boolean
  lt: Boolean
  lte: Boolean
  null: Boolean
  notNull: Boolean
  in: [Boolean]
  notIn: [Boolean]
  between: [Boolean]
}

input StringFilterInput {
  and: [String]
  or: [String]
  not: StringFilterInput
  eq: String
  eqi: String
  ne: String
  nei: String
  startsWith: String
  endsWith: String
  contains: String
  notContains: String
  containsi: String
  notContainsi: String
  gt: String
  gte: String
  lt: String
  lte: String
  null: Boolean
  notNull: Boolean
  in: [String]
  notIn: [String]
  between: [String]
}

input IntFilterInput {
  and: [Int]
  or: [Int]
  not: IntFilterInput
  eq: Int
  eqi: Int
  ne: Int
  nei: Int
  startsWith: Int
  endsWith: Int
  contains: Int
  notContains: Int
  containsi: Int
  notContainsi: Int
  gt: Int
  gte: Int
  lt: Int
  lte: Int
  null: Boolean
  notNull: Boolean
  in: [Int]
  notIn: [Int]
  between: [Int]
}

input FloatFilterInput {
  and: [Float]
  or: [Float]
  not: FloatFilterInput
  eq: Float
  eqi: Float
  ne: Float
  nei: Float
  startsWith: Float
  endsWith: Float
  contains: Float
  notContains: Float
  containsi: Float
  notContainsi: Float
  gt: Float
  gte: Float
  lt: Float
  lte: Float
  null: Boolean
  notNull: Boolean
  in: [Float]
  notIn: [Float]
  between: [Float]
}

input DateTimeFilterInput {
  and: [DateTime]
  or: [DateTime]
  not: DateTimeFilterInput
  eq: DateTime
  eqi: DateTime
  ne: DateTime
  nei: DateTime
  startsWith: DateTime
  endsWith: DateTime
  contains: DateTime
  notContains: DateTime
  containsi: DateTime
  notContainsi: DateTime
  gt: DateTime
  gte: DateTime
  lt: DateTime
  lte: DateTime
  null: Boolean
  notNull: Boolean
  in: [DateTime]
  notIn: [DateTime]
  between: [DateTime]
}

input JSONFilterInput {
  and: [JSON]
  or: [JSON]
  not: JSONFilterInput
  eq: JSON
  eqi: JSON
  ne: JSON
  nei: JSON
  startsWith: JSON
  endsWith: JSON
  contains: JSON
  notContains: JSON
  containsi: JSON
  notContainsi: JSON
  gt: JSON
  gte: JSON
  lt: JSON
  lte: JSON
  null: Boolean
  notNull: Boolean
  in: [JSON]
  notIn: [JSON]
  between: [JSON]
}

type ComponentQuestionVocabularyQuestion {
  id: ID!
  image: String
  isComplete: Boolean
  isCorrect: Boolean
}

input ComponentEvolutionStageFiltersInput {
  name: StringFilterInput
  description: StringFilterInput
  requiredAssignments: IntFilterInput
  and: [ComponentEvolutionStageFiltersInput]
  or: [ComponentEvolutionStageFiltersInput]
  not: ComponentEvolutionStageFiltersInput
}

input ComponentEvolutionStageInput {
  id: ID
  name: String
  image: ID
  description: String
  requiredAssignments: Int
}

type ComponentEvolutionStage {
  id: ID!
  name: String!
  image: UploadFileEntityResponse!
  description: String
  requiredAssignments: Int!
}

enum ENUM_COMPONENTEVALUATIONEVALUATIONSETTINGS_TYPE {
  CUSTOM
  IMAGE
  VIDEO
  Q_AND_A
  READING
  PRONUNCIATION
}

input ComponentEvaluationEvaluationSettingsFiltersInput {
  type: StringFilterInput
  customPrompt: StringFilterInput
  rules: JSONFilterInput
  acceptableResponses: JSONFilterInput
  feedbackSettings: JSONFilterInput
  and: [ComponentEvaluationEvaluationSettingsFiltersInput]
  or: [ComponentEvaluationEvaluationSettingsFiltersInput]
  not: ComponentEvaluationEvaluationSettingsFiltersInput
}

input ComponentEvaluationEvaluationSettingsInput {
  id: ID
  type: ENUM_COMPONENTEVALUATIONEVALUATIONSETTINGS_TYPE
  customPrompt: String
  rules: JSON
  acceptableResponses: JSON
  feedbackSettings: JSON
}

type ComponentEvaluationEvaluationSettings {
  id: ID!
  type: ENUM_COMPONENTEVALUATIONEVALUATIONSETTINGS_TYPE
  customPrompt: String
  rules: JSON
  acceptableResponses: JSON
  feedbackSettings: JSON!
}

input UploadFileFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  alternativeText: StringFilterInput
  caption: StringFilterInput
  width: IntFilterInput
  height: IntFilterInput
  formats: JSONFilterInput
  hash: StringFilterInput
  ext: StringFilterInput
  mime: StringFilterInput
  size: FloatFilterInput
  url: StringFilterInput
  previewUrl: StringFilterInput
  provider: StringFilterInput
  provider_metadata: JSONFilterInput
  folder: UploadFolderFiltersInput
  folderPath: StringFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  and: [UploadFileFiltersInput]
  or: [UploadFileFiltersInput]
  not: UploadFileFiltersInput
}

input UploadFileInput {
  name: String
  alternativeText: String
  caption: String
  width: Int
  height: Int
  formats: JSON
  hash: String
  ext: String
  mime: String
  size: Float
  url: String
  previewUrl: String
  provider: String
  provider_metadata: JSON
  folder: ID
  folderPath: String
}

type UploadFile {
  name: String!
  alternativeText: String
  caption: String
  width: Int
  height: Int
  formats: JSON
  hash: String!
  ext: String
  mime: String!
  size: Float!
  url: String!
  previewUrl: String
  provider: String!
  provider_metadata: JSON
  related: [GenericMorph]
  createdAt: DateTime
  updatedAt: DateTime
}

type UploadFileEntity {
  id: ID
  attributes: UploadFile
}

type UploadFileEntityResponse {
  data: UploadFileEntity
}

type UploadFileEntityResponseCollection {
  data: [UploadFileEntity!]!
  meta: ResponseCollectionMeta!
}

type UploadFileRelationResponseCollection {
  data: [UploadFileEntity!]!
}

input UploadFolderFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  pathId: IntFilterInput
  parent: UploadFolderFiltersInput
  children: UploadFolderFiltersInput
  files: UploadFileFiltersInput
  path: StringFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  and: [UploadFolderFiltersInput]
  or: [UploadFolderFiltersInput]
  not: UploadFolderFiltersInput
}

input UploadFolderInput {
  name: String
  pathId: Int
  parent: ID
  children: [ID]
  files: [ID]
  path: String
}

type UploadFolder {
  name: String!
  pathId: Int!
  parent: UploadFolderEntityResponse
  children(
    filters: UploadFolderFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UploadFolderRelationResponseCollection
  files(
    filters: UploadFileFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UploadFileRelationResponseCollection
  path: String!
  createdAt: DateTime
  updatedAt: DateTime
}

type UploadFolderEntity {
  id: ID
  attributes: UploadFolder
}

type UploadFolderEntityResponse {
  data: UploadFolderEntity
}

type UploadFolderEntityResponseCollection {
  data: [UploadFolderEntity!]!
  meta: ResponseCollectionMeta!
}

type UploadFolderRelationResponseCollection {
  data: [UploadFolderEntity!]!
}

input I18NLocaleFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  code: StringFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  and: [I18NLocaleFiltersInput]
  or: [I18NLocaleFiltersInput]
  not: I18NLocaleFiltersInput
}

type I18NLocale {
  name: String
  code: String
  createdAt: DateTime
  updatedAt: DateTime
}

type I18NLocaleEntity {
  id: ID
  attributes: I18NLocale
}

type I18NLocaleEntityResponse {
  data: I18NLocaleEntity
}

type I18NLocaleEntityResponseCollection {
  data: [I18NLocaleEntity!]!
  meta: ResponseCollectionMeta!
}

input UsersPermissionsPermissionFiltersInput {
  id: IDFilterInput
  action: StringFilterInput
  role: UsersPermissionsRoleFiltersInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  and: [UsersPermissionsPermissionFiltersInput]
  or: [UsersPermissionsPermissionFiltersInput]
  not: UsersPermissionsPermissionFiltersInput
}

type UsersPermissionsPermission {
  action: String!
  role: UsersPermissionsRoleEntityResponse
  createdAt: DateTime
  updatedAt: DateTime
}

type UsersPermissionsPermissionEntity {
  id: ID
  attributes: UsersPermissionsPermission
}

type UsersPermissionsPermissionRelationResponseCollection {
  data: [UsersPermissionsPermissionEntity!]!
}

input UsersPermissionsRoleFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  description: StringFilterInput
  type: StringFilterInput
  permissions: UsersPermissionsPermissionFiltersInput
  users: UsersPermissionsUserFiltersInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  and: [UsersPermissionsRoleFiltersInput]
  or: [UsersPermissionsRoleFiltersInput]
  not: UsersPermissionsRoleFiltersInput
}

input UsersPermissionsRoleInput {
  name: String
  description: String
  type: String
  permissions: [ID]
  users: [ID]
}

type UsersPermissionsRole {
  name: String!
  description: String
  type: String
  permissions(
    filters: UsersPermissionsPermissionFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UsersPermissionsPermissionRelationResponseCollection
  users(
    filters: UsersPermissionsUserFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UsersPermissionsUserRelationResponseCollection
  createdAt: DateTime
  updatedAt: DateTime
}

type UsersPermissionsRoleEntity {
  id: ID
  attributes: UsersPermissionsRole
}

type UsersPermissionsRoleEntityResponse {
  data: UsersPermissionsRoleEntity
}

type UsersPermissionsRoleEntityResponseCollection {
  data: [UsersPermissionsRoleEntity!]!
  meta: ResponseCollectionMeta!
}

enum ENUM_USERSPERMISSIONSUSER_CUSTOMROLE {
  TEACHER
  ADMIN
  STUDENT
  PARENT
}

input UsersPermissionsUserFiltersInput {
  id: IDFilterInput
  username: StringFilterInput
  email: StringFilterInput
  provider: StringFilterInput
  password: StringFilterInput
  resetPasswordToken: StringFilterInput
  confirmationToken: StringFilterInput
  confirmed: BooleanFilterInput
  blocked: BooleanFilterInput
  role: UsersPermissionsRoleFiltersInput
  customRole: StringFilterInput
  address: StringFilterInput
  customImage: StringFilterInput
  phone: StringFilterInput
  classes: ClassFiltersInput
  progresses: StudentAssignmentProgressFiltersInput
  activity_logs: ActivityLogFiltersInput
  assignments: AssignmentFiltersInput
  isPlayGame: BooleanFilterInput
  assignment: AssignmentFiltersInput
  averageScoreOfCompleted: FloatFilterInput
  totalAssignments: IntFilterInput
  totalAssignmentsCompleted: IntFilterInput
  averageCompletionPercentage: FloatFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  and: [UsersPermissionsUserFiltersInput]
  or: [UsersPermissionsUserFiltersInput]
  not: UsersPermissionsUserFiltersInput
}

input UsersPermissionsUserInput {
  username: String
  email: String
  provider: String
  password: String
  resetPasswordToken: String
  confirmationToken: String
  confirmed: Boolean
  blocked: Boolean
  role: ID
  customRole: ENUM_USERSPERMISSIONSUSER_CUSTOMROLE
  address: String
  customImage: String
  phone: String
  classes: [ID]
  progresses: [ID]
  activity_logs: [ID]
  assignments: [ID]
  isPlayGame: Boolean
  assignment: [ID]
  averageScoreOfCompleted: Float
  totalAssignments: Int
  totalAssignmentsCompleted: Int
  averageCompletionPercentage: Float
}

type UsersPermissionsUser {
  username: String!
  email: String!
  provider: String
  confirmed: Boolean
  blocked: Boolean
  role: UsersPermissionsRoleEntityResponse
  customRole: ENUM_USERSPERMISSIONSUSER_CUSTOMROLE!
  address: String
  customImage: String
  phone: String
  classes(
    filters: ClassFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ClassRelationResponseCollection
  progresses(
    filters: StudentAssignmentProgressFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): StudentAssignmentProgressRelationResponseCollection
  activity_logs(
    filters: ActivityLogFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ActivityLogRelationResponseCollection
  assignments(
    filters: AssignmentFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): AssignmentRelationResponseCollection
  isPlayGame: Boolean
  assignment(
    filters: AssignmentFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): AssignmentRelationResponseCollection
  averageScoreOfCompleted: Float
  totalAssignments: Int
  totalAssignmentsCompleted: Int
  averageCompletionPercentage: Float
  createdAt: DateTime
  updatedAt: DateTime
}

type UsersPermissionsUserEntity {
  id: ID
  attributes: UsersPermissionsUser
}

type UsersPermissionsUserEntityResponse {
  data: UsersPermissionsUserEntity
}

type UsersPermissionsUserEntityResponseCollection {
  data: [UsersPermissionsUserEntity!]!
  meta: ResponseCollectionMeta!
}

type UsersPermissionsUserRelationResponseCollection {
  data: [UsersPermissionsUserEntity!]!
}

enum ENUM_ACTIVITYLOG_TYPE {
  STUDENT_CREATED
  TEACHER_CREATED
  CLASS_CREATED
  ASSIGNMENT_CREATED
  INDIVIDUAL_ASSIGNMENT_CREATED
}

input ActivityLogFiltersInput {
  id: IDFilterInput
  type: StringFilterInput
  user: UsersPermissionsUserFiltersInput
  class: ClassFiltersInput
  assignment: AssignmentFiltersInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [ActivityLogFiltersInput]
  or: [ActivityLogFiltersInput]
  not: ActivityLogFiltersInput
}

input ActivityLogInput {
  type: ENUM_ACTIVITYLOG_TYPE
  user: ID
  class: ID
  assignment: ID
  publishedAt: DateTime
}

type ActivityLog {
  type: ENUM_ACTIVITYLOG_TYPE!
  user: UsersPermissionsUserEntityResponse
  class: ClassEntityResponse
  assignment: AssignmentEntityResponse
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type ActivityLogEntity {
  id: ID
  attributes: ActivityLog
}

type ActivityLogEntityResponse {
  data: ActivityLogEntity
}

type ActivityLogEntityResponseCollection {
  data: [ActivityLogEntity!]!
  meta: ResponseCollectionMeta!
}

type ActivityLogRelationResponseCollection {
  data: [ActivityLogEntity!]!
}

enum ENUM_ASSIGNMENT_TYPE {
  CLASS
  INDIVIDUAL
}

enum ENUM_ASSIGNMENT_LANGUAGEASSESSMENTTYPE {
  SCRIPTED_US
  SCRIPTED_UK
  UNSCRIPTED_US
  UNSCRIPTED_UK
  PRONUNCIATION_US
  PRONUNCIATION_UK
}

input AssignmentFiltersInput {
  id: IDFilterInput
  topic: StringFilterInput
  color: StringFilterInput
  vocabularyItems: JSONFilterInput
  progresses: StudentAssignmentProgressFiltersInput
  language: LanguageFiltersInput
  evaluationSettings: ComponentEvaluationEvaluationSettingsFiltersInput
  scheduledPublishAt: DateTimeFilterInput
  isActive: BooleanFilterInput
  type: StringFilterInput
  questions: QuestionFiltersInput
  activity_logs: ActivityLogFiltersInput
  classes: ClassFiltersInput
  students: UsersPermissionsUserFiltersInput
  videoUrl: StringFilterInput
  videoTranscript: StringFilterInput
  languageAssessmentType: StringFilterInput
  isIELTS: BooleanFilterInput
  context: StringFilterInput
  teacher: UsersPermissionsUserFiltersInput
  totalStudentsInScope: IntFilterInput
  completedStudentsCount: IntFilterInput
  completionRate: FloatFilterInput
  averageScoreOfCompleted: FloatFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [AssignmentFiltersInput]
  or: [AssignmentFiltersInput]
  not: AssignmentFiltersInput
}

input AssignmentInput {
  topic: String
  color: String
  vocabularyItems: JSON
  progresses: [ID]
  language: ID
  evaluationSettings: ComponentEvaluationEvaluationSettingsInput
  scheduledPublishAt: DateTime
  isActive: Boolean
  type: ENUM_ASSIGNMENT_TYPE
  questions: [ID]
  activity_logs: [ID]
  classes: [ID]
  students: [ID]
  videoUrl: String
  videoTranscript: String
  languageAssessmentType: ENUM_ASSIGNMENT_LANGUAGEASSESSMENTTYPE
  isIELTS: Boolean
  context: String
  teacher: ID
  totalStudentsInScope: Int
  completedStudentsCount: Int
  completionRate: Float
  averageScoreOfCompleted: Float
  publishedAt: DateTime
}

type Assignment {
  topic: String
  color: String
  vocabularyItems: JSON
  progresses(
    filters: StudentAssignmentProgressFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): StudentAssignmentProgressRelationResponseCollection
  language: LanguageEntityResponse
  evaluationSettings: ComponentEvaluationEvaluationSettings!
  scheduledPublishAt: DateTime
  isActive: Boolean
  type: ENUM_ASSIGNMENT_TYPE
  questions(
    filters: QuestionFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): QuestionRelationResponseCollection
  activity_logs(
    filters: ActivityLogFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ActivityLogRelationResponseCollection
  classes(
    filters: ClassFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ClassRelationResponseCollection
  students(
    filters: UsersPermissionsUserFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UsersPermissionsUserRelationResponseCollection
  videoUrl: String
  videoTranscript: String
  languageAssessmentType: ENUM_ASSIGNMENT_LANGUAGEASSESSMENTTYPE
  isIELTS: Boolean
  context: String
  teacher: UsersPermissionsUserEntityResponse
  totalStudentsInScope: Int
  completedStudentsCount: Int
  completionRate: Float
  averageScoreOfCompleted: Float
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type AssignmentEntity {
  id: ID
  attributes: Assignment
}

type AssignmentEntityResponse {
  data: AssignmentEntity
}

type AssignmentEntityResponseCollection {
  data: [AssignmentEntity!]!
  meta: ResponseCollectionMeta!
}

type AssignmentRelationResponseCollection {
  data: [AssignmentEntity!]!
}

enum ENUM_ASSIGNMENTCATEGORY_TYPE {
  IMAGE
  VIDEO
  Q_AND_A
  CUSTOM
  READING
  PRONUNCIATION
  Q_AND_A_IMAGE
}

input AssignmentCategoryFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  type: StringFilterInput
  description: StringFilterInput
  defaultPrompt: StringFilterInput
  defaultRules: JSONFilterInput
  defaultFeedbackSettings: JSONFilterInput
  isEnabled: BooleanFilterInput
  assignment_group: AssignmentGroupFiltersInput
  isIELTS: BooleanFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [AssignmentCategoryFiltersInput]
  or: [AssignmentCategoryFiltersInput]
  not: AssignmentCategoryFiltersInput
}

input AssignmentCategoryInput {
  name: String
  type: ENUM_ASSIGNMENTCATEGORY_TYPE
  description: String
  defaultPrompt: String
  defaultRules: JSON
  defaultFeedbackSettings: JSON
  isEnabled: Boolean
  assignment_group: ID
  isIELTS: Boolean
  publishedAt: DateTime
}

type AssignmentCategory {
  name: String!
  type: ENUM_ASSIGNMENTCATEGORY_TYPE
  description: String
  defaultPrompt: String
  defaultRules: JSON
  defaultFeedbackSettings: JSON
  isEnabled: Boolean!
  assignment_group: AssignmentGroupEntityResponse
  isIELTS: Boolean
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type AssignmentCategoryEntity {
  id: ID
  attributes: AssignmentCategory
}

type AssignmentCategoryEntityResponse {
  data: AssignmentCategoryEntity
}

type AssignmentCategoryEntityResponseCollection {
  data: [AssignmentCategoryEntity!]!
  meta: ResponseCollectionMeta!
}

type AssignmentCategoryRelationResponseCollection {
  data: [AssignmentCategoryEntity!]!
}

input AssignmentGroupFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  description: StringFilterInput
  color: StringFilterInput
  isEnabled: BooleanFilterInput
  assignment_categories: AssignmentCategoryFiltersInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [AssignmentGroupFiltersInput]
  or: [AssignmentGroupFiltersInput]
  not: AssignmentGroupFiltersInput
}

input AssignmentGroupInput {
  name: String
  description: String
  color: String
  isEnabled: Boolean
  assignment_categories: [ID]
  publishedAt: DateTime
}

type AssignmentGroup {
  name: String!
  description: String!
  color: String!
  isEnabled: Boolean!
  assignment_categories(
    filters: AssignmentCategoryFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): AssignmentCategoryRelationResponseCollection
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type AssignmentGroupEntity {
  id: ID
  attributes: AssignmentGroup
}

type AssignmentGroupEntityResponse {
  data: AssignmentGroupEntity
}

type AssignmentGroupEntityResponseCollection {
  data: [AssignmentGroupEntity!]!
  meta: ResponseCollectionMeta!
}

input ClassFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  users: UsersPermissionsUserFiltersInput
  assignments: AssignmentFiltersInput
  activity_logs: ActivityLogFiltersInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [ClassFiltersInput]
  or: [ClassFiltersInput]
  not: ClassFiltersInput
}

input ClassInput {
  name: String
  users: [ID]
  assignments: [ID]
  activity_logs: [ID]
  publishedAt: DateTime
}

type Class {
  name: String
  users(
    filters: UsersPermissionsUserFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UsersPermissionsUserRelationResponseCollection
  assignments(
    filters: AssignmentFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): AssignmentRelationResponseCollection
  activity_logs(
    filters: ActivityLogFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ActivityLogRelationResponseCollection
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type ClassEntity {
  id: ID
  attributes: Class
}

type ClassEntityResponse {
  data: ClassEntity
}

type ClassEntityResponseCollection {
  data: [ClassEntity!]!
  meta: ResponseCollectionMeta!
}

type ClassRelationResponseCollection {
  data: [ClassEntity!]!
}

enum ENUM_DASHBOARDSNAPSHOT_SNAPSHOTTYPE {
  daily
  weekly
  monthly
}

input DashboardSnapshotFiltersInput {
  id: IDFilterInput
  timestamp: DateTimeFilterInput
  snapshotType: StringFilterInput
  totalClasses: IntFilterInput
  totalTeachers: IntFilterInput
  totalStudents: IntFilterInput
  totalAssignments: IntFilterInput
  classAssignments: IntFilterInput
  individualAssignments: IntFilterInput
  averageCompletionRate: IntFilterInput
  averageSuccessRate: IntFilterInput
  studentsNeedingAttention: IntFilterInput
  recentActivities: IntFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [DashboardSnapshotFiltersInput]
  or: [DashboardSnapshotFiltersInput]
  not: DashboardSnapshotFiltersInput
}

input DashboardSnapshotInput {
  timestamp: DateTime
  snapshotType: ENUM_DASHBOARDSNAPSHOT_SNAPSHOTTYPE
  totalClasses: Int
  totalTeachers: Int
  totalStudents: Int
  totalAssignments: Int
  classAssignments: Int
  individualAssignments: Int
  averageCompletionRate: Int
  averageSuccessRate: Int
  studentsNeedingAttention: Int
  recentActivities: Int
  publishedAt: DateTime
}

type DashboardSnapshot {
  timestamp: DateTime
  snapshotType: ENUM_DASHBOARDSNAPSHOT_SNAPSHOTTYPE!
  totalClasses: Int
  totalTeachers: Int
  totalStudents: Int
  totalAssignments: Int
  classAssignments: Int
  individualAssignments: Int
  averageCompletionRate: Int
  averageSuccessRate: Int
  studentsNeedingAttention: Int
  recentActivities: Int
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type DashboardSnapshotEntity {
  id: ID
  attributes: DashboardSnapshot
}

type DashboardSnapshotEntityResponse {
  data: DashboardSnapshotEntity
}

type DashboardSnapshotEntityResponseCollection {
  data: [DashboardSnapshotEntity!]!
  meta: ResponseCollectionMeta!
}

enum ENUM_LANGUAGE_LANGUAGE {
  ENGLISH
  VIETNAMESE
  JAPANESE
  SPANISH
  ITALIAN
  FRENCH
  GERMAN
  PORTUGESE
}

input LanguageFiltersInput {
  id: IDFilterInput
  language: StringFilterInput
  code: StringFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [LanguageFiltersInput]
  or: [LanguageFiltersInput]
  not: LanguageFiltersInput
}

input LanguageInput {
  language: ENUM_LANGUAGE_LANGUAGE
  code: String
  publishedAt: DateTime
}

type Language {
  language: ENUM_LANGUAGE_LANGUAGE
  code: String
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type LanguageEntity {
  id: ID
  attributes: Language
}

type LanguageEntityResponse {
  data: LanguageEntity
}

type LanguageEntityResponseCollection {
  data: [LanguageEntity!]!
  meta: ResponseCollectionMeta!
}

input QuestionFiltersInput {
  id: IDFilterInput
  image: StringFilterInput
  assignment: AssignmentFiltersInput
  progresses: StudentAssignmentProgressFiltersInput
  textQuestion: StringFilterInput
  videoUrl: StringFilterInput
  textAnswer: StringFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [QuestionFiltersInput]
  or: [QuestionFiltersInput]
  not: QuestionFiltersInput
}

input QuestionInput {
  image: String
  assignment: ID
  progresses: [ID]
  textQuestion: String
  videoUrl: String
  textAnswer: String
  publishedAt: DateTime
}

type Question {
  image: String
  assignment: AssignmentEntityResponse
  progresses(
    filters: StudentAssignmentProgressFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): StudentAssignmentProgressRelationResponseCollection
  textQuestion: String
  videoUrl: String
  textAnswer: String
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type QuestionEntity {
  id: ID
  attributes: Question
}

type QuestionEntityResponse {
  data: QuestionEntity
}

type QuestionEntityResponseCollection {
  data: [QuestionEntity!]!
  meta: ResponseCollectionMeta!
}

type QuestionRelationResponseCollection {
  data: [QuestionEntity!]!
}

input SpriteSetFiltersInput {
  id: IDFilterInput
  name: StringFilterInput
  description: StringFilterInput
  stages: ComponentEvolutionStageFiltersInput
  difficulty: IntFilterInput
  order: IntFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [SpriteSetFiltersInput]
  or: [SpriteSetFiltersInput]
  not: SpriteSetFiltersInput
}

input SpriteSetInput {
  name: String
  description: String
  stages: [ComponentEvolutionStageInput]
  difficulty: Int
  order: Int
  publishedAt: DateTime
}

type SpriteSet {
  name: String!
  description: String
  stages(
    filters: ComponentEvolutionStageFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): [ComponentEvolutionStage]!
  difficulty: Int
  order: Int!
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type SpriteSetEntity {
  id: ID
  attributes: SpriteSet
}

type SpriteSetEntityResponse {
  data: SpriteSetEntity
}

type SpriteSetEntityResponseCollection {
  data: [SpriteSetEntity!]!
  meta: ResponseCollectionMeta!
}

type SpriteSetRelationResponseCollection {
  data: [SpriteSetEntity!]!
}

input StatsClassFiltersInput {
  id: IDFilterInput
  averageCompletion: FloatFilterInput
  averageScore: FloatFilterInput
  class: ClassFiltersInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [StatsClassFiltersInput]
  or: [StatsClassFiltersInput]
  not: StatsClassFiltersInput
}

input StatsClassInput {
  averageCompletion: Float
  averageScore: Float
  class: ID
  publishedAt: DateTime
}

type StatsClass {
  averageCompletion: Float
  averageScore: Float
  class: ClassEntityResponse
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type StatsClassEntity {
  id: ID
  attributes: StatsClass
}

type StatsClassEntityResponse {
  data: StatsClassEntity
}

type StatsClassEntityResponseCollection {
  data: [StatsClassEntity!]!
  meta: ResponseCollectionMeta!
}

input StudentAssignmentProgressFiltersInput {
  id: IDFilterInput
  student: UsersPermissionsUserFiltersInput
  assignment: AssignmentFiltersInput
  isComplete: BooleanFilterInput
  isCorrect: BooleanFilterInput
  question: QuestionFiltersInput
  languageConfidenceResponse: JSONFilterInput
  grammarCorrected: JSONFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [StudentAssignmentProgressFiltersInput]
  or: [StudentAssignmentProgressFiltersInput]
  not: StudentAssignmentProgressFiltersInput
}

input StudentAssignmentProgressInput {
  student: ID
  assignment: ID
  isComplete: Boolean
  isCorrect: Boolean
  question: ID
  languageConfidenceResponse: JSON
  grammarCorrected: JSON
  publishedAt: DateTime
}

type StudentAssignmentProgress {
  student: UsersPermissionsUserEntityResponse
  assignment: AssignmentEntityResponse
  isComplete: Boolean
  isCorrect: Boolean
  question: QuestionEntityResponse
  languageConfidenceResponse: JSON
  grammarCorrected: JSON
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type StudentAssignmentProgressEntity {
  id: ID
  attributes: StudentAssignmentProgress
}

type StudentAssignmentProgressEntityResponse {
  data: StudentAssignmentProgressEntity
}

type StudentAssignmentProgressEntityResponseCollection {
  data: [StudentAssignmentProgressEntity!]!
  meta: ResponseCollectionMeta!
}

type StudentAssignmentProgressRelationResponseCollection {
  data: [StudentAssignmentProgressEntity!]!
}

input StudentSpriteFiltersInput {
  id: IDFilterInput
  student: UsersPermissionsUserFiltersInput
  currentEvolutionStage: IntFilterInput
  completedAssignmentsCount: IntFilterInput
  currentSpriteSetIndex: IntFilterInput
  completedSpriteSets: JSONFilterInput
  availableSpriteSets: SpriteSetFiltersInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [StudentSpriteFiltersInput]
  or: [StudentSpriteFiltersInput]
  not: StudentSpriteFiltersInput
}

input StudentSpriteInput {
  student: ID
  currentEvolutionStage: Int
  completedAssignmentsCount: Int
  currentSpriteSetIndex: Int
  completedSpriteSets: JSON
  availableSpriteSets: [ID]
  publishedAt: DateTime
}

type StudentSprite {
  student: UsersPermissionsUserEntityResponse
  currentEvolutionStage: Int!
  completedAssignmentsCount: Int!
  currentSpriteSetIndex: Int!
  completedSpriteSets: JSON!
  availableSpriteSets(
    filters: SpriteSetFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): SpriteSetRelationResponseCollection
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type StudentSpriteEntity {
  id: ID
  attributes: StudentSprite
}

type StudentSpriteEntityResponse {
  data: StudentSpriteEntity
}

type StudentSpriteEntityResponseCollection {
  data: [StudentSpriteEntity!]!
  meta: ResponseCollectionMeta!
}

enum ENUM_TOOL_TYPE {
  PLANNING
  ASSESSMENT
  RESOURCES
  ADMIN
  PUPIL_REPORTS
  LEADERSHIP
  WELLBEING
}

input ToolFiltersInput {
  id: IDFilterInput
  type: StringFilterInput
  name: StringFilterInput
  description: StringFilterInput
  enabled: BooleanFilterInput
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  publishedAt: DateTimeFilterInput
  and: [ToolFiltersInput]
  or: [ToolFiltersInput]
  not: ToolFiltersInput
}

input ToolInput {
  type: ENUM_TOOL_TYPE
  name: String
  description: String
  enabled: Boolean
  image: ID
  publishedAt: DateTime
}

type Tool {
  type: ENUM_TOOL_TYPE
  name: String
  description: String
  enabled: Boolean
  image: UploadFileEntityResponse
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

type ToolEntity {
  id: ID
  attributes: Tool
}

type ToolEntityResponse {
  data: ToolEntity
}

type ToolEntityResponseCollection {
  data: [ToolEntity!]!
  meta: ResponseCollectionMeta!
}

union GenericMorph =
    ComponentQuestionVocabularyQuestion
  | ComponentEvolutionStage
  | ComponentEvaluationEvaluationSettings
  | UploadFile
  | UploadFolder
  | I18NLocale
  | UsersPermissionsPermission
  | UsersPermissionsRole
  | UsersPermissionsUser
  | ActivityLog
  | Assignment
  | AssignmentCategory
  | AssignmentGroup
  | Class
  | DashboardSnapshot
  | Language
  | Question
  | SpriteSet
  | StatsClass
  | StudentAssignmentProgress
  | StudentSprite
  | Tool

input FileInfoInput {
  name: String
  alternativeText: String
  caption: String
}

type UsersPermissionsMe {
  id: ID!
  username: String!
  email: String
  confirmed: Boolean
  blocked: Boolean
  role: UsersPermissionsMeRole
}

type UsersPermissionsMeRole {
  id: ID!
  name: String!
  description: String
  type: String
}

input UsersPermissionsRegisterInput {
  username: String!
  email: String!
  password: String!
}

input UsersPermissionsLoginInput {
  identifier: String!
  password: String!
  provider: String! = "local"
}

type UsersPermissionsPasswordPayload {
  ok: Boolean!
}

type UsersPermissionsLoginPayload {
  jwt: String
  user: UsersPermissionsMe!
}

type UsersPermissionsCreateRolePayload {
  ok: Boolean!
}

type UsersPermissionsUpdateRolePayload {
  ok: Boolean!
}

type UsersPermissionsDeleteRolePayload {
  ok: Boolean!
}

input PaginationArg {
  page: Int
  pageSize: Int
  start: Int
  limit: Int
}

type Query {
  uploadFile(id: ID): UploadFileEntityResponse
  uploadFiles(
    filters: UploadFileFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UploadFileEntityResponseCollection
  uploadFolder(id: ID): UploadFolderEntityResponse
  uploadFolders(
    filters: UploadFolderFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UploadFolderEntityResponseCollection
  i18NLocale(id: ID): I18NLocaleEntityResponse
  i18NLocales(
    filters: I18NLocaleFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): I18NLocaleEntityResponseCollection
  usersPermissionsRole(id: ID): UsersPermissionsRoleEntityResponse
  usersPermissionsRoles(
    filters: UsersPermissionsRoleFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UsersPermissionsRoleEntityResponseCollection
  usersPermissionsUser(id: ID): UsersPermissionsUserEntityResponse
  usersPermissionsUsers(
    filters: UsersPermissionsUserFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
  ): UsersPermissionsUserEntityResponseCollection
  activityLog(id: ID): ActivityLogEntityResponse
  activityLogs(
    filters: ActivityLogFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ActivityLogEntityResponseCollection
  assignment(id: ID): AssignmentEntityResponse
  assignments(
    filters: AssignmentFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): AssignmentEntityResponseCollection
  assignmentCategory(id: ID): AssignmentCategoryEntityResponse
  assignmentCategories(
    filters: AssignmentCategoryFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): AssignmentCategoryEntityResponseCollection
  assignmentGroup(id: ID): AssignmentGroupEntityResponse
  assignmentGroups(
    filters: AssignmentGroupFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): AssignmentGroupEntityResponseCollection
  class(id: ID): ClassEntityResponse
  classes(
    filters: ClassFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ClassEntityResponseCollection
  dashboardSnapshot(id: ID): DashboardSnapshotEntityResponse
  dashboardSnapshots(
    filters: DashboardSnapshotFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): DashboardSnapshotEntityResponseCollection
  language(id: ID): LanguageEntityResponse
  languages(
    filters: LanguageFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): LanguageEntityResponseCollection
  question(id: ID): QuestionEntityResponse
  questions(
    filters: QuestionFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): QuestionEntityResponseCollection
  spriteSet(id: ID): SpriteSetEntityResponse
  spriteSets(
    filters: SpriteSetFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): SpriteSetEntityResponseCollection
  statsClass(id: ID): StatsClassEntityResponse
  statsClasses(
    filters: StatsClassFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): StatsClassEntityResponseCollection
  studentAssignmentProgress(id: ID): StudentAssignmentProgressEntityResponse
  studentAssignmentProgresses(
    filters: StudentAssignmentProgressFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): StudentAssignmentProgressEntityResponseCollection
  studentSprite(id: ID): StudentSpriteEntityResponse
  studentSprites(
    filters: StudentSpriteFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): StudentSpriteEntityResponseCollection
  tool(id: ID): ToolEntityResponse
  tools(
    filters: ToolFiltersInput
    pagination: PaginationArg = {}
    sort: [String] = []
    publicationState: PublicationState = LIVE
  ): ToolEntityResponseCollection
  me: UsersPermissionsMe
}

type Mutation {
  createUploadFile(data: UploadFileInput!): UploadFileEntityResponse
  updateUploadFile(id: ID!, data: UploadFileInput!): UploadFileEntityResponse
  deleteUploadFile(id: ID!): UploadFileEntityResponse
  createUploadFolder(data: UploadFolderInput!): UploadFolderEntityResponse
  updateUploadFolder(
    id: ID!
    data: UploadFolderInput!
  ): UploadFolderEntityResponse
  deleteUploadFolder(id: ID!): UploadFolderEntityResponse
  createActivityLog(data: ActivityLogInput!): ActivityLogEntityResponse
  updateActivityLog(id: ID!, data: ActivityLogInput!): ActivityLogEntityResponse
  deleteActivityLog(id: ID!): ActivityLogEntityResponse
  createAssignment(data: AssignmentInput!): AssignmentEntityResponse
  updateAssignment(id: ID!, data: AssignmentInput!): AssignmentEntityResponse
  deleteAssignment(id: ID!): AssignmentEntityResponse
  createAssignmentCategory(
    data: AssignmentCategoryInput!
  ): AssignmentCategoryEntityResponse
  updateAssignmentCategory(
    id: ID!
    data: AssignmentCategoryInput!
  ): AssignmentCategoryEntityResponse
  deleteAssignmentCategory(id: ID!): AssignmentCategoryEntityResponse
  createAssignmentGroup(
    data: AssignmentGroupInput!
  ): AssignmentGroupEntityResponse
  updateAssignmentGroup(
    id: ID!
    data: AssignmentGroupInput!
  ): AssignmentGroupEntityResponse
  deleteAssignmentGroup(id: ID!): AssignmentGroupEntityResponse
  createClass(data: ClassInput!): ClassEntityResponse
  updateClass(id: ID!, data: ClassInput!): ClassEntityResponse
  deleteClass(id: ID!): ClassEntityResponse
  createDashboardSnapshot(
    data: DashboardSnapshotInput!
  ): DashboardSnapshotEntityResponse
  updateDashboardSnapshot(
    id: ID!
    data: DashboardSnapshotInput!
  ): DashboardSnapshotEntityResponse
  deleteDashboardSnapshot(id: ID!): DashboardSnapshotEntityResponse
  createLanguage(data: LanguageInput!): LanguageEntityResponse
  updateLanguage(id: ID!, data: LanguageInput!): LanguageEntityResponse
  deleteLanguage(id: ID!): LanguageEntityResponse
  createQuestion(data: QuestionInput!): QuestionEntityResponse
  updateQuestion(id: ID!, data: QuestionInput!): QuestionEntityResponse
  deleteQuestion(id: ID!): QuestionEntityResponse
  createSpriteSet(data: SpriteSetInput!): SpriteSetEntityResponse
  updateSpriteSet(id: ID!, data: SpriteSetInput!): SpriteSetEntityResponse
  deleteSpriteSet(id: ID!): SpriteSetEntityResponse
  createStatsClass(data: StatsClassInput!): StatsClassEntityResponse
  updateStatsClass(id: ID!, data: StatsClassInput!): StatsClassEntityResponse
  deleteStatsClass(id: ID!): StatsClassEntityResponse
  createStudentAssignmentProgress(
    data: StudentAssignmentProgressInput!
  ): StudentAssignmentProgressEntityResponse
  updateStudentAssignmentProgress(
    id: ID!
    data: StudentAssignmentProgressInput!
  ): StudentAssignmentProgressEntityResponse
  deleteStudentAssignmentProgress(
    id: ID!
  ): StudentAssignmentProgressEntityResponse
  createStudentSprite(data: StudentSpriteInput!): StudentSpriteEntityResponse
  updateStudentSprite(
    id: ID!
    data: StudentSpriteInput!
  ): StudentSpriteEntityResponse
  deleteStudentSprite(id: ID!): StudentSpriteEntityResponse
  createTool(data: ToolInput!): ToolEntityResponse
  updateTool(id: ID!, data: ToolInput!): ToolEntityResponse
  deleteTool(id: ID!): ToolEntityResponse
  upload(
    refId: ID
    ref: String
    field: String
    info: FileInfoInput
    file: Upload!
  ): UploadFileEntityResponse!
  multipleUpload(
    refId: ID
    ref: String
    field: String
    files: [Upload]!
  ): [UploadFileEntityResponse]!
  updateFileInfo(id: ID!, info: FileInfoInput): UploadFileEntityResponse!
  removeFile(id: ID!): UploadFileEntityResponse

  # Create a new role
  createUsersPermissionsRole(
    data: UsersPermissionsRoleInput!
  ): UsersPermissionsCreateRolePayload

  # Update an existing role
  updateUsersPermissionsRole(
    id: ID!
    data: UsersPermissionsRoleInput!
  ): UsersPermissionsUpdateRolePayload

  # Delete an existing role
  deleteUsersPermissionsRole(id: ID!): UsersPermissionsDeleteRolePayload

  # Create a new user
  createUsersPermissionsUser(
    data: UsersPermissionsUserInput!
  ): UsersPermissionsUserEntityResponse!

  # Update an existing user
  updateUsersPermissionsUser(
    id: ID!
    data: UsersPermissionsUserInput!
  ): UsersPermissionsUserEntityResponse!

  # Delete an existing user
  deleteUsersPermissionsUser(id: ID!): UsersPermissionsUserEntityResponse!
  login(input: UsersPermissionsLoginInput!): UsersPermissionsLoginPayload!

  # Register a user
  register(input: UsersPermissionsRegisterInput!): UsersPermissionsLoginPayload!

  # Request a reset password token
  forgotPassword(email: String!): UsersPermissionsPasswordPayload

  # Reset user password. Confirm with a code (resetToken from forgotPassword)
  resetPassword(
    password: String!
    passwordConfirmation: String!
    code: String!
  ): UsersPermissionsLoginPayload

  # Change user password. Confirm with the current password.
  changePassword(
    currentPassword: String!
    password: String!
    passwordConfirmation: String!
  ): UsersPermissionsLoginPayload

  # Confirm an email users email address
  emailConfirmation(confirmation: String!): UsersPermissionsLoginPayload
}
