import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjects } from '../hooks/useSubjects';
import { useTopics } from '../hooks/useTopics';
import SubjectManagement from '../components/admin/SubjectManagement';
import TopicGeneratorForm from '../components/admin/TopicGeneratorForm';
import FlashcardGeneratorForm from '../components/admin/FlashcardGeneratorForm';
import QuizGeneratorForm from '../components/admin/QuizGeneratorForm';
import ExamPaperGeneratorForm from '../components/admin/ExamPaperGeneratorForm';
import LLMProviderTester from '../components/admin/LLMProviderTester';

/**
 * Admin page for content generation using LLM
 */
const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subjects' | 'topics' | 'flashcards' | 'quizzes' | 'exam-papers' | 'test-llm'>('subjects');
  const { subjects } = useSubjects();
  const navigate = useNavigate();

  // Get topics for the selected subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const { topics } = useTopics(selectedSubjectId);

  // Handle tab change
  const handleTabChange = (tab: 'subjects' | 'topics' | 'flashcards' | 'quizzes' | 'exam-papers' | 'test-llm') => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 lg:mb-8 gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Content Administration</h1>
            <p className="text-gray-600 text-sm lg:text-base mt-1">Generate and manage educational content using AI</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'subjects'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('subjects')}
          >
            Subjects
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'topics'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('topics')}
          >
            Topics
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'flashcards'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('flashcards')}
          >
            Flashcards
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'quizzes'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('quizzes')}
          >
            Quizzes
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'exam-papers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('exam-papers')}
          >
            Exam Papers
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'test-llm'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('test-llm')}
          >
            Test LLM Providers
          </button>
        </div>

      {/* Tab Content */}
      <div className={activeTab === 'subjects' ? '' : 'bg-white rounded-lg shadow-md p-6'}>
        {activeTab === 'subjects' && (
          <SubjectManagement />
        )}

        {activeTab === 'topics' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <TopicGeneratorForm
              subjects={subjects}
              onSubjectChange={setSelectedSubjectId}
            />
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <FlashcardGeneratorForm />
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <QuizGeneratorForm
              subjects={subjects}
              topics={topics}
              onSubjectChange={setSelectedSubjectId}
            />
          </div>
        )}

        {activeTab === 'exam-papers' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ExamPaperGeneratorForm />
          </div>
        )}

        {activeTab === 'test-llm' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <LLMProviderTester />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
