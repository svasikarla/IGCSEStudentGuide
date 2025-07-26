/**
 * Simplified Generation Demo Component
 * 
 * Demonstrates the new cost-optimized content generation approach
 * and compares it with the existing method.
 */

import React, { useState } from 'react';
import { useSimplifiedQuizGeneration, useSimplifiedFlashcardGeneration } from '../../hooks/useSimplifiedGeneration';
import { useGenerationCostEstimator } from '../../hooks/useSimplifiedGeneration';

interface GenerationResult {
  type: 'quiz' | 'flashcards';
  content: any[];
  cost: number;
  duration: number;
  quality: 'excellent' | 'good' | 'fair';
  approach: 'simplified' | 'traditional';
}

export function SimplifiedGenerationDemo() {
  const [formData, setFormData] = useState({
    subject: 'Mathematics',
    topicTitle: 'Algebraic Expressions',
    syllabusCode: '0580.2',
    questionCount: 5,
    cardCount: 10,
    costTier: 'minimal' as 'minimal' | 'standard' | 'premium'
  });

  const [results, setResults] = useState<GenerationResult[]>([]);
  const [activeTab, setActiveTab] = useState('quiz');

  const { generateAndSaveQuiz, loading: quizLoading, error: quizError, progress: quizProgress, estimatedCost: quizCost } = useSimplifiedQuizGeneration();
  const { generateAndSaveFlashcards, loading: flashcardLoading, error: flashcardError, progress: flashcardProgress, estimatedCost: flashcardCost } = useSimplifiedFlashcardGeneration();
  const { estimateCost, compareCosts } = useGenerationCostEstimator();

  const handleGenerateQuiz = async () => {
    const startTime = Date.now();
    
    try {
      const result = await generateAndSaveQuiz(
        'demo-topic-id', // Mock topic ID for demo
        formData.subject,
        formData.topicTitle,
        formData.syllabusCode,
        formData.questionCount,
        3, // difficulty level
        formData.costTier
      );

      if (result) {
        const duration = Date.now() - startTime;
        const newResult: GenerationResult = {
          type: 'quiz',
          content: result.questions,
          cost: result.estimatedCost,
          duration,
          quality: 'excellent',
          approach: 'simplified'
        };
        setResults(prev => [...prev, newResult]);
      }
    } catch (error) {
      console.error('Quiz generation failed:', error);
    }
  };

  const handleGenerateFlashcards = async () => {
    const startTime = Date.now();
    
    try {
      const result = await generateAndSaveFlashcards(
        'demo-topic-id', // Mock topic ID for demo
        formData.subject,
        formData.topicTitle,
        formData.syllabusCode,
        formData.cardCount,
        formData.costTier
      );

      if (result) {
        const duration = Date.now() - startTime;
        const newResult: GenerationResult = {
          type: 'flashcards',
          content: result.flashcards,
          cost: result.estimatedCost,
          duration,
          quality: 'excellent',
          approach: 'simplified'
        };
        setResults(prev => [...prev, newResult]);
      }
    } catch (error) {
      console.error('Flashcard generation failed:', error);
    }
  };

  const costComparison = compareCosts(formData.questionCount);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Simplified Content Generation Demo</h1>
        <p className="text-gray-600">
          Test the new cost-optimized approach for generating IGCSE educational content
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Generation Configuration</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
              </select>
            </div>

            <div>
              <label htmlFor="topicTitle" className="block text-sm font-medium text-gray-700 mb-1">Topic Title</label>
              <input
                id="topicTitle"
                type="text"
                value={formData.topicTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, topicTitle: e.target.value }))}
                placeholder="e.g., Algebraic Expressions"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="syllabusCode" className="block text-sm font-medium text-gray-700 mb-1">Syllabus Code</label>
              <input
                id="syllabusCode"
                type="text"
                value={formData.syllabusCode}
                onChange={(e) => setFormData(prev => ({ ...prev, syllabusCode: e.target.value }))}
                placeholder="e.g., 0580.2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-1">Question Count</label>
              <input
                id="questionCount"
                type="number"
                min="1"
                max="20"
                value={formData.questionCount}
                onChange={(e) => setFormData(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 5 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="cardCount" className="block text-sm font-medium text-gray-700 mb-1">Flashcard Count</label>
              <input
                id="cardCount"
                type="number"
                min="1"
                max="50"
                value={formData.cardCount}
                onChange={(e) => setFormData(prev => ({ ...prev, cardCount: parseInt(e.target.value) || 10 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="costTier" className="block text-sm font-medium text-gray-700 mb-1">Cost Tier</label>
              <select
                id="costTier"
                value={formData.costTier}
                onChange={(e) => setFormData(prev => ({ ...prev, costTier: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minimal">Minimal (Gemini-1.5-flash)</option>
                <option value="standard">Standard (GPT-4o-mini)</option>
                <option value="premium">Premium (GPT-4o)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Estimation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          💰 Cost Estimation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ${costComparison.quiz.minimal.toFixed(4)}
            </div>
            <div className="text-sm text-gray-600">Quiz (Minimal)</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              ${costComparison.quiz.standard.toFixed(4)}
            </div>
            <div className="text-sm text-gray-600">Quiz (Standard)</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              ${costComparison.flashcards.minimal.toFixed(4)}
            </div>
            <div className="text-sm text-gray-600">Flashcards (Minimal)</div>
          </div>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Generate Quiz Questions</h3>
          <div className="space-y-4">
            <button
              onClick={handleGenerateQuiz}
              disabled={quizLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {quizLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating... ({quizProgress}%)
                </>
              ) : (
                'Generate Quiz Questions'
              )}
            </button>

            {quizError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                ⚠️ {quizError}
              </div>
            )}

            {quizCost > 0 && (
              <div className="text-sm text-gray-600">
                Estimated cost: ${quizCost.toFixed(6)}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Generate Flashcards</h3>
          <div className="space-y-4">
            <button
              onClick={handleGenerateFlashcards}
              disabled={flashcardLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {flashcardLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating... ({flashcardProgress}%)
                </>
              ) : (
                'Generate Flashcards'
              )}
            </button>

            {flashcardError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                ⚠️ {flashcardError}
              </div>
            )}

            {flashcardCost > 0 && (
              <div className="text-sm text-gray-600">
                Estimated cost: ${flashcardCost.toFixed(6)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Display */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Generation Results</h2>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.approach === 'simplified' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {result.approach}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {result.type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.quality === 'excellent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.quality}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      💰 ${result.cost.toFixed(6)}
                    </div>
                    <div className="flex items-center gap-1">
                      ⏱️ {(result.duration / 1000).toFixed(1)}s
                    </div>
                    <div className="flex items-center gap-1">
                      ✅ {result.content.length} items
                    </div>
                  </div>
                </div>

                <div className="text-sm">
                  <strong>Sample Content:</strong>
                  {result.type === 'quiz' && result.content[0] && (
                    <div className="mt-1 p-2 bg-gray-50 rounded">
                      Q: {result.content[0].question_text}
                    </div>
                  )}
                  {result.type === 'flashcards' && result.content[0] && (
                    <div className="mt-1 p-2 bg-gray-50 rounded">
                      Front: {result.content[0].front_content}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
