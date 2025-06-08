# School AI Refactor Plan: Strapi to Prisma Migration

The origional application is in the '/japaneseinternationalschoolai.com' directory.

IMPORANT: Do not change the code in '/japaneseinternationalschoolai.com', only change the code in '/school-ai'
IMPORANT: Update this file when necesarry.
IMPORANT: Always use shadcn/ui for ui related components
IMPORANT: Always run 'nvm use 18 &&' before any terminal uses.

## 🚨 CRITICAL REQUIREMENT
**Node.js Upgrade Required**: ✅ **COMPLETED** - Upgraded to Node.js 18.20.8

## 🎯 Objective
Refactor the Japanese International School AI application from Strapi to Prisma, moving all database operations from frontend to backend with proper transaction support.

## 📋 Phase 1: Project Setup & Database Schema
- [x] Initialize Next.js 14 project with TypeScript
- [x] Setup Prisma with PostgreSQL
- [x] Create Prisma schema based on current Strapi schema
- [x] Setup database connection and migrations
- [x] Configure environment variables example
- [x] Configure TypeScript path aliases
- [x] Install all dependencies

### ✅ Completed in Phase 1:
- Created comprehensive Prisma schema (`prisma/schema.prisma`) with all models:
  - User model with custom roles (TEACHER, ADMIN, STUDENT, PARENT)
  - Class, Assignment, Question models
  - StudentAssignmentProgress for tracking
  - ActivityLog for audit trails
  - Language, AssignmentCategory, AssignmentGroup models
  - Tool, SpriteSet, StudentSprite models (gamification)
  - DashboardSnapshot, StatsClass models
  - UploadFile, UploadFolder models (replace Strapi uploads)
- Database service layer (`lib/db.ts`) with transaction helpers
- Authentication configuration (`lib/auth.ts`) with NextAuth
- Role-based access control middleware (`middleware.ts`)
- Utility functions (`lib/utils.ts`)
- Environment configuration example (`env.example`)
- Basic API route structure
- Prisma client generated and ready

## 📋 Phase 2: Database Schema Implementation
### Core Models
- [x] User model with custom roles (TEACHER, ADMIN, STUDENT, PARENT)
- [x] Class model
- [x] Assignment model with types (CLASS, INDIVIDUAL)
- [x] Question model
- [x] StudentAssignmentProgress model
- [x] ActivityLog model
- [x] Language model
- [x] AssignmentCategory and AssignmentGroup models
- [x] Tool model
- [x] SpriteSet and StudentSprite models (gamification)
- [x] DashboardSnapshot model
- [x] StatsClass model

### Relationships
- [x] User-Class many-to-many relationship
- [x] Assignment-Class many-to-many relationship
- [x] Assignment-Student many-to-many relationship
- [x] Question-Assignment one-to-many relationship
- [x] StudentAssignmentProgress relationships
- [x] ActivityLog relationships

## 📋 Phase 3: Backend API Development
### Authentication & Authorization
- [x] NextAuth.js setup with custom providers
- [x] Role-based access control middleware
- [x] Session management (basic implementation)

### ✅ **NEW: Scheduled Tasks System** (Equivalent to Strapi lifecycle)
- [x] **Assignment Publishing System** (`lib/scheduled-tasks/publish-scheduled-assignments.ts`):
  - Cron job running every minute
  - Automatic activation of assignments when `scheduledPublishAt` <= current time
  - Transaction-based operations with rollback support
  - Activity logging for audit trails
  - Manual activation utility for missed assignments
  - Future assignments listing
  
- [x] **Dashboard Analytics System** (`lib/scheduled-tasks/dashboard-snapshot.ts`):
  - Daily snapshots at 6 AM (configurable)
  - Comprehensive metrics calculation:
    - Student completion rates and success rates
    - Assignment statistics (class vs individual)
    - Students needing attention identification
    - Recent activity tracking
  - Automatic cleanup of old snapshots (365-day retention)
  - Manual snapshot creation for testing
  
- [x] **Task Management Infrastructure** (`lib/scheduled-tasks/index.ts`):
  - Centralized task manager with start/stop/restart capabilities
  - Health monitoring and status reporting
  - Graceful shutdown handling
  - Task lifecycle management

### ✅ **NEW: Services Architecture**
- [x] **AuthService**: User authentication, authorization, role-based access control
- [x] **UsersService**: Complete CRUD operations, password management, role-based filtering  
- [x] **AssignmentsService**: Full assignment lifecycle, scheduled assignments, progress tracking
- [x] **Service Factory**: Centralized service access with clean import/export structure
- [x] **Error Handling**: Custom error classes with proper HTTP status codes

### API Routes Structure
- [x] `/api/auth/*` - Authentication endpoints
- [x] `/api/assignments` - Assignment management with scheduling support
- [x] `/api/users` - User management with filtering and pagination
- [x] `/api/admin/scheduled-tasks` - Admin task monitoring and control
- [ ] `/api/classes/*` - Class management
- [ ] `/api/questions/*` - Question management
- [ ] `/api/progress/*` - Student progress tracking
- [ ] `/api/activity-logs/*` - Activity logging
- [ ] `/api/languages/*` - Language management
- [ ] `/api/tools/*` - Tool management
- [ ] `/api/sprites/*` - Gamification features
- [ ] `/api/dashboard/*` - Dashboard statistics

### Database Operations with Transactions
- [x] Create database service layer with Prisma client
- [x] Implement transaction wrapper functions
- [x] Error handling and rollback mechanisms
- [x] Connection health checking
- [ ] Optimistic locking for concurrent updates

### ✅ **NEW: Application Bootstrap System**
- [x] **Bootstrap Integration** (`src/app/lib/bootstrap.ts`):
  - Application startup sequence
  - Database connection verification
  - Scheduled tasks initialization
  - Health check system
  - Production-ready error handling

## 📋 Phase 4: Frontend Components Migration
### ✅ **NEW: UI Framework Setup**
- [x] **shadcn/ui Integration**: Modern component library with Tailwind CSS v4
- [x] **Essential Components**: Button, Card, Table, Badge, Dialog, Form, Input, Avatar, Dropdown
- [x] **ESLint Configuration**: Compatibility fixes for shadcn/ui empty interfaces
- [x] **TypeScript Setup**: Proper type definitions and path aliases

### 📋 **NEW: Comprehensive Frontend Development Plan**
- [x] **Analysis Complete**: Studied existing application architecture and features
- [x] **FRONTEND-PLAN.md Created**: Detailed 8-phase implementation roadmap
- [x] **Technical Specifications**: Audio recording, AI integration, S3/MinIO caching
- [x] **10-Week Timeline**: From authentication to production-ready application

### Layout & Navigation
- [x] **Dashboard Layout**: Clean, modern UI with responsive design
- [ ] **Phase 1**: Authentication system and core layout (Week 1)
- [ ] **Navigation System**: Role-based menus and responsive design
- [ ] **Protected Routes**: Middleware with role-based access control

### Pages & Components Implementation
- [x] **Dashboard Page**: Beautiful stats cards, data tables, real-time metrics
- [ ] **Phase 2**: User management system with CRUD operations (Week 2)
- [ ] **Phase 3**: Class management with analytics (Week 3)
- [ ] **Phase 4-5**: Assignment creation and management system (Weeks 4-5)
- [ ] **Phase 6-7**: Student assessment interface with audio recording (Weeks 6-7)
- [ ] **Phase 8**: AI tools integration and advanced features (Week 8)

### Data Fetching & Advanced Features
- [x] **API Integration**: Dashboard fetches from users and assignments APIs
- [x] **React State Management**: useState/useEffect for data fetching
- [ ] **React Query/SWR**: Advanced caching and state management
- [ ] **Audio Recording System**: Web Audio API with AI assessment integration
- [ ] **Real-time Features**: WebSocket integration for live updates
- [ ] **PWA Capabilities**: Mobile app functionality with offline support

**📋 Detailed Implementation Plan**: See `FRONTEND-PLAN.md` for comprehensive roadmap

## 📋 Phase 5: Advanced Features
### Assignment System
- [x] **Scheduled assignment publishing** (automated via cron)
- [ ] Video assignment handling
- [ ] Vocabulary assessment
- [ ] Audio recording integration
- [ ] AI evaluation system
- [ ] IELTS assessment features

### Statistics & Analytics
- [x] **Automated daily dashboard snapshots**
- [x] **Real-time progress tracking infrastructure**
- [x] **Assignment completion statistics calculation**
- [x] **Student performance analytics**
- [ ] Dashboard metrics visualization
- [ ] Trending analysis

### Gamification
- [x] Sprite evolution system (schema ready)
- [ ] Achievement tracking implementation
- [ ] Progress rewards

## 📋 Phase 6: File Upload & Media Management
- [ ] Setup file upload system (replace Strapi uploads)
- [ ] Image processing and optimization
- [ ] Video handling for assignments
- [ ] Audio file management

## 📋 Phase 7: Testing & Quality Assurance
- [ ] Unit tests for database operations
- [ ] Integration tests for API routes
- [ ] Component testing
- [ ] E2E testing for critical flows
- [ ] Performance testing

## 📋 Phase 8: Deployment & Migration
- [ ] Production database setup
- [ ] Data migration scripts from Strapi to Prisma
- [ ] Environment configuration
- [ ] CI/CD pipeline setup
- [ ] Performance monitoring

## 🔧 Technical Stack
- **Framework**: Next.js 14 with App Router ✅
- **Database**: PostgreSQL with Prisma ORM ✅
- **Authentication**: NextAuth.js ✅
- **Scheduled Tasks**: Node-cron with transaction support ✅
- **UI**: TailwindCSS + Radix UI components
- **State Management**: React Query/SWR
- **File Upload**: Custom implementation or Uploadthing
- **Testing**: Jest + React Testing Library + Playwright
- **Deployment**: Vercel or custom Docker setup

## 📝 Key Considerations
- ✅ Maintain data integrity during migration (transaction support implemented)
- ✅ Ensure role-based access control is properly implemented
- ✅ Optimize database queries for performance (Prisma with proper relations)
- ✅ Implement proper error handling and logging
- [ ] Maintain backward compatibility where possible
- [ ] Document API endpoints and database schema changes

## 🚀 Current Status
- [x] Plan created
- [x] Project structure initialized
- [x] Database schema designed and generated
- [x] **Dependencies installed and configured**
- [x] **Scheduled tasks system implemented** 
- [x] **Core backend API structure created**
- [x] **Services architecture implemented**
- [x] **shadcn/ui frontend framework setup**
- [x] **Dashboard page with modern UI components**
- [x] **🆕 COMPREHENSIVE CODEBASE ANALYSIS COMPLETED**
- [x] **🆕 SOPHISTICATED FEATURES DISCOVERED & DOCUMENTED**
- [x] **🆕 ENHANCED FRONTEND PLAN WITH ATOMIC DESIGN**
- [ ] Begin Phase 1 implementation (Authentication & Atomic Design)
- [ ] Complete frontend migration with advanced features
- [ ] Testing & deployment

---

## 🆕 **Latest Achievement: Comprehensive Codebase Analysis & Enhanced Planning**

We've completed an **extensive analysis** of the existing Japanese International School AI codebase and discovered **sophisticated features** that significantly enhance our development plan:

### **🔍 Critical Discoveries**
- **🏗️ Atomic Design Architecture**: Sophisticated component hierarchy with atoms/molecules/particles/templates
- **🎮 Advanced Gamification**: 775-line DinoGame with physics engine and sprite evolution system  
- **🤖 AI Integration Excellence**: OpenAI GPT-4o, Language Confidence API, rule-based evaluation engine
- **🎤 Professional Audio System**: 475-line audio recording hook with noise suppression and real-time analysis
- **💬 Vector Chat System**: N8N-powered intelligent chat with chart rendering and multi-language support
- **📱 Complete PWA Implementation**: Service worker, manifest, offline functionality
- **🛠️ Separate Admin Panel**: Dedicated Next.js app for infrastructure and multi-tenant management

### **📋 Enhanced Implementation Plan**
- **Updated Timeline**: Extended to 11 weeks to include all sophisticated features
- **Atomic Design Integration**: Complete component architecture following existing patterns
- **AI-Powered Assessment**: Rule-based evaluation with phoneme-level pronunciation feedback
- **Interactive Gamification**: Canvas-based games with physics engine and achievements
- **Advanced Audio Recording**: Full-featured recording system with multiple format support
- **Chart Rendering System**: Dynamic visualization with Recharts integration
- **Multi-tenant Architecture**: Separate admin panel for infrastructure management

### **🎯 Technical Excellence Standards**
- **Component Architecture**: Atomic design with 104KB+ advanced components
- **AI Integration**: Multiple APIs with sophisticated evaluation rules
- **Audio Processing**: Professional-grade recording with Web Audio API
- **Real-time Features**: WebSocket integration with progress tracking
- **Performance Optimization**: Image proxy system, CDN caching, service worker
- **Mobile Experience**: PWA with offline functionality and native app feel

### **🔄 Next Steps**
1. **Implement Atomic Design Structure** following discovered patterns
2. **Port Critical Components** (VocabularyAssessment, DinoGame, LanguageConfidenceResults)
3. **Set up Audio Recording System** with 475-line hook implementation
4. **Integrate AI Evaluation Engine** with rule-based assessment
5. **Develop Vector Chat System** with chart rendering capabilities
6. **Create Admin Panel Architecture** for multi-tenant management

## 📈 **Project Scope Enhancement**

**Original Scope**: Basic Strapi to Prisma migration with modern UI
**Enhanced Scope**: **Enterprise-grade AI-powered language learning platform** with:
- ✅ Sophisticated gamification and interactive games
- ✅ Professional audio recording and AI evaluation
- ✅ Multi-language AI chat with chart generation
- ✅ Atomic design component architecture
- ✅ Complete PWA with offline functionality
- ✅ Multi-tenant admin panel architecture
- ✅ Advanced analytics and real-time updates

**Current Status**: **Phase 4+ planning complete** - Comprehensive analysis and enhanced development plan created. Ready to begin implementation of **enterprise-grade language learning platform** that significantly exceeds the original Strapi-based implementation.
