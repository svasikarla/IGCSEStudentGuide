/**
 * Simplified Content Generator Service
 * 
 * Replaces complex web scraping pipeline with direct LLM-based content generation.
 * Optimized for cost-effectiveness and quality for IGCSE educational content.
 */

import { LLMProvider, LLMService } from './llmService';
import { defaultLLMAdapter } from './llmAdapter';
import { rolloutManager } from './rolloutManager';
import { costMonitor } from './costMonitor';

// Cost-optimized model selection
const MODEL_SELECTION = {
  ultra_minimal: 'meta-llama/Llama-3.1-8B-Instruct',  // ~$0.0001/1M tokens
  minimal: 'gemini-1.5-flash',    // ~$0.075/1M tokens
  standard: 'gpt-4o-mini',        // ~$0.15/1M tokens
  premium: 'claude-3-haiku'       // ~$0.25/1M tokens
} as const;

// Provider selection based on cost and capability
const PROVIDER_SELECTION = {
  ultra_minimal: LLMProvider.HUGGINGFACE,
  minimal: LLMProvider.GOOGLE,
  standard: LLMProvider.OPENAI,
  premium: LLMProvider.ANTHROPIC
} as const;

export interface GenerationOptions {
  costTier?: 'ultra_minimal' | 'minimal' | 'standard' | 'premium';
  maxTokens?: number;
  temperature?: number;
  authToken?: string;
  provider?: LLMProvider;
  model?: string;
  fallbackProvider?: LLMProvider;
  validateQuality?: boolean;
}

export interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer';
  options?: string[];
  correct_answer: string;
  explanation: string;
  difficulty_level: number;
  points: number;
  syllabus_reference: string;
}

export interface ExamQuestion {
  question_number: string;
  question_text: string;
  marks: number;
  answer_space_lines: number;
  command_words: string[];
  difficulty_level: number;
}

export interface Flashcard {
  front_content: string;
  back_content: string;
  card_type: string;
  difficulty_level: number;
  tags: string[];
  hint?: string;
  syllabus_reference: string;
}

export class SimplifiedContentGenerator {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService(defaultLLMAdapter);
  }

  /**
   * Generate quiz questions directly without web scraping
   */
  async generateQuizQuestions(
    subject: string,
    topicTitle: string,
    syllabusCode: string,
    questionCount: number = 5,
    difficultyLevel: number = 3,
    grade: number = 10,
    options: GenerationOptions = {}
  ): Promise<QuizQuestion[]> {
    const costTier = options.costTier || 'minimal';
    const model = options.model || MODEL_SELECTION[costTier];
    const provider = options.provider || PROVIDER_SELECTION[costTier];

    const prompt = `You are an expert IGCSE ${subject} educator creating assessment questions for Grade ${grade} students.

Topic: ${topicTitle}
Syllabus Code: ${syllabusCode}
Difficulty Level: ${difficultyLevel}/5
Question Count: ${questionCount}

Generate ${questionCount} high-quality IGCSE ${subject} questions covering the topic "${topicTitle}".

Requirements:
- Follow Cambridge IGCSE ${subject} curriculum standards
- Include a mix of multiple choice (60%) and short answer (40%) questions
- Ensure questions test understanding, not just memorization
- Provide clear, accurate answers with brief explanations
- Use appropriate scientific terminology and notation
- Match the specified difficulty level

Return JSON format:
{
  "questions": [
    {
      "question_text": "Clear, specific question text",
      "question_type": "multiple_choice" | "short_answer",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"] | null,
      "correct_answer": "A" | "specific answer text",
      "explanation": "Brief explanation of why this is correct",
      "difficulty_level": ${difficultyLevel},
      "points": 1-3,
      "syllabus_reference": "${syllabusCode}"
    }
  ]
}`;

    try {
      const result = await this.llmService.generateJSON<{questions: QuizQuestion[]}>(prompt, {
        provider,
        model,
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        authToken: options.authToken
      });

      return result.questions || [];
    } catch (error) {
      console.error('Error generating quiz questions:', error);
      throw new Error(`Failed to generate quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate exam paper questions directly
   */
  async generateExamPaper(
    subject: string,
    topicTitles: string | string[],
    syllabusCode: string,
    examOptions: {
      questionCount?: number;
      timeLimit?: number;
      difficultyLevel?: number;
      includeMarkingScheme?: boolean;
      provider?: LLMProvider;
      model?: string;
    } = {}
  ): Promise<{title: string; instructions: string; duration_minutes: number; total_marks: number; questions: ExamQuestion[]; sections?: any[]}> {
    const topicTitle = Array.isArray(topicTitles) ? topicTitles.join(', ') : topicTitles;
    const questionCount = examOptions.questionCount || 5;
    const timeLimit = examOptions.timeLimit || 60;
    const difficultyLevel = examOptions.difficultyLevel || 3;
    const model = examOptions.model || MODEL_SELECTION['standard'];
    const provider = examOptions.provider || PROVIDER_SELECTION['standard'];

    const prompt = `You are an expert IGCSE ${subject} examiner creating a formal exam paper for Grade 10 students.

Topic: ${topicTitle}
Syllabus Code: ${syllabusCode}
Paper Duration: ${timeLimit} minutes
Question Count: ${questionCount}

Create a complete IGCSE ${subject} exam paper section covering "${topicTitle}".

Requirements:
- Follow official IGCSE exam paper format and style
- Include command words (state, explain, describe, calculate, etc.)
- Provide appropriate mark allocations
- Include a variety of question types and difficulty levels
- Ensure questions are printer-friendly and clearly formatted
- Include space indicators for student answers

Return JSON format:
{
  "title": "IGCSE ${subject} - ${topicTitle}",
  "instructions": "Answer ALL questions. Show your working clearly.",
  "duration_minutes": ${timeLimit},
  "total_marks": ${questionCount * 5},
  "questions": [
    {
      "question_number": "1",
      "question_text": "Question with clear instructions",
      "marks": 3,
      "answer_space_lines": 4,
      "command_words": ["explain", "describe"],
      "difficulty_level": 1-5
    }
  ]
}`;

    try {
      const result = await this.llmService.generateJSON<{
        title: string;
        instructions: string;
        duration_minutes: number;
        total_marks: number;
        questions: ExamQuestion[];
        sections?: any[];
      }>(prompt, {
        provider,
        model,
        maxTokens: 3000,
        temperature: 0.5
      });

      return result;
    } catch (error) {
      console.error('Error generating exam paper:', error);
      throw new Error(`Failed to generate exam paper: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate flashcards directly
   */
  async generateFlashcards(
    subject: string,
    topicTitle: string,
    syllabusCode: string,
    cardCount: number = 10,
    grade: number = 10,
    options: GenerationOptions = {}
  ): Promise<Flashcard[]> {
    const costTier = options.costTier || 'minimal';
    const model = MODEL_SELECTION[costTier];
    const provider = PROVIDER_SELECTION[costTier];

    const prompt = `You are an expert IGCSE ${subject} educator creating study flashcards for Grade ${grade} students.

Topic: ${topicTitle}
Syllabus Code: ${syllabusCode}
Card Count: ${cardCount}

Generate ${cardCount} effective study flashcards for the topic "${topicTitle}".

Requirements:
- Create clear, concise question-answer pairs
- Focus on key concepts, definitions, and formulas
- Use active recall principles
- Include memory aids and mnemonics where helpful
- Ensure answers are complete but not overwhelming

Return JSON format:
{
  "flashcards": [
    {
      "front_content": "Clear question or term",
      "back_content": "Comprehensive but concise answer",
      "card_type": "basic",
      "difficulty_level": 1-5,
      "tags": ["concept", "definition", "formula"],
      "hint": "Optional memory aid or hint",
      "syllabus_reference": "${syllabusCode}"
    }
  ]
}`;

    try {
      const result = await this.llmService.generateJSON<{flashcards: Flashcard[]}>(prompt, {
        provider,
        model,
        maxTokens: options.maxTokens || 2500,
        temperature: options.temperature || 0.6,
        authToken: options.authToken
      });

      return result.flashcards || [];
    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw new Error(`Failed to generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate estimated cost for generation
   */
  estimateGenerationCost(
    contentType: 'quiz' | 'exam' | 'flashcards',
    itemCount: number,
    costTier: 'ultra_minimal' | 'minimal' | 'standard' | 'premium' = 'minimal'
  ): number {
    const baseCosts = {
      ultra_minimal: 0.0001, // per 1M tokens (Hugging Face)
      minimal: 0.075,        // per 1M tokens
      standard: 0.15,
      premium: 0.25
    };

    const estimatedTokens = {
      quiz: itemCount * 150,      // ~150 tokens per question
      exam: itemCount * 200,      // ~200 tokens per exam question
      flashcards: itemCount * 100 // ~100 tokens per flashcard
    };

    const tokens = estimatedTokens[contentType];
    const costPerToken = baseCosts[costTier] / 1000000;
    
    return tokens * costPerToken;
  }
}

export const simplifiedContentGenerator = new SimplifiedContentGenerator();
