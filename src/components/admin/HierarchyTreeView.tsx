import React, { useState } from 'react';
import { SubjectHierarchyData, ChapterData, TopicData } from '../../services/subjectImportAPI';

interface HierarchyTreeViewProps {
  data: SubjectHierarchyData;
  editable?: boolean;
  onEdit?: (data: SubjectHierarchyData) => void;
}

const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  data,
  editable = false,
  onEdit,
}) => {
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([0])); // First chapter expanded by default

  const toggleChapter = (index: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChapters(newExpanded);
  };

  const expandAll = () => {
    setExpandedChapters(new Set(data.chapters?.map((_, i) => i) || []));
  };

  const collapseAll = () => {
    setExpandedChapters(new Set());
  };

  // Calculate statistics
  const totalChapters = data.chapters?.length || 0;
  const totalTopics = data.chapters?.reduce((sum, ch) => sum + (ch.topics?.length || 0), 0) || 0;
  const totalStudyTime = data.chapters?.reduce(
    (sum, ch) => sum + (ch.topics?.reduce((tSum, t) => tSum + (t.estimated_study_time_minutes || 0), 0) || 0),
    0
  ) || 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Subject Header */}
      <div
        className="p-4 border-b border-gray-200"
        style={{ backgroundColor: `${data.subject.color_hex}15` || '#6366f115' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: data.subject.color_hex || '#6366f1' }}
          >
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 21 12 17.77 5.82 21 7 13.87 2 9l6.91-.74L12 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{data.subject.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{data.subject.description}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-block bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-700 border border-gray-300">
                {data.subject.code}
              </span>
              <span className="text-xs text-gray-500">
                {data.subject.curriculum_board || 'Cambridge IGCSE'}
              </span>
              {data.subject.grade_levels && (
                <span className="text-xs text-gray-500">
                  Grades: {data.subject.grade_levels.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalChapters}</div>
          <div className="text-xs text-gray-600">Chapters</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalTopics}</div>
          <div className="text-xs text-gray-600">Topics</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{Math.round(totalStudyTime / 60)}h {totalStudyTime % 60}m</div>
          <div className="text-xs text-gray-600">Study Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {totalChapters > 0 ? Math.round(totalTopics / totalChapters) : 0}
          </div>
          <div className="text-xs text-gray-600">Topics/Chapter</div>
        </div>
      </div>

      {/* Expand/Collapse Controls */}
      {data.chapters && data.chapters.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Hierarchy Preview</span>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Chapters Tree */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {!data.chapters || data.chapters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No chapters defined</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.chapters.map((chapter, chapterIndex) => (
              <div key={chapterIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Chapter Header */}
                <button
                  onClick={() => toggleChapter(chapterIndex)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedChapters.has(chapterIndex) ? 'rotate-90' : ''
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{chapter.title}</div>
                      {chapter.description && (
                        <div className="text-sm text-gray-600 mt-1">{chapter.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {chapter.syllabus_code && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                        {chapter.syllabus_code}
                      </span>
                    )}
                    {chapter.tier && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                        {chapter.tier}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                      {chapter.topics?.length || 0} topics
                    </span>
                  </div>
                </button>

                {/* Topics List */}
                {expandedChapters.has(chapterIndex) && chapter.topics && chapter.topics.length > 0 && (
                  <div className="bg-white">
                    {chapter.topics.map((topic, topicIndex) => (
                      <div
                        key={topicIndex}
                        className="px-4 py-3 border-t border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path
                                  fillRule="evenodd"
                                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="font-medium text-gray-900">{topic.title}</span>
                            </div>
                            {topic.description && (
                              <p className="text-sm text-gray-600 mt-1 ml-6">{topic.description}</p>
                            )}
                            {topic.learning_objectives && topic.learning_objectives.length > 0 && (
                              <ul className="text-xs text-gray-500 mt-2 ml-6 space-y-1">
                                {topic.learning_objectives.slice(0, 2).map((objective, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-blue-500">•</span>
                                    <span>{objective}</span>
                                  </li>
                                ))}
                                {topic.learning_objectives.length > 2 && (
                                  <li className="text-gray-400">
                                    +{topic.learning_objectives.length - 2} more objectives
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {topic.difficulty_level && (
                              <span
                                className={`px-2 py-1 text-xs rounded font-medium ${
                                  topic.difficulty_level === 1
                                    ? 'bg-green-100 text-green-700'
                                    : topic.difficulty_level === 2
                                    ? 'bg-blue-100 text-blue-700'
                                    : topic.difficulty_level === 3
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : topic.difficulty_level === 4
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                L{topic.difficulty_level}
                              </span>
                            )}
                            {topic.estimated_study_time_minutes && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {topic.estimated_study_time_minutes}min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {expandedChapters.has(chapterIndex) &&
                  (!chapter.topics || chapter.topics.length === 0) && (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm bg-white border-t border-gray-200">
                      No topics in this chapter
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchyTreeView;
