import React, { useState, useEffect, useCallback } from 'react';
import { useContentScraping, ScrapingJob, ScrapingJobDetails, ScrapingResult } from '../../hooks/useContentScraping';
import { useSubjects, Subject } from '../../hooks/useSubjects';
import { useTopics, Topic } from '../../hooks/useTopics';

// Interfaces are now imported from the hook

const ContentScrapingInterface: React.FC = () => {
  const {
    loading,
    error: hookError,
    startScraping,
    startProcessing,
    getAllJobs,
    pollJobStatus
  } = useContentScraping();

  const { subjects, loading: subjectsLoading } = useSubjects();

  const [urls, setUrls] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('khan_academy');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const { topics, loading: topicsLoading } = useTopics(selectedSubject?.id || null);
  const [syllabusCode, setSyllabusCode] = useState<string>('');
  const [difficultyLevel, setDifficultyLevel] = useState<number>(3);
  const [generateQuestions, setGenerateQuestions] = useState<boolean>(true);
  const [generateFlashcards, setGenerateFlashcards] = useState<boolean>(true);
  const [currentJob, setCurrentJob] = useState<ScrapingJobDetails | null>(null);
  const [jobHistory, setJobHistory] = useState<ScrapingJob[]>([]);
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchJobHistory = useCallback(async () => {
    try {
      const jobs = await getAllJobs();
      setJobHistory(jobs);
    } catch (error) {
      console.error('Error fetching job history:', error);
    }
  }, [getAllJobs]);

  // Poll for job status updates
  useEffect(() => {
    if (currentJob && (currentJob.status === 'starting' || currentJob.status === 'running')) {
      pollJobStatus(currentJob.id, (updatedJob) => {
        setCurrentJob(updatedJob);
        if (updatedJob.results) {
          setResults(updatedJob.results);
        }
      }).then(() => {
        fetchJobHistory();
      });
    }
  }, [currentJob, pollJobStatus, fetchJobHistory]);

  // Fetch job history on component mount
  useEffect(() => {
    fetchJobHistory();
  }, [fetchJobHistory]);

  // Reset topic selection when subject changes
  useEffect(() => {
    setSelectedTopic(null);
  }, [selectedSubject]);

  const handleStartScraping = async () => {
    if (!urls.trim()) {
      setError('Please enter at least one URL to scrape');
      return;
    }

    if (!selectedSubject) {
      setError('Please select a subject for the scraped content');
      return;
    }

    const urlList = urls.split('\n').map(url => url.trim()).filter(url => url);

    setCurrentJob(null);
    setResults([]);
    setError(null);

    try {
      const jobId = await startScraping({
        sources: urlList,
        sourceType,
        subject: selectedSubject.name,
        subjectId: selectedSubject.id,
        topicId: selectedTopic?.id,
        topicName: selectedTopic?.title,
        syllabusCode: syllabusCode || undefined,
        difficultyLevel,
        generateQuestions,
        generateFlashcards
      });

      if (jobId) {
        setCurrentJob({
          id: jobId,
          status: 'starting',
          progress: 0,
          totalSources: urlList.length,
          processedSources: 0,
          startTime: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error starting scraping:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleProcessContent = async () => {
    setCurrentJob(null);
    setResults([]);
    setError(null);

    try {
      const jobId = await startProcessing();

      if (jobId) {
        setCurrentJob({
          id: jobId,
          status: 'starting',
          progress: 0,
          totalSources: 0,
          processedSources: 0,
          startTime: new Date().toISOString(),
          type: 'processing'
        });
      }
    } catch (error) {
      console.error('Error starting processing:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Content Scraping</h2>
        <p className="text-neutral-600">
          Scrape educational content from external sources to enhance the knowledge base
        </p>
      </div>

      {/* Scraping Form */}
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Start New Scraping Job</h3>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">How it works</h4>
              <p className="text-sm text-blue-800">
                Scraped content will be automatically linked to the selected subject{selectedTopic ? ' and topic' : ''}.
                The system will generate {generateQuestions && generateFlashcards ? 'quiz questions and flashcards' :
                generateQuestions ? 'quiz questions' : generateFlashcards ? 'flashcards' : 'educational content'}
                that students can access through the study interface.
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* URLs Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              URLs to Scrape (one per line)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={6}
              placeholder="https://www.khanacademy.org/science/biology/intro-to-biology&#10;https://www.ck12.org/biology/cell-structure/&#10;..."
              disabled={loading}
            />
          </div>

          {/* Subject and Topic Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSubject?.id || ''}
                onChange={(e) => {
                  const subject = subjects.find(s => s.id === e.target.value);
                  setSelectedSubject(subject || null);
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={loading || subjectsLoading}
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Topic (Optional)
              </label>
              <select
                value={selectedTopic?.id || ''}
                onChange={(e) => {
                  const topic = topics.find(t => t.id === e.target.value);
                  setSelectedTopic(topic || null);
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={loading || topicsLoading || !selectedSubject}
              >
                <option value="">Select a topic (optional)</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={loading}
              >
                <option value="khan_academy">Khan Academy</option>
                <option value="ck12">CK-12 Foundation</option>
                <option value="wikipedia">Wikipedia</option>
                <option value="cambridge_resource">Cambridge Resource</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={loading}
              >
                <option value={1}>1 - Very Easy</option>
                <option value={2}>2 - Easy</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - Hard</option>
                <option value={5}>5 - Very Hard</option>
              </select>
            </div>
          </div>

          {/* Syllabus Code */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Syllabus Code (Optional)
            </label>
            <input
              type="text"
              value={syllabusCode}
              onChange={(e) => setSyllabusCode(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., 1.1, 2.3, B1.2"
              disabled={loading}
            />
          </div>

          {/* Content Generation Options */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Generate Content
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="generateQuestions"
                  checked={generateQuestions}
                  onChange={(e) => setGenerateQuestions(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="generateQuestions" className="ml-2 text-sm text-neutral-700">
                  Generate quiz questions from scraped content
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="generateFlashcards"
                  checked={generateFlashcards}
                  onChange={(e) => setGenerateFlashcards(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="generateFlashcards" className="ml-2 text-sm text-neutral-700">
                  Generate flashcards from scraped content
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleStartScraping}
              disabled={loading || !urls.trim() || !selectedSubject}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Starting...' : 'Start Scraping'}
            </button>

            <button
              onClick={handleProcessContent}
              disabled={loading}
              className="px-6 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              Process Pending Content
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(error || hookError) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-red-800">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error || hookError}</p>
        </div>
      )}

      {/* Current Job Status */}
      {currentJob && (
        <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Current Job Status</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-700">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                currentJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                currentJob.status === 'running' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {currentJob.status.charAt(0).toUpperCase() + currentJob.status.slice(1)}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-neutral-700">Progress:</span>
                <span className="text-sm text-neutral-600">{currentJob.progress}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
            </div>

            {currentJob.totalSources > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-700">Sources:</span>
                <span className="text-sm text-neutral-600">
                  {currentJob.processedSources} / {currentJob.totalSources}
                </span>
              </div>
            )}

            {currentJob.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{currentJob.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Scraping Results</h3>
          
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className={`p-3 rounded-lg border ${
                result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{result.url}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {result.error && (
                  <p className="text-xs text-red-600 mt-1">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job History */}
      {jobHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Jobs</h3>
          
          <div className="space-y-3">
            {jobHistory.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Job {job.id.slice(-8)}</p>
                  <p className="text-xs text-neutral-600">
                    {new Date(job.startTime).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                    job.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {job.status}
                  </span>
                  {job.totalSources > 0 && (
                    <p className="text-xs text-neutral-600 mt-1">
                      {job.processedSources}/{job.totalSources} sources
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentScrapingInterface;
