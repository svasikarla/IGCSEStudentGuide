import React, { useState, useCallback } from 'react';
import { useSubjects, Subject } from '../../hooks/useSubjects';
import SubjectList from './SubjectList';
import SubjectGeneratorForm from './SubjectGeneratorForm';
import SubjectEditForm from './SubjectEditForm';
import SubjectImportWizard from './SubjectImportWizard';

type ActiveView = 'create' | 'edit' | 'list' | 'import';

const SubjectManagement: React.FC = () => {
  const { subjects, loading, error } = useSubjects();
  const [activeView, setActiveView] = useState<ActiveView>('create');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh of subjects list
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleSubjectSelect = useCallback((subject: Subject | null) => {
    setSelectedSubject(subject);
    if (subject) {
      setActiveView('list');
    }
  }, []);

  const handleSubjectEdit = useCallback((subject: Subject) => {
    setEditingSubject(subject);
    setActiveView('edit');
  }, []);

  const handleSubjectDelete = useCallback((subjectId: string) => {
    if (selectedSubject?.id === subjectId) {
      setSelectedSubject(null);
    }
    if (editingSubject?.id === subjectId) {
      setEditingSubject(null);
      setActiveView('create');
    }
    handleRefresh();
  }, [selectedSubject, editingSubject, handleRefresh]);

  const handleCreateNew = useCallback(() => {
    setEditingSubject(null);
    setSelectedSubject(null);
    setActiveView('create');
  }, []);

  const handleEditComplete = useCallback(() => {
    setEditingSubject(null);
    setActiveView('create');
    handleRefresh();
  }, [handleRefresh]);

  const handleGenerationComplete = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold">Error loading subjects</h3>
        <p>{error}</p>
        <button 
          onClick={handleRefresh} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">Subject Management</h2>
          <p className="text-neutral-600 text-lg">Create, edit, and manage IGCSE subjects with AI assistance</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCreateNew}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeView === 'create'
                ? 'bg-primary-600 text-white shadow-medium hover:bg-primary-700'
                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 shadow-soft'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New
            </span>
          </button>
          <button
            onClick={() => setActiveView('import')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeView === 'import'
                ? 'bg-green-600 text-white shadow-medium hover:bg-green-700'
                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 shadow-soft'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Bulk Import
            </span>
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeView === 'list'
                ? 'bg-primary-600 text-white shadow-medium hover:bg-primary-700'
                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 shadow-soft'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              View All ({subjects.length})
            </span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left sidebar - Subject list (hidden on mobile when not in list view) */}
        <div className={`lg:col-span-5 ${activeView === 'list' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
            <SubjectList
              subjects={subjects}
              loading={loading}
              onSubjectSelect={handleSubjectSelect}
              onSubjectEdit={handleSubjectEdit}
              onSubjectDelete={handleSubjectDelete}
              onRefresh={handleRefresh}
              selectedSubject={selectedSubject}
            />
          </div>
        </div>

        {/* Right main area - Forms (full width on mobile when not in list view) */}
        <div className={`lg:col-span-7 ${activeView === 'list' ? 'hidden lg:block' : 'block'}`}>
          {activeView === 'import' ? (
            <SubjectImportWizard
              onImportComplete={() => {
                handleGenerationComplete();
                setActiveView('list');
              }}
              onCancel={() => setActiveView('create')}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
              {activeView === 'create' && (
                <SubjectGeneratorForm onGenerationComplete={handleGenerationComplete} />
              )}

              {activeView === 'edit' && editingSubject && (
                <SubjectEditForm
                  subject={editingSubject}
                  onEditComplete={handleEditComplete}
                  onCancel={() => setActiveView('create')}
                />
              )}
            
              {activeView === 'list' && selectedSubject && (
                <div className="lg:hidden">
                  {/* Mobile view for selected subject details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: selectedSubject.color_hex }}
                      >
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 21 12 17.77 5.82 21 7 13.87 2 9l6.91-.74L12 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedSubject.name}</h3>
                        <p className="text-sm text-gray-500">{selectedSubject.code}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600">{selectedSubject.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-900">Display Order:</span>
                        <span className="ml-2 text-gray-600">{selectedSubject.display_order}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Grade Levels:</span>
                        <span className="ml-2 text-gray-600">{selectedSubject.grade_levels?.join(', ') || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => handleSubjectEdit(selectedSubject)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Edit Subject
                      </button>
                      <button
                        onClick={() => setSelectedSubject(null)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={handleCreateNew}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            List ({subjects.length})
          </button>
          {editingSubject && (
            <button
              onClick={() => setActiveView('edit')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectManagement;
