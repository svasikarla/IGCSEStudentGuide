/**
 * Unified Review Workflow Hook
 *
 * Consolidates review submission logic that was duplicated across
 * QuizGeneratorForm, FlashcardGeneratorForm, and ExamPaperGeneratorForm.
 *
 * Usage:
 *   const { reviewState, isSubmitting, handleSubmit } = useReviewWorkflow(
 *     ContentType.QUIZ,
 *     generatedContent?.id
 *   );
 */

import { useState, useEffect, useCallback } from 'react';
import { useReview } from '../contexts/ReviewContext';
import { ContentType, ReviewState } from '../types/reviewTypes';
import { notify } from '../utils/notifications';

interface UseReviewWorkflowOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useReviewWorkflow = (
  contentType: ContentType,
  contentId?: string,
  options: UseReviewWorkflowOptions = {}
) => {
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitForReview, getContentReviewState } = useReview();

  // Fetch review state when content ID changes
  useEffect(() => {
    if (contentId) {
      fetchReviewState();
    } else {
      setReviewState(null);
    }
  }, [contentId]);

  const fetchReviewState = async () => {
    if (!contentId) return;

    try {
      const state = await getContentReviewState(contentType, contentId);
      setReviewState(state);
    } catch (error) {
      console.error('Error fetching review state:', error);
    }
  };

  /**
   * Submit content for review
   */
  const handleSubmit = useCallback(async () => {
    if (!contentId) {
      notify.error('Please generate and save content before submitting for review.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitForReview(contentType, contentId);

      // Update local state
      setReviewState(ReviewState.PENDING_REVIEW);

      // Show success notification
      const defaultMessage = `${getContentTypeLabel(contentType)} submitted for review successfully!`;
      notify.success(options.successMessage || defaultMessage);

      // Call success callback
      if (options.onSuccess) {
        options.onSuccess();
      }
    } catch (error) {
      console.error('Error submitting for review:', error);

      const defaultMessage = `Failed to submit ${getContentTypeLabel(contentType).toLowerCase()} for review.`;
      notify.error(options.errorMessage || defaultMessage);

      // Call error callback
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [contentId, contentType, submitForReview, options]);

  /**
   * Check if submit button should be disabled
   */
  const canSubmit = useCallback(() => {
    if (!contentId || isSubmitting) return false;
    if (reviewState === ReviewState.PENDING_REVIEW) return false;
    if (reviewState === ReviewState.APPROVED) return false;
    return true;
  }, [contentId, isSubmitting, reviewState]);

  /**
   * Get submit button text
   */
  const getSubmitButtonText = useCallback(() => {
    if (isSubmitting) return 'Submitting...';
    if (reviewState === ReviewState.PENDING_REVIEW) return 'Pending Review';
    if (reviewState === ReviewState.APPROVED) return 'Approved';
    return 'Submit for Review';
  }, [isSubmitting, reviewState]);

  return {
    reviewState,
    isSubmitting,
    handleSubmit,
    canSubmit,
    getSubmitButtonText,
    refreshReviewState: fetchReviewState,
  };
};

/**
 * Helper function to get human-readable content type labels
 */
function getContentTypeLabel(contentType: ContentType): string {
  switch (contentType) {
    case ContentType.QUIZ:
      return 'Quiz';
    case ContentType.FLASHCARD:
      return 'Flashcards';
    case ContentType.EXAM_PAPER:
      return 'Exam Paper';
    default:
      return 'Content';
  }
}
