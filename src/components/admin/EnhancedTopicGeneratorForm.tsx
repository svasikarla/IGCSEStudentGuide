import React, { useState, useEffect } from 'react';
import { useTopicListGeneration, useTopicContentGeneration } from '../../hooks/useLLMGeneration';
import { useRAGContentGeneration } from '../../hooks/useRAG';
import { useSemanticSearch } from '../../hooks/useSemanticSearch';
import { Subject } from '../../hooks/useSubjects';
import { Topic } from '../../hooks/useTopics';
import { useTopics } from '../../hooks/useTopics';
import { LLMProvider } from '../../services/llmAdapter';
import LLMProviderSelector from './LLMProviderSelector';

interface EnhancedTopicGeneratorFormProps {
  subjects: Subject[];
  onSubjectChange: (subjectId: string | null) => void;
}

/**
 * Enhanced Topic Generator Form with RAG capabilities
 * 
 * This form leverages existing content through semantic search to generate
 * more contextually relevant and comprehensive topics.
 */
const EnhancedTopicGeneratorForm: React.FC<EnhancedTopicGeneratorFormProps> = ({ 
  subjects, 
  onSubjectChange 
}) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [generatedTopics, setGeneratedTopics] = useState<Partial<Topic>[]>([]);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Partial<Topic> | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form configuration
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [curriculumBoard, setCurriculumBoard] = useState<string>('Cambridge IGCSE');
  const [tier, setTier] = useState<string>('');
  const [useRAGEnhancement, setUseRAGEnhancement] = useState<boolean>(true);
  const [contextQuery, setContextQuery] = useState<string>('');

  // LLM Provider state
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');

  // Progress tracking
  const [generationProgress, setGenerationProgress] = useState<{
    phase: string;
    progress: number;
    estimatedTime?: number;
    startTime?: number;
    currentTopic?: string;
  } | null>(null);

  // Hooks
  const { generateTopicList, generateComprehensiveCurriculum, loading, error } = useTopicListGeneration();
  const { topics, saveTopics, saveSingleTopic, isSaving, saveError } = useTopics(selectedSubject?.id || null);
  const { generateTopicContent, loading: contentLoading, error: contentError } = useTopicContentGeneration();
  const { generateWithContext, loading: ragLoading, error: ragError } = useRAGContentGeneration();
  const { search, results: searchResults, loading: searchLoading } = useSemanticSearch({
    autoSearch: false,
    cacheResults: true
  });

  // Update selected subject
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]);
      onSubjectChange(subjects[0].id);
    }
  }, [subjects, selectedSubject, onSubjectChange]);

  // Auto-generate context query when subject changes
  useEffect(() => {
    if (selectedSubject && useRAGEnhancement) {
      setContextQuery(`${selectedSubject.name} curriculum topics and concepts`);
    }
  }, [selectedSubject, useRAGEnhancement]);

  /**
   * Generate topics with RAG enhancement
   */
  const handleGenerateTopics = async () => {
    if (!selectedSubject) return;

    setGenerationProgress({
      phase: 'Initializing',
      progress: 0,
      startTime: Date.now()
    });

    try {
      let enhancedPrompt = '';

      if (useRAGEnhancement && contextQuery) {
        setGenerationProgress({
          phase: 'Searching existing content',
          progress: 20,
          startTime: Date.now()
        });

        // Search for relevant existing content
        await search(contextQuery, {
          subjectId: selectedSubject.id,
          matchCount: 5,
          similarityThreshold: 0.6
        });

        // Build context from search results
        if (searchResults.length > 0) {
          const contextContent = searchResults
            .map(result => `${result.title}: ${result.content.substring(0, 200)}...`)
            .join('\n\n');

          enhancedPrompt = `Existing content context:
${contextContent}

Based on the above existing content, generate comprehensive topics that complement and extend the current curriculum.`;
        }
      }

      setGenerationProgress({
        phase: 'Generating topic list',
        progress: 40,
        startTime: Date.now()
      });

      // Generate topics using enhanced prompt
      const topics = await generateComprehensiveCurriculum(
        selectedSubject.name,
        gradeLevel,
        selectedProvider,
        selectedModel,
        curriculumBoard,
        tier,
        false, // includeContent
        (phase: string, progress: number, currentTopic?: string) => {
          setGenerationProgress({
            phase,
            progress,
            startTime: Date.now(),
            currentTopic
          });
        }
      );

      setGenerationProgress({
        phase: 'Processing results',
        progress: 80,
        startTime: Date.now()
      });

      if (topics && topics.length > 0) {
        setGeneratedTopics(topics);
        setGenerationProgress({
          phase: 'Complete',
          progress: 100,
          startTime: Date.now()
        });
      }

    } catch (err) {
      console.error('Enhanced topic generation failed:', err);
      setGenerationProgress(null);
    }

    // Clear progress after 2 seconds
    setTimeout(() => setGenerationProgress(null), 2000);
  };

  /**
   * Generate detailed content for a specific topic with RAG enhancement
   */
  const handleGenerateTopicContent = async (topicTitle: string) => {
    if (!selectedSubject || !topicTitle) return;

    setSelectedTopicTitle(topicTitle);

    try {
      let content;

      if (useRAGEnhancement) {
        // Use RAG-enhanced content generation
        const contextQuery = `${selectedSubject.name} ${topicTitle} concepts explanations examples`;
        
        content = await generateWithContext(
          `Generate comprehensive educational content for the topic "${topicTitle}" in ${selectedSubject.name} for ${curriculumBoard} ${gradeLevel} students. Include:
          
          1. Clear explanation of key concepts
          2. Learning objectives
          3. Real-world examples and applications
          4. Common misconceptions to address
          5. Study tips and practice suggestions
          
          Make the content engaging and appropriate for IGCSE level students.`,
          {
            contextQuery,
            subjectId: selectedSubject.id,
            provider: selectedProvider,
            temperature: 0.7,
            maxTokens: 2000
          }
        );
      } else {
        // Use standard content generation
        content = await generateTopicContent(
          selectedSubject.name,
          topicTitle,
          gradeLevel,
          selectedProvider,
          selectedModel
        );
      }

      if (content) {
        setGeneratedContent({
          title: topicTitle,
          content: typeof content === 'string' ? content : content.content,
          description: `Comprehensive guide to ${topicTitle}`,
          subject_id: selectedSubject.id,
          difficulty_level: 3,
          estimated_study_time_minutes: 45
        });
      }

    } catch (err) {
      console.error('Enhanced content generation failed:', err);
    }
  };

  /**
   * Save generated topics to database
   */
  const handleSaveTopics = async () => {
    if (!selectedSubject || generatedTopics.length === 0) return;

    try {
      const topicsToSave = generatedTopics.map(topic => ({
        ...topic,
        subject_id: selectedSubject.id,
        is_published: false // Require manual review
      }));

      await saveTopics(selectedSubject.id, topicsToSave as Topic[]);
      setSaveSuccess(true);
      setGeneratedTopics([]);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Failed to save topics:', err);
    }
  };

  /**
   * Save individual topic content
   */
  const handleSaveTopicContent = async () => {
    if (!generatedContent || !selectedSubject) return;

    try {
      await saveSingleTopic({
        ...generatedContent,
        subject_id: selectedSubject.id,
        is_published: false
      } as Topic);

      setSaveSuccess(true);
      setGeneratedContent(null);
      setSelectedTopicTitle(null);

      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Failed to save topic content:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900">
            Enhanced Topic Generator
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">RAG Enhanced</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        <p className="text-neutral-600">
          Generate comprehensive topics using AI with contextual awareness from existing content.
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-medium text-neutral-900 mb-4">Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Subject
            </label>
            <select
              value={selectedSubject?.id || ''}
              onChange={(e) => {
                const subject = subjects.find(s => s.id === e.target.value);
                setSelectedSubject(subject || null);
                onSubjectChange(subject?.id || null);
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Grade Level
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select grade level</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
            </select>
          </div>

          {/* Curriculum Board */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Curriculum Board
            </label>
            <select
              value={curriculumBoard}
              onChange={(e) => setCurriculumBoard(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Cambridge IGCSE">Cambridge IGCSE</option>
              <option value="Edexcel IGCSE">Edexcel IGCSE</option>
              <option value="AQA IGCSE">AQA IGCSE</option>
            </select>
          </div>

          {/* Tier */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Tier (if applicable)
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">No tier</option>
              <option value="Foundation">Foundation</option>
              <option value="Higher">Higher</option>
              <option value="Core">Core</option>
              <option value="Extended">Extended</option>
            </select>
          </div>
        </div>

        {/* RAG Enhancement Options */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useRAGEnhancement}
                onChange={(e) => setUseRAGEnhancement(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-blue-900">
                Enable RAG Enhancement
              </span>
            </label>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              Recommended
            </span>
          </div>
          
          {useRAGEnhancement && (
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                Context Query (optional)
              </label>
              <input
                type="text"
                value={contextQuery}
                onChange={(e) => setContextQuery(e.target.value)}
                placeholder="e.g., Mathematics algebra concepts and examples"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <p className="text-xs text-blue-600 mt-1">
                This query will be used to find relevant existing content to enhance topic generation.
              </p>
            </div>
          )}
        </div>

        {/* LLM Provider Selection */}
        <div className="mt-6">
          <LLMProviderSelector
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onProviderChange={setSelectedProvider}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>

      {/* Generation Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-neutral-900">Generate Topics</h3>
            <p className="text-sm text-neutral-600">
              Create comprehensive topic lists for the selected subject
            </p>
          </div>
          
          <button
            onClick={handleGenerateTopics}
            disabled={!selectedSubject || loading || ragLoading || searchLoading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {(loading || ragLoading || searchLoading) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>
              {loading || ragLoading || searchLoading ? 'Generating...' : 'Generate Topics'}
            </span>
          </button>
        </div>

        {/* Progress Indicator */}
        {generationProgress && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                {generationProgress.phase}
              </span>
              <span className="text-sm text-blue-600">
                {generationProgress.progress}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {(error || ragError) && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              {error || ragError}
            </p>
          </div>
        )}
      </div>

      {/* Generated Topics Display */}
      {generatedTopics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-neutral-900">
              Generated Topics ({generatedTopics.length})
            </h3>
            <button
              onClick={handleSaveTopics}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save All Topics'}
            </button>
          </div>

          <div className="space-y-3">
            {generatedTopics.map((topic, index) => (
              <div
                key={index}
                className="p-4 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-neutral-900">{topic.title}</h4>
                    <p className="text-sm text-neutral-600 mt-1">{topic.description}</p>
                  </div>
                  <button
                    onClick={() => handleGenerateTopicContent(topic.title || '')}
                    disabled={contentLoading}
                    className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200 disabled:opacity-50"
                  >
                    {contentLoading && selectedTopicTitle === topic.title ? 'Generating...' : 'Generate Content'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Content Display */}
      {generatedContent && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-neutral-900">
              Generated Content: {generatedContent.title}
            </h3>
            <button
              onClick={handleSaveTopicContent}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Topic'}
            </button>
          </div>

          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-neutral-700">
              {generatedContent.content}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Content saved successfully!
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTopicGeneratorForm;
