import { useState } from 'react';
import { llmService, LLMProvider, LLMServiceOptions } from '../services/llmService';
import { supabase } from '../lib/supabase';
import { Subject } from './useSubjects';
import { Topic } from './useTopics';
import { Flashcard } from './useFlashcards';
import { useAuth } from '../contexts/AuthContext';
import { validateChemistryContent, ValidationResult, isChemistryContent as isChemContent } from '../utils/chemistryValidator';

// --- Shared Utility Functions ---

/**
 * Fix common JSON parsing issues in LLM responses
 * @param jsonString - The malformed JSON string
 * @returns Fixed JSON string
 */
const fixJsonString = (jsonString: string): string => {
  let fixed = jsonString.trim();

  // Fix 1: Quote unquoted property names
  fixed = fixed.replace(/(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, whitespace, propName) => {
    if (!match.includes('"')) {
      return `${whitespace}"${propName}":`;
    }
    return match;
  });

  // Fix 2: Quote unquoted property names at line start
  fixed = fixed.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, (match, whitespace, propName) => {
    if (!match.includes('"')) {
      return `${whitespace}"${propName}":`;
    }
    return match;
  });

  // Fix 3: Quote unquoted property names after commas
  fixed = fixed.replace(/,(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, whitespace, propName) => {
    if (!match.includes('"')) {
      return `,${whitespace}"${propName}":`;
    }
    return match;
  });

  // Fix 4: Replace single quotes with double quotes for property names
  fixed = fixed.replace(/(\s*)'([^']*)'(\s*:)/g, '$1"$2"$3');

  // Fix 5: Replace single quotes with double quotes for property values
  fixed = fixed.replace(/(\s*:\s*)'([^']*)'(\s*[,}])/g, '$1"$2"$3');

  // Fix 6: Remove trailing commas before closing braces
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // Fix 7: Fix missing commas between properties
  fixed = fixed.replace(/"([^"]*)"(\s+)"([^"]*)"(\s*:)/g, '"$1", "$3"$4');

  // Fix 8: Handle unterminated strings at the end
  const quoteCount = (fixed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    if (!fixed.trim().endsWith('"')) {
      fixed = fixed.trim() + '"';
    }
  }

  return fixed;
};

/**
 * Shared function to generate content for a single topic
 * Used by both useTopicListGeneration and useTopicContentGeneration
 */
const generateSingleTopicContent = async (
  subjectName: string,
  topicName: string,
  gradeLevel: string,
  provider: LLMProvider,
  model: string,
  authToken: string
): Promise<Partial<Topic> | null> => {
  try {
    let instruction = `For the subject "${subjectName}", generate a comprehensive topic breakdown for the topic "${topicName}".`;
    if (gradeLevel && gradeLevel.trim() !== '') {
      instruction += ` This content should be tailored for IGCSE grade levels ${gradeLevel}.`;
    }
    if (isChemContent(subjectName)) {
      instruction += ` The subject is chemistry, so ensure all chemical formulas, equations, and terminology are accurate and correctly formatted.`;
    }

    instruction += ` Provide detailed, educational content that helps students understand and master this topic.`;

    const systemPrompt = `
      ${instruction}
      Return a single JSON object with these fields:
      - title: The title of the topic (use "${topicName}" or improve it)
      - description: A brief description of the topic (1-2 sentences)
      - content: Detailed educational content for this topic (at least 500 words, with markdown formatting, including headings, lists, and bold text for key terms).
      - difficulty_level: A number from 1-5 representing difficulty (1=easiest, 5=hardest)
      - estimated_study_time_minutes: Estimated time to study this topic in minutes (e.g., 45)
      - learning_objectives: An array of 3-5 learning objectives for this topic
    `;

    const result = await llmService.generateJSON<Partial<Topic>>(systemPrompt, {
      authToken,
      provider,
      model,
      maxTokens: 4000, // Increase token limit for detailed content
    });

    if (result && result.content && isChemContent(subjectName)) {
      console.log('Validating Chemistry topic content...');
      const validation = validateChemistryContent(result.content);
      if (validation.warnings.length > 0 || validation.errors.length > 0) {
        console.warn('Chemistry content validation issues:', validation);
      }
    }

    return result;
  } catch (err) {
    console.error(`Failed to generate content for topic "${topicName}":`, err);
    return null;
  }
};

// --- Interfaces ---

export interface GeneratedSubject {
  name: string;
  code: string;
  description: string;
  color_hex: string;
  icon_name: string;
}

export interface GeneratedTopic {
  title: string;
  description: string;
  content: string;
  difficulty_level: number;
  estimated_study_time_minutes: number;
  learning_objectives: string[];
}

export interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  difficulty_level: number;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  difficulty_level: number;
  time_limit_minutes: number;
  questions: QuizQuestion[];
}

// --- Helper Functions ---

const isChemistryContent = (subjectName: string): boolean => {
  if (!subjectName) return false;
  const normalizedSubject = subjectName.toLowerCase().trim();
  return normalizedSubject.includes('chemistry') ||
    normalizedSubject.includes('chemical') ||
    normalizedSubject === 'chem';
};


// --- Custom Hooks ---

/**
 * Hook for generating a list of topics for a subject.
 */
export function useTopicListGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const generateTopicList = async (
    subjectName: string,
    gradeLevel: string,
    provider: LLMProvider,
    model: string,
    curriculumBoard: string = 'Cambridge IGCSE',
    tier?: string
  ): Promise<Partial<Topic>[] | null> => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.access_token) {
        throw new Error('Authentication required.');
      }

      const systemPrompt = `
        You are an expert ${curriculumBoard} curriculum designer with comprehensive knowledge of official IGCSE syllabi.

        TASK: Generate a COMPLETE curriculum structure for "${subjectName}" at grade level(s) "${gradeLevel}"${tier ? ` (${tier} tier)` : ''}.

        REQUIREMENTS:
        1. Generate comprehensive topics to provide 100% syllabus coverage
        2. Topics should be organized within chapters (use the chapter structure for organization)
        3. Include official syllabus reference codes where applicable
        4. Ensure comprehensive coverage of all curriculum requirements

        STRUCTURE:
        - Each topic is a specific learning unit
        - Topics will be assigned to appropriate chapters after generation
        - Include both main topics and subtopics in a flat structure

        Return a JSON array where each object has:
        {
          "title": "Specific, descriptive topic title",
          "description": "Brief description (1 sentence)",
          "syllabus_code": "Internal reference code (e.g., 1.1, 1.2.1)",
          "official_syllabus_ref": "Official curriculum reference if applicable",
          "difficulty_level": 1-5,
          "estimated_study_time_minutes": 30-120
        }

        Example for Biology:
        [
          {"title": "Cell Structure and Organization", "description": "Components of animal and plant cells.", "syllabus_code": "1.1", "official_syllabus_ref": "B1.1", "difficulty_level": 2, "estimated_study_time_minutes": 45},
          {"title": "Cell Membrane Structure", "description": "Structure and function of cell membranes.", "syllabus_code": "1.1.1", "official_syllabus_ref": "B1.1a", "difficulty_level": 3, "estimated_study_time_minutes": 30},
          {"title": "Organelles and Their Functions", "description": "Roles of different cellular organelles.", "syllabus_code": "1.1.2", "official_syllabus_ref": "B1.1b", "difficulty_level": 2, "estimated_study_time_minutes": 40}
        ]
      `;

      const response = await llmService.generateContent(systemPrompt, {
        authToken: session.access_token,
        provider,
        model,
        temperature: 0.3,
        maxTokens: 8000, // Increased for comprehensive generation
      });

      if (!response) {
        throw new Error('LLM service returned no response.');
      }

      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']');
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No JSON array found in the LLM response.');
      }
      const jsonString = response.substring(startIndex, endIndex + 1);

      // Apply smart JSON parsing with error handling
      let parsedTopics;
      try {
        parsedTopics = JSON.parse(jsonString);
      } catch (parseError) {
        console.log('Topic generation JSON parse failed, attempting to fix:', parseError);

        // Try to fix common JSON issues
        const fixedJson = fixJsonString(jsonString);
        try {
          parsedTopics = JSON.parse(fixedJson);
          console.log('✅ Topic generation JSON fixed and parsed successfully');
        } catch (finalError) {
          console.error('Topic generation JSON fix failed:', finalError);
          const errorMessage = finalError instanceof Error ? finalError.message : 'Unknown parsing error';
          throw new Error(`Failed to parse topic generation response: ${errorMessage}`);
        }
      }

      if (!Array.isArray(parsedTopics)) {
        throw new Error('LLM response is not a JSON array.');
      }

      return parsedTopics.map((topic: any) => ({
        title: topic.title || 'Untitled Topic',
        description: topic.description || 'No description provided.',
        syllabus_code: topic.syllabus_code || null,
        official_syllabus_ref: topic.official_syllabus_ref || null,
        difficulty_level: topic.difficulty_level || 1,
        estimated_study_time_minutes: topic.estimated_study_time_minutes || 30,
        curriculum_board: curriculumBoard,
        tier: tier || null,
      })).filter(t => t.title && t.description);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate topic list';
      setError(errorMessage);
      console.error(errorMessage, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate comprehensive curriculum using chunked approach for better token management
   */
  const generateComprehensiveCurriculum = async (
    subjectName: string,
    gradeLevel: string,
    provider: LLMProvider,
    model: string,
    curriculumBoard: string = 'Cambridge IGCSE',
    tier?: string,
    includeContent: boolean = false,
    onProgress?: (phase: string, progress: number, currentTopic?: string) => void
  ): Promise<Partial<Topic>[] | null> => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.access_token) {
        throw new Error('Authentication required.');
      }

      // Step 1: Generate chapters first
      const chaptersPrompt = `
        You are an expert ${curriculumBoard} curriculum designer.

        Generate the main chapters for "${subjectName}" at grade level(s) "${gradeLevel}"${tier ? ` (${tier} tier)` : ''}.

        Return 5-8 chapters that comprehensively cover the entire syllabus.

        Return a JSON array of objects with:
        {
          "title": "Chapter title",
          "description": "Brief description of this chapter",
          "syllabus_code": "Sequential code (1, 2, 3, etc.)",
          "official_syllabus_ref": "Official reference if known"
        }
      `;

      const chaptersResponse = await llmService.generateContent(chaptersPrompt, {
        authToken: session.access_token,
        provider,
        model,
        temperature: 0.3,
        maxTokens: 2000,
      });

      if (!chaptersResponse) {
        throw new Error('Failed to generate chapters.');
      }

      const chaptersJson = chaptersResponse.substring(
        chaptersResponse.indexOf('['),
        chaptersResponse.lastIndexOf(']') + 1
      );
      const chapters = JSON.parse(chaptersJson);

      // Step 2: Generate detailed topics for each chapter
      const allTopics: Partial<Topic>[] = [];

      for (const [index, chapter] of chapters.entries()) {
        const detailedPrompt = `
          You are an expert ${curriculumBoard} curriculum designer.

          For the chapter "${chapter.title}" in "${subjectName}" (${gradeLevel}${tier ? `, ${tier} tier` : ''}), generate a comprehensive list of ALL topics.

          Generate 10-20 specific topics to ensure complete coverage of this chapter.

          IMPORTANT TITLE REQUIREMENTS:
          - Create SPECIFIC, DESCRIPTIVE titles that avoid generic terms
          - DO NOT use generic titles like "Introduction", "Overview", "Fundamentals", "Basics", "Principles"
          - Instead use specific titles like "Cell Structure Components", "DNA Replication Process", "Photosynthesis Mechanisms"
          - Each title must be unique and descriptive of the specific content

          Return a JSON array where each object has:
          {
            "title": "Specific, descriptive topic title (avoid generic terms)",
            "description": "Brief description (1 sentence)",
            "syllabus_code": "${chapter.syllabus_code}.X",
            "official_syllabus_ref": "Official reference if applicable",
            "difficulty_level": 1-5,
            "estimated_study_time_minutes": 30-90
          }
        `;

        const detailedResponse = await llmService.generateContent(detailedPrompt, {
          authToken: session.access_token,
          provider,
          model,
          temperature: 0.3,
          maxTokens: 4000,
        });

        if (detailedResponse) {
          const detailedJson = detailedResponse.substring(
            detailedResponse.indexOf('['),
            detailedResponse.lastIndexOf(']') + 1
          );

          // Apply smart JSON parsing with error handling
          let detailedTopics;
          try {
            detailedTopics = JSON.parse(detailedJson);
          } catch (parseError) {
            console.log('Detailed topic generation JSON parse failed, attempting to fix:', parseError);

            // Try to fix common JSON issues
            const fixedJson = fixJsonString(detailedJson);
            try {
              detailedTopics = JSON.parse(fixedJson);
              console.log('✅ Detailed topic generation JSON fixed and parsed successfully');
            } catch (finalError) {
              console.error('Detailed topic generation JSON fix failed:', finalError);
              const errorMessage = finalError instanceof Error ? finalError.message : 'Unknown parsing error';
              console.log(`Skipping this chapter due to JSON parsing error: ${errorMessage}`);
              continue; // Skip this chapter and continue with the next one
            }
          }

          // Add all topics for this chapter (no longer adding chapter as a separate topic)
          // Note: Chapters should be created separately, topics reference them via chapter_id
          allTopics.push(...detailedTopics.map((topic: any) => ({
            ...topic,
            curriculum_board: curriculumBoard,
            tier: tier || null,
          })));
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 3: Generate content for topics if requested
      if (includeContent && allTopics.length > 0) {
        onProgress?.('Generating detailed content for topics...', 70);

        const topicsWithContent: Partial<Topic>[] = [];
        const totalTopics = allTopics.length;

        for (let i = 0; i < allTopics.length; i++) {
          const topic = allTopics[i];
          const progressPercent = 70 + Math.round((i / totalTopics) * 25); // 70-95%

          onProgress?.(`Generating content for: ${topic.title}`, progressPercent, topic.title);

          try {
            // Generate content for this topic using inline implementation
            const contentResult = await generateSingleTopicContent(
              subjectName,
              topic.title || 'Untitled Topic',
              gradeLevel,
              provider,
              model,
              session.access_token
            );

            if (contentResult && contentResult.content) {
              topicsWithContent.push({
                ...topic,
                content: contentResult.content,
                learning_objectives: contentResult.learning_objectives || null,
              });
            } else {
              // Keep topic without content if generation fails
              topicsWithContent.push(topic);
            }
          } catch (contentError) {
            console.warn(`Failed to generate content for topic "${topic.title}":`, contentError);
            // Keep topic without content if generation fails
            topicsWithContent.push(topic);
          }

          // Add delay to respect rate limits
          if (i < allTopics.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        }

        onProgress?.('Content generation complete!', 95);
        return topicsWithContent;
      }

      return allTopics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate comprehensive curriculum';
      setError(errorMessage);
      console.error(errorMessage, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Alias for backward compatibility and cleaner API
  const generateCurriculum = generateComprehensiveCurriculum;

  return {
    generateTopicList,
    generateComprehensiveCurriculum,
    generateCurriculum,
    loading,
    error
  };
}


/**
 * Hook for generating the detailed content of a single topic.
 */
export function useTopicContentGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const { session } = useAuth();

  const generateTopicContent = async (
    subjectName: string,
    topicName: string,
    gradeLevel: string,
    provider: LLMProvider,
    model: string
  ): Promise<Partial<Topic> | null> => {
    try {
      setLoading(true);
      setError(null);
      setValidationResults(null);

      if (!session || !session.access_token) {
        throw new Error('Authentication required.');
      }

      // Use the shared content generation function
      const result = await generateSingleTopicContent(
        subjectName,
        topicName,
        gradeLevel,
        provider,
        model,
        session.access_token
      );

      if (result && result.content && isChemistryContent(subjectName)) {
        console.log('Validating Chemistry topic content...');
        const validation = validateChemistryContent(result.content);
        setValidationResults(validation);
        if (validation.warnings.length > 0 || validation.errors.length > 0) {
          console.warn('Chemistry content validation issues:', validation);
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate topic content';
      setError(errorMessage);
      console.error(errorMessage, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateTopicContent, loading, error, validationResults };
}

/**
 * Hook for generating and saving flashcards using an LLM.
 */
export function useLLMFlashcardGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const { session } = useAuth();

  const generateFlashcards = async (
    subjectName: string,
    topicTitle: string,
    count: number,
    difficulty: string,
    provider: LLMProvider,
    model: string
  ): Promise<Partial<Flashcard>[] | null> => {
    try {
      setLoading(true);
      setError(null);
      setValidationResults(null);

      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in.');
      }

      const prompt = `You are an expert in creating educational content for the IGCSE curriculum. Your task is to generate a set of ${count} high-quality flashcards for the topic "${topicTitle}" in the subject "${subjectName}". The target audience is IGCSE students, and the difficulty level should be ${difficulty}.

Each flashcard must have a 'front_content' (a question, term, or concept) and a 'back_content' (a concise and accurate answer or explanation).

Return the output as a JSON array of objects. For example:
[
  {
    "front_content": "What is the chemical symbol for Gold?",
    "back_content": "Au"
  },
  {
    "front_content": "Define 'isotope'.",
    "back_content": "Atoms of the same element that have the same number of protons but a different number of neutrons."
  }
]`;

      const response = await llmService.generateContent(prompt, {
        authToken: session.access_token,
        provider,
        model,
        temperature: 0.7,
        maxTokens: 150 * count,
      });

      if (!response) {
        throw new Error('LLM service returned no response.');
      }

      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']');
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No JSON array found in the LLM response.');
      }
      const jsonString = response.substring(startIndex, endIndex + 1);
      const parsedFlashcards = JSON.parse(jsonString);

      if (!Array.isArray(parsedFlashcards)) {
        throw new Error('LLM response is not a JSON array.');
      }

      const validFlashcards = parsedFlashcards.filter(fc => fc.front_content && fc.back_content);

      if (isChemistryContent(subjectName)) {
        const allContent = validFlashcards.map(fc => `${fc.front_content}\n${fc.back_content}`).join('\n\n');
        const validation = validateChemistryContent(allContent);
        setValidationResults(validation);
        if (validation.warnings.length > 0 || validation.errors.length > 0) {
          console.warn('Chemistry content validation issues:', validation);
        }
      }

      return validFlashcards;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate flashcards';
      setError(errorMessage);
      console.error('Error generating or parsing flashcards:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateFlashcards, loading, error, validationResults };
}


/**
 * Hook for generating quizzes using an LLM.
 */
export function useQuizGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const { session } = useAuth();

  const generateQuiz = async (
    topicTitle: string,
    topicContent: string,
    questionCount: number,
    difficulty: string,
    provider: LLMProvider,
    model: string
  ): Promise<GeneratedQuiz | null> => {
    try {
      setLoading(true);
      setError(null);
      setValidationResults(null);

      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in to generate a quiz.');
      }

      const systemPrompt = `
        You are an expert IGCSE quiz creator. Based on the topic "${topicTitle}" and its content, generate a quiz with ${questionCount} multiple-choice questions with a difficulty level of '${difficulty}'.
        The quiz should assess understanding of the key concepts in the provided content.
        
        Return a single JSON object with these fields:
        - title: A suitable title for the quiz (e.g., "Quiz: ${topicTitle}")
        - description: A brief description of what the quiz covers.
        - difficulty_level: A number from 1-5 representing the overall difficulty.
        - time_limit_minutes: An estimated time limit in minutes.
        - questions: An array of question objects. Each question object must have:
          - question_text: The text of the question.
          - options: An array of 4 strings representing the possible answers.
          - correct_answer_index: The 0-based index of the correct answer in the options array.
          - explanation: A brief explanation for the correct answer.
          - difficulty_level: A number from 1-5 representing difficulty.
      `;

      const result = await llmService.generateJSON<GeneratedQuiz>(systemPrompt, {
        maxTokens: 3000,
        authToken: session.access_token,
        provider: provider,
        model: model,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate quiz';
      setError(errorMessage);
      console.error('Error generating quiz:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateQuiz, loading, error, validationResults };
}

/**
 * Combined hook for LLM generation functionality.
 * Provides access to topic content generation.
 */
export function useLLMGeneration() {
  const { generateTopicContent, loading, error, validationResults } = useTopicContentGeneration();

  return {
    generateTopicContent,
    loading,
    error,
    validationResults
  };
}