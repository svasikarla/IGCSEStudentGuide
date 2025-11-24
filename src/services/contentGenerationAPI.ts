/**
 * Content Generation API Client
 *
 * Thin wrapper for the unified /api/content-generation endpoints.
 * Replaces direct calls to old /api/llm and /api/simplified-generation endpoints.
 *
 * All generation endpoints now require authentication (Teacher/Admin role).
 */

import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Get authentication headers with current user's token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export interface ContentGenerationOptions {
  provider?: 'openai' | 'google' | 'huggingface';
  model?: string;
  costTier?: 'ultra_minimal' | 'minimal' | 'standard' | 'premium';
  temperature?: number;
  maxTokens?: number;
}

export interface QuizGenerationParams {
  subject: string;
  topicTitle: string;
  syllabusCode: string;
  questionCount?: number;
  difficultyLevel?: number;
  grade?: number;
}

export interface ExamPaperGenerationParams {
  subject: string;
  topicTitle: string;
  syllabusCode: string;
  duration?: number;
  totalMarks?: number;
  grade?: number;
}

export interface FlashcardGenerationParams {
  subject: string;
  topicTitle: string;
  syllabusCode: string;
  cardCount?: number;
  grade?: number;
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

export interface GenerationMetadata {
  subject: string;
  topicTitle: string;
  syllabusCode?: string;
  questionCount?: number;
  cardCount?: number;
  difficultyLevel?: number;
  costTier: string;
  estimatedCost: string;
  provider: string;
  model: string;
  generationTimestamp: string;
}

export interface QuizGenerationResponse {
  questions: QuizQuestion[];
  metadata: GenerationMetadata;
  warnings?: string[];
}

export interface ExamPaperGenerationResponse {
  title: string;
  instructions: string;
  duration_minutes: number;
  total_marks: number;
  questions: ExamQuestion[];
  sections?: any[];
  metadata: GenerationMetadata;
  warnings?: string[];
}

export interface FlashcardGenerationResponse {
  flashcards: Flashcard[];
  metadata: GenerationMetadata;
  warnings?: string[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  models: string[];
  setupUrl?: string;
  costTier?: string;
  description?: string;
}

/**
 * Generate quiz questions
 * @requires Authentication - Teacher or Admin role
 */
export async function generateQuiz(
  params: QuizGenerationParams,
  options: ContentGenerationOptions = {}
): Promise<QuizGenerationResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/content-generation/quiz`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...params, ...options }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to generate quiz');
  }

  return response.json();
}

/**
 * Generate exam paper
 * @requires Authentication - Teacher or Admin role
 */
export async function generateExamPaper(
  params: ExamPaperGenerationParams,
  options: ContentGenerationOptions = {}
): Promise<ExamPaperGenerationResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/content-generation/exam`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...params, ...options }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to generate exam paper');
  }

  return response.json();
}

/**
 * Generate flashcards
 * @requires Authentication - Teacher or Admin role
 */
export async function generateFlashcards(
  params: FlashcardGenerationParams,
  options: ContentGenerationOptions = {}
): Promise<FlashcardGenerationResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/content-generation/flashcards`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...params, ...options }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to generate flashcards');
  }

  return response.json();
}

/**
 * Get available providers
 */
export async function getAvailableProviders(): Promise<ProviderInfo[]> {
  const response = await fetch(`${API_BASE_URL}/content-generation/providers`);

  if (!response.ok) {
    throw new Error('Failed to fetch available providers');
  }

  return response.json();
}

/**
 * Get service health status
 */
export async function getServiceHealth() {
  const response = await fetch(`${API_BASE_URL}/content-generation/health`);
  return response.json();
}

/**
 * Get cost estimate
 */
export async function getCostEstimate(contentType: 'quiz' | 'exam' | 'flashcards', itemCount: number) {
  const response = await fetch(
    `${API_BASE_URL}/content-generation/cost-estimate?contentType=${contentType}&itemCount=${itemCount}`
  );

  if (!response.ok) {
    throw new Error('Failed to get cost estimate');
  }

  return response.json();
}
