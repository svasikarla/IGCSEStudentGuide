import React from 'react';
import { ValidationResult } from '../../utils/chemistryValidator';
import { Alert, AlertTitle, Box, Collapse, IconButton, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';

interface ChemistryValidationResultsProps {
  validationResults: ValidationResult | null;
  onDismiss?: () => void;
}

/**
 * Component to display Chemistry content validation results
 * Shows errors and warnings with helpful feedback for content creators
 */
const ChemistryValidationResults: React.FC<ChemistryValidationResultsProps> = ({ 
  validationResults,
  onDismiss
}) => {
  const [open, setOpen] = React.useState(true);

  // If no validation results or no issues, don't render anything
  if (!validationResults || (validationResults.errors.length === 0 && validationResults.warnings.length === 0)) {
    return null;
  }

  const handleClose = () => {
    setOpen(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Collapse in={open}>
        {validationResults.errors.length > 0 && (
          <Alert 
            severity="error"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={handleClose}
              >
                ×
              </IconButton>
            }
            sx={{ mb: 2 }}
          >
            <AlertTitle>Chemistry Content Errors</AlertTitle>
            <List dense>
              {validationResults.errors.map((error, index) => (
                <ListItem key={`error-${index}`}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Box component="span" sx={{ color: 'error.main', fontWeight: 'bold' }}>⚠️</Box>
                  </ListItemIcon>
                  <ListItemText primary={error} />
                </ListItem>
              ))}
            </List>
            <Box sx={{ mt: 1, fontSize: '0.9rem' }}>
              These issues should be fixed before saving the content.
            </Box>
          </Alert>
        )}
        
        {validationResults.warnings.length > 0 && (
          <Alert 
            severity="warning"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={handleClose}
              >
                ×
              </IconButton>
            }
          >
            <AlertTitle>Chemistry Content Suggestions</AlertTitle>
            <List dense>
              {validationResults.warnings.map((warning, index) => (
                <ListItem key={`warning-${index}`}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Box component="span" sx={{ color: 'warning.main', fontWeight: 'bold' }}>⚠</Box>
                  </ListItemIcon>
                  <ListItemText primary={warning} />
                </ListItem>
              ))}
            </List>
            <Box sx={{ mt: 1, fontSize: '0.9rem' }}>
              Consider addressing these suggestions to improve the quality of your Chemistry content.
            </Box>
          </Alert>
        )}
      </Collapse>
      
      {/* Chemistry content formatting tips */}
      <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box component="span" sx={{ color: 'info.main', mr: 1, fontWeight: 'bold' }}>ℹ️</Box>
          <Box component="span" sx={{ fontWeight: 'bold' }}>Chemistry Content Tips</Box>
        </Box>
        <List dense>
          <ListItem>
            <ListItemText 
              primary="Use HTML subscripts for chemical formulas" 
              secondary="Example: H<sub>2</sub>O for H₂O" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Include state symbols in equations" 
              secondary="Example: 2H₂(g) + O₂(g) → 2H₂O(l)" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Reference IGCSE syllabus topics" 
              secondary="Link content to specific syllabus points where possible" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Include safety information" 
              secondary="Always mention safety considerations for practical work" 
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default ChemistryValidationResults;
