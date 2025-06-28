import React, { useState } from 'react';
import { Topic } from '../../hooks/useTopics';
import { LLMProvider } from '../../services/llmAdapter';
import { useLLMGeneration } from '../../hooks/useLLMGeneration';

interface BulkContentGeneratorProps {
  topics: Topic[];
  subjectName: string;
  gradeLevel: string;
  onContentGenerated?: (topicId: string, content: string) => void;
  onComplete?: () => void;
  className?: string;
}

interface GenerationProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  errors: Array<{ topicId: string; topicTitle: string; error: string }>;
}

const BulkContentGenerator: React.FC<BulkContentGeneratorProps> = ({
  topics,
  subjectName,
  gradeLevel,
  onContentGenerated,
  onComplete,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    current: '',
    errors: []
  });
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { generateTopicContent } = useLLMGeneration();

  // Filter topics that need content
  const topicsNeedingContent = topics.filter(topic => 
    !topic.content || topic.content.trim().length === 0
  );

  const estimatedCost = topicsNeedingContent.length * 0.15; // Rough estimate
  const estimatedTime = Math.ceil(topicsNeedingContent.length * 1.5); // Minutes

  const handleStartGeneration = async () => {
    if (topicsNeedingContent.length === 0) return;

    setIsGenerating(true);
    setProgress({
      total: topicsNeedingContent.length,
      completed: 0,
      failed: 0,
      current: '',
      errors: []
    });

    for (let i = 0; i < topicsNeedingContent.length; i++) {
      const topic = topicsNeedingContent[i];
      
      setProgress(prev => ({
        ...prev,
        current: topic.title
      }));

      try {
        const content = await generateTopicContent(
          subjectName,
          topic.title,
          gradeLevel,
          selectedProvider,
          selectedModel
        );

        if (content && content.content) {
          // Update topic in database
          onContentGenerated?.(topic.id, content.content);
          
          setProgress(prev => ({
            ...prev,
            completed: prev.completed + 1
          }));
        } else {
          throw new Error('No content generated');
        }
      } catch (error) {
        console.error(`Failed to generate content for ${topic.title}:`, error);
        setProgress(prev => ({
          ...prev,
          failed: prev.failed + 1,
          errors: [...prev.errors, {
            topicId: topic.id,
            topicTitle: topic.title,
            error: error instanceof Error ? error.message : 'Unknown error'
          }]
        }));
      }

      // Add delay between requests to respect rate limits
      if (i < topicsNeedingContent.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGenerating(false);
    setProgress(prev => ({ ...prev, current: '' }));
    onComplete?.();
  };

  const getProviderModels = (provider: LLMProvider): string[] => {
    switch (provider) {
      case LLMProvider.OPENAI:
        return ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];
      case LLMProvider.GOOGLE:
        return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
      default:
        return [];
    }
  };

  if (topicsNeedingContent.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-green-900">All Topics Have Content!</h3>
            <p className="text-green-700">
              All {topics.length} topics in this subject already have educational content generated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-soft border border-neutral-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <h3 className="text-xl font-semibold text-neutral-900">Bulk Content Generation</h3>
            <p className="text-neutral-600">
              Generate educational content for all topics missing content
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-neutral-900">{topics.length}</div>
            <div className="text-sm text-neutral-600">Total Topics</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{topicsNeedingContent.length}</div>
            <div className="text-sm text-neutral-600">Need Content</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{topics.length - topicsNeedingContent.length}</div>
            <div className="text-sm text-neutral-600">Have Content</div>
          </div>
        </div>

        {!isGenerating && !showConfirmation && (
          <>
            {/* LLM Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  LLM Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value as LLMProvider);
                    setSelectedModel(getProviderModels(e.target.value as LLMProvider)[0]);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={LLMProvider.OPENAI}>OpenAI</option>
                  <option value={LLMProvider.GOOGLE}>Google Gemini</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {getProviderModels(selectedProvider).map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cost and Time Estimation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">Generation Estimates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-800">
                    <strong>Time:</strong> ~{estimatedTime} minutes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="text-blue-800">
                    <strong>Cost:</strong> ~${estimatedCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmation(true)}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Generate Content for {topicsNeedingContent.length} Topics
            </button>
          </>
        )}

        {showConfirmation && !isGenerating && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-2">Confirm Bulk Generation</h4>
                <p className="text-amber-800 mb-4">
                  This will generate educational content for <strong>{topicsNeedingContent.length} topics</strong> using <strong>{selectedProvider}</strong> ({selectedModel}).
                </p>
                <ul className="text-sm text-amber-700 mb-4 space-y-1">
                  <li>• Estimated time: ~{estimatedTime} minutes</li>
                  <li>• Estimated cost: ~${estimatedCost.toFixed(2)}</li>
                  <li>• Content will be automatically saved to the database</li>
                  <li>• You can monitor progress in real-time</li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={handleStartGeneration}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    Start Generation
                  </button>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-neutral-600 mb-2">
                <span>Generating content...</span>
                <span>{progress.completed + progress.failed} / {progress.total}</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${((progress.completed + progress.failed) / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Current Topic */}
            {progress.current && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <div>
                    <div className="font-medium text-blue-900">Currently generating:</div>
                    <div className="text-blue-700">{progress.current}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
                <div className="text-sm text-neutral-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                <div className="text-sm text-neutral-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-600">{progress.total - progress.completed - progress.failed}</div>
                <div className="text-sm text-neutral-600">Remaining</div>
              </div>
            </div>

            {/* Errors */}
            {progress.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Generation Errors</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {progress.errors.map((error, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-red-800">{error.topicTitle}:</span>
                      <span className="text-red-700 ml-2">{error.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkContentGenerator;
