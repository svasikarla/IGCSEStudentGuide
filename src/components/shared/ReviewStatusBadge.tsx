import React from 'react';
import { ReviewState } from '../../types/reviewTypes';

interface ReviewStatusBadgeProps {
  reviewState: ReviewState | null;
  className?: string;
}

/**
 * Shared ReviewStatusBadge component
 *
 * Displays a colored badge indicating the review status of content.
 * Extracted from duplicated code in QuizGeneratorForm, FlashcardGeneratorForm,
 * and ExamPaperGeneratorForm.
 */
const ReviewStatusBadge: React.FC<ReviewStatusBadgeProps> = ({ reviewState, className = '' }) => {
  if (!reviewState) return null;

  const getStatusStyles = (state: ReviewState): string => {
    switch (state) {
      case ReviewState.DRAFT:
        return 'bg-neutral-100 text-neutral-800';
      case ReviewState.PENDING_REVIEW:
        return 'bg-amber-100 text-amber-800';
      case ReviewState.APPROVED:
        return 'bg-success-100 text-success-800';
      case ReviewState.REJECTED:
        return 'bg-red-100 text-red-800';
      case ReviewState.NEEDS_REVISION:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusLabel = (state: ReviewState): string => {
    switch (state) {
      case ReviewState.DRAFT:
        return 'Draft';
      case ReviewState.PENDING_REVIEW:
        return 'Pending Review';
      case ReviewState.APPROVED:
        return 'Approved';
      case ReviewState.REJECTED:
        return 'Rejected';
      case ReviewState.NEEDS_REVISION:
        return 'Needs Revision';
      default:
        return 'Unknown';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyles(reviewState)} ${className}`}>
      {getStatusLabel(reviewState)}
    </span>
  );
};

export default ReviewStatusBadge;
