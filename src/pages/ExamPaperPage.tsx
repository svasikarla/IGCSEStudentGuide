import React, { useState, useEffect, useCallback } from 'react';
import { useSubjects } from '../hooks/useSubjects';
import { useTopics } from '../hooks/useTopics';
import { useChapters } from '../hooks/useChapters';
import { useExamPapers, ExamPaper, PaperHistoryItem } from '../hooks/useExamPapers';
import PrintPreview from '../components/PrintPreview';
import AnswerSheetUploader from '../components/AnswerSheetUploader';

const ExamPaperPage: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [useChapterMode, setUseChapterMode] = useState<boolean>(false);
  const [totalMarks, setTotalMarks] = useState<20 | 50>(20);
  const [generatedPaper, setGeneratedPaper] = useState<ExamPaper | null>(null);
  const [paperHistory, setPaperHistory] = useState<PaperHistoryItem[]>([]);
  const [uploadingPaperId, setUploadingPaperId] = useState<string | null>(null);
  const [viewingEvaluationId, setViewingEvaluationId] = useState<string | null>(null);

  const { subjects, loading: subjectsLoading } = useSubjects();
  const { chapters, loading: chaptersLoading } = useChapters(selectedSubjectId);
  const { topics, loading: topicsLoading } = useTopics(selectedSubjectId);
  const { generatePaper, getPaperDetails, getPaperHistory, loading: paperLoading, error: paperError } = useExamPapers();

  // Reset chapter and topic when subject changes
  useEffect(() => {
    setSelectedChapterId(null);
    setSelectedTopicId(null);
    setUseChapterMode(false);
  }, [selectedSubjectId]);

  // Reset topic when chapter changes
  useEffect(() => {
    setSelectedTopicId(null);
  }, [selectedChapterId]);

  // Function to fetch paper history
  const fetchHistory = useCallback(async () => {
    const history = await getPaperHistory();
    setPaperHistory(history);
  }, [getPaperHistory]);

  // Fetch paper history on component mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleGeneratePaper = async () => {
    if (useChapterMode) {
      // Chapter-based generation
      if (!selectedChapterId) {
        alert('Please select a chapter first.');
        return;
      }

      let targetTopicId: string;

      if (selectedChapterId === 'ALL') {
        // Generate from all topics in the subject
        if (topics.length === 0) {
          alert('No topics found in the subject.');
          return;
        }
        // Use the first topic as the primary topic for generation
        targetTopicId = topics[0].id;
      } else {
        // Generate from specific chapter
        if (selectedTopicId) {
          // Use the selected specific topic within the chapter
          targetTopicId = selectedTopicId;
        } else {
          // Use all topics in the chapter
          const chapterTopics = topics.filter(topic => topic.chapter_id === selectedChapterId);
          if (chapterTopics.length === 0) {
            alert('No topics found in the selected chapter.');
            return;
          }
          // Use the first topic as the primary topic for generation
          targetTopicId = chapterTopics[0].id;
        }
      }

      setGeneratedPaper(null);
      const paperId = await generatePaper(targetTopicId, totalMarks);
      if (paperId) {
        const paperDetails = await getPaperDetails(paperId);
        if (paperDetails) {
          setGeneratedPaper(paperDetails);
          // Refresh history
          fetchHistory();
        }
      }
    } else {
      // Topic-based generation (existing logic)
      if (!selectedTopicId) {
        alert('Please select a topic first.');
        return;
      }
      setGeneratedPaper(null);
      const paperId = await generatePaper(selectedTopicId, totalMarks);
      if (paperId) {
        const paperDetails = await getPaperDetails(paperId);
        if (paperDetails) {
          setGeneratedPaper(paperDetails);
          // Refresh history
          fetchHistory();
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Exam Paper Generator</h1>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Generate professional IGCSE-style exam papers with proper formatting for printing
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">

        <div className="space-y-6">
          {/* Subject Selector */}
          <div>
            <label htmlFor="subject-select" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select 
              id="subject-select"
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value || null)}
              disabled={subjectsLoading}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="">{subjectsLoading ? 'Loading...' : 'Select a subject'}</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          {/* Chapter Mode Toggle */}
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
                      setSelectedTopicId(null); // Clear topic selection when switching to chapter mode
                    } else {
                      setSelectedChapterId(null); // Clear chapter selection when switching to topic mode
                    }
                  }}
                  className="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                />
                <label htmlFor="useChapterMode" className="text-sm font-medium text-blue-900">
                  Take exam on entire chapter
                </label>
              </div>
              <p className="mt-1 text-sm text-blue-700">
                Generate an exam paper covering all topics within a chapter for comprehensive assessment
              </p>
            </div>
          )}

          {/* Chapter Selector */}
          {useChapterMode && selectedSubjectId && chapters.length > 0 && (
            <div>
              <label htmlFor="chapter-select" className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
              <select
                id="chapter-select"
                value={selectedChapterId || ''}
                onChange={(e) => setSelectedChapterId(e.target.value || null)}
                disabled={!selectedSubjectId || chaptersLoading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">{chaptersLoading ? 'Loading...' : 'Select a chapter'}</option>
                <option value="ALL">ALL - Complete Chapter Assessment</option>
                {chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.syllabus_code ? `${chapter.syllabus_code}. ` : ''}{chapter.title}
                  </option>
                ))}
              </select>

              {/* Chapter Preview */}
              {selectedChapterId && selectedChapterId !== 'ALL' && (
                <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  {(() => {
                    const chapter = chapters.find(c => c.id === selectedChapterId);
                    const chapterTopics = topics.filter(t => t.chapter_id === selectedChapterId);
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

              {/* ALL Chapter Preview */}
              {selectedChapterId === 'ALL' && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Complete Subject Assessment</h4>
                      <p className="text-sm text-green-700 mt-1">
                        This will create a comprehensive exam covering all chapters and topics in the subject.
                        Perfect for final assessments and comprehensive review.
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        <span className="font-medium">Total chapters:</span> {chapters.length} |
                        <span className="font-medium"> Total topics:</span> {topics.length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Topic Selector */}
          {!useChapterMode && (
            <div>
              <label htmlFor="topic-select" className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <select
                id="topic-select"
                value={selectedTopicId || ''}
                onChange={(e) => setSelectedTopicId(e.target.value || null)}
                disabled={!selectedSubjectId || topicsLoading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">{topicsLoading ? 'Loading...' : 'Select a topic'}</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Chapter Topics Selector (when specific chapter is selected) */}
          {useChapterMode && selectedChapterId && selectedChapterId !== 'ALL' && (
            <div>
              <label htmlFor="chapter-topic-select" className="block text-sm font-medium text-gray-700 mb-1">
                Topic (Optional - Leave blank for all topics in chapter)
              </label>
              <select
                id="chapter-topic-select"
                value={selectedTopicId || ''}
                onChange={(e) => setSelectedTopicId(e.target.value || null)}
                disabled={!selectedChapterId || topicsLoading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All topics in chapter</option>
                {topics
                  .filter(topic => topic.chapter_id === selectedChapterId)
                  .map(topic => (
                    <option key={topic.id} value={topic.id}>{topic.title}</option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select a specific topic within the chapter, or leave blank to include all topics
              </p>
            </div>
          )}

          {/* Marks Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paper Length</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="radio" name="marks" value={20} checked={totalMarks === 20} onChange={() => setTotalMarks(20)} className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300" />
                <span className="ml-2 text-sm text-gray-700">20 Marks</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="marks" value={50} checked={totalMarks === 50} onChange={() => setTotalMarks(50)} className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300" />
                <span className="ml-2 text-sm text-gray-700">50 Marks</span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <div>
            <button
              onClick={handleGeneratePaper}
              disabled={
                paperLoading ||
                (!useChapterMode && !selectedTopicId) ||
                (useChapterMode && !selectedChapterId)
              }
              className={`w-full px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                paperLoading ||
                (!useChapterMode && !selectedTopicId) ||
                (useChapterMode && !selectedChapterId)
                  ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-medium shadow-soft'
              }`}
            >
              {paperLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Paper...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Exam Paper
                </span>
              )}
            </button>
          </div>
        </div>

        {paperError && <p className="mt-4 text-sm text-red-600">Error: {paperError}</p>}

        {generatedPaper && (
          <PrintPreview
            paper={generatedPaper}
            subjectName={subjects.find(s => s.id === selectedSubjectId)?.name || "IGCSE Subject"}
            topicTitle={topics.find(t => t.id === selectedTopicId)?.title || "Practice Topic"}
            timeAllocation={totalMarks === 20 ? "45 minutes" : "1 hour 30 minutes"}
            instructions={[
              "Answer ALL questions.",
              "Write your answers in the spaces provided.",
              "Show all your working clearly.",
              "Calculators may be used unless otherwise stated.",
              "The total mark for this paper is " + totalMarks + " marks."
            ]}
          />
        )}

        {/* Paper History Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Paper History</h2>
          {paperHistory.length > 0 ? (
            <ul className="space-y-4">
              {paperHistory.map(item => (
                <li key={item.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-700">{item.topic_title}</p>
                      <p className="text-sm text-gray-500">{item.total_marks} marks - {new Date(item.generated_at).toLocaleDateString()}</p>
                      {/* Display Submission Status and Score */}
                      {item.submission_status === 'EVALUATED' && (
                        <p className="text-md font-semibold text-green-600 mt-1">
                          Score: {item.submission_score ?? 'N/A'} / {item.total_marks}
                        </p>
                      )}
                      {item.submission_status === 'PENDING' && (
                        <p className="text-sm text-yellow-600 mt-1 animate-pulse">Evaluation in progress...</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Conditionally show Upload button */}
                      {!item.submission_status && (
                        <button 
                          onClick={() => setUploadingPaperId(uploadingPaperId === item.id ? null : item.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {uploadingPaperId === item.id ? 'Cancel' : 'Upload Answers'}
                        </button>
                      )}
                      {/* View Evaluation Button */}
                      {item.submission_status === 'EVALUATED' && (
                        <button
                          onClick={() => setViewingEvaluationId(viewingEvaluationId === item.id ? null : item.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          {viewingEvaluationId === item.id ? 'Hide Evaluation' : 'View Evaluation'}
                        </button>
                      )}
                      <button 
                        onClick={async () => {
                          setGeneratedPaper(null);
                          const paperDetails = await getPaperDetails(item.id);
                          if (paperDetails) setGeneratedPaper(paperDetails);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-secondary-600 hover:bg-secondary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                      >
                        View
                      </button>
                    </div>
                  </div>
                  {uploadingPaperId === item.id && (
                    <div className="mt-4 border-t pt-4">
                      <AnswerSheetUploader 
                        paperId={item.id} 
                        onUploadComplete={() => {
                          setUploadingPaperId(null);
                          fetchHistory();
                        }}
                      />
                    </div>
                  )}
                  {/* Display OCR Text */}
                  {viewingEvaluationId === item.id && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="font-semibold text-gray-800">Extracted Answer Text (OCR)</h4>
                      <pre className="mt-2 p-3 bg-gray-100 rounded-md text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {item.ocr_raw_text || 'No text extracted.'}
                      </pre>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No previously generated papers found.</p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPaperPage;
