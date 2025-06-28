import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTopics, Topic } from '../hooks/useTopics';
import { useSubjects, Subject } from '../hooks/useSubjects';
import ContentViewer from '../components/study/ContentViewer';

const TopicContentPage: React.FC = () => {
  const { subjectId, topicId } = useParams<{ subjectId: string; topicId: string }>();
  const navigate = useNavigate();
  const { topics, loading: topicsLoading, error: topicsError } = useTopics(subjectId || '');
  const { subjects, loading: subjectsLoading } = useSubjects();
  
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId || !topicId) {
      setError('Invalid topic or subject ID');
      setLoading(false);
      return;
    }

    // Find the current subject
    const subject = subjects.find(s => s.id === subjectId);
    if (!subjectsLoading && !subject) {
      setError('Subject not found');
      setLoading(false);
      return;
    }
    setCurrentSubject(subject || null);

    // Find the current topic
    const topic = topics.find(t => t.id === topicId);
    if (!topicsLoading && !topic) {
      setError('Topic not found');
      setLoading(false);
      return;
    }
    setCurrentTopic(topic || null);

    // Set loading state
    setLoading(topicsLoading || subjectsLoading);
    setError(topicsError);
  }, [subjectId, topicId, topics, subjects, topicsLoading, subjectsLoading, topicsError]);

  const handleBack = () => {
    navigate(`/subjects/${subjectId}`);
  };

  const handleBackToSubjects = () => {
    navigate('/subjects');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentTopic || !currentSubject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl text-center">
            <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Content Not Found</h2>
            <p className="mb-6">
              {error || 'The requested topic could not be found. It may have been moved or deleted.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                Back to Topics
              </button>
              <button
                onClick={handleBackToSubjects}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Back to Subjects
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={handleBackToSubjects}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Subjects
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <button
              onClick={handleBack}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              {currentSubject.name}
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-500">{currentTopic.title}</span>
          </div>
        </nav>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {currentSubject.name} Topics
          </button>
        </div>

        {/* Content Viewer */}
        <ContentViewer topic={currentTopic} />

        {/* Navigation to Other Topics */}
        <div className="mt-12 bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Other Topics in {currentSubject.name}
          </h3>
          
          {topics.length > 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics
                .filter(topic => topic.id !== currentTopic.id)
                .slice(0, 6)
                .map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => navigate(`/subjects/${subjectId}/topics/${topic.id}`)}
                    className="text-left p-4 border border-neutral-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all"
                  >
                    <h4 className="font-medium text-neutral-900 mb-1">{topic.title}</h4>
                    <p className="text-sm text-neutral-600 line-clamp-2">
                      {topic.description || 'No description available'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-neutral-500">
                        {topic.estimated_study_time_minutes} min
                      </span>
                      <span className="text-xs text-primary-600 font-medium">
                        Study →
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-neutral-600">
              This is the only topic available in {currentSubject.name} at the moment.
            </p>
          )}
          
          {topics.length > 7 && (
            <div className="mt-4 text-center">
              <button
                onClick={handleBack}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                View all {topics.length} topics →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicContentPage;
