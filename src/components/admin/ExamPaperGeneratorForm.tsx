import React, { useState, useEffect } from 'react';
import LLMProviderSelector from './LLMProviderSelector';
import GenerationConfigPanel from '../shared/GenerationConfigPanel';
import GenerationActions from '../shared/GenerationActions';
import ReviewStatusBadge from '../shared/ReviewStatusBadge';
import { useSubjects } from '../../hooks/useSubjects';
import { useTopics } from '../../hooks/useTopics';
import { useChapters } from '../../hooks/useChapters';
import { useExamPaperGeneration } from '../../hooks/useContentGeneration';
import { useReviewWorkflow } from '../../hooks/useReviewWorkflow';
import { LLMProvider } from '../../services/llmAdapter';
import { isChemistryContent } from '../../utils/chemistryValidator';
import { ContentType } from '../../types/reviewTypes';
import { notify } from '../../utils/notifications';

const ExamPaperGeneratorForm: React.FC = () => {
  // Hooks
  const { subjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const { topics, loading: topicsLoading } = useTopics(selectedSubjectId);
  const { chapters, loading: chaptersLoading } = useChapters(selectedSubjectId);

  // State
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [useChapterMode, setUseChapterMode] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [isChemistry, setIsChemistry] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Hooks for generation and review
  const { generateAndSaveExamPaper, loading, error } = useExamPaperGeneration();
  const {
    reviewState,
    isSubmitting,
    handleSubmit: submitForReview,
    canSubmit,
  } = useReviewWorkflow(ContentType.EXAM_PAPER, generatedContent?.id);

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
          const topic = topics.find(t => t.id === selectedTopic);
          if (topic) {
            hasChemistryContent = isChemistrySubject || isChemistryContent(topic.title);
          }
        }

        setIsChemistry(hasChemistryContent);
      }
    } else {
      setIsChemistry(false);
    }
  }, [selectedSubjectId, selectedTopic, selectedChapter, useChapterMode, subjects, chapters, topics]);

  // Handle subject change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedTopic('');
    setSelectedChapter('');
  };

  // Handle chapter mode toggle
  const handleChapterModeChange = (enabled: boolean) => {
    setUseChapterMode(enabled);
    if (enabled) {
      setSelectedTopic('');
    } else {
      setSelectedChapter('');
    }
  };

  // Handle exam paper generation
  const handleGenerate = async () => {
    if (useChapterMode) {
      // Chapter-based generation
      if (!selectedChapter || !selectedSubjectId) {
        notify.warning('Please select a subject and a chapter first.');
        return;
      }

      const subject = subjects.find(s => s.id === selectedSubjectId);
      const chapter = chapters.find(c => c.id === selectedChapter);

      if (!subject || !chapter) {
        notify.error('Selected subject or chapter details could not be found.');
        return;
      }

      // Get all topics in the chapter
      const chapterTopics = topics.filter(t => t.chapter_id === selectedChapter);
      if (chapterTopics.length === 0) {
        notify.warning('No topics found in the selected chapter.');
        return;
      }

      const primaryTopic = chapterTopics[0];

      const newPaper = await generateAndSaveExamPaper(
        primaryTopic.id,
        {
          subject: subject.name,
          topicTitle: `${subject.name} - ${chapter.title}`,
          syllabusCode: 'IGCSE',
          duration: 60,
          totalMarks: questionCount * 5,
          grade: 10
        }
      );

      if (newPaper) {
        setGeneratedContent(newPaper);
        notify.success(`Successfully generated chapter exam paper: ${newPaper.title}`);
      }
    } else {
      // Topic-based generation
      if (!selectedTopic || !selectedSubjectId) {
        notify.warning('Please select a subject and a topic first.');
        return;
      }

      const subject = subjects.find(s => s.id === selectedSubjectId);
      const topic = topics.find(t => t.id === selectedTopic);

      if (!subject || !topic) {
        notify.error('Selected subject or topic details could not be found.');
        return;
      }

      const newPaper = await generateAndSaveExamPaper(
        selectedTopic,
        {
          subject: subject.name,
          topicTitle: topic.title,
          syllabusCode: 'IGCSE',
          duration: 60,
          totalMarks: questionCount * 5,
          grade: 10
        }
      );

      if (newPaper) {
        setGeneratedContent(newPaper);
        notify.success(`Successfully generated exam paper: ${newPaper.title}`);
      }
    }
  };

  // Check if we can generate
  const canGenerate = selectedSubjectId && (useChapterMode ? selectedChapter : selectedTopic);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            Exam Paper Generation
            <ReviewStatusBadge reviewState={reviewState} />
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
              <LLMProviderSelector
                selectedProvider={llmProvider}
                selectedModel={selectedModel}
                onProviderChange={setLlmProvider}
                onModelChange={setSelectedModel}
                disabled={loading || isSubmitting}
              />

              {/* Subject/Topic/Chapter Selection */}
              <GenerationConfigPanel
                subjects={subjects}
                selectedSubjectId={selectedSubjectId}
                onSubjectChange={handleSubjectChange}
                topics={topics}
                selectedTopicId={selectedTopic}
                onTopicChange={setSelectedTopic}
                topicsLoading={topicsLoading}
                chapters={chapters}
                selectedChapterId={selectedChapter}
                onChapterChange={setSelectedChapter}
                useChapterMode={useChapterMode}
                onChapterModeChange={handleChapterModeChange}
                chaptersLoading={chaptersLoading}
                disabled={loading || isSubmitting}
              />

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
              <GenerationActions
                onGenerate={handleGenerate}
                canGenerate={!!canGenerate}
                isGenerating={loading}
                generateButtonText="Generate Exam Paper"
                onSubmitForReview={submitForReview}
                canSubmitForReview={canSubmit()}
                isSubmitting={isSubmitting}
                reviewState={reviewState}
                showReviewButton={!!generatedContent?.id}
              />
            </form>
          </div>
        </div>

        {/* Right Panel - Generated Content */}
        <div className="xl:col-span-7 space-y-6">
          {/* Empty State */}
          {!loading && !generatedContent && !error && (
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
          {loading && (
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

          {/* Chemistry validation can be added here if needed */}
        </div>
      </div>
    </div>
  );
};

export default ExamPaperGeneratorForm;
