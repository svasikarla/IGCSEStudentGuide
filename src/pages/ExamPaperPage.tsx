import React, { useState, useEffect, useCallback } from 'react';
import { useSubjects } from '../hooks/useSubjects';
import { useTopics } from '../hooks/useTopics';
import { useExamPapers, ExamPaper, PaperHistoryItem } from '../hooks/useExamPapers';
import PrintPreview from '../components/PrintPreview';
import AnswerSheetUploader from '../components/AnswerSheetUploader';

const ExamPaperPage: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [totalMarks, setTotalMarks] = useState<20 | 50>(20);
  const [generatedPaper, setGeneratedPaper] = useState<ExamPaper | null>(null);
  const [paperHistory, setPaperHistory] = useState<PaperHistoryItem[]>([]);
  const [uploadingPaperId, setUploadingPaperId] = useState<string | null>(null);
  const [viewingEvaluationId, setViewingEvaluationId] = useState<string | null>(null);

  const { subjects, loading: subjectsLoading } = useSubjects();
  const { topics, loading: topicsLoading } = useTopics(selectedSubjectId);
  const { generatePaper, getPaperDetails, getPaperHistory, loading: paperLoading, error: paperError } = useExamPapers();

  // Reset topic when subject changes
  useEffect(() => {
    setSelectedTopicId(null);
  }, [selectedSubjectId]);

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

          {/* Topic Selector */}
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
              disabled={!selectedTopicId || paperLoading}
              className={`w-full px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                !selectedTopicId || paperLoading
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
