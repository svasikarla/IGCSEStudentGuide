import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Paper, 
  Chip, 
  Grid, 
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { useReview } from '../contexts/ReviewContext';
import { useNavigate } from 'react-router-dom';
import { ContentType, ReviewState } from '../types/reviewTypes';
import ReviewFilters from '../components/review/ReviewFilters';
import ReviewList from '../components/review/ReviewList';
import ReviewStats from '../components/review/ReviewStats';
import { useAuth } from '../contexts/AuthContext';

const ReviewPage: React.FC = () => {
  const { 
    pendingReviews, 
    reviewStats, 
    selectedContentType, 
    selectedReviewState,
    setSelectedContentType, 
    setSelectedReviewState, 
    isReviewer,
    isLoading, 
    error, 
    fetchPendingReviews,
    refreshReviewData 
  } = useReview();
  
  // Type assertion to align null/undefined usage
  const typedFetchPendingReviews = fetchPendingReviews as (filters?: { contentType?: ContentType | null, reviewState?: ReviewState | null }) => Promise<void>;
  
  const { session } = useAuth();
  const navigate = useNavigate();
  
  // Local state for selected tab (content type filter)
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Map tab index to content type
  const tabToContentType: (ContentType | null)[] = [
    null, // All content types
    ContentType.TOPIC,
    ContentType.FLASHCARD,
    ContentType.QUIZ,
    ContentType.QUIZ_QUESTION // Quiz Questions
  ];
  
  // Redirect non-reviewers
  useEffect(() => {
    if (session && !isReviewer) {
      navigate('/dashboard');
    }
  }, [session, isReviewer, navigate]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedContentType(tabToContentType[newValue]);
    typedFetchPendingReviews({ contentType: tabToContentType[newValue], reviewState: selectedReviewState });
  };
  
  // Handle review state filter change
  const handleReviewStateChange = (state: ReviewState | null) => {
    setSelectedReviewState(state);
    typedFetchPendingReviews({ contentType: selectedContentType, reviewState: state });
  };
  
  // Handle refresh
  const handleRefresh = () => {
    refreshReviewData();
  };
  
  if (!session) {
    return (
      <Container>
        <Box mt={4}>
          <Typography variant="h6">Please login to access the review panel.</Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Content Review Panel
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Review and approve content before it is published to students.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}
        
        {/* Review statistics */}
        <Box mb={4}>
          <ReviewStats stats={reviewStats} isLoading={isLoading} />
        </Box>
        
        {/* Content type tabs */}
        <Paper elevation={1} sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="All Types" />
              <Tab label="Topics" />
              <Tab label="Flashcards" />
              <Tab label="Quizzes" />
              <Tab label="Quiz Questions" />
            </Tabs>
          </Box>
        </Paper>
        
        {/* Review filters */}
        <ReviewFilters 
          selectedReviewState={selectedReviewState}
          onReviewStateChange={handleReviewStateChange}
        />
        
        {/* Review list */}
        <Box mt={3} mb={3}>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button 
              variant="outlined" 
              onClick={handleRefresh} 
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Refresh'}
            </Button>
          </Box>
          
          <ReviewList 
            items={pendingReviews}
            isLoading={isLoading}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default ReviewPage;
