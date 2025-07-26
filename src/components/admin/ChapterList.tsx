import React, { useState } from 'react';
import { Chapter } from '../../types/chapter';
import { useChapters } from '../../hooks/useChapters';

interface ChapterListProps {
  subjectId: string | null;
  onChapterSelect?: (chapter: Chapter | null) => void;
  onChapterEdit?: (chapter: Chapter) => void;
  onChapterDelete?: (chapterId: string) => void;
  selectedChapter?: Chapter | null;
}

const ChapterList: React.FC<ChapterListProps> = ({
  subjectId,
  onChapterSelect,
  onChapterEdit,
  onChapterDelete,
  selectedChapter
}) => {
  const { chapters, loading, error, deleteChapter } = useChapters(subjectId);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (chapterId: string) => {
    if (deleteConfirm === chapterId) {
      const success = await deleteChapter(chapterId);
      if (success && onChapterDelete) {
        onChapterDelete(chapterId);
      }
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(chapterId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-neutral-600">Loading chapters...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700">Error loading chapters: {error}</span>
        </div>
      </div>
    );
  }

  if (!subjectId) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p>Select a subject to view chapters</p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">No chapters found</h3>
        <p className="text-neutral-500 mb-4">This subject doesn't have any chapters yet.</p>
        <button
          onClick={() => onChapterSelect?.(null)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Create First Chapter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-neutral-900">
          Chapters ({chapters.length})
        </h3>
        <button
          onClick={() => onChapterSelect?.(null)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Chapter
        </button>
      </div>

      <div className="space-y-2">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className={`
              bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer
              ${selectedChapter?.id === chapter.id ? 'ring-2 ring-primary-500 border-primary-500' : 'border-neutral-200'}
            `}
            onClick={() => onChapterSelect?.(chapter)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: chapter.color_hex }}
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-neutral-900 truncate">
                        {chapter.title}
                      </h4>
                      {chapter.syllabus_code && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800">
                          {chapter.syllabus_code}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                      {chapter.description || 'No description available'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-neutral-500">
                      <span>{chapter.estimated_study_time_minutes} min</span>
                      <span>Order: {chapter.display_order}</span>
                      {!chapter.is_published && (
                        <span className="text-amber-600">Draft</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChapterEdit?.(chapter);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded"
                    title="Edit chapter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(chapter.id);
                    }}
                    className={`p-1.5 rounded ${
                      deleteConfirm === chapter.id
                        ? 'text-red-600 bg-red-100'
                        : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title={deleteConfirm === chapter.id ? 'Click again to confirm' : 'Delete chapter'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChapterList;
