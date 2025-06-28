import React from 'react';
import { Box, Chip, Typography, Paper } from '@mui/material';
import { ReviewState } from '../../types/reviewTypes';

interface ReviewFiltersProps {
  selectedReviewState: ReviewState | null;
  onReviewStateChange: (state: ReviewState | null) => void;
}

const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  selectedReviewState,
  onReviewStateChange,
}) => {
  // Filter options
  const reviewStateFilters = [
    { label: 'All', value: null },
    { label: 'Pending Review', value: ReviewState.PENDING_REVIEW },
    { label: 'Approved', value: ReviewState.APPROVED },
    { label: 'Rejected', value: ReviewState.REJECTED },
    { label: 'Needs Revision', value: ReviewState.NEEDS_REVISION },
    { label: 'Draft', value: ReviewState.DRAFT },
  ];

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box mb={1}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Filter by Review State
        </Typography>
      </Box>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {reviewStateFilters.map((filter) => (
          <Chip
            key={filter.value || 'all'}
            label={filter.label}
            color={
              selectedReviewState === filter.value ? 'primary' : 'default'
            }
            onClick={() => onReviewStateChange(filter.value)}
            variant={
              selectedReviewState === filter.value ? 'filled' : 'outlined'
            }
          />
        ))}
      </Box>
    </Paper>
  );
};

export default ReviewFilters;
