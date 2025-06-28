import React, { useState, useEffect, useRef } from 'react';
import { TextField, Button, ButtonGroup, Tooltip, Box, Typography } from '@mui/material';
import { formatChemicalEquation, containsChemicalContent } from '../../utils/chemistryFormatter';
import ChemistryEquation from './ChemistryEquation';

interface ChemistryEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  rows?: number;
  showPreview?: boolean;
  className?: string;
}

/**
 * Rich text editor component for Chemistry content
 * Allows easy insertion of subscripts, superscripts, and reaction arrows
 * Provides a preview with properly formatted chemical equations
 */
const ChemistryEditor: React.FC<ChemistryEditorProps> = ({
  initialValue = '',
  onChange,
  placeholder = 'Enter chemistry content here...',
  label = 'Chemistry Content',
  multiline = true,
  rows = 4,
  showPreview = true,
  className = ''
}) => {
  const [content, setContent] = useState(initialValue);
  const [previewContent, setPreviewContent] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const [hasChemistry, setHasChemistry] = useState(false);
  
  // Update preview content when content changes
  useEffect(() => {
    // Format chemistry content for preview
    const formattedContent = formatChemicalEquation(content);
    setPreviewContent(formattedContent);
    
    // Check if content contains chemistry
    setHasChemistry(containsChemicalContent(content));
    
    // Call parent onChange
    onChange(content);
  }, [content, onChange]);
  
  // Insert text at cursor position
  const insertAtCursor = (textToInsert: string) => {
    if (!textFieldRef.current) return;
    
    const start = textFieldRef.current.selectionStart || 0;
    const end = textFieldRef.current.selectionEnd || 0;
    const textBefore = content.substring(0, start);
    const textAfter = content.substring(end);
    const newText = textBefore + textToInsert + textAfter;
    
    setContent(newText);
    
    // Set new cursor position after the inserted text
    const newPosition = start + textToInsert.length;
    setCursorPosition(newPosition);
    
    // Focus back on the text field and set cursor position
    setTimeout(() => {
      if (textFieldRef.current) {
        textFieldRef.current.focus();
        textFieldRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };
  
  // Insert chemical notation buttons
  const insertSubscript = () => insertAtCursor('<sub>2</sub>'); // Default to 2 for common formulas
  const insertSuperscript = () => insertAtCursor('<sup>+</sup>'); // Default to + for common ions
  const insertArrow = () => insertAtCursor(' → ');
  const insertReversibleArrow = () => insertAtCursor(' ⇌ ');
  const insertYieldsArrow = () => insertAtCursor(' ⇒ ');
  
  // Insert common elements and compounds
  const insertCommonFormula = (formula: string) => insertAtCursor(formula);
  
  // Common chemistry formulas and elements
  const commonElements = [
    { symbol: 'H', name: 'Hydrogen' },
    { symbol: 'O', name: 'Oxygen' },
    { symbol: 'C', name: 'Carbon' },
    { symbol: 'N', name: 'Nitrogen' },
    { symbol: 'Cl', name: 'Chlorine' },
    { symbol: 'Na', name: 'Sodium' },
    { symbol: 'K', name: 'Potassium' },
    { symbol: 'Ca', name: 'Calcium' }
  ];
  
  const commonCompounds = [
    { formula: 'H<sub>2</sub>O', name: 'Water' },
    { formula: 'CO<sub>2</sub>', name: 'Carbon Dioxide' },
    { formula: 'H<sub>2</sub>SO<sub>4</sub>', name: 'Sulfuric Acid' },
    { formula: 'NaOH', name: 'Sodium Hydroxide' },
    { formula: 'CH<sub>4</sub>', name: 'Methane' },
    { formula: 'NaCl', name: 'Sodium Chloride' }
  ];
  
  return (
    <div className={`chemistry-editor ${className}`}>
      {/* Editor field */}
      <TextField
        inputRef={textFieldRef}
        fullWidth
        multiline={multiline}
        rows={rows}
        label={label}
        placeholder={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        variant="outlined"
        sx={{ mb: 2 }}
      />
      
      {/* Chemistry toolbar */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Chemistry Formatting
        </Typography>
        
        <ButtonGroup variant="outlined" size="small" sx={{ mb: 1, mr: 1 }}>
          <Tooltip title="Insert Subscript">
            <Button onClick={insertSubscript}>
              X<sub>2</sub>
            </Button>
          </Tooltip>
          <Tooltip title="Insert Superscript">
            <Button onClick={insertSuperscript}>
              X<sup>+</sup>
            </Button>
          </Tooltip>
          <Tooltip title="Insert Reaction Arrow">
            <Button onClick={insertArrow}>
              →
            </Button>
          </Tooltip>
          <Tooltip title="Insert Reversible Arrow">
            <Button onClick={insertReversibleArrow}>
              ⇌
            </Button>
          </Tooltip>
          <Tooltip title="Insert Yields Arrow">
            <Button onClick={insertYieldsArrow}>
              ⇒
            </Button>
          </Tooltip>
        </ButtonGroup>
        
        {/* Common elements */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
            Common Elements:
          </Typography>
          <ButtonGroup variant="outlined" size="small" sx={{ flexWrap: 'wrap' }}>
            {commonElements.map((element) => (
              <Tooltip key={element.symbol} title={element.name}>
                <Button onClick={() => insertCommonFormula(element.symbol)}>
                  {element.symbol}
                </Button>
              </Tooltip>
            ))}
          </ButtonGroup>
        </Box>
        
        {/* Common compounds */}
        <Box>
          <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
            Common Compounds:
          </Typography>
          <ButtonGroup variant="outlined" size="small" sx={{ flexWrap: 'wrap' }}>
            {commonCompounds.map((compound) => (
              <Tooltip key={compound.formula} title={compound.name}>
                <Button 
                  onClick={() => insertCommonFormula(compound.formula)}
                  dangerouslySetInnerHTML={{ __html: compound.formula }}
                />
              </Tooltip>
            ))}
          </ButtonGroup>
        </Box>
      </Box>
      
      {/* Preview */}
      {showPreview && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Preview:
          </Typography>
          <Box 
            sx={{ 
              p: 2, 
              border: '1px solid #e0e0e0', 
              borderRadius: 1,
              minHeight: '100px',
              bgcolor: hasChemistry ? '#f5f8ff' : 'transparent' 
            }}
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </Box>
      )}
      
      {/* Formatting tips */}
      <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2">Chemistry Formatting Tips:</Typography>
        <ul>
          <li>Use the toolbar buttons to insert subscripts, superscripts, and reaction arrows</li>
          <li>For manual formatting, use &lt;sub&gt;2&lt;/sub&gt; for subscripts (e.g., H<sub>2</sub>O)</li>
          <li>Use &lt;sup&gt;+&lt;/sup&gt; for superscripts (e.g., Na<sup>+</sup>)</li>
          <li>Include state symbols in parentheses: (s) solid, (l) liquid, (g) gas, (aq) aqueous</li>
        </ul>
      </Box>
    </div>
  );
};

export default ChemistryEditor;
