import React from 'react';
import { Chapter } from '../../types/chapter';
import { Topic } from '../../hooks/useTopics';

interface GenerationConfigPanelProps {
  // Subject selection
  subjects: any[];
  selectedSubjectId: string;
  onSubjectChange: (subjectId: string) => void;

  // Topic selection
  topics: Topic[];
  selectedTopicId: string;
  onTopicChange: (topicId: string) => void;
  topicsLoading?: boolean;

  // Chapter mode (optional)
  chapters?: Chapter[];
  selectedChapterId?: string;
  onChapterChange?: (chapterId: string) => void;
  useChapterMode?: boolean;
  onChapterModeChange?: (enabled: boolean) => void;
  chaptersLoading?: boolean;

  // State
  disabled?: boolean;
}

/**
 * Shared GenerationConfigPanel component
 *
 * Provides consistent Subject/Topic/Chapter selection UI
 * across all generator forms (Quiz, Flashcard, Exam).
 *
 * Extracted from duplicated code in QuizGeneratorForm, FlashcardGeneratorForm,
 * and ExamPaperGeneratorForm.
 */
const GenerationConfigPanel: React.FC<GenerationConfigPanelProps> = ({
  subjects,
  selectedSubjectId,
  onSubjectChange,
  topics,
  selectedTopicId,
  onTopicChange,
  topicsLoading = false,
  chapters = [],
  selectedChapterId = '',
  onChapterChange,
  useChapterMode = false,
  onChapterModeChange,
  chaptersLoading = false,
  disabled = false,
}) => {
  const showChapterMode = chapters.length > 0 && onChapterModeChange && onChapterChange;

  return (
    <div className="space-y-6">
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
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
              disabled={disabled}
            >
              <option value="">Select a subject...</option>
              {subjects.map((subject) => (
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
            <p className="mt-1 text-sm">Please create a subject first before generating content.</p>
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
                value={selectedTopicId}
                onChange={(e) => onTopicChange(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                disabled={disabled || topicsLoading || useChapterMode}
              >
                <option value="">Select a topic...</option>
                {topics.map((topic) => (
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

      {/* Chapter-based Generation Toggle */}
      {showChapterMode && selectedSubjectId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="useChapterMode"
              checked={useChapterMode}
              onChange={(e) => {
                if (onChapterModeChange) {
                  onChapterModeChange(e.target.checked);
                }
              }}
              className="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              disabled={disabled}
            />
            <label htmlFor="useChapterMode" className="text-sm font-medium text-blue-900">
              Generate from entire chapter
            </label>
          </div>
          <p className="mt-1 text-sm text-blue-700">
            Create comprehensive content using questions from multiple topics within a chapter
          </p>
        </div>
      )}

      {/* Chapter Selection */}
      {showChapterMode && useChapterMode && selectedSubjectId && (
        <div>
          <label htmlFor="chapter" className="block text-sm font-medium text-neutral-700 mb-2">
            Chapter *
          </label>
          <div className="relative">
            <select
              id="chapter"
              value={selectedChapterId}
              onChange={(e) => {
                if (onChapterChange) {
                  onChapterChange(e.target.value);
                }
              }}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
              disabled={disabled || chaptersLoading}
            >
              <option value="">Select a chapter...</option>
              {chapters.map((chapter) => (
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

          {/* Chapter Details */}
          {selectedChapterId && (
            <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
              {(() => {
                const chapter = chapters.find((c) => c.id === selectedChapterId);
                const chapterTopics = topics.filter((t) => t.chapter_id === selectedChapterId);
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

      {/* Chapter Info Banner */}
      {useChapterMode && selectedChapterId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-900">Chapter-Based Generation</h4>
              <p className="text-sm text-green-700 mt-1">
                This will create comprehensive content drawing from all topics within the selected chapter,
                providing a thorough assessment of the entire chapter scope.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationConfigPanel;
