import React, { useState, useEffect } from 'react';
import LLMProviderSelector from './LLMProviderSelector';
import QuestionCounter from './QuestionCounter';
import QuickQuestionStats from './QuickQuestionStats';
import GenerationConfigPanel from '../shared/GenerationConfigPanel';
import GenerationActions from '../shared/GenerationActions';
import ReviewStatusBadge from '../shared/ReviewStatusBadge';
import { useQuizGeneration } from '../../hooks/useContentGeneration';
import { useReviewWorkflow } from '../../hooks/useReviewWorkflow';
import { useSubjects } from '../../hooks/useSubjects';
import { useTopics } from '../../hooks/useTopics';
import { useChapters } from '../../hooks/useChapters';
import { useRealtimeQuestionCounts } from '../../hooks/useQuestionStatistics';
import { LLMProvider } from '../../services/llmAdapter';
import { isChemistryContent } from '../../utils/chemistryValidator';
import ChemistryValidationResults from '../validation/ChemistryValidationResults';
import { ContentType } from '../../types/reviewTypes';
import { Chapter } from '../../types/chapter';
import { notify } from '../../utils/notifications';

interface QuizGeneratorFormProps {
  subjects: any[];
  topics: any[];
  chapters?: Chapter[];
  onSubjectChange: (subjectId: string | null) => void;
}

const QuizGeneratorForm: React.FC<QuizGeneratorFormProps> = ({
  subjects,
  topics,
  chapters: passedChapters,
  onSubjectChange
}) => {
  // Hooks
  const { subjects: allSubjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const { topics: filteredTopics, loading: loadingTopics } = useTopics(selectedSubjectId);
  const { chapters: hookChapters, loading: loadingChapters } = useChapters(selectedSubjectId);
  const chapters = passedChapters || hookChapters;

  // State
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [useChapterMode, setUseChapterMode] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficultyLevel, setDifficultyLevel] = useState<string>('medium');
  const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [isChemistry, setIsChemistry] = useState<boolean>(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

  // Hooks for generation and review
  const { generateAndSaveQuiz, loading, error, validationResults } = useQuizGeneration();
  const { refreshStatistics } = useRealtimeQuestionCounts();
  const {
    reviewState,
    isSubmitting,
    handleSubmit: submitForReview,
    canSubmit,
  } = useReviewWorkflow(ContentType.QUIZ, generatedQuiz?.id);

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

  // Handle subject change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    onSubjectChange(subjectId);
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

  // Handle quiz generation
  const handleGenerate = async () => {
    if (useChapterMode) {
      // Chapter-based generation
      if (!selectedChapter || !selectedSubjectId) {
        notify.warning('Please select a subject and a chapter first.');
        return;
      }

      const chapter = chapters.find(c => c.id === selectedChapter);
      const subject = allSubjects.find(s => s.id === selectedSubjectId);

      if (!chapter || !subject) {
        notify.error('Selected chapter or subject details could not be found.');
        return;
      }

      // Get all topics in the chapter
      const chapterTopics = filteredTopics.filter(t => t.chapter_id === selectedChapter);
      if (chapterTopics.length === 0) {
        notify.warning('No topics found in the selected chapter.');
        return;
      }

      const primaryTopic = chapterTopics[0];

      const newQuiz = await generateAndSaveQuiz(
        primaryTopic.id,
        {
          subject: subject.name,
          topicTitle: `${chapter.title} - Chapter Quiz`,
          syllabusCode: 'IGCSE',
          questionCount,
          difficultyLevel: parseInt(difficultyLevel) || 3,
          grade: 10
        }
      );

      if (newQuiz) {
        setGeneratedQuiz(newQuiz);
        refreshStatistics();
        notify.success(`Successfully generated chapter quiz with ${questionCount} questions for ${chapter.title}`);
      }
    } else {
      // Topic-based generation
      if (!selectedTopic || !selectedSubjectId) {
        notify.warning('Please select a subject and a topic first.');
        return;
      }

      const topic = filteredTopics.find(t => t.id === selectedTopic);
      const subject = allSubjects.find(s => s.id === selectedSubjectId);

      if (!topic || !subject) {
        notify.error('Selected topic or subject details could not be found.');
        return;
      }

      const newQuiz = await generateAndSaveQuiz(
        selectedTopic,
        {
          subject: subject.name,
          topicTitle: topic.title,
          syllabusCode: 'IGCSE',
          questionCount,
          difficultyLevel: parseInt(difficultyLevel) || 3,
          grade: 10
        }
      );

      if (newQuiz) {
        setGeneratedQuiz(newQuiz);
        refreshStatistics();
        notify.success(`Successfully generated quiz with ${questionCount} questions for ${topic.title}`);
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
            Quiz Generation
            <ReviewStatusBadge reviewState={reviewState} />
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
              <LLMProviderSelector
                selectedProvider={llmProvider}
                selectedModel={selectedModel}
                onProviderChange={setLlmProvider}
                onModelChange={setSelectedModel}
                disabled={loading || isSubmitting}
              />

              {/* Subject/Topic/Chapter Selection */}
              <GenerationConfigPanel
                subjects={allSubjects}
                selectedSubjectId={selectedSubjectId}
                onSubjectChange={handleSubjectChange}
                topics={filteredTopics}
                selectedTopicId={selectedTopic}
                onTopicChange={setSelectedTopic}
                topicsLoading={loadingTopics}
                chapters={chapters}
                selectedChapterId={selectedChapter}
                onChapterChange={setSelectedChapter}
                useChapterMode={useChapterMode}
                onChapterModeChange={handleChapterModeChange}
                chaptersLoading={loadingChapters}
                disabled={loading || isSubmitting}
              />

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
                    onGenerateMore={(recommendedCount) => setQuestionCount(recommendedCount)}
                  />
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
              <GenerationActions
                onGenerate={handleGenerate}
                canGenerate={!!canGenerate}
                isGenerating={loading}
                generateButtonText="Generate Quiz"
                onSubmitForReview={submitForReview}
                canSubmitForReview={canSubmit()}
                isSubmitting={isSubmitting}
                reviewState={reviewState}
                showReviewButton={!!generatedQuiz?.id}
              />
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
