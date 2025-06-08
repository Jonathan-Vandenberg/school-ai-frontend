# School AI - Prisma Refactor

A modern education management system built with Next.js 14, Prisma, and PostgreSQL. This is a refactored version of the original Strapi-based application, now with improved architecture and backend-driven database operations.

## 🚨 Prerequisites

**IMPORTANT**: This project requires **Node.js >= 18.18.0**

Current detected version: 16.14.2 (incompatible)

Please upgrade Node.js before proceeding:
- **Recommended**: Node.js 20 LTS
- **Minimum**: Node.js 18.18.0

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with role-based access control
- **UI**: TailwindCSS + Radix UI components
- **State Management**: React Query/SWR (planned)
- **TypeScript**: Full type safety

### Database Schema
Comprehensive schema supporting:
- **Users**: Teachers, Admins, Students, Parents with role-based permissions
- **Classes & Assignments**: Flexible assignment system with class/individual targeting
- **Progress Tracking**: Detailed student progress on assignments and questions
- **Gamification**: Sprite evolution system for student engagement
- **File Management**: Upload system replacing Strapi uploads
- **Analytics**: Dashboard snapshots and statistical tracking

## 📁 Project Structure

```
school-ai/
├── prisma/
│   └── schema.prisma           # Database schema with all models
├── lib/
│   ├── db.ts                   # Database service layer with transactions
│   ├── auth.ts                 # NextAuth configuration
│   └── utils.ts                # Utility functions
├── src/
│   └── app/
│       └── api/
│           └── auth/           # Authentication endpoints
├── middleware.ts               # Role-based access control
├── env.example                 # Environment variables template
└── PLAN.md                     # Detailed migration plan
```

## 🚀 Getting Started

### 1. Upgrade Node.js
Ensure you have Node.js 18.18+ or 20 LTS installed:
```bash
node --version  # Should be >= 18.18.0
```

### 2. Install Dependencies
```bash
npm install prisma @prisma/client next-auth @next-auth/prisma-adapter bcryptjs @tanstack/react-query @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-toast lucide-react clsx tailwind-merge class-variance-authority
```

### 3. Environment Setup
```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/school_ai"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# OR run migrations (production)
npx prisma migrate dev
```

### 5. Start Development Server
```bash
npm run dev
```

## 🎯 Key Features

### Authentication & Authorization
- **NextAuth.js**: Secure authentication with role-based access
- **Custom Roles**: ADMIN, TEACHER, STUDENT, PARENT
- **Route Protection**: Middleware-based access control
- **Password Security**: Bcrypt hashing

### Database Operations
- **Prisma ORM**: Type-safe database operations
- **Transactions**: Automatic rollback on failures
- **Error Handling**: Comprehensive error management
- **Connection Pooling**: Optimized for performance

### User Management
- **Multi-Role System**: Support for different user types
- **Class Management**: Teachers can manage multiple classes
- **Student Progress**: Detailed tracking of assignment completion

### Assignment System
- **Flexible Types**: Class-wide or individual assignments
- **Multi-Media Support**: Text, images, videos, audio
- **Progress Tracking**: Question-level progress monitoring
- **IELTS Integration**: Specialized language assessment features

### Gamification
- **Sprite Evolution**: Student progression through sprite stages
- **Achievement System**: Progress-based rewards
- **Engagement Metrics**: Track student participation

## 📊 Database Models

### Core Models
- **User**: Multi-role user system with authentication
- **Class**: Group management for students and teachers
- **Assignment**: Flexible assignment system with evaluation settings
- **Question**: Individual questions within assignments
- **StudentAssignmentProgress**: Detailed progress tracking

### Supporting Models
- **ActivityLog**: Audit trail for all system activities
- **Language**: Multi-language support for assignments
- **Tool**: Admin tools and features
- **SpriteSet/StudentSprite**: Gamification system
- **UploadFile/UploadFolder**: File management system

## 🔄 Migration from Strapi

This project replaces a Strapi-based backend with:
- **Performance**: Direct database operations vs. GraphQL overhead
- **Type Safety**: Full TypeScript integration with Prisma
- **Transactions**: Proper ACID compliance for data integrity
- **Authentication**: Integrated NextAuth vs. external auth
- **File Handling**: Custom upload system vs. Strapi uploads

## 📋 Development Progress

See [PLAN.md](./PLAN.md) for detailed progress tracking.

**Phase 1**: ✅ Completed - Project setup and database schema
**Phase 2**: ✅ Completed - Core models and relationships  
**Phase 3**: 🔄 In Progress - Backend API development
**Phase 4**: ⏳ Pending - Frontend component migration

## 🤝 Contributing

1. Ensure Node.js >= 18.18.0
2. Follow the established TypeScript patterns
3. Use Prisma transactions for multi-step operations
4. Implement proper error handling
5. Add appropriate role-based access controls

## 📝 License

This project is part of the Japanese International School AI system.

---

**Next Steps**: Complete Node.js upgrade and proceed with dependency installation to continue development.
# school-ai-frontend
