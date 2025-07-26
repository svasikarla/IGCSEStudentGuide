import React from 'react';
import { useChapters } from '../../hooks/useChapters';

interface SubjectChapterPreviewProps {
  subjectId: string;
  onChapterClick?: (chapterId: string) => void;
  maxChapters?: number;
}

const SubjectChapterPreview: React.FC<SubjectChapterPreviewProps> = ({
  subjectId,
  onChapterClick,
  maxChapters = 3
}) => {
  const { chapters, loading } = useChapters(subjectId);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-3 bg-neutral-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="text-xs text-neutral-500 italic">
        No chapters available
      </div>
    );
  }

  const displayChapters = chapters.slice(0, maxChapters);
  const remainingCount = Math.max(0, chapters.length - maxChapters);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-700">Chapters</span>
        <span className="text-xs text-neutral-500">{chapters.length} total</span>
      </div>
      
      <div className="space-y-1">
        {displayChapters.map((chapter, index) => (
          <div
            key={chapter.id}
            className={`flex items-center space-x-2 text-xs p-1.5 rounded-md transition-colors ${
              onChapterClick 
                ? 'hover:bg-neutral-100 cursor-pointer' 
                : ''
            }`}
            onClick={(e) => {
              if (onChapterClick) {
                e.stopPropagation();
                onChapterClick(chapter.id);
              }
            }}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {chapter.syllabus_code && (
                <span className="text-neutral-500 font-mono text-xs flex-shrink-0">
                  {chapter.syllabus_code}.
                </span>
              )}
              <span className="text-neutral-700 truncate">
                {chapter.title}
              </span>
            </div>
            {onChapterClick && (
              <svg className="w-3 h-3 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div className="text-xs text-neutral-500 italic pl-1.5">
            +{remainingCount} more chapter{remainingCount === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectChapterPreview;
