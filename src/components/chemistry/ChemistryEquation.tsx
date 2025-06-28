import React from 'react';

interface ChemistryEquationProps {
  equation: string;
  className?: string;
}

/**
 * Component for rendering chemical equations with proper formatting
 * Handles subscripts and state symbols correctly
 */
const ChemistryEquation: React.FC<ChemistryEquationProps> = ({ 
  equation, 
  className = '' 
}) => {
  // Early return for empty equations
  if (!equation) return null;
  
  /**
   * Format chemical equation by:
   * 1. Converting numbers after element symbols to subscripts
   * 2. Preserving state symbols (s), (l), (g), (aq)
   * 3. Handling reaction arrows
   */
  const formatEquation = () => {
    // Convert numbers after element symbols to subscripts
    // Example: H2O -> H₂O, CO2 -> CO₂
    let formatted = equation.replace(/([A-Za-z\)])(\d+)/g, '$1<sub>$2</sub>');
    
    // Handle superscripts for ions (e.g., Ca2+)
    formatted = formatted.replace(/([A-Za-z\)])<sub>(\d+)<\/sub>([+]+)/g, '$1<sub>$2</sub><sup>$3</sup>');
    formatted = formatted.replace(/([A-Za-z\)])([+]+)/g, '$1<sup>$2</sup>');
    
    // Handle common reaction arrows
    formatted = formatted.replace(/->/g, '→');
    formatted = formatted.replace(/<->/g, '⇌');
    formatted = formatted.replace(/=>/g, '⇒');
    
    return formatted;
  };
  
  return (
    <span 
      className={`chemistry-equation ${className}`}
      dangerouslySetInnerHTML={{ __html: formatEquation() }} 
    />
  );
};

/**
 * Component for rendering multiple chemical equations in a block
 * Allows for displaying equation systems or multi-step reactions
 */
export const ChemistryEquationBlock: React.FC<{
  equations: string[];
  className?: string;
}> = ({ equations, className = '' }) => {
  if (!equations || equations.length === 0) return null;
  
  return (
    <div className={`chemistry-equation-block ${className}`}>
      {equations.map((eq, index) => (
        <div key={index} className="mb-2">
          <ChemistryEquation equation={eq} />
        </div>
      ))}
    </div>
  );
};

export default ChemistryEquation;
