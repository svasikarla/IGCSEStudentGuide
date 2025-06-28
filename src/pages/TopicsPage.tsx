import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSubjects } from '../hooks/useSubjects';
import { useTopics } from '../hooks/useTopics';
import TopicBrowser from '../components/study/TopicBrowser';
import BulkContentGenerator from '../components/admin/BulkContentGenerator';

const TopicsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { subjects } = useSubjects();
  const { topics, loading, error, updateTopicContent } = useTopics(subjectId || null);
  const [currentSubject, setCurrentSubject] = useState<any>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);

  // Find the current subject details
  useEffect(() => {
    if (subjects && subjectId) {
      const subject = subjects.find(s => s.id === subjectId);
      setCurrentSubject(subject || null);
    }
  }, [subjects, subjectId]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/subjects');
  };

  // Handle topic selection
  const handleTopicSelect = (topicId: string) => {
    setSelectedTopicId(topicId);
    navigate(`/subjects/${subjectId}/topics/${topicId}`);
  };

  // Handle content generation completion
  const handleContentGenerated = async (topicId: string, content: string) => {
    try {
      await updateTopicContent(topicId, content);
    } catch (error) {
      console.error('Failed to update topic content:', error);
    }
  };

  // Handle bulk generation completion
  const handleBulkGenerationComplete = () => {
    setShowBulkGenerator(false);
    // Topics will be automatically refreshed by the useTopics hook
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="flex items-center mb-8">
          <button 
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h1>Loading Topics...</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="flex items-center mb-8">
          <button 
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h1>Topics</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Error loading topics</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No subject found
  if (!currentSubject) {
    return (
      <div>
        <div className="flex items-center mb-8">
          <button 
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h1>Subject Not Found</h1>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Subject not found</h3>
          <p>The subject you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={handleBack} 
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Back to Subjects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{currentSubject.name}</h1>
            <p className="text-neutral-600">
              Explore {topics.length} topics and study materials for {currentSubject.name}.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkGenerator(!showBulkGenerator)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Content
          </button>
        </div>
      </div>

      {/* Subject Banner */}
      <div
        className="w-full h-20 mb-8 rounded-xl flex items-center justify-center p-4 shadow-soft"
        style={{ backgroundColor: currentSubject.color_hex }}
      >
        <h2 className="text-2xl font-bold text-white">{currentSubject.name} Topics</h2>
      </div>

      {/* Bulk Content Generator */}
      {showBulkGenerator && (
        <div className="mb-8">
          <BulkContentGenerator
            topics={topics}
            subjectName={currentSubject.name}
            gradeLevel="IGCSE"
            onContentGenerated={handleContentGenerated}
            onComplete={handleBulkGenerationComplete}
          />
        </div>
      )}

      {/* Main Content */}
      {topics.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Topic Browser - Left Side */}
          <div className="xl:col-span-5">
            <TopicBrowser
              topics={topics}
              selectedTopicId={selectedTopicId}
              onTopicSelect={handleTopicSelect}
              loading={loading}
            />
          </div>

          {/* Content Preview - Right Side */}
          <div className="xl:col-span-7">
            {selectedTopicId ? (
              <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">Topic Selected</h3>
                  <p className="text-neutral-600 mb-4">
                    Click "Study Now" to view the full topic content and learning materials.
                  </p>
                  <button
                    onClick={() => navigate(`/subjects/${subjectId}/topics/${selectedTopicId}`)}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    Study Now →
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300 p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">Select a Topic</h3>
                <p className="text-neutral-500">
                  Choose a topic from the browser on the left to see details and study options.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Topics Available Yet</h3>
          <p className="text-neutral-600 mb-6">
            We're currently developing content for {currentSubject.name}. Use the "Generate Content" button above to create topics automatically.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowBulkGenerator(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Generate Topics
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-300 transition-colors"
            >
              Back to Subjects
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicsPage;
