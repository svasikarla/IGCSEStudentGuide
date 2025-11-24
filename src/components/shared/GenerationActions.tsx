import React from 'react';
import { ReviewState } from '../../types/reviewTypes';

interface GenerationActionsProps {
  // Generation button props
  onGenerate: () => void;
  canGenerate: boolean;
  isGenerating: boolean;
  generateButtonText?: string;

  // Review submission props (optional)
  onSubmitForReview?: () => void;
  canSubmitForReview?: boolean;
  isSubmitting?: boolean;
  reviewState?: ReviewState | null;
  showReviewButton?: boolean;
}

/**
 * Shared GenerationActions component
 *
 * Provides consistent Generate and Submit for Review buttons
 * across all generator forms (Quiz, Flashcard, Exam).
 *
 * Extracted from duplicated code in QuizGeneratorForm, FlashcardGeneratorForm,
 * and ExamPaperGeneratorForm.
 */
const GenerationActions: React.FC<GenerationActionsProps> = ({
  onGenerate,
  canGenerate,
  isGenerating,
  generateButtonText = 'Generate Content',
  onSubmitForReview,
  canSubmitForReview = false,
  isSubmitting = false,
  reviewState = null,
  showReviewButton = true,
}) => {
  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Submitting...';
    if (reviewState === ReviewState.PENDING_REVIEW) return 'Pending Review';
    if (reviewState === ReviewState.APPROVED) return 'Approved';
    return 'Submit for Review';
  };

  const isSubmitDisabled =
    isSubmitting ||
    isGenerating ||
    !canSubmitForReview ||
    reviewState === ReviewState.PENDING_REVIEW ||
    reviewState === ReviewState.APPROVED;

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
      {/* Generate Button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating || isSubmitting}
        className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
          !canGenerate || isGenerating || isSubmitting
            ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-medium shadow-soft'
        }`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            {generateButtonText}
          </span>
        )}
      </button>

      {/* Submit for Review Button */}
      {showReviewButton && onSubmitForReview && (
        <button
          type="button"
          onClick={onSubmitForReview}
          disabled={isSubmitDisabled}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
            isSubmitDisabled
              ? 'bg-secondary-300 text-white cursor-not-allowed'
              : 'bg-secondary-600 text-white hover:bg-secondary-700 hover:shadow-medium shadow-soft'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Submitting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              {getSubmitButtonText()}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default GenerationActions;
