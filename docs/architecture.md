# IGCSE Student Guide Application Architecture

This document outlines the architecture of the IGCSE Student Guide web application, a comprehensive learning platform for IGCSE Grade 9-10 students.

## Application Overview

The IGCSE Student Guide is a modern, responsive web application targeted at IGCSE Grade 9-10 students to improve learning, engagement, and retention through interactive study tools. It provides features such as flashcards, quizzes, subject content, and progress tracking.

## Tech Stack

- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: Supabase (Authentication, PostgreSQL Database, Storage)
- **Deployment**: Vercel or Netlify (planned)
- **Content Generation**: OpenAI integration (planned)

## Architecture Diagram

```mermaid
graph TD
    %% Main Application Structure
    User(User) --> FrontEnd
    
    %% Frontend Components
    subgraph FrontEnd["Frontend (React + TypeScript)"]
        App[App.tsx] --> Router[React Router]
        Router --> AuthRoutes[Auth Routes]
        Router --> ProtectedRoutes[Protected Routes]
        
        %% Auth Routes
        AuthRoutes --> LoginPage[Login Page]
        AuthRoutes --> AuthCallback[Auth Callback]
        
        %% Protected Routes
        ProtectedRoutes --> Dashboard[Dashboard Page]
        ProtectedRoutes --> Subjects[Subjects Page]
        ProtectedRoutes --> Flashcards[Flashcards Page]
        ProtectedRoutes --> Quizzes[Quizzes Page]
        
        %% Components
        subgraph Components["UI Components"]
            %% Layout Components
            LayoutComp[Layout Components] --> AppShell
            LayoutComp --> Navbar
            LayoutComp --> Footer
            
            %% Auth Components
            AuthComp[Auth Components] --> LoginForm
            AuthComp --> AuthContext
            
            %% Study Components
            StudyComp[Study Components] --> SubjectCard
            StudyComp --> TopicList
            StudyComp --> ContentViewer
            StudyComp --> FlashcardComponent
            StudyComp --> QuizInterface
            
            %% Dashboard Components
            DashboardComp[Dashboard Components] --> ProgressChart
            DashboardComp --> StudyStreakTracker
            DashboardComp --> RecentActivityFeed
            DashboardComp --> PerformanceMetrics
        end
        
        %% Styling
        TailwindCSS[Tailwind CSS] --> Components
    end
    
    %% Backend Services
    subgraph BackEnd["Backend (Supabase)"]
        %% Auth Services
        Auth[Authentication] --> MagicLink[Magic Link Auth]
        Auth --> EmailPassword[Email/Password Auth]
        Auth --> Session[Session Management]
        
        %% Database
        Database[PostgreSQL Database] --> Tables
        Tables --> SubjectsTable[Subjects]
        Tables --> TopicsTable[Topics]
        Tables --> FlashcardsTable[Flashcards]
        Tables --> QuizzesTable[Quizzes]
        Tables --> UserProgressTable[User Progress]
        
        %% Storage
        Storage[Supabase Storage] --> ContentAssets[Content Assets]
        Storage --> UserAssets[User Assets]
        
        %% Functions
        Functions[Database Functions] --> RLS[Row Level Security]
        Functions --> ProgressTracking[Progress Tracking]
    end
    
    %% LLM Integration
    subgraph LLMIntegration["LLM Integration (OpenAI)"]
        LLMService[LLM Service] --> ContentGeneration[Content Generation]
        ContentGeneration --> SubjectGen[Subject Generation]
        ContentGeneration --> TopicGen[Topic Generation]
        ContentGeneration --> FlashcardGen[Flashcard Generation]
        ContentGeneration --> QuizGen[Quiz Generation]
    end
    
    %% Connections between components
    FrontEnd <--> BackEnd
    FrontEnd <--> LLMIntegration
    
    %% Data Flow
    Database --> FrontEnd
    Auth --> ProtectedRoutes
    
    %% Deployment
    Deployment[Deployment: Vercel/Netlify] --> FrontEnd
```

## Component Details

### Frontend Components

#### Layout Components
- **AppShell**: Main layout wrapper with responsive design
- **Navbar**: Navigation bar with auth state management
- **Footer**: Page footer with links and contact information

#### Authentication Components
- **LoginForm**: User authentication interface
- **AuthContext**: Global authentication state management
- **ProtectedRoute**: Route protection for authenticated users

#### Study Content Components
- **SubjectCard**: Display for subject information
- **TopicList**: Navigation for topics within subjects
- **ContentViewer**: Display for educational content with Markdown support
- **FlashcardComponent**: Interactive flashcard system with flip animation
- **QuizInterface**: Interactive quiz system with scoring

#### Dashboard Components
- **ProgressChart**: Visual representation of learning progress
- **StudyStreakTracker**: Track consecutive days of study
- **RecentActivityFeed**: Display recent learning activities
- **PerformanceMetrics**: Show performance statistics

### Backend Services (Supabase)

#### Authentication
- Magic link authentication (implemented)
- Email/password authentication (planned)
- Session management with token refresh

#### Database
- **Subjects Table**: Core subject information
- **Topics Table**: Topic content organized by subject
- **Flashcards Table**: Flashcard content by topic
- **Quizzes Table**: Quiz questions and answers by topic
- **User Progress Table**: Track user learning progress

#### Storage
- Content assets (images, diagrams)
- User assets (profile pictures, uploads)

#### Functions
- Row Level Security (RLS) for data protection
- Progress tracking functions

### LLM Integration (Planned)

- Integration with OpenAI for content generation
- Subject, topic, flashcard, and quiz generation
- Admin interface for content management

## Implementation Status

The application is currently approximately 45% complete:
- Authentication system is mostly implemented
- UI components and layout are complete
- Core content features are partially implemented
- Database schema and real data integration are pending
- Interactive features (flashcards, quizzes) are in development

## Future Enhancements

- Adaptive learning algorithm
- Advanced spaced repetition
- Collaborative study groups using Supabase real-time subscriptions
- Mobile app version
- Offline functionality with local storage sync
