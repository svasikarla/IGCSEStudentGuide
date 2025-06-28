import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import reviewService from '../services/reviewService.fixed';
import { 
  ReviewState, 
  ContentType, 
  ReviewDecision, 
  ReviewResult, 
  ReviewHistoryRecord,
  ReviewFilters,
  ReviewStats,
  ReviewerProfile,
  UserRole,
  PendingReview
} from '../types/reviewTypes';

// Define the context shape
interface ReviewContextType {
  // State
  pendingReviews: PendingReview[];
  reviewStats: ReviewStats | null;
  reviewers: ReviewerProfile[];
  selectedContentType: ContentType | null;
  selectedReviewState: ReviewState | null;
  isReviewer: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  submitReview: (decision: ReviewDecision) => Promise<ReviewResult>;
  getReviewHistory: (contentType: ContentType, contentId: string) => Promise<ReviewHistoryRecord[]>;
  fetchPendingReviews: (filters?: ReviewFilters) => Promise<void>;
  fetchReviewStats: () => Promise<void>;
  fetchReviewers: () => Promise<void>;
  setSelectedContentType: (type: ContentType | null) => void;
  setSelectedReviewState: (state: ReviewState | null) => void;
  refreshReviewData: () => Promise<void>;
  
  // New actions for content submission workflow
  submitForReview: (contentType: ContentType, contentId: string) => Promise<ReviewResult>;
  getContentReviewState: (contentType: ContentType, contentId: string) => Promise<ReviewState | null>;
}

// Create the context with a default value
const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

// Provider component
export const ReviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session, user } = useAuth();
  
  // State
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewers, setReviewers] = useState<ReviewerProfile[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [selectedReviewState, setSelectedReviewState] = useState<ReviewState | null>(ReviewState.PENDING_REVIEW);
  const [isReviewer, setIsReviewer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Check if current user has reviewer permissions
  useEffect(() => {
    if (user && (user as any).user_role) {
      setIsReviewer(
        (user as any).user_role === UserRole.CONTENT_REVIEWER || 
        (user as any).user_role === UserRole.ADMIN ||
        (user as any).user_role === UserRole.TEACHER
      );
    }
  }, [user]);
  
  // Fetch initial data when authenticated
  useEffect(() => {
    if (session) {
      fetchPendingReviews();
      fetchReviewStats();
      fetchReviewers();
    }
  }, [session]);

  // Submit a review decision
  const submitReview = async (decision: ReviewDecision): Promise<ReviewResult> => {
    setIsLoading(true);
    try {
      const result = await reviewService.submitReview(decision);
      if (result.success) {
        await refreshReviewData();
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error submitting review'));
      return { success: false, error: new Error('Error submitting review') };
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to normalize reviewer data
  const normalizeReviewerData = (records: any[]): ReviewHistoryRecord[] => {
    return records.map(record => {
      if (record.reviewer && Array.isArray(record.reviewer) && record.reviewer.length > 0) {
        // If reviewer is an array, take the first item
        return {
          ...record,
          reviewer: {
            id: record.reviewer[0].id,
            full_name: record.reviewer[0].full_name,
            email: record.reviewer[0].email,
            user_role: record.reviewer[0].user_role || 'content_reviewer' // Default role if missing
          }
        };
      }
      return record;
    });
  };

  // Get review history for a content item
  const getReviewHistory = async (contentType: ContentType, contentId: string): Promise<ReviewHistoryRecord[]> => {
    setIsLoading(true);
    try {
      const data = await reviewService.getReviewHistory(contentType, contentId);
      return normalizeReviewerData(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching review history'));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch pending reviews with optional filters
  const fetchPendingReviews = async (filters?: ReviewFilters): Promise<void> => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      // Apply selected filters if not provided in the params
      const appliedFilters: ReviewFilters = filters || {};
      if (!filters?.contentType && selectedContentType) {
        appliedFilters.contentType = selectedContentType;
      }
      if (!filters?.reviewState && selectedReviewState) {
        appliedFilters.reviewState = selectedReviewState;
      }
      
      const reviews = await reviewService.getPendingReviews(appliedFilters);
      setPendingReviews(reviews);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching pending reviews'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch review statistics
  const fetchReviewStats = async (): Promise<void> => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      const stats = await reviewService.getReviewStats();
      setReviewStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching review statistics'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reviewers (users with reviewer or admin role)
  const fetchReviewers = async (): Promise<void> => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      const reviewersData = await reviewService.getReviewers();
      setReviewers(reviewersData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching reviewers'));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all review data
  const refreshReviewData = async (): Promise<void> => {
    await Promise.all([
      fetchPendingReviews(),
      fetchReviewStats()
    ]);
  };

  // Submit content for review
  const submitForReview = async (contentType: ContentType, contentId: string): Promise<ReviewResult> => {
    setIsLoading(true);
    try {
      const decision: ReviewDecision = {
        contentType,
        contentId,
        newState: ReviewState.PENDING_REVIEW
      };
      const result = await reviewService.submitForReview(contentType, contentId);
      if (result.success) {
        await refreshReviewData();
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error submitting content for review'));
      return { success: false, error: new Error('Error submitting content for review') };
    } finally {
      setIsLoading(false);
    }
  };

  // Get the review state of a specific content item
  const getContentReviewState = async (contentType: ContentType, contentId: string): Promise<ReviewState | null> => {
    setIsLoading(true);
    try {
      const state = await reviewService.getContentReviewState(contentType, contentId);
      return state;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching content review state'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Value object for the context provider
  const value: ReviewContextType = {
    pendingReviews,
    reviewStats,
    reviewers,
    selectedContentType,
    selectedReviewState,
    isReviewer,
    isLoading,
    error,
    submitReview,
    getReviewHistory,
    fetchPendingReviews,
    fetchReviewStats,
    fetchReviewers,
    setSelectedContentType,
    setSelectedReviewState,
    refreshReviewData,
    submitForReview,
    getContentReviewState
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
};

// Custom hook for using the review context
export const useReview = (): ReviewContextType => {
  const context = useContext(ReviewContext);
  if (context === undefined) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
};

export default ReviewContext;
