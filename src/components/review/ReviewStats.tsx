import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack,
  useTheme,
  CircularProgress
} from '@mui/material';
import { useReview } from '../../contexts/ReviewContext';
import { ContentType, ReviewState, ReviewStats as ReviewStatsType } from '../../types/reviewTypes';

interface ReviewStatsProps {
  onSelectContentType?: (contentType: ContentType | null) => void;
  onSelectReviewState?: (state: ReviewState | null) => void;
  stats?: ReviewStatsType | null;
  isLoading?: boolean;
}

const ReviewStats: React.FC<ReviewStatsProps> = ({ 
  onSelectContentType, 
  onSelectReviewState,
  stats,
  isLoading
}) => {
  const { reviewStats: contextReviewStats } = useReview();
  const theme = useTheme();
  
  // Use provided stats if available, otherwise use context stats
  const statsToUse = stats || contextReviewStats;

  // If loading is true, show loading indicator
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  // Define default values for stats
  const pendingReview = statsToUse?.totalPendingReview || 0;
  const approved = statsToUse?.totalApproved || 0;
  const rejected = statsToUse?.totalRejected || 0;
  const needsRevision = statsToUse?.totalNeedsRevision || 0;
  const byContentType = statsToUse?.byContentType || {};

  // Define the stat cards to display
  const statCards = [
    {
      title: 'Pending Review',
      value: pendingReview,
      color: theme.palette.warning.main,
      onClick: () => onSelectReviewState && onSelectReviewState(ReviewState.PENDING_REVIEW)
    },
    {
      title: 'Approved',
      value: approved,
      color: theme.palette.success.main,
      onClick: () => onSelectReviewState && onSelectReviewState(ReviewState.APPROVED)
    },
    {
      title: 'Rejected',
      value: rejected,
      color: theme.palette.error.main,
      onClick: () => onSelectReviewState && onSelectReviewState(ReviewState.REJECTED)
    },
    {
      title: 'Needs Revision',
      value: needsRevision,
      color: theme.palette.info.main,
      onClick: () => onSelectReviewState && onSelectReviewState(ReviewState.NEEDS_REVISION)
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Statistics
      </Typography>
      
      {/* Use Stack instead of Grid for a simpler layout solution */}
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        {statCards.map((card, index) => (
          <Box 
            key={index} 
            sx={{ 
              width: { xs: '100%', sm: '45%', md: '22%' },
              mb: 2
            }}
          >
            <Paper 
              elevation={1}
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: typeof card.onClick !== 'undefined' ? 'pointer' : 'default',
                borderLeft: `4px solid ${card.color}`,
                '&:hover': {
                  boxShadow: typeof card.onClick !== 'undefined' ? 3 : 1
                }
              }}
              onClick={card.onClick}
            >
              <Typography variant="subtitle1" color="textSecondary">
                {card.title}
              </Typography>
              <Typography variant="h4">
                {card.value}
              </Typography>
            </Paper>
          </Box>
        ))}
      </Stack>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        By Content Type
      </Typography>
      
      {/* Use Stack instead of Grid for content types */}
      <Stack spacing={2}>
        {Object.entries(byContentType).map(([contentType, typeStats]: [string, any], index) => {
          const total = typeStats?.pending + typeStats?.approved + typeStats?.rejected + typeStats?.needsRevision;
          if (!typeStats || total === 0) return null;
          
          return (
            <Box 
              key={index} 
              sx={{ 
                width: { xs: '100%', sm: '48%', md: '31%' },
                mb: 2,
                display: 'inline-block',
                mr: 2
              }}
            >
              <Paper 
                elevation={1}
                sx={{
                  p: 2,
                  cursor: onSelectContentType ? 'pointer' : 'default',
                  '&:hover': {
                    boxShadow: onSelectContentType ? 3 : 1
                  }
                }}
                onClick={() => onSelectContentType && onSelectContentType(contentType as ContentType)}
              >
                <Typography variant="subtitle1" gutterBottom>
                  {contentType.replace('_', ' ')}
                </Typography>
                
                {/* Use Box with flexbox instead of Grid */}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ flex: 1 }}>Pending:</Typography>
                    <Typography variant="body2">{typeStats.pending}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ flex: 1 }}>Approved:</Typography>
                    <Typography variant="body2">{typeStats.approved}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ flex: 1 }}>Rejected:</Typography>
                    <Typography variant="body2">{typeStats.rejected}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ flex: 1 }}>Needs Revision:</Typography>
                    <Typography variant="body2">{typeStats.needsRevision}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ReviewStats;
