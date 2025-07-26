import React, { useState, useEffect } from 'react';
import { useSubjects } from '../../hooks/useSubjects';
import { useTopics, Topic } from '../../hooks/useTopics';
import { useChapters } from '../../hooks/useChapters';
import { useExamPaperGeneration } from '../../hooks/useExamPaperGeneration';
import { LLMProvider } from '../../services/llmAdapter';
import { isChemistryContent, ValidationResult } from '../../utils/chemistryValidator';
import ChemistryValidationResults from '../validation/ChemistryValidationResults';
import { useReview } from '../../contexts/ReviewContext';
import { ContentType, ReviewState } from '../../types/reviewTypes';

// Define available LLM providers with their display names
const LLM_PROVIDERS = [
  { id: LLMProvider.OPENAI, name: 'OpenAI' },
  { id: LLMProvider.ANTHROPIC, name: 'Anthropic' },
  { id: LLMProvider.GOOGLE, name: 'Google' },
  { id: LLMProvider.HUGGINGFACE, name: 'Hugging Face (Ultra Low Cost)' },
  { id: LLMProvider.AZURE, name: 'Azure' },
];

const ExamPaperGeneratorForm: React.FC = () => {
  const { subjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const { topics } = useTopics(selectedSubjectId);
  const { chapters } = useChapters(selectedSubjectId);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [useChapterMode, setUseChapterMode] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [isChemistry, setIsChemistry] = useState<boolean>(false);
  const [showChemistryHelp, setShowChemistryHelp] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { generateAndSaveExamPaper, loading, error } = useExamPaperGeneration();
  const { submitForReview, getContentReviewState } = useReview();
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);

  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Check if the selected subject, topic, or chapter is chemistry-related
  useEffect(() => {
    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (subject) {
        const isChemistrySubject = isChemistryContent(subject.name);
        let hasChemistryContent = isChemistrySubject;

        if (useChapterMode && selectedChapter) {
          const chapter = chapters.find(c => c.id === selectedChapter);
          if (chapter) {
            hasChemistryContent = isChemistrySubject || isChemistryContent(chapter.title);
          }
        } else if (selectedTopic) {
          hasChemistryContent = isChemistrySubject || isChemistryContent(selectedTopic.title);
        }

        setIsChemistry(hasChemistryContent);
        setShowChemistryHelp(hasChemistryContent);
      }
    } else {
      setIsChemistry(false);
      setShowChemistryHelp(false);
    }
  }, [selectedSubjectId, selectedTopic, selectedChapter, useChapterMode, subjects, chapters]);

  useEffect(() => {
    if (generatedContent?.id) {
      // Fetch review state for this exam paper if it has an ID
      const fetchReviewState = async () => {
        try {
          const state = await getContentReviewState(ContentType.EXAM_PAPER, generatedContent.id);
          setReviewState(state);
        } catch (error) {
          console.error('Error fetching review state:', error);
        }
      };
      
      fetchReviewState();
    } else {
      setReviewState(null);
    }
  }, [generatedContent?.id, getContentReviewState]);

  const handleGenerate = async () => {
    if (useChapterMode) {
      // Chapter-based generation
      if (!selectedChapter || !selectedSubjectId) {
        alert('Please select a subject and a chapter first.');
        return;
      }

      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (!subject) {
        alert('Could not find the selected subject.');
        return;
      }

      const chapter = chapters.find(c => c.id === selectedChapter);
      if (!chapter) {
        alert('Selected chapter details could not be found.');
        return;
      }

      // Get all topics in the chapter
      const chapterTopics = topics.filter(t => t.chapter_id === selectedChapter);
      if (chapterTopics.length === 0) {
        alert('No topics found in the selected chapter.');
        return;
      }

      // Use the first topic as the primary topic for the exam paper generation
      const primaryTopic = chapterTopics[0];

      const newPaper = await generateAndSaveExamPaper(
        primaryTopic,
        `${subject.name} - ${chapter.title}`,
        questionCount,
        llmProvider
      );

      if (newPaper) {
        setGeneratedContent(newPaper);
        alert(`Successfully generated chapter exam paper: ${newPaper.title}`);
      }
    } else {
      // Topic-based generation (existing logic)
      if (!selectedTopic || !selectedSubjectId) {
        alert('Please select a subject and a topic first.');
        return;
      }
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (!subject) {
        alert('Could not find the selected subject.');
        return;
      }
      const newPaper = await generateAndSaveExamPaper(
        selectedTopic,
        subject.name,
        questionCount,
        llmProvider
      );
      if (newPaper) {
        setGeneratedContent(newPaper);
        alert(`Successfully generated exam paper: ${newPaper.title}`);
      }
    }
  };

  const handleSubmitForReview = async () => {
    if (!generatedContent || !generatedContent.id) {
      toast.error('Please generate and save content before submitting for review.');
      return;
    }

    setIsLoading(true);
    try {
      await submitForReview(
        ContentType.EXAM_PAPER,
        generatedContent.id
      );
      
      // Update local state after submission
      setReviewState(ReviewState.PENDING_REVIEW);
      toast.success('Exam paper submitted for review successfully!');
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast.error('Failed to submit exam paper for review.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toast utility replacement
  const toast = {
    success: (message: string) => {
      setSnackbarSeverity('success');
      setSnackbarMessage(message);
      setOpenSnackbar(true);
    },
    error: (message: string) => {
      setSnackbarSeverity('error');
      setSnackbarMessage(message);
      setOpenSnackbar(true);
    },
    info: (message: string) => {
      setSnackbarSeverity('info');
      setSnackbarMessage(message);
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
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
            Exam Paper Generation
            {renderReviewStatusBadge()}
          </h2>
          <p className="text-neutral-600 mt-1">Create comprehensive exam papers with AI-generated questions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Select topic → Configure exam → Generate questions</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Panel - Generation Form */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exam Configuration
            </h3>

            <form className="space-y-6">
              {/* LLM Provider Selection */}
              <div>
                <label htmlFor="llmProvider" className="block text-sm font-medium text-neutral-700 mb-2">
                  LLM Provider
                </label>
                <div className="relative">
                  <select
                    id="llmProvider"
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value as LLMProvider)}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                    disabled={loading || isLoading}
                  >
                    {LLM_PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
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
                      value={selectedSubjectId || ''}
                      onChange={(e) => setSelectedSubjectId(e.target.value || null)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading}
                    >
                      <option value="">Select a subject...</option>
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
                    <p className="mt-1 text-sm">Please create a subject first before generating exam papers.</p>
                  </div>
                )}
              </div>

              {/* Topic Selection */}
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-neutral-700 mb-2">
                  Topic *
                </label>
                {selectedSubjectId ? (
                  topics.length > 0 ? (
                    <div className="relative">
                      <select
                        id="topic"
                        value={selectedTopic?.id || ''}
                        onChange={(e) => {
                          const topic = topics.find(t => t.id === e.target.value) || null;
                          setSelectedTopic(topic);
                        }}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                        disabled={loading}
                      >
                        <option value="">Select a topic...</option>
                        {topics.map(topic => (
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

              {/* Chapter-based Exam Generation Toggle */}
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
                          setSelectedTopic(null); // Clear topic selection when switching to chapter mode
                        } else {
                          setSelectedChapter(''); // Clear chapter selection when switching to topic mode
                        }
                      }}
                      className="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      disabled={loading}
                    />
                    <label htmlFor="useChapterMode" className="text-sm font-medium text-blue-900">
                      Generate exam paper from entire chapter
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-blue-700">
                    Create a comprehensive exam paper using questions from multiple topics within a chapter
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
                      disabled={loading}
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
                        const chapterTopics = topics.filter(t => t.chapter_id === selectedChapter);
                        return (
                          <div>
                            <p className="text-sm text-neutral-700">
                              <span className="font-medium">Chapter:</span> {chapter?.title}
                            </p>
                            <p className="text-sm text-neutral-600 mt-1">
                              <span className="font-medium">Topics included:</span> {chapterTopics.length} topics
                            </p>
                            <p className="text-sm text-neutral-600 mt-1">
                              <span className="font-medium">Estimated study time:</span> {Math.round((chapter?.estimated_study_time_minutes || 0) / 60)}h {(chapter?.estimated_study_time_minutes || 0) % 60}m
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

              {/* Chapter Exam Info */}
              {useChapterMode && selectedChapter && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Chapter Exam Paper Generation</h4>
                      <p className="text-sm text-green-700 mt-1">
                        This will create a comprehensive exam paper drawing questions from all topics within the selected chapter.
                        The exam will test understanding across the entire chapter scope and provide a thorough assessment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Question Count */}
              <div>
                <label htmlFor="questionCount" className="block text-sm font-medium text-neutral-700 mb-2">
                  Number of Questions
                </label>
                <div className="relative">
                  <input
                    id="questionCount"
                    type="number"
                    min="1"
                    max="50"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 10)}
                    className="w-full px-4 py-3 pr-20 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="10"
                    disabled={loading}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-neutral-500 text-sm">questions</span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  Recommended: 10-30 questions per exam paper
                </p>
              </div>

              {/* Chemistry Information */}
              {isChemistry && (
                <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium mb-2">Chemistry Content Detected</h4>
                      <p className="text-sm mb-3">
                        This will generate Chemistry-specific exam questions with proper notation for chemical formulas and equations.
                        Any generated content will be validated against IGCSE Chemistry standards.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-sm">
                        <li>Chemical formulas and equations will be properly formatted</li>
                        <li>Questions will include appropriate state symbols (s, l, g, aq)</li>
                        <li>Multiple-choice questions will follow IGCSE Chemistry exam format</li>
                        <li>Content will be validated against IGCSE Chemistry syllabus standards</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={
                    !selectedSubjectId ||
                    (useChapterMode ? !selectedChapter : !selectedTopic) ||
                    loading ||
                    isLoading
                  }
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    !selectedSubjectId ||
                    (useChapterMode ? !selectedChapter : !selectedTopic) ||
                    loading ||
                    isLoading
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-medium shadow-soft'
                  }`}
                >
                  {loading || isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Exam Paper...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Generate Exam Paper
                    </span>
                  )}
                </button>

                {generatedContent?.id && (
                  <button
                    type="button"
                    onClick={handleSubmitForReview}
                    disabled={isLoading || reviewState === ReviewState.PENDING_REVIEW || reviewState === ReviewState.APPROVED}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isLoading || reviewState === ReviewState.PENDING_REVIEW || reviewState === ReviewState.APPROVED
                        ? 'bg-secondary-300 text-white cursor-not-allowed'
                        : 'bg-secondary-600 text-white hover:bg-secondary-700 hover:shadow-medium shadow-soft'
                    }`}
                  >
                    {isLoading ? (
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
          {!loading && !isLoading && !generatedContent && !error && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ready to Generate Exam Paper</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Select a subject and topic, configure your exam settings, then click "Generate Exam Paper" to create comprehensive questions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Multiple question types
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Marking schemes
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    IGCSE format
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
          {(loading || isLoading) && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
                  <svg className="animate-spin w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Generating Exam Paper</h3>
                <p className="text-neutral-600">Creating {questionCount} questions for comprehensive assessment...</p>
              </div>
            </div>
          )}

          {/* Generated Exam Paper Display */}
          {generatedContent && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generated Exam Paper
                </h3>
                <span className="px-3 py-1 bg-success-100 text-success-800 rounded-full text-sm font-medium">
                  {questionCount} Questions
                </span>
              </div>

              <div className="prose max-w-none">
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-neutral-900 mb-4">Exam Paper Preview</h4>
                  <div className="text-neutral-700 whitespace-pre-wrap">
                    {generatedContent.content || 'No content available'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chemistry Validation Results */}
          {isChemistry && validationResult && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <ChemistryValidationResults
                validationResults={validationResult}
                onDismiss={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamPaperGeneratorForm;
