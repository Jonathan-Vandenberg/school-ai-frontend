# 🎨 Frontend Development Plan: Japanese International School AI

## 🆕 **CRITICAL DISCOVERIES: Advanced Features from Existing Codebase**

**After comprehensive codebase analysis, several sophisticated features must be integrated:**

### 🏗️ **shadcn/ui Component Architecture**
- **Component Structure**: Leveraging existing patterns with shadcn/ui components
- **Reusable Patterns**: StatCard, UserCard, AssignmentCard, ToolsGrid components built with shadcn/ui
- **Advanced UI Components**: 104KB+ LanguageConfidenceResults with detailed AI feedback using shadcn/ui
- **Modular System**: Highly organized component hierarchy for scalability with shadcn/ui foundation

### 🎮 **Advanced Gamification System**
- **DinoGame Component**: 775-line interactive game with sophisticated physics
- **Sprite Evolution**: Dynamic character progression based on performance
- **Achievement System**: Real-time progress tracking and rewards
- **Interactive Elements**: Canvas-based games with collision detection

### 🤖 **Sophisticated AI Integration**
- **Multiple AI APIs**: OpenAI GPT-4o, Language Confidence API, transcription
- **Audio Evaluation**: Real-time pronunciation scoring with phoneme breakdown
- **Image Analysis**: AI-powered image description and assessment
- **Grammar Analysis**: Advanced rule-based evaluation with custom prompts
- **Multi-language Support**: 15+ languages with intelligent evaluation

### 🎤 **Professional Audio System**
- **Web Audio API**: 475-line hook with noise suppression, echo cancellation
- **Real-time Processing**: Audio level monitoring, speaking detection
- **Multiple Formats**: WebM, MP4, WAV, OGG support with fallbacks
- **Sound Effects**: Activation/deactivation sounds with Web Audio fallbacks

### 💬 **Vector Chat System**
- **AI Chat Integration**: N8N webhook-based intelligent chat
- **Chart Rendering**: Dynamic charts with Recharts (line, bar, pie)
- **Markdown Support**: Advanced content rendering with table support
- **Multi-language**: Real-time language switching with localStorage persistence

### 📱 **PWA Implementation**
- **Complete Manifest**: App icons, screenshots, installation prompts
- **Service Worker**: Offline functionality and background sync
- **Mobile Experience**: Portrait-optimized with touch-friendly interface
- **App-like Features**: Standalone display mode with native feel

### 🎯 **Assessment Excellence**
- **3 Assessment Types**: Vocabulary, Video, IELTS with specialized evaluation
- **Rule Engine**: Custom evaluation rules with detailed feedback
- **Progress Tracking**: Granular question-level and assignment-level tracking
- **Preview Mode**: Testing assessments without affecting student data

### 🛠️ **Admin Panel Separation**
- **Dedicated Admin App**: Separate Next.js application for administration
- **Infrastructure Management**: Deployments, droplets, database management
- **Schema Management**: Live database schema editing and migration tools
- **Client Management**: Multi-tenant client deployment system

---

## 📋 Current Analysis Summary

**✅ PHASE 1 COMPLETED - Role-Based Authentication & Access Control:**
- 🔐 **Complete Authentication System**: Multi-role system (Admin, Teacher, Student, Parent)
- 🎯 **Role-Based Redirection**: Admin → Dashboard, Others → Profile page
- 🔒 **Access Control**: Dashboard protected for Admin-only access via middleware
- 🧭 **Conditional Navigation**: shadcn/ui sidebar only visible for authenticated users
- 👤 **Profile Pages**: Role-specific profile pages with relevant stats and actions
- 🛡️ **Route Protection**: Middleware enforces role-based access control
- 🎨 **Clean Public Pages**: Landing page and auth pages without sidebar clutter

**Advanced Application Features Identified from Existing Codebase:**
- 📊 **Advanced Dashboard**: Real-time analytics, charts, activity logs (Admin only)
- 🎯 **Assessment System**: Video, vocabulary, IELTS assessments with audio recording
- 🤖 **AI Integration**: Language confidence API, pronunciation scoring
- 🎮 **Gamification**: Sprite evolution, progress tracking
- 📁 **File Management**: S3/MinIO storage with optimization
- 💬 **Real-time Features**: Vector chat, messaging system
- 📱 **PWA Support**: Mobile app capabilities

---

## 🎯 **CURRENT: Phase 2: User Management System (Week 2)** 🔄

### 👥 User CRUD Operations
**Priority: HIGH** - **IN PROGRESS**
- 🔄 **User List Page (In Progress)**
  - Professional DataTable with search/filter using shadcn/ui Table components ✅
  - Role-based filtering (Admin, Teacher, Student, Parent) with shadcn/ui Select ✅
  - User status badges (Active, Pending, Blocked) with color coding ✅
  - Action dropdown menus (Edit, Block, Delete) with shadcn/ui DropdownMenu ✅
  - Summary statistics cards showing user counts by role ✅
  - Admin-only access protection ✅

- [ ] **User Creation Form**
  - Multi-step form with validation using shadcn/ui Form components
  - Role-specific field visibility
  - Image upload with preview (integrate with existing upload patterns)
  - Password generation or manual entry

- [ ] **User Edit/Update**
  - Inline editing capabilities using shadcn/ui Dialog
  - Change password functionality
  - Role modification with permission checks
  - Audit trail display

- [ ] **User Profile Enhancement**
  - Enhanced student profiles with progress metrics and sprite display
  - Teacher profiles with class assignments
  - Parent profiles with child connections
  - Performance analytics integration

### 🎨 Advanced UI Components (shadcn/ui) - **NEXT**
- [ ] **DataTable Component (Enhanced)**
  - Reusable table with sorting, filtering, pagination using shadcn/ui Table
  - Export functionality (CSV, PDF) with shadcn/ui Button actions
  - Column visibility controls using shadcn/ui DropdownMenu
  - Mobile-responsive cards view using shadcn/ui Card

- [ ] **Form Components (Enhanced)**
  - Multi-step form wizard using shadcn/ui Tabs or custom stepper
  - Real-time validation with shadcn/ui Form error handling
  - File upload with drag-and-drop using shadcn/ui Input
  - Auto-save draft functionality

- [ ] **UserCard Component (Custom)**
  - Avatar with status indicators using shadcn/ui Avatar and Badge
  - Role-based styling with shadcn/ui Card variants
  - Quick action buttons using shadcn/ui Button
  - Progress metrics display using shadcn/ui Progress

**📊 Deliverables for Phase 2:**
- 🔄 Complete user management system (In Progress)
- ⏳ Reusable DataTable component with shadcn/ui
- ⏳ Advanced form handling with shadcn/ui Form components
- ⏳ Enhanced profile management system with gamification

---

## 🏫 Phase 3: Class Management System (Week 3)

### 📚 Class CRUD Operations
**Priority: HIGH**
- [ ] **Class List View**
  - Grid and list view options using shadcn/ui Card and Table layouts
  - Class analytics preview cards using shadcn/ui Card with metrics
  - Quick action buttons using shadcn/ui Button and DropdownMenu
  - Student count and performance metrics

- [ ] **Class Creation/Editing**
  - Class details form using shadcn/ui Form components
  - Student enrollment management (drag-and-drop) with shadcn/ui
  - Teacher assignment using shadcn/ui Select
  - Class schedule integration

- [ ] **Class Dashboard**
  - Individual class analytics using shadcn/ui Card layouts
  - Student performance overview with sprite displays
  - Assignment distribution charts using Recharts with shadcn/ui Card wrapper
  - Recent activity feed using shadcn/ui Card and Badge

- [ ] **Student Enrollment**
  - Drag-and-drop student assignment
  - Bulk enrollment from CSV using shadcn/ui Dialog
  - Enrollment history tracking with shadcn/ui Table
  - Waitlist management

### 📊 Class Analytics
- [ ] **Performance Metrics**
  - Completion rate visualizations using shadcn/ui Progress and Card
  - Success rate trends with Recharts integration
  - Individual student progress with gamification elements
  - Comparative class analysis using shadcn/ui Tabs

- [ ] **Interactive Charts (using existing patterns)**
  - Recharts integration for performance data wrapped in shadcn/ui Card
  - Drill-down capabilities with shadcn/ui Dialog
  - Export functionality using shadcn/ui Button
  - Real-time updates

**Deliverables:**
- ✅ Complete class management system
- ✅ Student enrollment functionality
- ✅ Class analytics dashboard with charts
- ✅ Performance visualization components with shadcn/ui

---

## 📝 Phase 4-5: Assignment System - Creation & Management (Week 4-5)

### 📋 Assignment CRUD Operations  
**Priority: CRITICAL**
- [ ] **Assignment List/Library**
  - Template library with categories using shadcn/ui Card and Badge components
  - Search and filter by type, difficulty, language using shadcn/ui Input and Select
  - Preview thumbnails with metadata using shadcn/ui Card and Dialog
  - Duplicate and share functionality with shadcn/ui Button actions

- [ ] **Assignment Creation Wizard (Templates)**
  - Multi-step creation process using shadcn/ui Tabs or Steps component:
    1. **Basic Info**: Title, description, type selection using shadcn/ui Form
    2. **Content Setup**: Questions, media, vocabulary using shadcn/ui Form and Input
    3. **Assessment Config**: AI settings, scoring rules, custom evaluation rules
    4. **Assignment Settings**: Scheduling, target audience using shadcn/ui DatePicker
    5. **Review & Publish**: Preview mode functionality with shadcn/ui Card

### 🎯 Assignment Types Implementation (Critical Feature Parity)
- [ ] **Vocabulary Assessment (VocabularyChecker Template)**
  - Port existing 700-line VocabularyAssessment component
  - Word list management with image grid support using shadcn/ui Card
  - Definition matching with AI evaluation
  - Pronunciation exercises with audio recording
  - Context-based questions with rule engine

- [ ] **Video Assessment (VideoChecker Template)**
  - Video upload/URL integration using shadcn/ui Input and Dialog
  - Transcript management and analysis
  - Comprehension questions using shadcn/ui Form
  - Speaking prompts based on video content

- [ ] **IELTS Assessment (IELTSChecker Template)**
  - Speaking, listening, reading, writing modules using shadcn/ui Tabs
  - Official IELTS format compliance
  - Automated scoring integration with Language Confidence API
  - Band score predictions using shadcn/ui Badge and Progress
  - Vocabulary item handling for IELTS mode

### 🎨 Media Management
- [ ] **File Upload System (Enhanced)**
  - Drag-and-drop multi-file upload using shadcn/ui Input
  - Progress indicators with real-time feedback using shadcn/ui Progress
  - File type validation and compression
  - S3/MinIO integration with CDN caching
  - Image proxy system for optimization

- [ ] **Media Library (Enhanced)**
  - Organized folder structure using shadcn/ui Card and Breadcrumb
  - Search and tag functionality using shadcn/ui Input and Badge
  - Usage tracking across assignments
  - Bulk operations (move, delete, organize) using shadcn/ui Checkbox and Button

### 🤖 **AI Evaluation Engine Integration**
- [ ] **Rule Engine Implementation**
  - Custom evaluation rules with detailed feedback using shadcn/ui Form
  - Grammar analysis with OpenAI GPT-4o
  - Multi-language evaluation support using shadcn/ui Select
  - Preview mode for testing without affecting data using shadcn/ui Dialog

**Deliverables:**
- ✅ Complete assignment creation system
- ✅ All 3 assignment type implementations with AI evaluation
- ✅ Advanced media management with proxy system
- ✅ Template library system with shadcn/ui components
- ✅ AI evaluation engine with rule-based assessment

---

## 🎮 Phase 6-7: Assessment Experience & Gamification (Week 6-7)

### 🎯 Assignment Taking Interface
**Priority: CRITICAL**
- [ ] **Assignment Preview**
  - Instructions and overview using template patterns
  - Time estimates and requirements
  - Sample questions preview
  - Equipment check (microphone, camera)

- [ ] **Assessment Player (Enhanced)**
  - Question navigation with progress
  - Auto-save functionality
  - Timer with warnings
  - Submit confirmation with review
  - Confetti celebrations for achievements

### 🎤 Professional Audio Recording System
**Priority: CRITICAL**
- [ ] **Advanced Audio Recorder Hook (Port Existing)**
  - 475-line useAudioRecorder with full feature set
  - Real-time audio level monitoring
  - Noise suppression and echo cancellation
  - Multiple format support (WebM, MP4, WAV, OGG)
  - Sound effects for activation/deactivation

- [ ] **Web Audio API Integration**
  - High-quality audio capture
  - Real-time waveform visualization
  - Speaking detection algorithms
  - Cross-browser compatibility with fallbacks

- [ ] **Audio Processing & Evaluation**
  - Language Confidence API integration
  - Real-time pronunciation scoring
  - Phoneme-level feedback with IPA notation
  - Grammar and vocabulary analysis

### 📊 Results & Feedback System (LanguageConfidenceResults)
- [ ] **Advanced Feedback Display**
  - Port 104KB+ LanguageConfidenceResults component
  - Detailed AI scoring results with visualizations
  - Pronunciation feedback with phoneme breakdown
  - Rule evaluation with specific feedback per rule
  - IELTS/CEFR predictions

- [ ] **Progress Tracking with Gamification**
  - Assignment completion status
  - Historical performance trends
  - Strengths and weaknesses analysis
  - Goal setting and recommendations

### 🎮 Advanced Gamification Features
- [ ] **DinoGame Integration**
  - Port 775-line interactive game component
  - Canvas-based physics engine
  - Collision detection and scoring
  - Responsive design with scaling

- [ ] **Sprite Evolution System**
  - Dynamic character progression
  - Achievement unlocking based on performance
  - Virtual rewards and badges
  - Leaderboards and competitions

**Deliverables:**
- ✅ Complete student assessment interface
- ✅ Professional audio recording system (475-line hook)
- ✅ AI integration with real-time feedback
- ✅ Advanced gamification with DinoGame
- ✅ Comprehensive feedback system

---

## 🤖 Phase 8: AI Tools & Advanced Features (Week 8)

### 🛠️ AI-Powered Tools (Enhanced from Existing API Structure)
**Priority: HIGH**
- [ ] **Assignment Generator Tools**
  - AI-powered content creation with OpenAI integration
  - Vocabulary list generation
  - Question creation from text/video
  - Difficulty level adjustment
  - DALL-E image generation for custom content

- [ ] **Advanced Language Tools**
  - Grammar analysis API integration
  - Text-to-speech with multiple voices
  - Pronunciation trainer with real-time feedback
  - Language confidence assessment integration

### 💬 Vector Chat System (Port Existing)
- [ ] **AI Chat Integration**
  - N8N webhook-based intelligent chat system
  - Context-aware responses with assignment data
  - Multi-language support with localStorage persistence
  - Chart rendering capabilities (line, bar, pie charts)

- [ ] **Enhanced Chat Features**
  - Markdown support with custom renderers
  - Table rendering with custom components
  - Real-time language switching
  - Chat history and search functionality

### 📱 **PWA Features (Enhance Existing)**
- [ ] **Advanced PWA Implementation**
  - Complete manifest with proper icon paths
  - Service worker for offline functionality
  - Background sync for assignment progress
  - Push notifications for assignment updates

- [ ] **Mobile Optimization**
  - Touch-friendly interface
  - Offline capability for assignments
  - App-like experience with native feel
  - Portrait-optimized layout

**Deliverables:**
- ✅ AI-powered content generation tools
- ✅ Vector chat system with chart rendering
- ✅ Enhanced PWA functionality
- ✅ Advanced language assessment tools

---

## 📊 Phase 9: Analytics & Reporting (Week 9)

### 📈 Advanced Analytics Dashboard
**Priority: HIGH**
- [ ] **Real-time Metrics**
  - Live completion rates
  - Performance trends
  - System usage analytics
  - Alert system for issues

- [ ] **Interactive Visualizations**
  - Recharts/D3.js integration
  - Drill-down capabilities
  - Custom date ranges
  - Comparative analysis tools

- [ ] **Custom Reports**
  - Teacher performance reports
  - Student progress reports
  - Class comparison analysis
  - Parent summary reports

### 📋 Data Export & Integration
- [ ] **Export Functionality**
  - PDF report generation
  - CSV data export
  - API endpoints for external tools
  - Scheduled report delivery

- [ ] **Integration APIs**
  - LMS integration capabilities
  - Third-party analytics tools
  - Parent portal access
  - Mobile app API support

**Deliverables:**
- ✅ Comprehensive analytics system
- ✅ Custom reporting tools
- ✅ Data export capabilities
- ✅ Integration API endpoints

---

## 🔧 Phase 10: Performance & Polish (Week 10)

### ⚡ Performance Optimization
**Priority: HIGH**
- [ ] **Image Optimization**
  - Next.js Image component implementation
  - CDN integration for media files
  - Lazy loading and compression
  - WebP format support

- [ ] **Caching Strategy**
  - Redis integration for API caching
  - Browser caching optimization
  - Service worker implementation
  - Static asset optimization

- [ ] **Code Splitting**
  - Route-based code splitting
  - Component lazy loading
  - Bundle size optimization
  - Performance monitoring

### 🎨 UI/UX Polish
- [ ] **Design System Completion**
  - Complete shadcn/ui integration
  - Custom theme implementation
  - Dark/light mode support
  - Accessibility improvements

- [ ] **User Experience**
  - Loading states optimization
  - Error handling improvements
  - Smooth transitions and animations
  - Mobile responsiveness testing

### 🧪 Testing & Quality Assurance
- [ ] **Testing Suite**
  - Unit tests for components
  - Integration tests for workflows
  - E2E tests for critical paths
  - Performance testing

**Deliverables:**
- ✅ Optimized performance metrics
- ✅ Complete design system
- ✅ Comprehensive testing suite
- ✅ Production-ready application

---

## 🛠️ **Phase 11: Admin Panel Architecture (Week 11)**

### 🏗️ **Separate Admin Application**
**Priority: HIGH - Critical Discovery**
- [ ] **Independent Admin App Setup**
  - Separate Next.js application for administrative functions
  - Shared component library with main application
  - Independent deployment pipeline
  - Admin-specific authentication and authorization

### 🗄️ **Infrastructure Management**
- [ ] **Database Management Interface**
  - Live database schema editing
  - Migration tools and version control
  - Data backup and restore functionality
  - Performance monitoring and optimization

- [ ] **Deployment Management**
  - Client deployment automation
  - Environment configuration management
  - Server resource monitoring
  - Application health checks

### 👥 **Multi-tenant Client Management**
- [ ] **Client Deployment System**
  - Individual client environments
  - Customizable branding and configuration
  - Resource allocation and scaling
  - Client-specific feature flags

- [ ] **System Administration Tools**
  - User management across all clients
  - System-wide analytics and reporting
  - Security monitoring and audit logs
  - License and subscription management

**Deliverables:**
- ✅ Separate admin application architecture
- ✅ Infrastructure management tools
- ✅ Multi-tenant deployment system
- ✅ Advanced administration capabilities

---

## 🔄 Development Workflow (Updated)

### 🛠️ Tools & Technologies
- **Framework**: Next.js 15 with App Router
- **UI Library**: shadcn/ui + Tailwind CSS (Component-based Architecture)
- **State Management**: Zustand + React Query
- **Audio Processing**: Web Audio API + MediaRecorder (475-line hook implementation)
- **Charts**: Recharts + D3.js (with existing chart renderer patterns)
- **AI Integration**: OpenAI GPT-4o + Language Confidence API + N8N workflows
- **Gamification**: Canvas-based games + Sprite evolution system
- **PWA**: Service Worker + Complete manifest + Offline support
- **Testing**: Jest + Playwright + Testing Library
- **Performance**: Lighthouse + Web Vitals

### 📅 Timeline Summary (Updated)
- **Phase 1**: Authentication & shadcn/ui Setup (Week 1)
- **Phase 2**: User Management with Gamification (Week 2) 
- **Phase 3**: Class Management with Charts (Week 3)
- **Phase 4-5**: Assignment System with AI Evaluation (Weeks 4-5)
- **Phase 6-7**: Assessment Experience with Audio & Gamification (Weeks 6-7)
- **Phase 8**: AI Tools & Vector Chat Integration (Week 8)
- **Phase 9**: Analytics & Reporting (Week 9)
- **Phase 10**: Performance & Polish (Week 10)
- **Phase 11**: Admin Panel Architecture (Week 11)

**Total Estimated Timeline: 11 weeks**

---

## 🎉 Final Goal (Enhanced)

Create a **sophisticated, AI-powered language learning platform** that:
- ✅ **Exceeds current implementation** with shadcn/ui component architecture
- ✅ **Advanced AI Integration** with OpenAI GPT-4o and Language Confidence API
- ✅ **Professional Audio System** with 475-line recording hook and real-time evaluation
- ✅ **Interactive Gamification** with DinoGame and sprite evolution
- ✅ **Vector Chat System** with chart rendering and multi-language support
- ✅ **Comprehensive PWA** with offline functionality and native app experience
- ✅ **Sophisticated Assessment Engine** with rule-based evaluation and preview modes
- ✅ **Separate Admin Architecture** for infrastructure and multi-tenant management
- ✅ **Enterprise-grade Performance** with optimized caching and mobile experience

**Key Differentiators:**
- 🎯 **AI-Powered Assessment** with phoneme-level pronunciation feedback
- 🎮 **Interactive Gamification** with physics-based games and achievements
- 💬 **Intelligent Chat System** with context-aware responses and chart generation
- 🎤 **Professional Audio Recording** with noise suppression and real-time analysis
- 🏗️ **Scalable Architecture** with shadcn/ui components and multi-tenant capabilities

---

## 🔗 Technical Implementation Notes (Enhanced from Existing Patterns)

### 📁 **S3/MinIO Integration Strategy (Enhanced)**
```typescript
// Advanced file upload with caching and optimization (from existing patterns)
const uploadFile = async (file: File) => {
  // Client-side compression with multiple format support
  const compressed = await compressImage(file, {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080
  });
  
  // Upload to S3/MinIO with proxy fallback
  const uploadUrl = await getPresignedUrl({
    fileType: file.type,
    fileName: file.name,
    userId: session.user.id
  });
  
  const result = await uploadToS3(compressed, uploadUrl);
  
  // Generate CDN URLs with proxy fallback for different sizes
  return {
    original: result.url,
    thumbnail: `/api/proxy-image?url=${encodeURIComponent(result.url)}&w=150&h=150`,
    medium: `/api/proxy-image?url=${encodeURIComponent(result.url)}&w=500&h=500`,
    large: `/api/proxy-image?url=${encodeURIComponent(result.url)}&w=1200&h=800`,
  };
};
```

### 🎤 **Audio Recording Implementation (Advanced Hook Pattern)**
```typescript
// Professional audio recorder with full feature set (475-line implementation)
const AudioRecorderHook = {
  setup: () => {
    const {
      isRecording,
      isProcessing,
      audioLevel,
      isSpeaking,
      toggleRecording,
      resetRecording
    } = useAudioRecorder({
      languageCode: assignment?.language?.code,
      onTranscriptionStart: () => setShowFeedback(false),
      onTranscriptionComplete: (transcript) => {
        submitTranscript(capitalizeSentence(transcript));
      },
      onTranscriptionError: (error) => {
        console.error("Recording error:", error);
        alert(error.message || "Error recording audio");
      }
    });
    
    return { isRecording, audioLevel, toggleRecording };
  },
  
  processAudio: async (audioBlob: Blob) => {
    // Multiple format support with fallbacks
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    
    if (languageCode) {
      const iso639Code = languageCode.split(/[-/]/)[0];
      formData.append('language', iso639Code);
    }
    
    const response = await fetch('/api/transcribe-audio', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }
};
```

### 🤖 **AI Evaluation Engine (Rule-Based System)**
```typescript
// Advanced AI evaluation with custom rules (from existing API patterns)
const AIEvaluationEngine = {
  evaluateAnswer: async (answer: string, imageUrl: string, assignment: Assignment) => {
    const response = await fetch('/api/evaluate-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer: capitalizeSentence(answer),
        imageUrl: imageUrl,
        language: assignment.language,
        evaluationSettings: {
          type: assignment.evaluationSettings.type,
          customPrompt: assignment.evaluationSettings.customPrompt,
          rules: assignment.evaluationSettings.rules,
          feedbackSettings: {
            detailedFeedback: true,
            encouragementEnabled: true
          }
        },
        topic: assignment.topic
      })
    });
    
    const {
      feedback,
      isCorrect,
      details,
      encouragement,
      ruleEvaluation
    } = await response.json();
    
    return {
      isCorrect,
      feedback,
      details,
      encouragement,
      ruleEvaluation // Object with rule-specific feedback
    };
  }
};
```

### 🎮 **Gamification System (Canvas-Based Games)**
```typescript
// DinoGame integration with physics engine (775-line implementation)
const GameSystem = {
  initDinoGame: (canvasRef: RefObject<HTMLCanvasElement>) => {
    const game = new DinoGame({
      canvas: canvasRef.current,
      onGameOver: (score: number) => {
        // Update student progress and sprite evolution
        updateGameScore(score);
        checkSpriteEvolution();
      },
      scaleFactor: canvasRef.current.width / 800,
      physics: {
        gravity: 0.3,
        jumpStrength: -10,
        gameSpeed: 3
      }
    });
    
    return game;
  },
  
  evolveSprite: async (studentId: string, performance: Performance) => {
    const { evolve } = useStudentSprite(studentId);
    
    if (performance.allCorrect && performance.allComplete) {
      fireConfetti(); // Canvas confetti celebration
      await evolve();
      await updatePlayGameFlag(studentId, true);
    }
  }
};
```

### 💬 **Vector Chat with Chart Rendering**
```typescript
// Advanced chat system with chart rendering capabilities
const VectorChatSystem = {
  sendMessage: async (message: string, language: string) => {
    const messageWithLanguage = `Respond in ${language}: ${message}`;
    
    const response = await fetch(`${N8N_BASE_URL}/webhook/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': process.env.NEXT_PUBLIC_N8N_API_KEY
      },
      body: JSON.stringify({ message: messageWithLanguage })
    });
    
    return response.json();
  },
  
  renderCharts: (content: string) => {
    // Parse chart data from markdown
    const chartRegex = /```chart\s*([\s\S]*?)```/g;
    const chartMatches = content.match(chartRegex);
    
    return chartMatches?.map((match, index) => {
      const chartData = JSON.parse(match.replace(/```chart|```/g, ''));
      return (
        <ChartRenderer
          key={index}
          data={chartData.data}
          type={chartData.type}
          title={chartData.title}
        />
      );
    });
  }
};
```

### 📊 **Real-time Updates with Advanced Patterns**
```typescript
// Enhanced real-time updates with progress tracking
const useRealTimeUpdates = (assignmentId: string, studentId: string) => {
  const [progress, setProgress] = useState<AssignmentProgress>();
  
  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      if (update.type === 'assignment_progress' && 
          update.assignmentId === assignmentId &&
          update.studentId === studentId) {
        setProgress(update.progress);
        
        // Trigger sprite evolution check
        if (update.progress.isComplete && update.progress.allCorrect) {
          triggerSpriteEvolution(studentId);
        }
      }
    };
    
    return () => ws.close();
  }, [assignmentId, studentId]);
  
  return progress;
};
```

### 🏗️ **shadcn/ui Component Implementation Pattern**
```typescript
// Component architecture using shadcn/ui components
const ShadcnUIPatterns = {
  // Base shadcn/ui components
  baseComponents: {
    Button: (props) => <Button variant="default" {...props} />,
    Input: (props) => <Input className="w-full" {...props} />,
    Card: (props) => <Card className="p-4" {...props} />
  },
  
  // Custom components built with shadcn/ui
  customComponents: {
    UserCard: ({ user, onEdit, onDelete }) => (
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={user.customImage} />
            <AvatarFallback>{user.username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">{user.username}</h3>
            <Badge variant="secondary">{user.role}</Badge>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" onClick={onEdit}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
          </div>
        </div>
      </Card>
    ),
    
    StatCard: ({ title, value, trend, icon, description }) => (
      <Card className="p-6">
        <div className="flex items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="ml-auto">
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <div className="flex items-center pt-1">
              <Badge variant={trend > 0 ? "default" : "destructive"}>
                {trend > 0 ? "+" : ""}{trend}%
              </Badge>
            </div>
          )}
        </div>
      </Card>
    ),
    
    AssignmentCard: ({ assignment, onEdit, onDelete, onPreview }) => (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{assignment.topic}</h3>
              <p className="text-sm text-muted-foreground">{assignment.type}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onPreview}>Preview</DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <Badge variant="outline">{assignment.language}</Badge>
            <span className="text-muted-foreground">
              {assignment.completedStudents}/{assignment.totalStudents} completed
            </span>
          </div>
          <Progress value={(assignment.completedStudents / assignment.totalStudents) * 100} />
        </div>
      </Card>
    )
  },
  
  // Page layouts using shadcn/ui
  layouts: {
    DashboardLayout: ({ children, header, sidebar }) => (
      <div className="flex h-screen">
        {sidebar}
        <div className="flex-1 flex flex-col">
          {header}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    ),
    
    AssignmentLayout: ({ children, breadcrumbs, actions }) => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Breadcrumb>
            {breadcrumbs}
          </Breadcrumb>
          <div className="flex space-x-2">
            {actions}
          </div>
        </div>
        <div className="grid gap-6">
          {children}
        </div>
      </div>
    )
  }
};
```

---

## 🎯 Success Metrics

### 📈 Performance Targets
- **Page Load Time**: < 2 seconds
- **Audio Recording Latency**: < 100ms
- **API Response Time**: < 500ms
- **Mobile Performance Score**: > 90
- **Accessibility Score**: > 95

### 💡 User Experience Goals
- **Intuitive Navigation**: < 3 clicks to any feature
- **Assignment Completion Rate**: > 85%
- **User Satisfaction**: > 4.5/5 rating
- **Mobile Usage**: Support for 95% of devices

---

## 🎉 Final Goal

Create a **modern, performant, and user-friendly** language learning platform that:
- ✅ Exceeds the current Strapi-based implementation
- ✅ Provides seamless audio recording and AI integration
- ✅ Offers superior mobile experience
- ✅ Maintains high performance with optimized caching
- ✅ Delivers comprehensive analytics and reporting
- ✅ Supports all current features with improved UX 

## ✅ **COMPLETED: Phase 1: Authentication & Core Layout**

### 🔐 Authentication System ✅
**Priority: CRITICAL** - **COMPLETED**
- ✅ **Login/Logout Pages**
  - NextAuth integration with custom providers
  - Role-based redirect logic (Admin → Dashboard, Others → Profile)
  - Modern UI with shadcn/ui components
  - Mobile-responsive design

- ✅ **Session Management** 
  - Protected route middleware with role-based access control
  - Role-based access control (Admin-only dashboard)
  - Session persistence and refresh tokens
  - Loading states and error handling

- ✅ **Password Reset Flow**
  - Forgot password functionality
  - Email verification system
  - Secure token generation

### 🏗️ **shadcn/ui Component Setup** ✅
- ✅ **Component Library Enhancement**
  - Official shadcn/ui sidebar component integration
  - Consistent theming and design tokens
  - Component documentation and usage patterns

### 🏗️ Core Layout Structure ✅
- ✅ **Conditional Navigation**
  - Role-based menu system using shadcn/ui Sidebar components
  - Sidebar only visible for authenticated users on protected routes
  - Global navigation in root layout.tsx with ConditionalLayout wrapper
  - User avatar with dropdown using shadcn/ui DropdownMenu
  - Mobile-responsive collapsible design

- ✅ **Clean Public Experience**
  - Landing page and auth pages without sidebar interference
  - Proper layout separation for public vs authenticated routes
  - Professional UI with shadcn/ui components

- ✅ **Profile Pages**
  - Role-specific profile pages for Teachers, Students, Parents
  - Quick stats and actions based on user role
  - Professional UI with shadcn/ui components

- ✅ **Access Control**
  - Middleware protecting dashboard routes (Admin-only)
  - Automatic redirection for unauthorized access
  - Role-based navigation menu filtering

**✅ Deliverables - COMPLETED:**
- ✅ Working authentication flow with role-based redirection
- ✅ Protected routes with admin-only dashboard access
- ✅ Global navigation system using official shadcn/ui components
- ✅ Role-specific profile pages for all user types
- ✅ Comprehensive middleware for route protection 