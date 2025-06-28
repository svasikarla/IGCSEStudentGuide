/**
 * Chemistry content formatting utility
 * Detects and formats chemical formulas and equations within text content
 */

/**
 * Formats a chemical formula with proper subscripts
 * Example: H2O -> H₂O, CO2 -> CO₂
 * @param formula - The chemical formula to format
 * @returns The formatted formula with HTML subscripts
 */
export function formatChemicalFormula(formula: string): string {
  if (!formula) return '';
  
  // Convert numbers after element symbols to subscripts
  return formula.replace(/([A-Za-z\)])(\d+)/g, '$1<sub>$2</sub>');
}

/**
 * Formats a chemical equation with proper subscripts and arrow symbols
 * @param equation - The chemical equation to format
 * @returns The formatted equation with HTML subscripts and proper arrow symbols
 */
export function formatChemicalEquation(equation: string): string {
  if (!equation) return '';
  
  // Format formulas with subscripts
  let formatted = formatChemicalFormula(equation);
  
  // Handle superscripts for ions (e.g., Ca2+)
  formatted = formatted.replace(/([A-Za-z\)])<sub>(\d+)<\/sub>([+]+)/g, '$1<sub>$2</sub><sup>$3</sup>');
  formatted = formatted.replace(/([A-Za-z\)])([+]+)/g, '$1<sup>$2</sup>');
  
  // Handle common reaction arrows
  formatted = formatted.replace(/->/g, '→');
  formatted = formatted.replace(/<->/g, '⇌');
  formatted = formatted.replace(/=>/g, '⇒');
  
  return formatted;
}

/**
 * Regular expressions for detecting chemical formulas and equations
 */
const CHEMISTRY_REGEX = {
  // Chemical formula pattern (e.g., H2O, CO2, Ca(OH)2)
  FORMULA: /([A-Z][a-z]*)(\d*)|(\(([A-Z][a-z]*(\d*))+\))(\d+)/g,
  
  // Chemical equation pattern (e.g., 2H2 + O2 -> 2H2O)
  EQUATION: /(?:\d*[A-Z][a-z]*\d*)+\s*(?:[+]\s*(?:\d*[A-Z][a-z]*\d*)+\s*)*(?:->|→|⟶|⇌)\s*(?:\d*[A-Z][a-z]*\d*)+\s*(?:[+]\s*(?:\d*[A-Z][a-z]*\d*)+\s*)*/g
};

/**
 * Finds and formats all chemical formulas within HTML content
 * @param content - HTML content containing chemical formulas
 * @returns HTML with formatted chemical formulas
 */
export function formatChemistryInHTML(content: string): string {
  if (!content) return '';
  
  // Skip processing if the content already contains subscript HTML tags
  if (content.includes('<sub>')) return content;
  
  // Create a temporary element to work with the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  // Process text nodes only (skip script tags, etc.)
  const textNodes = getTextNodesIn(tempDiv);
  
  textNodes.forEach(node => {
    if (!node.nodeValue) return;
    
    // Format chemical formulas in text
    const html = node.nodeValue
      // Format full equations first
      .replace(CHEMISTRY_REGEX.EQUATION, match => formatChemicalEquation(match))
      // Then format any remaining standalone formulas
      .replace(CHEMISTRY_REGEX.FORMULA, match => formatChemicalFormula(match));
    
    // Replace the node if changes were made
    if (html !== node.nodeValue) {
      const span = document.createElement('span');
      span.innerHTML = html;
      if (node.parentNode) {
        node.parentNode.replaceChild(span, node);
      }
    }
  });
  
  return tempDiv.innerHTML;
}

/**
 * Gets all text nodes within an element
 * @param el - The element to search within
 * @returns Array of text nodes
 */
function getTextNodesIn(el: Node): Node[] {
  const textNodes: Node[] = [];
  
  // Skip certain elements where we don't want to format chemistry
  const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE'];
  
  function getTextNodes(node: Node) {
    if (node.nodeType === 3) { // TEXT_NODE
      textNodes.push(node);
    } else if (
      node.nodeType === 1 && // ELEMENT_NODE
      !skipTags.includes((node as Element).tagName) &&
      !(node as Element).classList.contains('chemistry-equation')
    ) {
      // Process children if not a skipped element
      for (let i = 0; i < node.childNodes.length; i++) {
        getTextNodes(node.childNodes[i]);
      }
    }
  }
  
  getTextNodes(el);
  return textNodes;
}

/**
 * Formats chemical formulas and equations in plain text
 * @param text - The text content to format
 * @returns Text with Unicode subscript characters for better readability
 */
export function formatChemistryInText(text: string): string {
  if (!text) return '';
  
  // Map digits to Unicode subscripts
  const subscripts: {[key: string]: string} = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
  };
  
  // Format chemical formulas with Unicode subscripts
  const formattedText = text.replace(
    /([A-Z][a-z]*)(\d+)|(\(([A-Z][a-z]*(\d*))+\))(\d+)/g,
    (match: string, element: string, number: string) => {
      if (!number) return match;
      return element + number.split('').map((digit: string) => subscripts[digit] || digit).join('');
    }
  );
  
  // Format arrows
  return formattedText
    .replace(/->/g, '→')
    .replace(/<->/g, '⇌')
    .replace(/=>/g, '⇒');
}

/**
 * Checks if a string contains chemical formulas or equations
 * @param text - The text to check
 * @returns True if the text contains chemical formulas or equations
 */
export function containsChemicalContent(text: string): boolean {
  if (!text) return false;
  
  // Reset regex lastIndex property
  CHEMISTRY_REGEX.FORMULA.lastIndex = 0;
  CHEMISTRY_REGEX.EQUATION.lastIndex = 0;
  
  return CHEMISTRY_REGEX.FORMULA.test(text) || CHEMISTRY_REGEX.EQUATION.test(text);
}
