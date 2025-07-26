import React, { useState, useEffect } from 'react';
import LLMProviderSelector from './LLMProviderSelector';
import QuestionCounter from './QuestionCounter';
import QuickQuestionStats from './QuickQuestionStats';
import { useQuizGeneration } from '../../hooks/useQuizGeneration';
import { useSubjects } from '../../hooks/useSubjects';
import { useTopics } from '../../hooks/useTopics';
import { useChapters } from '../../hooks/useChapters';
import { useRealtimeQuestionCounts } from '../../hooks/useQuestionStatistics';
import { LLMProvider } from '../../services/llmAdapter';
import { isChemistryContent } from '../../utils/chemistryValidator';
import ChemistryValidationResults from '../validation/ChemistryValidationResults';
import { useReview } from '../../contexts/ReviewContext';
import { ContentType, ReviewState } from '../../types/reviewTypes';
import { Chapter } from '../../types/chapter';

interface QuizGeneratorFormProps {
  subjects: any[];
  topics: any[];
  chapters?: Chapter[]; // Optional for backward compatibility
  onSubjectChange: (subjectId: string | null) => void;
}

const QuizGeneratorForm: React.FC<QuizGeneratorFormProps> = ({
  subjects,
  topics,
  chapters: passedChapters,
  onSubjectChange
}) => {
  const { subjects: allSubjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [useChapterMode, setUseChapterMode] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficultyLevel, setDifficultyLevel] = useState<string>('medium');
    const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [isChemistry, setIsChemistry] = useState<boolean>(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { topics: filteredTopics, loading: loadingTopics } = useTopics(selectedSubjectId);
  const { chapters: hookChapters, loading: loadingChapters } = useChapters(selectedSubjectId);

  // Use passed chapters if available, otherwise use hook chapters
  const chapters = passedChapters || hookChapters;
  const { generateAndSaveQuiz, loading, error, validationResults } = useQuizGeneration();
  const { submitForReview, getContentReviewState } = useReview();
  const { refreshStatistics } = useRealtimeQuestionCounts();
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);

  // Check if the selected subject or topic is chemistry-related
  useEffect(() => {
    if (selectedSubjectId && selectedTopic) {
      const subjectName = allSubjects.find(s => s.id === selectedSubjectId)?.name || '';
      const topicTitle = filteredTopics.find(t => t.id === selectedTopic)?.title || '';
      const isChemistrySubject = isChemistryContent(subjectName);
      const isChemistryTopic = isChemistryContent(topicTitle);
      setIsChemistry(isChemistrySubject || isChemistryTopic);
    } else {
      setIsChemistry(false);
    }
  }, [selectedSubjectId, selectedTopic, allSubjects, filteredTopics]);

  // Fetch review state when we have a generated quiz
  useEffect(() => {
    if (generatedQuiz?.id) {
      const fetchReviewState = async () => {
        try {
          const state = await getContentReviewState(ContentType.QUIZ, generatedQuiz.id);
          setReviewState(state);
        } catch (error) {
          console.error('Error fetching review state:', error);
        }
      };
      
      fetchReviewState();
    } else {
      setReviewState(null);
    }
  }, [generatedQuiz?.id, getContentReviewState]);

  const handleGenerate = async () => {
    if (useChapterMode) {
      // Chapter-based generation
      if (!selectedChapter || !selectedSubjectId) {
        alert('Please select a subject and a chapter first.');
        return;
      }

      try {
        const chapter = chapters.find(c => c.id === selectedChapter);
        if (!chapter) {
          alert('Selected chapter details could not be found.');
          return;
        }

        // Get all topics in the chapter
        const chapterTopics = filteredTopics.filter(t => t.chapter_id === selectedChapter);
        if (chapterTopics.length === 0) {
          alert('No topics found in the selected chapter.');
          return;
        }

        // For now, use the first topic as the primary topic and combine content from all topics
        const primaryTopic = chapterTopics[0];
        const combinedContent = chapterTopics
          .map(t => `${t.title}: ${t.content || 'No content available'}`)
          .join('\n\n');

        const newQuiz = await generateAndSaveQuiz(
          primaryTopic.id, // Use primary topic ID
          `${chapter.title} - Chapter Quiz`,
          combinedContent,
          questionCount,
          difficultyLevel,
          llmProvider,
          selectedModel
        );

        if (newQuiz) {
          setGeneratedQuiz(newQuiz);
          refreshStatistics();
          alert(`Successfully generated chapter quiz with ${questionCount} questions for ${chapter.title}`);
        }
      } catch (err) {
        console.error('Failed to generate chapter quiz:', err);
      }
    } else {
      // Topic-based generation (existing logic)
      if (!selectedTopic || !selectedSubjectId) {
        alert('Please select a subject and a topic first.');
        return;
      }

      try {
        const topic = filteredTopics.find(t => t.id === selectedTopic);
        if (!topic || !topic.title) {
          alert('Selected topic details could not be found.');
          return;
        }

        const newQuiz = await generateAndSaveQuiz(
          selectedTopic, // topicId
          topic.title,
          topic.content || '',
          questionCount,
          difficultyLevel,
          llmProvider,
          selectedModel
        );

        if (newQuiz) {
          setGeneratedQuiz(newQuiz);
          // Refresh question statistics after successful generation
          refreshStatistics();
          alert(`Successfully generated quiz with ${questionCount} questions for ${topic.title}`);
        }
      } catch (err) {
        console.error('Failed to generate quiz:', err);
      }
    }
  };

  const handleSubmitForReview = async () => {
    if (!generatedQuiz || !generatedQuiz.id) {
      alert('Please generate and save a quiz before submitting for review.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitForReview(
        ContentType.QUIZ,
        generatedQuiz.id
      );
      
      // Update local state after submission
      setReviewState(ReviewState.PENDING_REVIEW);
      alert('Quiz submitted for review successfully!');
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Failed to submit quiz for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to render review status badge
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
            Quiz Generation
            {renderReviewStatusBadge()}
          </h2>
          <p className="text-neutral-600 mt-1">Create interactive quizzes with AI-generated questions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Select topic → Configure quiz → Generate questions</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Panel - Generation Form */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Quiz Configuration
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
                {allSubjects.length > 0 ? (
                  <div className="relative">
                    <select
                      id="subject"
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        onSubjectChange(e.target.value);
                        setSelectedTopic(''); // Reset topic when subject changes
                      }}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading || isSubmitting}
                    >
                      <option value="">Select a subject...</option>
                      {allSubjects.map(subject => (
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
                    <p className="mt-1 text-sm">Please create a subject first before generating quizzes.</p>
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
                        disabled={loading || isSubmitting}
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

              {/* Chapter-based Quiz Generation Toggle */}
              {selectedSubjectId && chapters.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="useChapterMode"
                      checked={useChapterMode}
                      onChange={(e) => {
                        setUseChapterMode(e.target.checked);
                        if (e.target.checked) {
                          setSelectedTopic(''); // Clear topic selection when switching to chapter mode
                        } else {
                          setSelectedChapter(''); // Clear chapter selection when switching to topic mode
                        }
                      }}
                      className="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      disabled={loading || isSubmitting}
                    />
                    <label htmlFor="useChapterMode" className="text-sm font-medium text-blue-900">
                      Generate quiz from entire chapter
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-blue-700">
                    Create a comprehensive quiz using questions from multiple topics within a chapter
                  </p>
                </div>
              )}

              {/* Chapter Selection */}
              {useChapterMode && selectedSubjectId && chapters.length > 0 && (
                <div>
                  <label htmlFor="chapter" className="block text-sm font-medium text-neutral-700 mb-2">
                    Chapter *
                  </label>
                  <div className="relative">
                    <select
                      id="chapter"
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading || isSubmitting}
                    >
                      <option value="">Select a chapter...</option>
                      {chapters.map(chapter => (
                        <option key={chapter.id} value={chapter.id}>
                          {chapter.syllabus_code ? `${chapter.syllabus_code}. ` : ''}{chapter.title}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {selectedChapter && (
                    <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      {(() => {
                        const chapter = chapters.find(c => c.id === selectedChapter);
                        const chapterTopics = filteredTopics.filter(t => t.chapter_id === selectedChapter);
                        return (
                          <div>
                            <p className="text-sm text-neutral-700">
                              <span className="font-medium">Chapter:</span> {chapter?.title}
                            </p>
                            <p className="text-sm text-neutral-600 mt-1">
                              <span className="font-medium">Topics included:</span> {chapterTopics.length} topics
                            </p>
                            {chapter?.description && (
                              <p className="text-sm text-neutral-600 mt-1">{chapter.description}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Question Counter for Selected Topic */}
              {selectedTopic && !useChapterMode && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Current Question Count
                  </label>
                  <QuestionCounter
                    topicId={selectedTopic}
                    showRecommendations={true}
                    showProgressBar={true}
                    onGenerateMore={(recommendedCount) => {
                      setQuestionCount(recommendedCount);
                      // Optionally scroll to question count input
                      const questionCountInput = document.getElementById('question-count');
                      if (questionCountInput) {
                        questionCountInput.focus();
                      }
                    }}
                  />
                </div>
              )}

              {/* Chapter Quiz Info */}
              {useChapterMode && selectedChapter && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Chapter Quiz Generation</h4>
                      <p className="text-sm text-green-700 mt-1">
                        This will create a comprehensive quiz drawing questions from all topics within the selected chapter.
                        The quiz will test understanding across the entire chapter scope.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quiz Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="question-count" className="block text-sm font-medium text-neutral-700 mb-2">
                    Number of Questions
                  </label>
                  <div className="relative">
                    <input
                      id="question-count"
                      type="number"
                      min="1"
                      max="50"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                      className="w-full px-4 py-3 pr-20 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="5"
                      disabled={loading || isSubmitting}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-neutral-500 text-sm">questions</span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    Recommended: 5-15 questions per quiz
                  </p>
                </div>

                <div>
                  <label htmlFor="difficulty-level" className="block text-sm font-medium text-neutral-700 mb-2">
                    Difficulty Level
                  </label>
                  <div className="relative">
                    <select
                      id="difficulty-level"
                      value={difficultyLevel}
                      onChange={(e) => setDifficultyLevel(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading || isSubmitting}
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
                  disabled={
                    !selectedSubjectId ||
                    (useChapterMode ? !selectedChapter : !selectedTopic) ||
                    loading ||
                    isSubmitting
                  }
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    !selectedSubjectId ||
                    (useChapterMode ? !selectedChapter : !selectedTopic) ||
                    loading ||
                    isSubmitting
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-medium shadow-soft'
                  }`}
                >
                  {loading || isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Quiz...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Generate Quiz
                    </span>
                  )}
                </button>

                {generatedQuiz?.id && (
                  <button
                    type="button"
                    onClick={handleSubmitForReview}
                    disabled={isSubmitting || loading || reviewState === ReviewState.PENDING_REVIEW || reviewState === ReviewState.APPROVED}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isSubmitting || loading || reviewState === ReviewState.PENDING_REVIEW || reviewState === ReviewState.APPROVED
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
          {/* Question Statistics Widget */}
          <QuickQuestionStats />

          {/* Empty State */}
          {!loading && !generatedQuiz && !error && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ready to Generate Quiz</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Select a subject and topic, configure your quiz settings, then click "Generate Quiz" to create interactive questions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Multiple choice questions
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Detailed explanations
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Adaptive difficulty
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
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Generating Quiz</h3>
                <p className="text-neutral-600">Creating {questionCount} questions with {difficultyLevel} difficulty...</p>
              </div>
            </div>
          )}

          {/* Generated Quiz Display */}
          {generatedQuiz && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generated Quiz
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-success-100 text-success-800 rounded-full text-sm font-medium">
                    {generatedQuiz.questions?.length || 0} Questions
                  </span>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium capitalize">
                    {difficultyLevel}
                  </span>
                </div>
              </div>

              {generatedQuiz.questions && generatedQuiz.questions.length > 0 ? (
                <div className="space-y-6">
                  {generatedQuiz.questions.slice(0, 3).map((question: any, index: number) => (
                    <div key={index} className="border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900 mb-3">{question.question}</p>
                          <div className="space-y-2">
                            {question.options?.map((option: string, optIndex: number) => (
                              <div key={optIndex} className={`p-2 rounded-lg text-sm ${
                                optIndex === question.correct_answer
                                  ? 'bg-success-50 border border-success-200 text-success-800'
                                  : 'bg-neutral-50 border border-neutral-200 text-neutral-700'
                              }`}>
                                <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                                {option}
                                {optIndex === question.correct_answer && (
                                  <svg className="inline w-4 h-4 ml-2 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            ))}
                          </div>
                          {question.explanation && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <span className="font-medium">Explanation:</span> {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {generatedQuiz.questions.length > 3 && (
                    <div className="text-center py-4 border-t border-neutral-200">
                      <p className="text-neutral-600">
                        And {generatedQuiz.questions.length - 3} more questions...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-600">No questions generated yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Chemistry Validation Results */}
          {isChemistry && validationResults && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <ChemistryValidationResults
                validationResults={validationResults}
                onDismiss={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizGeneratorForm;
