/**
 * Flashcard Generation Debugger
 * 
 * This utility helps debug issues with flashcard generation by providing
 * detailed logging and validation at each step of the process.
 */

import { LLMService } from '../services/llmService';
import { createLLMAdapter, LLMProvider } from '../services/llmAdapter';

export interface DebugResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export class FlashcardDebugger {
  private results: DebugResult[] = [];
  
  private log(step: string, success: boolean, data?: any, error?: string) {
    const result: DebugResult = {
      step,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    if (success) {
      console.log(`✅ ${step}:`, data);
    } else {
      console.error(`❌ ${step}:`, error);
    }
  }
  
  /**
   * Test the complete flashcard generation workflow
   */
  async debugFlashcardGeneration(
    topicTitle: string,
    topicContent: string,
    authToken?: string
  ): Promise<DebugResult[]> {
    console.log('🔍 Starting Flashcard Generation Debug...');
    this.results = [];
    
    try {
      // Step 1: Validate inputs
      this.log('Input Validation', true, {
        topicTitle,
        topicContentLength: topicContent?.length || 0,
        hasAuthToken: !!authToken
      });
      
      if (!topicTitle || !topicContent) {
        this.log('Input Validation', false, null, 'Missing topic title or content');
        return this.results;
      }
      
      // Step 2: Create LLM service
      const adapter = createLLMAdapter(LLMProvider.OPENAI);
      const llmService = new LLMService(adapter);
      
      this.log('LLM Service Creation', true, { provider: LLMProvider.OPENAI });
      
      // Step 3: Construct prompt
      const systemPrompt = `
        Generate 3 flashcards for the IGCSE topic "${topicTitle}" based on the following content.
        Use this content as reference: "${topicContent.substring(0, 500)}..."
        
        Return a JSON object with a "flashcards" array, where each flashcard has:
        - front_content: The question or prompt
        - back_content: The answer
        - card_type: One of "basic", "cloze", or "multiple_choice"
        - difficulty_level: A number from 1-5
        - tags: An array of relevant tags
        - hint: A hint to help remember (optional)
        - explanation: A detailed explanation (optional)
      `;
      
      this.log('Prompt Construction', true, {
        promptLength: systemPrompt.length,
        topicTitleUsed: topicTitle,
        contentPreview: topicContent.substring(0, 100) + '...'
      });
      
      // Step 4: Make API call
      try {
        const result = await llmService.generateJSON<any>(systemPrompt, {
          maxTokens: 1500,
          authToken
        });
        
        this.log('API Call', true, {
          resultType: typeof result,
          isArray: Array.isArray(result),
          hasFlashcardsProperty: result && typeof result === 'object' && 'flashcards' in result,
          resultKeys: result && typeof result === 'object' ? Object.keys(result) : null
        });
        
        // Step 5: Validate response format
        let flashcards: any[] = [];
        
        if (Array.isArray(result)) {
          flashcards = result;
          this.log('Response Format', true, { format: 'direct_array', count: flashcards.length });
        } else if (result && typeof result === 'object' && 'flashcards' in result) {
          flashcards = (result as any).flashcards;
          if (Array.isArray(flashcards)) {
            this.log('Response Format', true, { format: 'wrapped_object', count: flashcards.length });
          } else {
            this.log('Response Format', false, null, 'flashcards property is not an array');
            return this.results;
          }
        } else {
          this.log('Response Format', false, { actualResult: result }, 'Unexpected response format');
          return this.results;
        }
        
        // Step 6: Validate flashcard structure
        const validFlashcards = flashcards.filter(card => 
          card && 
          typeof card === 'object' && 
          card.front_content && 
          card.back_content
        );
        
        const invalidFlashcards = flashcards.filter(card => 
          !card || 
          typeof card !== 'object' || 
          !card.front_content || 
          !card.back_content
        );
        
        this.log('Flashcard Validation', invalidFlashcards.length === 0, {
          totalCards: flashcards.length,
          validCards: validFlashcards.length,
          invalidCards: invalidFlashcards.length,
          sampleCard: validFlashcards[0] || null,
          invalidCardReasons: invalidFlashcards.map(card => ({
            card,
            issues: [
              !card ? 'null/undefined' : null,
              typeof card !== 'object' ? 'not_object' : null,
              !card?.front_content ? 'missing_front_content' : null,
              !card?.back_content ? 'missing_back_content' : null
            ].filter(Boolean)
          }))
        });
        
        // Step 7: Test React state update simulation
        if (validFlashcards.length > 0) {
          this.log('State Update Simulation', true, {
            wouldSetState: true,
            flashcardsToSet: validFlashcards,
            uiWouldRender: true
          });
        } else {
          this.log('State Update Simulation', false, null, 'No valid flashcards to set in state');
        }
        
      } catch (apiError) {
        this.log('API Call', false, null, apiError instanceof Error ? apiError.message : 'Unknown API error');
      }
      
    } catch (error) {
      this.log('Debug Process', false, null, error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('🔍 Debug Complete. Results:', this.results);
    return this.results;
  }
  
  /**
   * Get a summary of the debug results
   */
  getSummary(): { success: boolean; failedSteps: string[]; successfulSteps: string[] } {
    const failedSteps = this.results.filter(r => !r.success).map(r => r.step);
    const successfulSteps = this.results.filter(r => r.success).map(r => r.step);
    
    return {
      success: failedSteps.length === 0,
      failedSteps,
      successfulSteps
    };
  }
}

/**
 * Quick debug function for browser console
 */
export async function debugFlashcards(
  topicTitle: string = "Forces and Motion",
  topicContent: string = "# Forces and Motion\n\nUnderstand Newton's three laws.",
  authToken?: string
): Promise<void> {
  const flashcardDebugger = new FlashcardDebugger();
  const results = await flashcardDebugger.debugFlashcardGeneration(topicTitle, topicContent, authToken);
  const summary = flashcardDebugger.getSummary();
  
  console.log('\n📊 DEBUG SUMMARY:');
  console.log(`Overall Success: ${summary.success ? '✅' : '❌'}`);
  console.log(`Successful Steps: ${summary.successfulSteps.join(', ')}`);
  if (summary.failedSteps.length > 0) {
    console.log(`Failed Steps: ${summary.failedSteps.join(', ')}`);
  }
  
  return;
}

// Export for browser console use
(window as any).debugFlashcards = debugFlashcards;
(window as any).FlashcardDebugger = FlashcardDebugger;
