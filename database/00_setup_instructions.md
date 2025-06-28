# IGCSE Student Guide - Database Setup Instructions

## Overview
This directory contains comprehensive SQL scripts to set up the complete database schema for the IGCSE Student Guide application using Supabase PostgreSQL.

## 📋 Prerequisites
1. **Supabase Project**: Create a new project at [supabase.com](https://supabase.com)
2. **Database Access**: Ensure you have admin access to your Supabase database
3. **SQL Editor**: Use Supabase SQL Editor or any PostgreSQL client

## 🚀 Quick Setup (Recommended)
Execute the `setup_all.sql` script in your Supabase SQL Editor for automatic setup.

## 📁 File Structure & Execution Order

### 1. `01_schema_tables.sql` - Core Database Schema
**Purpose**: Creates all main tables with proper relationships
**Contains**:
- User profiles table (extends Supabase auth)
- Subjects and topics hierarchy
- Flashcards with spaced repetition fields
- Quizzes and questions
- User progress tracking tables
- Study session analytics

**Key Features**:
- UUID primary keys for all tables
- Proper foreign key relationships
- Check constraints for data validation
- JSONB fields for flexible data storage
- Timestamp tracking for all records

### 2. `02_indexes_constraints.sql` - Performance Optimization
**Purpose**: Adds indexes and constraints for optimal performance
**Contains**:
- Performance indexes for common queries
- Full-text search indexes
- Composite indexes for complex queries
- Additional data validation constraints
- Partial indexes for specific use cases

**Benefits**:
- Fast query performance
- Efficient spaced repetition queries
- Full-text search capabilities
- Data integrity enforcement

### 3. `03_rls_policies.sql` - Security & Access Control
**Purpose**: Implements Row Level Security for data protection
**Contains**:
- User-specific data access policies
- Public read access for educational content
- Admin policies for content management
- Helper functions for policy logic

**Security Features**:
- Users can only access their own progress data
- Public read access for subjects/topics/flashcards/quizzes
- Admin role support for content management
- JWT-based authentication integration

### 4. `04_functions_triggers.sql` - Business Logic & Automation
**Purpose**: Implements core application logic in the database
**Contains**:
- Spaced repetition algorithm (SM-2)
- Progress calculation functions
- Study streak tracking
- Dashboard analytics functions
- Automatic triggers for data updates

**Key Functions**:
- `update_flashcard_progress()` - Updates spaced repetition data
- `calculate_topic_progress()` - Calculates completion percentages
- `get_user_study_streak()` - Tracks consecutive study days
- `get_user_dashboard_stats()` - Returns dashboard metrics

### 5. `05_sample_data.sql` - Test Data
**Purpose**: Populates database with realistic sample data
**Contains**:
- 6 IGCSE subjects (Math, Physics, Chemistry, Biology, English, History)
- Multiple topics per subject with markdown content
- Sample flashcards with various difficulty levels
- Sample quizzes with multiple choice questions
- Proper foreign key relationships

## 🔧 Manual Setup Instructions

### Step 1: Create Tables
```sql
-- Execute in Supabase SQL Editor
\i 01_schema_tables.sql
```

### Step 2: Add Indexes and Constraints
```sql
\i 02_indexes_constraints.sql
```

### Step 3: Set Up Security Policies
```sql
\i 03_rls_policies.sql
```

### Step 4: Create Functions and Triggers
```sql
\i 04_functions_triggers.sql
```

### Step 5: Insert Sample Data
```sql
\i 05_sample_data.sql
```

## 🔍 Database Schema Overview

### Core Tables
- **user_profiles**: Extended user data with IGCSE-specific fields
- **subjects**: IGCSE subjects with metadata and styling
- **topics**: Hierarchical content organization
- **flashcards**: Individual cards for spaced repetition
- **quizzes**: Quiz metadata and configuration
- **quiz_questions**: Individual quiz questions

### Progress Tracking Tables
- **user_flashcard_progress**: Spaced repetition data per user/card
- **user_quiz_attempts**: Quiz attempt records and scores
- **user_topic_progress**: Aggregated progress per topic
- **user_study_sessions**: Session tracking for analytics

### Key Relationships
```
subjects (1) → (many) topics
topics (1) → (many) flashcards
topics (1) → (many) quizzes
quizzes (1) → (many) quiz_questions
users (1) → (many) user_flashcard_progress
users (1) → (many) user_quiz_attempts
users (1) → (many) user_topic_progress
```

## 🎯 Key Features Implemented

### 1. Spaced Repetition System
- **SM-2 Algorithm**: Scientifically proven spaced repetition
- **Automatic Scheduling**: Cards scheduled based on performance
- **Progress Tracking**: Detailed statistics per flashcard
- **Learning States**: Tracks learning vs. review phases

### 2. Progress Analytics
- **Topic Completion**: Percentage-based progress tracking
- **Study Streaks**: Consecutive day tracking
- **Performance Metrics**: Quiz scores and improvement tracking
- **Time Tracking**: Study session duration analytics

### 3. Content Management
- **Hierarchical Topics**: Subjects → Topics → Content
- **Markdown Support**: Rich text content storage
- **Difficulty Levels**: 1-5 scale for all content
- **Prerequisites**: Topic dependency tracking

### 4. Security & Performance
- **Row Level Security**: User data isolation
- **Optimized Indexes**: Fast query performance
- **Full-Text Search**: Content search capabilities
- **Data Validation**: Comprehensive constraints

## 🔐 Security Considerations

### Row Level Security (RLS)
- **Enabled** on all user-specific tables
- **Disabled** on public content tables (subjects, topics, etc.)
- **JWT Integration** with Supabase auth
- **Admin Role Support** for content management

### Access Patterns
- **Users**: Can only access their own progress data
- **Public Content**: All authenticated users can read
- **Admins**: Full access to all data (optional)

## 📊 Sample Data Included

### Subjects (6 total)
1. **Mathematics** - Algebra, Quadratic Equations
2. **Physics** - Forces & Motion, Electricity & Circuits
3. **Chemistry** - Atomic Structure
4. **Biology** - Cell Structure & Function
5. **English Language** - (ready for content)
6. **History** - (ready for content)

### Content Statistics
- **Topics**: 5 topics with full markdown content
- **Flashcards**: 10 flashcards across different subjects
- **Quizzes**: 2 practice quizzes
- **Questions**: 5 multiple choice questions with explanations

## 🚀 Next Steps After Setup

1. **Verify Installation**: Check that all tables exist
2. **Test Queries**: Run sample queries to verify functionality
3. **Update Application**: Connect your React app to the database
4. **Add Real Content**: Replace sample data with actual IGCSE content
5. **Configure Environment**: Update Supabase credentials in your app

## 🔧 Troubleshooting

### Common Issues
1. **Permission Errors**: Ensure you have admin access to Supabase
2. **RLS Conflicts**: Check that auth.uid() is available
3. **Function Errors**: Verify all dependencies are installed
4. **Index Conflicts**: Drop existing indexes if recreating

### Verification Queries
```sql
-- Check table creation
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%user_%';

-- Check sample data
SELECT COUNT(*) FROM public.subjects;
SELECT COUNT(*) FROM public.flashcards;

-- Test RLS
SELECT * FROM public.user_profiles; -- Should return empty for non-authenticated
```

## 📞 Support
For issues with the database setup, check:
1. Supabase documentation
2. PostgreSQL error logs
3. RLS policy conflicts
4. Function dependency issues

This schema provides a complete foundation for the IGCSE Student Guide application with all necessary features for spaced repetition learning, progress tracking, and user management.
