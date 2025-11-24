import React, { useState, useEffect } from 'react';
import { useFlashcardGeneration } from '../../hooks/useContentGeneration';
import { Flashcard } from '../../hooks/useFlashcards';
import { useSubjects } from '../../hooks/useSubjects';
import { useTopics } from '../../hooks/useTopics';
import LLMProviderSelector from './LLMProviderSelector';
import { LLMProvider } from '../../services/llmAdapter';
import { useReview } from '../../contexts/ReviewContext';
import { ContentType, ReviewState } from '../../types/reviewTypes';

const FlashcardGeneratorForm: React.FC = () => {
  const { subjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const { topics: filteredTopics, loading: topicsLoading } = useTopics(selectedSubjectId);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [flashcardCount, setFlashcardCount] = useState<number>(5);

  const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [generatedFlashcards, setGeneratedFlashcards] = useState<Partial<Flashcard>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  const { generateAndSaveFlashcards, loading, error } = useFlashcardGeneration();
  const { submitForReview, getContentReviewState } = useReview();
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [savedFlashcardSet, setSavedFlashcardSet] = useState<any>(null);

  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    setSelectedTopic(''); // Reset topic when subject changes to prevent stale state
  };

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    // When the subject changes, filteredTopics will update.
    // Reset the selected topic.
    if (filteredTopics.length > 0) {
      setSelectedTopic(filteredTopics[0].id);
    } else {
      setSelectedTopic('');
    }
  }, [filteredTopics]);

  useEffect(() => {
    if (savedFlashcardSet?.id) {
      const fetchReviewState = async () => {
        try {
          const state = await getContentReviewState(ContentType.FLASHCARD, savedFlashcardSet.id);
          setReviewState(state);
        } catch (error) {
          console.error('Error fetching review state:', error);
        }
      };
      
      fetchReviewState();
    } else {
      setReviewState(null);
    }
  }, [savedFlashcardSet, getContentReviewState]);

  const handleGenerate = async () => {
    if (!selectedTopic || !selectedSubjectId) {
      alert('Please select a subject and a topic first.');
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubjectId);
    const topic = filteredTopics.find(t => t.id === selectedTopic);

    if (!subject || !topic) {
      alert('Selected subject or topic not found.');
      return;
    }

    // Generate and save in one step
    const flashcardSet = await generateAndSaveFlashcards(
      selectedTopic,
      {
        subject: subject.name,
        topicTitle: topic.title,
        syllabusCode: 'IGCSE',
        cardCount: flashcardCount,
        grade: 10
      }
    );

    if (flashcardSet) {
      alert('Flashcards generated and saved successfully!');
      setSavedFlashcardSet(flashcardSet);
      // Set generated flashcards for display
      if (flashcardSet.flashcards) {
        setGeneratedFlashcards(flashcardSet.flashcards);
      }
    }
  };

  const handleSave = async () => {
    // This is now handled by handleGenerate
    alert('Flashcards are automatically saved when generated.');
  };

  const handleFlashcardChange = (index: number, field: 'front_content' | 'back_content', value: string) => {
    const updatedFlashcards = [...generatedFlashcards];
    updatedFlashcards[index] = { ...updatedFlashcards[index], [field]: value };
    setGeneratedFlashcards(updatedFlashcards);
  };

  const handleSubmitForReview = async () => {
    if (!savedFlashcardSet) {
      alert('Please save the flashcards before submitting for review.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitForReview(ContentType.FLASHCARD, savedFlashcardSet.id);

      const state = await getContentReviewState(ContentType.FLASHCARD, savedFlashcardSet.id);
      setReviewState(state);

      alert('Flashcards submitted for review successfully!');
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderReviewStatusBadge = () => {
    if (!reviewState) return null;

    const getStatusStyles = (state: ReviewState) => {
      switch (state) {
        case ReviewState.DRAFT:
          return 'bg-neutral-100 text-neutral-800';
        case ReviewState.PENDING_REVIEW:
          return 'bg-amber-100 text-amber-800';
        case ReviewState.APPROVED:
          return 'bg-success-100 text-success-800';
        case ReviewState.REJECTED:
          return 'bg-red-100 text-red-800';
        case ReviewState.NEEDS_REVISION:
          return 'bg-blue-100 text-blue-800';
        default:
          return 'bg-neutral-100 text-neutral-800';
      }
    };

    const getStatusLabel = (state: ReviewState) => {
      switch (state) {
        case ReviewState.DRAFT: return 'Draft';
        case ReviewState.PENDING_REVIEW: return 'Pending Review';
        case ReviewState.APPROVED: return 'Approved';
        case ReviewState.REJECTED: return 'Rejected';
        case ReviewState.NEEDS_REVISION: return 'Needs Revision';
        default: return 'Unknown';
      }
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyles(reviewState)}`}>
        {getStatusLabel(reviewState)}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            Flashcard Generation
            {renderReviewStatusBadge()}
          </h2>
          <p className="text-neutral-600 mt-1">Create interactive flashcards with AI-generated content</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Select topic → Configure settings → Generate flashcards</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Panel - Generation Form */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Flashcard Configuration
            </h3>

            <form className="space-y-6">

              {/* LLM Provider Selection */}
              <div>
                <LLMProviderSelector
                  selectedProvider={llmProvider}
                  selectedModel={selectedModel}
                  onProviderChange={setLlmProvider}
                  onModelChange={setSelectedModel}
                  disabled={loading || isSubmitting}
                />
              </div>

              {/* Subject Selection */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-2">
                  Target Subject *
                </label>
                {subjects.length > 0 ? (
                  <div className="relative">
                    <select
                      id="subject"
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading}
                    >
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-medium">No subjects available</span>
                    </div>
                    <p className="mt-1 text-sm">Please create a subject first before generating flashcards.</p>
                  </div>
                )}
              </div>

              {/* Topic Selection */}
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-neutral-700 mb-2">
                  Topic *
                </label>
                {selectedSubjectId ? (
                  filteredTopics.length > 0 ? (
                    <div className="relative">
                      <select
                        id="topic"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                        disabled={loading || topicsLoading}
                      >
                        <option value="">Select a topic...</option>
                        {filteredTopics.map(topic => (
                          <option key={topic.id} value={topic.id}>
                            {topic.title}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  ) : topicsLoading ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl">
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="font-medium">Loading topics...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="font-medium">No topics available</span>
                      </div>
                      <p className="mt-1 text-sm">Please create topics for this subject first.</p>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-xl">
                    <p className="text-sm">Please select a subject first to see available topics.</p>
                  </div>
                )}
              </div>

              {/* Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="flashcard-count" className="block text-sm font-medium text-neutral-700 mb-2">
                    Number of Flashcards
                  </label>
                  <div className="relative">
                    <input
                      id="flashcard-count"
                      type="number"
                      min="1"
                      max="20"
                      value={flashcardCount}
                      onChange={(e) => setFlashcardCount(Number(e.target.value) || 5)}
                      className="w-full px-4 py-3 pr-20 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="5"
                      disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-neutral-500 text-sm">cards</span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    Recommended: 5-15 flashcards per set
                  </p>
                </div>

                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-neutral-700 mb-2">
                    Difficulty Level
                  </label>
                  <div className="relative">
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading}
                    >
                      <option value="easy">Easy - Basic concepts</option>
                      <option value="medium">Medium - Standard level</option>
                      <option value="hard">Hard - Advanced concepts</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>


              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!selectedTopic || loading || isSubmitting}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    !selectedTopic || loading || isSubmitting
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-medium shadow-soft'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Flashcards...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Generate Flashcards
                    </span>
                  )}
                </button>

                {savedFlashcardSet && (
                  <button
                    type="button"
                    onClick={handleSubmitForReview}
                    disabled={isSubmitting || loading || !!reviewState}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isSubmitting || loading || !!reviewState
                        ? 'bg-secondary-300 text-white cursor-not-allowed'
                        : 'bg-secondary-600 text-white hover:bg-secondary-700 hover:shadow-medium shadow-soft'
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Submit for Review
                      </span>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel - Generated Content */}
        <div className="xl:col-span-7 space-y-6">
          {/* Empty State */}
          {!loading && generatedFlashcards.length === 0 && !error && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ready to Generate Flashcards</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Select a subject and topic, configure your settings, then click "Generate Flashcards" to create interactive study cards.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Question & answer pairs
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Adaptive difficulty
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Interactive study mode
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Generation Error</span>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
                  <svg className="animate-spin w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Generating Flashcards</h3>
                <p className="text-neutral-600">Creating {flashcardCount} flashcards with {difficulty} difficulty...</p>
              </div>
            </div>
          )}

          {/* Generated Flashcards Display */}
          {generatedFlashcards && generatedFlashcards.length > 0 && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generated Flashcards ({generatedFlashcards.length})
                </h3>
                <button
                  onClick={handleSave}
                  disabled={loading || !!savedFlashcardSet}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    loading || !!savedFlashcardSet
                      ? 'bg-success-300 text-white cursor-not-allowed'
                      : 'bg-success-600 text-white hover:bg-success-700 hover:shadow-medium shadow-soft'
                  }`}
                >
                  {savedFlashcardSet ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Saved
                    </span>
                  ) : loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Flashcards
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                {generatedFlashcards.map((flashcard, index) => (
                  <div key={index} className="border border-neutral-200 rounded-xl p-6 bg-neutral-50">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <h4 className="font-medium text-neutral-900">Flashcard #{index + 1}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Front Content (Question)
                        </label>
                        <textarea
                          value={flashcard.front_content || ''}
                          onChange={(e) => handleFlashcardChange(index, 'front_content', e.target.value)}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          rows={4}
                          placeholder="Enter the question or prompt..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Back Content (Answer)
                        </label>
                        <textarea
                          value={flashcard.back_content || ''}
                          onChange={(e) => handleFlashcardChange(index, 'back_content', e.target.value)}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          rows={4}
                          placeholder="Enter the answer or explanation..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashcardGeneratorForm;
