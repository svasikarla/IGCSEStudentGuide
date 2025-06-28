import React, { useState } from 'react';
import { 
  ListItem,
  ListItemText,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { 
  CheckCircle, 
  Cancel, 
  Edit, 
  MoreVert, 
  History,
  Subject
} from '@mui/icons-material';
import { useReview } from '../../contexts/ReviewContext';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  ContentType, 
  ReviewState, 
  ReviewDecision, 
  PendingReview
} from '../../types/reviewTypes';
import ReviewHistory from './ReviewHistory';
// Import chemistry validation hook directly from the hook module
import { useChemistryValidation } from '../../hooks/useChemistryValidation';
import ChemistryValidationResults from '../validation/ChemistryValidationResults';

interface ReviewItemProps {
  item: PendingReview;
  contentTitle: string;
}

// Function to get content type label
const getContentTypeLabel = (contentType: ContentType): string => {
  switch (contentType) {
    case ContentType.TOPIC:
      return 'Topic';
    case ContentType.FLASHCARD:
      return 'Flashcard';
    case ContentType.QUIZ:
      return 'Quiz';
    case ContentType.QUIZ_QUESTION:
      return 'Quiz Question';
    default:
      return 'Unknown';
  }
};

// Function to get color for review state
const getReviewStateColor = (state: ReviewState): string => {
  switch (state) {
    case ReviewState.PENDING_REVIEW:
      return '#ff9800'; // warning
    case ReviewState.APPROVED:
      return '#4caf50'; // success
    case ReviewState.REJECTED:
      return '#f44336'; // error
    case ReviewState.NEEDS_REVISION:
      return '#2196f3'; // info
    case ReviewState.DRAFT:
      return '#9e9e9e'; // grey
    default:
      return '#9e9e9e'; // grey
  }
};

const ReviewItem: React.FC<ReviewItemProps> = ({ item, contentTitle }) => {
  const { submitReview } = useReview();
  const { validateContent } = useChemistryValidation();
  
  // State for dialogs and menus
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewState | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chemistryValidationResults, setChemistryValidationResults] = useState<any>(null);
  
  // Formatting the date
  const createdDate = item.created_at ? new Date(item.created_at) : null;
  const formattedDate = createdDate 
    ? `${format(createdDate, 'MMM d, yyyy')} (${formatDistanceToNow(createdDate, { addSuffix: true })})`
    : 'Unknown date';
  
  // Handle menu open/close
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Handle review dialog open
  const handleReviewAction = (action: ReviewState) => {
    setReviewAction(action);
    setShowReviewDialog(true);
    handleMenuClose();
    
    // Run chemistry validation for Chemistry subject content
    if (item.contentType === ContentType.TOPIC) {
      if (item.subject?.name === 'Chemistry' && item.description) {
        const validationResults = validateContent(item.description);
        setChemistryValidationResults(validationResults);
      }
    } else if (item.contentType === ContentType.FLASHCARD) {
      if (item.topic?.subject?.name === 'Chemistry' && (item.front_content || item.back_content)) {
        const validationResults = validateContent(
          `${item.front_content || ''} ${item.back_content || ''}`
        );
        setChemistryValidationResults(validationResults);
      }
    } else if (item.contentType === ContentType.QUIZ || item.contentType === ContentType.QUIZ_QUESTION) {
      let contentToValidate = '';
      
      if (item.contentType === ContentType.QUIZ) {
        contentToValidate = item.description || '';
      } else if (item.contentType === ContentType.QUIZ_QUESTION) {
        contentToValidate = item.question_text || '';
        if (item.options) {
          try {
            const options = JSON.parse(item.options);
            options.forEach((option: any) => {
              contentToValidate += ' ' + option.text;
            });
          } catch (e) {
            console.error('Error parsing quiz question options:', e);
          }
        }
      }
      
      if (
        (item.topic?.subject?.name === 'Chemistry' || 
         item.quiz?.topic?.subject?.name === 'Chemistry') && 
        contentToValidate
      ) {
        const validationResults = validateContent(contentToValidate);
        setChemistryValidationResults(validationResults);
      }
    }
  };
  
  // Handle review dialog close
  const handleDialogClose = () => {
    setShowReviewDialog(false);
    setReviewNotes('');
    setChemistryValidationResults(null);
  };
  
  // Handle submit review
  const handleSubmitReview = async () => {
    if (!reviewAction) return;
    
    setIsSubmitting(true);
    
    const decision: ReviewDecision = {
      contentType: item.contentType,
      contentId: item.id,
      newState: reviewAction,
      reviewNotes: reviewNotes,
      chemistryValidation: chemistryValidationResults
    };
    
    try {
      const result = await submitReview(decision);
      
      if (result.success) {
        handleDialogClose();
      } else {
        console.error('Error submitting review:', result.error);
        // Could show error message here
      }
    } catch (error) {
      console.error('Exception in handleSubmitReview:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle view details
  const handleViewDetails = () => {
    setShowDetails(true);
    handleMenuClose();
  };
  
  // Handle view history
  const handleViewHistory = () => {
    setShowHistory(true);
    handleMenuClose();
  };
  
  // Function to get primary content for the item based on content type
  const getPrimaryContent = (): JSX.Element => {
    return (
      <Box>
        <Typography variant="subtitle1" component="div">
          {contentTitle}
        </Typography>
        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
          <Chip 
            size="small" 
            label={getContentTypeLabel(item.contentType)} 
            color="primary" 
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary">
            {formattedDate}
          </Typography>
        </Box>
      </Box>
    );
  };
  
  // Function to get secondary content for the item
  const getSecondaryContent = (): JSX.Element => {
    // Get subject and topic info based on content type
    let subjectName = '';
    let topicName = '';
    
    switch (item.contentType) {
      case ContentType.TOPIC:
        subjectName = item.subject?.name || '';
        break;
      case ContentType.FLASHCARD:
        subjectName = item.topic?.subject?.name || '';
        topicName = item.topic?.title || '';
        break;
      case ContentType.QUIZ:
        subjectName = item.topic?.subject?.name || '';
        topicName = item.topic?.title || '';
        break;
      case ContentType.QUIZ_QUESTION:
        subjectName = item.quiz?.topic?.subject?.name || '';
        topicName = item.quiz?.topic?.title || '';
        break;
    }
    
    return (
      <Box mt={1}>
        {subjectName && (
          <Typography variant="body2" component="div">
            <strong>Subject:</strong> {subjectName}
          </Typography>
        )}
        {topicName && (
          <Typography variant="body2" component="div">
            <strong>Topic:</strong> {topicName}
          </Typography>
        )}
        {item.review_state && (
          <Box display="flex" alignItems="center" mt={0.5}>
            <Chip 
              size="small"
              label={item.review_state.replace('_', ' ').toUpperCase()}
              style={{ 
                backgroundColor: getReviewStateColor(item.review_state),
                color: 'white'
              }}
            />
          </Box>
        )}
      </Box>
    );
  };
  
  return (
    <>
      <ListItem alignItems="flex-start">
        <ListItemText
          primary={getPrimaryContent()}
          secondary={getSecondaryContent()}
        />
        
        <Box display="flex" flexDirection="column" alignItems="flex-end" mt={1}>
          <Box>
            {item.review_state === ReviewState.PENDING_REVIEW && (
              <>
                <Button 
                  startIcon={<CheckCircle />}
                  color="success"
                  onClick={() => handleReviewAction(ReviewState.APPROVED)}
                  sx={{ mr: 1 }}
                >
                  Approve
                </Button>
                <Button 
                  startIcon={<Cancel />}
                  color="error"
                  onClick={() => handleReviewAction(ReviewState.REJECTED)}
                  sx={{ mr: 1 }}
                >
                  Reject
                </Button>
                <Button 
                  startIcon={<Edit />}
                  color="info"
                  onClick={() => handleReviewAction(ReviewState.NEEDS_REVISION)}
                >
                  Needs Revision
                </Button>
              </>
            )}
            
            <IconButton
              aria-label="more options"
              aria-controls="review-item-menu"
              aria-haspopup="true"
              onClick={handleMenuClick}
            >
              <MoreVert />
            </IconButton>
          </Box>
        </Box>
      </ListItem>
      
      {/* More options menu */}
      <Menu
        id="review-item-menu"
        anchorEl={menuAnchorEl}
        keepMounted
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <Subject fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={handleViewHistory}>
          <History fontSize="small" sx={{ mr: 1 }} /> View History
        </MenuItem>
        {item.review_state !== ReviewState.PENDING_REVIEW && (
          <MenuItem onClick={() => handleReviewAction(ReviewState.PENDING_REVIEW)}>
            Set to Pending Review
          </MenuItem>
        )}
      </Menu>
      
      {/* Review Dialog */}
      <Dialog
        open={showReviewDialog}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {reviewAction === ReviewState.APPROVED && "Approve Content"}
          {reviewAction === ReviewState.REJECTED && "Reject Content"}
          {reviewAction === ReviewState.NEEDS_REVISION && "Request Revision"}
          {reviewAction === ReviewState.PENDING_REVIEW && "Set to Pending Review"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {contentTitle}
          </DialogContentText>
          
          {/* Chemistry Validation (if applicable) */}
          {chemistryValidationResults && (
            <Box mt={2} mb={2}>
              <Typography variant="subtitle1">Chemistry Validation Results</Typography>
              <ChemistryValidationResults validationResults={chemistryValidationResults} />
            </Box>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            id="review-notes"
            label="Review Notes"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitReview} 
            color="primary" 
            disabled={isSubmitting}
            variant="contained"
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Details Dialog could go here */}
      
      {/* Review History Dialog */}
      <ReviewHistory
        open={showHistory}
        onClose={() => setShowHistory(false)}
        contentType={item.contentType}
        contentId={item.id}
        contentTitle={contentTitle}
      />
    </>
  );
};

export default ReviewItem;
