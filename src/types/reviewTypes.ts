/**
 * Content review system types
 */

export enum ReviewState {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
}

export enum ContentType {
  TOPIC = 'topic',
  FLASHCARD = 'flashcard',
  QUIZ = 'quiz',
  QUIZ_QUESTION = 'quiz_question',
  EXAM_PAPER = 'exam_paper',
}

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  CONTENT_REVIEWER = 'content_reviewer',
  ADMIN = 'admin',
}

export interface ReviewDecision {
  contentType: ContentType;
  contentId: string;
  newState: ReviewState;
  reviewNotes?: string;
  chemistryValidation?: any;
}

export interface ReviewResult {
  success: boolean;
  error?: Error;
  historyId?: string;
}

export interface ReviewerProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface ReviewHistoryRecord {
  id: string;
  content_type: ContentType;
  content_id: string;
  previous_state: ReviewState;
  new_state: ReviewState;
  reviewer_id: string | null;
  review_notes: string | null;
  created_at: string;
  chemistry_validation_results?: any;
  review_version?: number;
  reviewer: ReviewerProfile | null;
}

export interface ReviewFilters {
  contentType?: ContentType;
  reviewState?: ReviewState;
  reviewerId?: string;
  subjectId?: string;
  topicId?: string;
  searchTerm?: string;
}

export interface PendingReview {
  id: string;
  title: string;
  created_at: string;
  contentType: ContentType;
  review_state: ReviewState;

  // Content-specific fields for validation and display
  description?: string;
  front_content?: string;
  back_content?: string;
  question_text?: string;
  options?: string; // Assuming JSON string

  // Relational data for context
  subject: { name: string } | null;
  topic: { title: string; subject: { name: string } } | null;
  quiz: { title: string; topic: { title: string; subject: { name: string } } } | null;
}

export interface ReviewStats {
  totalPendingReview: number;
  totalApproved: number;
  totalRejected: number;
  totalNeedsRevision: number;
  byContentType: {
    [key in ContentType]: {
      pending: number;
      approved: number;
      rejected: number;
      needsRevision: number;
    };
  };
}

