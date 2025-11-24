import { supabase } from '../lib/supabase';
import { 
  ContentType, 
  ReviewState, 
  ReviewDecision, 
  ReviewResult,
  ReviewHistoryRecord,
  ReviewFilters,
  ReviewStats,
  ReviewerProfile,
  PendingReview,
  UserRole
} from '../types/reviewTypes';

/**
 * Service for handling content review operations
 */
export const reviewService = {
  /**
   * Submit a review decision for a content item
   * @param decision The review decision details
   * @returns The result of the review operation
   */
  async submitReview(decision: ReviewDecision): Promise<ReviewResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('update_content_review_state', {
        p_content_type: decision.contentType,
        p_content_id: decision.contentId,
        p_new_state: decision.newState,
        p_reviewer_id: user.id,
        p_review_notes: decision.reviewNotes || null,
        p_chemistry_validation: decision.chemistryValidation || null,
      });

      if (error) {
        console.error('Error submitting review:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, historyId: data as string };
    } catch (err) {
      console.error('Unexpected error in submitReview:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err : new Error('Unknown error occurred') 
      };
    }
  },

  /**
   * Get review history for a specific content item
   * @param contentType The type of content
   * @param contentId The ID of the content
   * @returns An array of review history records
   */
  async getReviewHistory(contentType: ContentType, contentId: string): Promise<ReviewHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('content_review_history')
        .select(`
          id,
          content_type,
          content_id,
          previous_state,
          new_state,
          reviewer_id,
          review_notes,
          created_at,
          chemistry_validation_results,
          review_version,
          reviewer:reviewer_id (
            id,
            full_name,
            email,
            user_role
          )
        `)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('review_version', { ascending: true });

      if (error) {
        console.error('Error fetching review history:', error);
        return [];
      }

      const formattedData = (data || []).map((item): ReviewHistoryRecord => {
        let reviewerData: ReviewerProfile | null = null;
        if (item.reviewer) {
          const reviewer = Array.isArray(item.reviewer) ? item.reviewer[0] : item.reviewer;
          if (reviewer) {
            reviewerData = {
              id: reviewer.id,
              full_name: reviewer.full_name,
              email: reviewer.email,
              role: reviewer.user_role as UserRole,
            };
          }
        }

        return {
          id: item.id,
          content_type: item.content_type,
          content_id: item.content_id,
          previous_state: item.previous_state,
          new_state: item.new_state,
          reviewer_id: item.reviewer_id,
          review_notes: item.review_notes,
          created_at: item.created_at,
          chemistry_validation_results: item.chemistry_validation_results,
          review_version: item.review_version,
          reviewer: reviewerData,
        };
      });

      return formattedData;
    } catch (err) {
      console.error('Unexpected error in getReviewHistory:', err);
      return [];
    }
  },

  /**
   * Get all pending review items with optional filtering
   * @param filters Optional filters for the pending review items
   * @returns An array of items that need review
   */
  async getPendingReviews(filters: ReviewFilters = {}): Promise<PendingReview[]> {
    try {
      const { data, error } = await supabase.rpc('get_pending_reviews', {
        p_content_type: filters.contentType || null,
        p_review_state: filters.reviewState || null,
        p_subject_id: filters.subjectId || null,
        p_topic_id: filters.topicId || null,
        p_search_term: filters.searchTerm || null
      });

      if (error) {
        console.error('Error fetching pending reviews:', error);
        return [];
      }
      
      return data as PendingReview[];
    } catch (err) {
      console.error('Unexpected error in getPendingReviews:', err);
      return [];
    }
  },

  /**
   * Get review statistics for dashboard
   * @returns Review statistics
   */
  async getReviewStats(): Promise<ReviewStats> {
    const initialStats: ReviewStats = {
      totalPendingReview: 0,
      totalApproved: 0,
      totalRejected: 0,
      totalNeedsRevision: 0,
      byContentType: {
        [ContentType.TOPIC]: { pending: 0, approved: 0, rejected: 0, needsRevision: 0 },
        [ContentType.FLASHCARD]: { pending: 0, approved: 0, rejected: 0, needsRevision: 0 },
        [ContentType.QUIZ]: { pending: 0, approved: 0, rejected: 0, needsRevision: 0 },
        [ContentType.QUIZ_QUESTION]: { pending: 0, approved: 0, rejected: 0, needsRevision: 0 },
        [ContentType.EXAM_PAPER]: { pending: 0, approved: 0, rejected: 0, needsRevision: 0 }
      }
    };

    try {
      console.log('🔄 UPDATED: Using get_generation_stats function');
      const { data, error } = await supabase.rpc('get_generation_stats', { days_back: 30 });

      if (error) {
        console.error('Error fetching generation statistics:', error);
        return initialStats;
      }

      if (!data) return initialStats;

      const stats = data.reduce((acc: ReviewStats, row: any) => {
        if (row.content_type in acc.byContentType) {
          acc.byContentType[row.content_type as ContentType] = {
            pending: row.pending_count || 0,
            approved: row.approved_count || 0,
            rejected: row.rejected_count || 0,
            needsRevision: row.needs_revision_count || 0,
          };
          acc.totalPendingReview += row.pending_count || 0;
          acc.totalApproved += row.approved_count || 0;
          acc.totalRejected += row.rejected_count || 0;
          acc.totalNeedsRevision += row.needs_revision_count || 0;
        }
        return acc;
      }, initialStats);
      
      return stats;
    } catch (err) {
      console.error('Unexpected error in getReviewStats:', err);
      return initialStats;
    }
  },
  
  /**
   * Get reviewers (users with reviewer or admin role)
   * @returns Array of reviewers
   */
  async getReviewers(): Promise<ReviewerProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, user_role')
        .in('user_role', ['content_reviewer', 'admin', 'teacher']);
      
      if (error) {
        console.error('Error fetching reviewers:', error);
        return [];
      }
      
      return (data || []).map(p => ({ ...p, role: p.user_role as UserRole }));
    } catch (err) {
      console.error('Unexpected error in getReviewers:', err);
      return [];
    }
  },
  
  /**
   * Submit content for review
   * @param contentType The type of content
   * @param contentId The ID of the content
   * @returns Result of the submission operation
   */
  async submitForReview(contentType: ContentType, contentId: string): Promise<ReviewResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('submit_for_review', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_user_id: user.id
      });
        
      if (error) {
        console.error(`Error submitting ${contentType} for review:`, error);
        return { success: false, error: new Error(error.message) };
      }
      
      return { success: true };
    } catch (err) {
      console.error('Unexpected error in submitForReview:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err : new Error('Unknown error occurred') 
      };
    }
  },
  
  /**
   * Get the current review state of a content item
   * @param contentType The type of content
   * @param contentId The ID of the content
   * @returns The review state or null if error
   */
  async getContentReviewState(contentType: ContentType, contentId: string): Promise<ReviewState | null> {
    try {
      const { data, error } = await supabase.rpc('get_content_review_state', {
        p_content_type: contentType,
        p_content_id: contentId
      });
        
      if (error) {
        console.error(`Error fetching ${contentType} review state:`, error);
        return null;
      }
      
      return data as ReviewState | null;
    } catch (err) {
      console.error('Unexpected error in getContentReviewState:', err);
      return null;
    }
  }
};

export default reviewService;
