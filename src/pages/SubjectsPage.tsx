import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjects } from '../hooks/useSubjects';
import SubjectChapterPreview from '../components/subjects/SubjectChapterPreview';

const SubjectsPage: React.FC = () => {
  const { subjects, loading, error } = useSubjects();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter subjects based on search term and category
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           subject.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           subject.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' ||
                             subject.icon_name === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [subjects, searchTerm, selectedCategory]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(subjects.map(s => s.icon_name)));
    return [
      { id: 'all', name: 'All Subjects', count: subjects.length },
      ...uniqueCategories.map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: subjects.filter(s => s.icon_name === cat).length
      }))
    ];
  }, [subjects]);

  // Function to get appropriate icon based on subject icon_name
  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'math':
        return (
          <path d="M6.5 2a4.5 4.5 0 019 0 .5.5 0 01-1 0 3.5 3.5 0 00-7 0 .5.5 0 01-1 0zm3 10a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm-2-4a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zm-2 4a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" />
        );
      case 'physics':
        return (
          <path d="M10 2a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5A.75.75 0 0110 2zm0 13a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5a.75.75 0 01.75-.75zm-6.844-7.5a.75.75 0 01-.75-.75v-.5a.75.75 0 011.5 0v.5a.75.75 0 01-.75.75zm13.688 0a.75.75 0 01-.75-.75v-.5a.75.75 0 011.5 0v.5a.75.75 0 01-.75.75zm-12.357 5.57l-.084-.42a.75.75 0 011.492-.149l.083.42a.75.75 0 01-1.491.15zm9.865-11.569l-.42.084a.75.75 0 11-.149-1.492l.42-.083a.75.75 0 11.149 1.491zm.149 11.42l-.42-.083a.75.75 0 01.149-1.492l.42.084a.75.75 0 01-.149 1.491zM3.655 4.74l-.42-.084a.75.75 0 01.149-1.491l.42.083a.75.75 0 11-.149 1.492zM10 6a4 4 0 100 8 4 4 0 000-8zm0 1.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" />
        );
      case 'chemistry':
        return (
          <path d="M8 2a1 1 0 00-1 1v.5H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-12a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H8zm2 .5V4h-2v-.5h2zm1 3a.5.5 0 01.5.5v1a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm-4 0a.5.5 0 01.5.5v1a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2 3a3 3 0 110 6 3 3 0 010-6zm0 1a2 2 0 100 4 2 2 0 000-4z" />
        );
      case 'biology':
        return (
          <path d="M7 2a1 1 0 00-1 1v1H5a2 2 0 00-2 2v9a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H7zm4 1v1H9V3h2zm-3 8.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zm-2 0a.5.5 0 01.5-.5h.5a.5.5 0 010 1H6.5a.5.5 0 01-.5-.5z" />
        );
      case 'english':
        return (
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        );
      case 'history':
        return (
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 1a7 7 0 110 14 7 7 0 010-14zm0 2a.5.5 0 01.5.5V10H14a.5.5 0 010 1h-4a.5.5 0 01-.5-.5v-5a.5.5 0 01.5-.5z" />
        );
      default:
        return (
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        );
    }
  };

  // Handle navigation to topics page
  const handleExploreTopics = (subjectId: string) => {
    navigate(`/subjects/${subjectId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Compact Header Skeleton */}
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100 rounded-2xl p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="h-8 bg-neutral-200 rounded w-64 mx-auto mb-2 animate-pulse"></div>
              <div className="h-4 bg-neutral-100 rounded w-96 mx-auto animate-pulse"></div>
            </div>

            {/* Search Bar Skeleton */}
            <div className="max-w-2xl mx-auto mb-4">
              <div className="h-12 bg-neutral-200 rounded-xl animate-pulse"></div>
            </div>

            {/* Filter Tabs Skeleton */}
            <div className="flex flex-wrap justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-20 bg-neutral-200 rounded-full animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Loading Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-neutral-200 rounded-xl"></div>
                <div className="w-8 h-4 bg-neutral-200 rounded"></div>
              </div>
              <div className="h-5 bg-neutral-200 rounded w-3/4 mb-2"></div>
              <div className="space-y-1 mb-3">
                <div className="h-3 bg-neutral-100 rounded w-full"></div>
                <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
              </div>
              <div className="h-8 bg-neutral-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">IGCSE Subjects</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Discover comprehensive study materials for your IGCSE subjects
          </p>
        </div>

        {/* Error Message */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Unable to Load Subjects</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header with Integrated Search */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100 rounded-2xl p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">IGCSE Subjects</h1>
            <p className="text-neutral-600">
              Discover comprehensive study materials and expert guidance
            </p>
          </div>

          {/* Integrated Search Bar */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search subjects by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              />
            </div>
          </div>

          {/* Compact Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Results Summary */}
      {searchTerm && (
        <div className="text-center -mt-2 mb-4">
          <p className="text-sm text-neutral-600 bg-neutral-50 inline-block px-4 py-2 rounded-full">
            {filteredSubjects.length === 0
              ? `No subjects found for "${searchTerm}"`
              : `${filteredSubjects.length} subject${filteredSubjects.length === 1 ? '' : 's'} found`
            }
          </p>
        </div>
      )}

      {/* Optimized Subjects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="group bg-white rounded-xl shadow-soft border border-neutral-200 p-4 hover:shadow-medium hover:border-primary-200 transition-all duration-300 cursor-pointer"
              onClick={() => handleExploreTopics(subject.id)}
            >
              {/* Compact Header */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 flex-shrink-0"
                  style={{ backgroundColor: subject.color_hex }}
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    {getSubjectIcon(subject.icon_name)}
                  </svg>
                </div>
                <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-medium ml-2">
                  {subject.code}
                </span>
              </div>

              {/* Subject Info */}
              <h3 className="text-lg font-semibold text-neutral-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight">
                {subject.name}
              </h3>
              <p className="text-neutral-600 mb-3 line-clamp-2 text-sm leading-relaxed">
                {subject.description}
              </p>

              {/* Chapter Preview */}
              <div className="mb-3 p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <SubjectChapterPreview
                  subjectId={subject.id}
                  maxChapters={3}
                  onChapterClick={(chapterId) => {
                    // Navigate to chapter-specific view
                    navigate(`/study/${subject.id}/chapters/${chapterId}`);
                  }}
                />
              </div>

              {/* Compact Action Button */}
              <button
                className="w-full px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium group-hover:bg-primary-600 group-hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExploreTopics(subject.id);
                }}
              >
                <span className="flex items-center justify-center gap-1">
                  Explore Topics
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </button>
            </div>
          ))
        ) : subjects.length > 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-100 rounded-full mb-3">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No subjects found</h3>
            <p className="text-neutral-600 mb-4 text-sm">Try adjusting your search terms or filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-100 rounded-full mb-3">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No subjects available</h3>
            <p className="text-neutral-600 text-sm">Check back soon for new subjects and study materials!</p>
          </div>
        )}
      </div>

      {/* Compact Coming Soon Section */}
      {subjects.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 p-6 rounded-xl text-center mt-8">
          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">More Content Coming Soon</h3>
              <p className="text-neutral-700 text-sm">
                New subjects and study resources are being added regularly
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;
