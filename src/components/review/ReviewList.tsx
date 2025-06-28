import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  Skeleton,
  Divider,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import ReviewItem from './ReviewItem';
import { ContentType } from '../../types/reviewTypes';

interface ReviewListProps {
  items: any[];
  isLoading: boolean;
}

const ReviewList: React.FC<ReviewListProps> = ({ items, isLoading }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Handle pagination
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Handle page size change
  const handlePageSizeChange = (event: SelectChangeEvent) => {
    setPageSize(parseInt(event.target.value));
    setPage(1); // Reset to first page when changing page size
  };
  
  // Calculate pagination
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = items.slice(startIndex, endIndex);
  
  // Loading skeletons
  const loadingSkeletons = Array.from({ length: 3 }, (_, i) => (
    <Box key={i} mb={2}>
      <Skeleton variant="rectangular" height={20} width="60%" sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={60} />
    </Box>
  ));
  
  // Empty state
  const emptyState = (
    <Box py={4} textAlign="center">
      <Typography variant="body1" color="text.secondary">
        No items found that match your filters.
      </Typography>
    </Box>
  );
  
  // Function to get content title based on content type
  const getContentTitle = (item: any): string => {
    switch (item.content_type) {
      case ContentType.TOPIC:
        return item.title || 'Untitled Topic';
      case ContentType.FLASHCARD:
        return item.front_content?.substring(0, 50) || 'Untitled Flashcard';
      case ContentType.QUIZ:
        return item.title || 'Untitled Quiz';
      case ContentType.QUIZ_QUESTION:
        return item.question_text?.substring(0, 50) || 'Untitled Question';
      default:
        return 'Unknown Content';
    }
  };
  
  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Content Items ({totalItems})
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="page-size-label">Items per page</InputLabel>
            <Select
              labelId="page-size-label"
              value={pageSize.toString()}
              onChange={handlePageSizeChange}
              label="Items per page"
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {isLoading ? (
        <Box>{loadingSkeletons}</Box>
      ) : totalItems === 0 ? (
        emptyState
      ) : (
        <>
          <List sx={{ width: '100%' }}>
            {paginatedItems.map((item, index) => (
              <React.Fragment key={`${item.content_type}-${item.id}`}>
                <ReviewItem 
                  item={item}
                  contentTitle={getContentTitle(item)}
                />
                {index < paginatedItems.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
          
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
              />
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default ReviewList;
