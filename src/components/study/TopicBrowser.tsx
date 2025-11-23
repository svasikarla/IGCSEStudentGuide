import React, { useState, useMemo } from 'react';
import { Topic } from '../../hooks/useTopics';
import { Chapter } from '../../types/chapter';
import { useChapters } from '../../hooks/useChapters';

interface TopicBrowserProps {
  topics: Topic[];
  subjectId?: string; // Add subject ID for chapter support
  selectedTopicId?: string | null;
  onTopicSelect: (topicId: string) => void;
  loading?: boolean;
  className?: string;
}

interface ChapterGroupedTopics {
  [chapterId: string]: {
    chapter: Chapter;
    topics: Topic[];
  };
}

const TopicBrowser: React.FC<TopicBrowserProps> = ({
  topics,
  subjectId,
  selectedTopicId,
  onTopicSelect,
  loading = false,
  className = ''
}) => {
  const { chapters } = useChapters(subjectId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [selectedStudyTime, setSelectedStudyTime] = useState<string>('all');
  const [contentFilter, setContentFilter] = useState<string>('all');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Legacy major_area grouping removed - now using chapter-based organization exclusively

  // Group topics by chapters
  const chapterGroupedTopics = useMemo(() => {
    if (chapters.length === 0) {
      return {};
    }

    const grouped: ChapterGroupedTopics = {};

    // Initialize with all chapters
    chapters.forEach(chapter => {
      grouped[chapter.id] = {
        chapter,
        topics: []
      };
    });

    // Add topics to their respective chapters
    topics.forEach(topic => {
      if (topic.chapter_id && grouped[topic.chapter_id]) {
        grouped[topic.chapter_id].topics.push(topic);
      }
    });

    // Sort topics within each chapter
    Object.keys(grouped).forEach(chapterId => {
      grouped[chapterId].topics.sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));
    });

    return grouped;
  }, [topics, chapters]);

  // Filter topics based on search and filters
  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (topic.syllabus_code && topic.syllabus_code.toLowerCase().includes(searchTerm.toLowerCase()));

      // Difficulty filter
      const matchesDifficulty = selectedDifficulty === null || topic.difficulty_level === selectedDifficulty;

      // Study time filter
      const studyTime = topic.estimated_study_time_minutes || 0;
      const matchesStudyTime = selectedStudyTime === 'all' ||
        (selectedStudyTime === 'short' && studyTime <= 30) ||
        (selectedStudyTime === 'medium' && studyTime > 30 && studyTime <= 60) ||
        (selectedStudyTime === 'long' && studyTime > 60);

      // Content filter
      const hasContent = topic.content && topic.content.trim().length > 0;
      const matchesContent = contentFilter === 'all' ||
        (contentFilter === 'with-content' && hasContent) ||
        (contentFilter === 'without-content' && !hasContent);

      return matchesSearch && matchesDifficulty && matchesStudyTime && matchesContent;
    });
  }, [topics, searchTerm, selectedDifficulty, selectedStudyTime, contentFilter]);

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-soft border border-neutral-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-neutral-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
            <div className="h-6 bg-neutral-200 rounded w-1/2"></div>
            <div className="h-6 bg-neutral-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-soft border border-neutral-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Browse Topics</h3>
        
        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Difficulty</label>
            <select
              value={selectedDifficulty || ''}
              onChange={(e) => setSelectedDifficulty(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Levels</option>
              <option value="1">Beginner</option>
              <option value="2">Elementary</option>
              <option value="3">Intermediate</option>
              <option value="4">Advanced</option>
              <option value="5">Expert</option>
            </select>
          </div>

          {/* Study Time Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Study Time</label>
            <select
              value={selectedStudyTime}
              onChange={(e) => setSelectedStudyTime(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Durations</option>
              <option value="short">≤ 30 minutes</option>
              <option value="medium">30-60 minutes</option>
              <option value="long">&gt; 60 minutes</option>
            </select>
          </div>

          {/* Content Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Content</label>
            <select
              value={contentFilter}
              onChange={(e) => setContentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Topics</option>
              <option value="with-content">With Content</option>
              <option value="without-content">Needs Content</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-sm text-neutral-600">
          Showing {filteredTopics.length} of {topics.length} topics
          {useChapterView && chapters.length > 0 && (
            <span className="ml-2 text-primary-600">• Chapter view</span>
          )}
        </div>
      </div>

      {/* Topic Tree */}
      <div className="max-h-96 overflow-y-auto">
        {chapters.length === 0 ? (
          <div className="p-6 text-center text-neutral-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No topics match your current filters.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDifficulty(null);
                setSelectedStudyTime('all');
                setContentFilter('all');
              }}
              className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          // Chapter-based view
          <div className="space-y-1">
            {Object.keys(chapterGroupedTopics)
              .sort((a, b) => {
                const chapterA = chapterGroupedTopics[a].chapter;
                const chapterB = chapterGroupedTopics[b].chapter;
                return chapterA.display_order - chapterB.display_order;
              })
              .map((chapterId) => {
                const { chapter, topics: chapterTopics } = chapterGroupedTopics[chapterId];
                const filteredChapterTopics = chapterTopics.filter(topic => {
                  // Apply the same filters as the original filteredTopics logic
                  const matchesSearch = searchTerm === '' ||
                    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (topic.description && topic.description.toLowerCase().includes(searchTerm.toLowerCase()));

                  const matchesDifficulty = selectedDifficulty === null || topic.difficulty_level === selectedDifficulty;

                  const matchesStudyTime = selectedStudyTime === 'all' ||
                    (selectedStudyTime === 'short' && topic.estimated_study_time_minutes <= 30) ||
                    (selectedStudyTime === 'medium' && topic.estimated_study_time_minutes > 30 && topic.estimated_study_time_minutes <= 60) ||
                    (selectedStudyTime === 'long' && topic.estimated_study_time_minutes > 60);

                  const matchesContent = contentFilter === 'all' ||
                    (contentFilter === 'with-content' && topic.content && topic.content.trim().length > 0) ||
                    (contentFilter === 'without-content' && (!topic.content || topic.content.trim().length === 0));

                  return matchesSearch && matchesDifficulty && matchesStudyTime && matchesContent;
                });

                if (filteredChapterTopics.length === 0) return null;

                const isExpanded = expandedChapters.has(chapterId);
                const topicsWithContent = filteredChapterTopics.filter(t => t.content && t.content.trim().length > 0).length;

                return (
                  <div key={chapterId}>
                    {/* Chapter Header */}
                    <button
                      onClick={() => toggleChapter(chapterId)}
                      className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors border-l-4"
                      style={{ borderLeftColor: chapter.color_hex }}
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-4 h-4 text-neutral-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="flex items-center gap-2">
                          {chapter.syllabus_code && (
                            <span className="text-sm font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                              {chapter.syllabus_code}
                            </span>
                          )}
                          <span className="font-medium text-neutral-900">{chapter.title}</span>
                        </div>
                        <span className="text-sm text-neutral-500">
                          ({filteredChapterTopics.length} topics, {topicsWithContent} with content)
                        </span>
                      </div>
                    </button>

                    {/* Chapter Topics */}
                    {isExpanded && (
                      <div className="ml-6 space-y-1">
                        {filteredChapterTopics.map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => onTopicSelect(topic.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              selectedTopicId === topic.id
                                ? 'bg-primary-50 border border-primary-200'
                                : 'hover:bg-neutral-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-neutral-900 mb-1">{topic.title}</h4>
                                {topic.description && (
                                  <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{topic.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-neutral-500">
                                  <span>Level {topic.difficulty_level}</span>
                                  <span>{topic.estimated_study_time_minutes} min</span>
                                  {topic.content && topic.content.trim().length > 0 && (
                                    <span className="text-green-600">✓ Content</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }).filter(Boolean)}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicBrowser;
