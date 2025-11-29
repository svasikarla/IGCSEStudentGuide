import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjects } from '../hooks/useSubjects';
import { useTopics } from '../hooks/useTopics';
import { useChapters } from '../hooks/useChapters';
import SubjectManagement from '../components/admin/SubjectManagement';
import TopicGeneratorForm from '../components/admin/TopicGeneratorForm';
import FlashcardGeneratorForm from '../components/admin/FlashcardGeneratorForm';
import QuizGeneratorForm from '../components/admin/QuizGeneratorForm';
import ExamPaperGeneratorForm from '../components/admin/ExamPaperGeneratorForm';
import LLMProviderTester from '../components/admin/LLMProviderTester';
import ContentScrapingInterface from '../components/admin/ContentScrapingInterface';
import QuestionStatsDashboard from '../components/admin/QuestionStatsDashboard';
import ChapterList from '../components/admin/ChapterList';
import ChapterForm from '../components/admin/ChapterForm';
import { Chapter } from '../types/chapter';

import ContentGenerationWizard from '../components/admin/ContentGenerationWizard';

/**
 * Admin page for content generation using LLM
 */
const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'subjects' | 'chapters' | 'topics' | 'flashcards' | 'quizzes' | 'exam-papers' | 'scraping' | 'test-llm' | 'question-stats'>('wizard');
  const { subjects } = useSubjects();
  const navigate = useNavigate();

  // Get topics for the selected subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const { topics } = useTopics(selectedSubjectId);
  const { chapters } = useChapters(selectedSubjectId);

  // Chapter management state
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [showChapterForm, setShowChapterForm] = useState(false);

  // Handle tab change
  const handleTabChange = (tab: 'wizard' | 'subjects' | 'chapters' | 'topics' | 'flashcards' | 'quizzes' | 'exam-papers' | 'scraping' | 'test-llm' | 'question-stats') => {
    setActiveTab(tab);
  };

  // Listen for navigation events from QuickQuestionStats
  useEffect(() => {
    const handleNavigateToQuestionStats = () => {
      setActiveTab('question-stats');
    };

    window.addEventListener('navigate-to-question-stats', handleNavigateToQuestionStats);
    return () => {
      window.removeEventListener('navigate-to-question-stats', handleNavigateToQuestionStats);
    };
  }, []);

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
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'wizard'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('wizard')}
          >
            ✨ Content Wizard
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'subjects'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('subjects')}
          >
            Subjects
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'chapters'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('chapters')}
          >
            Chapters
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'topics'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('topics')}
          >
            Topics
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'flashcards'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('flashcards')}
          >
            Flashcards
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'quizzes'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('quizzes')}
          >
            Quizzes
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'exam-papers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('exam-papers')}
          >
            Exam Papers
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'scraping'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('scraping')}
          >
            Content Scraping
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'question-stats'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => handleTabChange('question-stats')}
          >
            Question Statistics
          </button>
          <button
            className={`px-4 lg:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'test-llm'
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
          {activeTab === 'wizard' && (
            <ContentGenerationWizard />
          )}

          {activeTab === 'subjects' && (
            <SubjectManagement />
          )}

          {activeTab === 'chapters' && (
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900">Chapter Management</h2>
                    <p className="text-neutral-600 mt-1">Organize topics into chapters for better content structure</p>
                  </div>
                  {selectedSubjectId && (
                    <button
                      onClick={() => {
                        setEditingChapter(null);
                        setShowChapterForm(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      New Chapter
                    </button>
                  )}
                </div>

                {/* Subject Selection */}
                <div className="mb-6">
                  <label htmlFor="subject-select" className="block text-sm font-medium text-neutral-700 mb-2">
                    Select Subject
                  </label>
                  <select
                    id="subject-select"
                    value={selectedSubjectId || ''}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value || null);
                      setSelectedChapter(null);
                      setShowChapterForm(false);
                    }}
                    className="w-full max-w-md px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Choose a subject...</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter Management Interface */}
                {selectedSubjectId && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Chapter List */}
                    <div className={`${showChapterForm ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                      <ChapterList
                        subjectId={selectedSubjectId}
                        onChapterSelect={setSelectedChapter}
                        onChapterEdit={(chapter) => {
                          setEditingChapter(chapter);
                          setShowChapterForm(true);
                        }}
                        onChapterDelete={(chapterId) => {
                          if (selectedChapter?.id === chapterId) {
                            setSelectedChapter(null);
                          }
                        }}
                        selectedChapter={selectedChapter}
                      />
                    </div>

                    {/* Chapter Form */}
                    {showChapterForm && (
                      <div className="lg:col-span-7">
                        <ChapterForm
                          subjectId={selectedSubjectId}
                          chapter={editingChapter}
                          onSave={(savedChapter) => {
                            setSelectedChapter(savedChapter);
                            setShowChapterForm(false);
                            setEditingChapter(null);
                          }}
                          onCancel={() => {
                            setShowChapterForm(false);
                            setEditingChapter(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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
                chapters={chapters}
                onSubjectChange={setSelectedSubjectId}
              />
            </div>
          )}

          {activeTab === 'exam-papers' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <ExamPaperGeneratorForm />
            </div>
          )}

          {activeTab === 'scraping' && (
            <ContentScrapingInterface />
          )}

          {activeTab === 'question-stats' && (
            <QuestionStatsDashboard />
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
