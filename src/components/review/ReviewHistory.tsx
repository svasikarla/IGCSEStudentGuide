import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import { 
  CheckCircle, 
  Cancel, 
  Edit, 
  History,
  HourglassEmpty,
  Create,
  Person
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ContentType, ReviewState, ReviewHistoryRecord } from '../../types/reviewTypes';
import { useReview } from '../../contexts/ReviewContext';
import ChemistryValidationResults from '../validation/ChemistryValidationResults';

interface ReviewHistoryProps {
  open: boolean;
  onClose: () => void;
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
}

// Function to get icon for review state
const getReviewStateIcon = (state: ReviewState) => {
  switch (state) {
    case ReviewState.PENDING_REVIEW:
      return <HourglassEmpty color="warning" />;
    case ReviewState.APPROVED:
      return <CheckCircle color="success" />;
    case ReviewState.REJECTED:
      return <Cancel color="error" />;
    case ReviewState.NEEDS_REVISION:
      return <Edit color="info" />;
    case ReviewState.DRAFT:
      return <Create color="action" />;
    default:
      return <History />;
  }
};

// Function to get color for TimelineDot component
const getReviewStateColor = (state: ReviewState): 'warning' | 'success' | 'error' | 'info' | 'primary' | 'secondary' | 'inherit' | 'grey' => {
  switch (state) {
    case ReviewState.PENDING_REVIEW:
      return 'warning';
    case ReviewState.APPROVED:
      return 'success';
    case ReviewState.REJECTED:
      return 'error';
    case ReviewState.NEEDS_REVISION:
      return 'info';
    case ReviewState.DRAFT:
      return 'grey';
    default:
      return 'grey';
  }
};

// Function to get color for Chip component (has different allowed values)
const getChipColor = (state: ReviewState): 'warning' | 'success' | 'error' | 'info' | 'primary' | 'secondary' | 'default' => {
  switch (state) {
    case ReviewState.PENDING_REVIEW:
      return 'warning';
    case ReviewState.APPROVED:
      return 'success';
    case ReviewState.REJECTED:
      return 'error';
    case ReviewState.NEEDS_REVISION:
      return 'info';
    case ReviewState.DRAFT:
      return 'default';
    default:
      return 'default';
  }
};

const ReviewHistory: React.FC<ReviewHistoryProps> = ({ 
  open, 
  onClose, 
  contentType, 
  contentId,
  contentTitle
}) => {
  const { getReviewHistory } = useReview();
  const [history, setHistory] = useState<ReviewHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ReviewHistoryRecord | null>(null);
  
  // Fetch review history when dialog opens
  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, contentType, contentId]);
  
  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const historyData = await getReviewHistory(contentType, contentId);
      setHistory(historyData);
    } catch (err) {
      setError('Failed to load review history. Please try again.');
      console.error('Error fetching review history:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewVersionDetails = (version: ReviewHistoryRecord) => {
    setSelectedVersion(version);
  };
  
  const handleCloseVersionDetails = () => {
    setSelectedVersion(null);
  };
  
  // Format review state for display
  const formatReviewState = (state: ReviewState): string => {
    return state.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };
  
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle>
          Review History
          <Typography variant="subtitle2" color="text.secondary">
            {contentTitle}
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers>
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <Typography color="error">{error}</Typography>
            </Box>
          ) : history.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <Typography color="text.secondary">No review history available.</Typography>
            </Box>
          ) : (
            <Timeline position="alternate">
              {history.map((item, index) => (
                <TimelineItem key={item.id}>
                  <TimelineOppositeContent sx={{ m: 'auto 0' }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy HH:mm') : 'Unknown date'}
                    </Typography>
                    
                    <Typography variant="caption" display="block" color="text.secondary">
                      Version {item.review_version}
                    </Typography>
                  </TimelineOppositeContent>
                  
                  <TimelineSeparator>
                    <TimelineDot color={getReviewStateColor(item.new_state)}>
                      {getReviewStateIcon(item.new_state)}
                    </TimelineDot>
                    {index < history.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  
                  <TimelineContent sx={{ py: 1, px: 2 }}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                      <Typography variant="h6" component="span">
                        {formatReviewState(item.new_state)}
                      </Typography>
                      
                      {item.previous_state && (
                        <Typography variant="body2" color="text.secondary">
                          Previous state: {formatReviewState(item.previous_state)}
                        </Typography>
                      )}
                      
                      {item.reviewer && (
                        <Box display="flex" alignItems="center" mt={1}>
                          <Person fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="body2">
                            {item.reviewer?.full_name || 'Unknown reviewer'}
                          </Typography>
                        </Box>
                      )}
                      
                      {item.review_notes && (
                        <Box mt={1}>
                          <Typography variant="body2">
                            "{item.review_notes}"
                          </Typography>
                        </Box>
                      )}
                      
                      {item.chemistry_validation_results && (
                        <Box mt={1}>
                          <Button 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewVersionDetails(item)}
                          >
                            View Chemistry Validation
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Version Details Dialog */}
      {selectedVersion && (
        <Dialog
          open={Boolean(selectedVersion)}
          onClose={handleCloseVersionDetails}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            Review Version {selectedVersion.review_version}
            <Typography variant="subtitle2" color="text.secondary">
              {format(new Date(selectedVersion.created_at), 'MMM d, yyyy HH:mm')}
            </Typography>
          </DialogTitle>
          
          <DialogContent dividers>
            <Box mb={3}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1">Review State</Typography>
                <Chip 
                  label={formatReviewState(selectedVersion.new_state)}
                  color={getChipColor(selectedVersion.new_state)}
                  size="small"
                />
              </Box>
              
              <Divider sx={{ my: 1.5 }} />
              
              {selectedVersion.reviewer && (
                <Box mb={1.5}>
                  <Typography variant="subtitle2" gutterBottom>Reviewer</Typography>
                  <Typography variant="body2">
                    {selectedVersion.reviewer?.full_name || 'Unknown'} ({selectedVersion.reviewer?.email || 'No email'})
                  </Typography>
                </Box>
              )}
              
              {selectedVersion.review_notes && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>Review Notes</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2">{selectedVersion.review_notes}</Typography>
                  </Paper>
                </Box>
              )}
              
              {selectedVersion.chemistry_validation_results && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>Chemistry Validation Results</Typography>
                  <ChemistryValidationResults 
                    validationResults={selectedVersion.chemistry_validation_results} 
                  />
                </Box>
              )}
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleCloseVersionDetails}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default ReviewHistory;
