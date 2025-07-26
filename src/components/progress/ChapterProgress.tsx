import React from 'react';
import { useChapters } from '../../hooks/useChapters';
import { useTopics } from '../../hooks/useTopics';

interface ChapterProgressProps {
  subjectId: string;
  userId?: string;
  className?: string;
}

interface ChapterProgressData {
  chapterId: string;
  chapterTitle: string;
  totalTopics: number;
  completedTopics: number;
  progressPercentage: number;
  estimatedStudyTime: number;
  syllabus_code?: string;
}

const ChapterProgress: React.FC<ChapterProgressProps> = ({
  subjectId,
  userId,
  className = ''
}) => {
  const { chapters, loading: chaptersLoading } = useChapters(subjectId);
  const { topics, loading: topicsLoading } = useTopics(subjectId);

  if (chaptersLoading || topicsLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
              <div className="h-2 bg-neutral-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-neutral-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-neutral-500">No chapters available for progress tracking</p>
      </div>
    );
  }

  // Calculate progress for each chapter
  const chapterProgressData: ChapterProgressData[] = chapters.map(chapter => {
    const chapterTopics = topics.filter(topic => topic.chapter_id === chapter.id);
    const totalTopics = chapterTopics.length;
    
    // For now, we'll simulate completion based on whether topics have content
    // In a real implementation, this would come from user progress data
    const completedTopics = chapterTopics.filter(topic => 
      topic.content && topic.content.trim().length > 0
    ).length;
    
    const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const estimatedStudyTime = chapterTopics.reduce((total, topic) => 
      total + (topic.estimated_study_time_minutes || 0), 0
    );

    return {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      totalTopics,
      completedTopics,
      progressPercentage,
      estimatedStudyTime,
      syllabus_code: chapter.syllabus_code || undefined
    };
  });

  // Sort by syllabus code or display order
  chapterProgressData.sort((a, b) => {
    const chapterA = chapters.find(c => c.id === a.chapterId);
    const chapterB = chapters.find(c => c.id === b.chapterId);
    return (chapterA?.display_order || 0) - (chapterB?.display_order || 0);
  });

  const overallProgress = {
    totalChapters: chapters.length,
    completedChapters: chapterProgressData.filter(c => c.progressPercentage === 100).length,
    totalTopics: chapterProgressData.reduce((sum, c) => sum + c.totalTopics, 0),
    completedTopics: chapterProgressData.reduce((sum, c) => sum + c.completedTopics, 0),
    totalStudyTime: chapterProgressData.reduce((sum, c) => sum + c.estimatedStudyTime, 0)
  };

  const overallPercentage = overallProgress.totalTopics > 0 
    ? Math.round((overallProgress.completedTopics / overallProgress.totalTopics) * 100) 
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Progress Summary */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary-900">Overall Progress</h3>
          <span className="text-2xl font-bold text-primary-700">{overallPercentage}%</span>
        </div>
        
        <div className="w-full bg-primary-200 rounded-full h-3 mb-4">
          <div 
            className="bg-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${overallPercentage}%` }}
          ></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-primary-900">{overallProgress.completedChapters}</div>
            <div className="text-primary-700">Chapters Complete</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-primary-900">{overallProgress.completedTopics}</div>
            <div className="text-primary-700">Topics Complete</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-primary-900">{Math.round(overallProgress.totalStudyTime / 60)}h</div>
            <div className="text-primary-700">Total Study Time</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-primary-900">{overallProgress.totalChapters}</div>
            <div className="text-primary-700">Total Chapters</div>
          </div>
        </div>
      </div>

      {/* Individual Chapter Progress */}
      <div className="space-y-3">
        <h4 className="text-lg font-medium text-neutral-900">Chapter Progress</h4>
        
        {chapterProgressData.map((chapterData) => {
          const chapter = chapters.find(c => c.id === chapterData.chapterId);
          
          return (
            <div key={chapterData.chapterId} className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {chapterData.syllabus_code && (
                    <span className="text-sm font-mono text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                      {chapterData.syllabus_code}
                    </span>
                  )}
                  <h5 className="font-medium text-neutral-900">{chapterData.chapterTitle}</h5>
                </div>
                <span className="text-lg font-semibold text-neutral-700">
                  {chapterData.progressPercentage}%
                </span>
              </div>
              
              <div className="w-full bg-neutral-200 rounded-full h-2 mb-3">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    chapterData.progressPercentage === 100 
                      ? 'bg-green-500' 
                      : chapterData.progressPercentage > 0 
                        ? 'bg-blue-500' 
                        : 'bg-neutral-300'
                  }`}
                  style={{ width: `${chapterData.progressPercentage}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-neutral-600">
                <span>
                  {chapterData.completedTopics} of {chapterData.totalTopics} topics completed
                </span>
                <span>
                  {Math.round(chapterData.estimatedStudyTime / 60)}h {chapterData.estimatedStudyTime % 60}m
                </span>
              </div>
              
              {chapterData.progressPercentage === 100 && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Chapter completed!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChapterProgress;
