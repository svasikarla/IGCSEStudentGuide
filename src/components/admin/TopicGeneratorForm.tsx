import React, { useState, useEffect } from 'react';
import { useTopicListGeneration, useTopicContentGeneration } from '../../hooks/useLLMGeneration';
import { Subject } from '../../hooks/useSubjects';
import { Topic } from '../../hooks/useTopics';
import { useTopics } from '../../hooks/useTopics';
import { useChapters } from '../../hooks/useChapters';
import { Chapter } from '../../types/chapter';
import { LLMProvider } from '../../services/llmAdapter';
import LLMProviderSelector from './LLMProviderSelector';


interface TopicGeneratorFormProps {
  subjects: Subject[];
  onSubjectChange: (subjectId: string | null) => void;
}

/**
 * Form for generating and saving topics using LLM
 */
const TopicGeneratorForm: React.FC<TopicGeneratorFormProps> = ({ subjects, onSubjectChange }) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [generatedTopics, setGeneratedTopics] = useState<Partial<Topic>[]>([]);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Partial<Topic> | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [curriculumBoard, setCurriculumBoard] = useState<string>('Cambridge IGCSE');
  const [tier, setTier] = useState<string>('');
  const [useComprehensiveGeneration, setUseComprehensiveGeneration] = useState<boolean>(true);
  const [includeContentGeneration, setIncludeContentGeneration] = useState<boolean>(false);
  const [generateForChapter, setGenerateForChapter] = useState<boolean>(false);

  // LLM Provider state
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini'); // Default to cost-effective model

  // Performance monitoring state
  const [generationProgress, setGenerationProgress] = useState<{
    phase: string;
    progress: number;
    estimatedTime?: number;
    startTime?: number;
    currentTopic?: string;
  } | null>(null);
  const [existingTopicTitles, setExistingTopicTitles] = useState<Set<string>>(new Set());
  
  const { generateTopicList, generateComprehensiveCurriculum, loading, error } = useTopicListGeneration();
  const { topics, saveTopics, saveSingleTopic, isSaving, saveError } = useTopics(selectedSubject?.id || null);
  const { chapters } = useChapters(selectedSubject?.id || null);
  const { generateTopicContent, loading: contentLoading, error: contentError } = useTopicContentGeneration();

  // Update selected subject when subjects load
  useEffect(() => {
    console.log('Subjects changed:', subjects);
    console.log('Current selectedSubject:', selectedSubject);
    
    if (subjects.length > 0 && !selectedSubject) {
      console.log('Setting initial subject:', subjects[0]);
      setSelectedSubject(subjects[0]);
      onSubjectChange(subjects[0].id);
    } else if (subjects.length === 0) {
      // Reset selected subject if no subjects are available
      console.log('No subjects available, resetting selection');
      setSelectedSubject(null);
      onSubjectChange(null);
    }
  }, [subjects, selectedSubject, onSubjectChange]);

  // Update grade level when subject changes
  useEffect(() => {
    if (selectedSubject && selectedSubject.grade_levels && selectedSubject.grade_levels.length > 0) {
      setGradeLevel(selectedSubject.grade_levels.join('-'));
    } else {
      setGradeLevel(''); // Reset if subject has no grade levels defined
    }
  }, [selectedSubject]);



  // Handle subject change
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = e.target.value;
    console.log('Subject selected from dropdown:', subjectId);
    const subject = subjects.find(s => s.id === subjectId) || null;
    console.log('Found subject object:', subject);
    setSelectedSubject(subject);
    onSubjectChange(subjectId);
  };

  // Handle form submission with progress tracking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    const startTime = Date.now();

    try {
      // Initialize progress tracking
      setGenerationProgress({
        phase: useComprehensiveGeneration ? 'Generating comprehensive curriculum...' : 'Generating topic list...',
        progress: 0,
        startTime,
        estimatedTime: useComprehensiveGeneration ? 45000 : 15000 // 45s for comprehensive, 15s for quick
      });

      // Simulate progress updates during generation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (!prev) return null;
          const elapsed = Date.now() - startTime;
          const estimatedProgress = Math.min(90, (elapsed / (prev.estimatedTime || 30000)) * 100);
          return {
            ...prev,
            progress: estimatedProgress
          };
        });
      }, 1000);

      let result;
      if (useComprehensiveGeneration) {
        setGenerationProgress(prev => prev ? { ...prev, phase: 'Phase 1: Generating major curriculum areas...' } : null);

        // Progress callback for content generation
        const onProgress = (phase: string, progress: number, currentTopic?: string) => {
          setGenerationProgress(prev => prev ? {
            ...prev,
            phase,
            progress,
            currentTopic
          } : null);
        };

        result = await generateComprehensiveCurriculum(
          selectedSubject.name,
          gradeLevel,
          selectedProvider,
          selectedModel,
          curriculumBoard,
          tier || undefined,
          includeContentGeneration,
          onProgress
        );
      } else {
        result = await generateTopicList(
          selectedSubject.name,
          gradeLevel,
          selectedProvider,
          selectedModel,
          curriculumBoard,
          tier || undefined
        );
      }

      clearInterval(progressInterval);

      if (result) {
        setGenerationProgress({
          phase: 'Generation complete!',
          progress: 100,
          startTime
        });

        setGeneratedTopics(result);

        // Clear progress after a short delay
        setTimeout(() => setGenerationProgress(null), 2000);
      }
    } catch (error) {
      console.error('Error generating topics:', error);
      setGenerationProgress(null);
      // Error is handled by the hook's error state
    }
  };

  const handleTopicSelect = async (topicTitle: string) => {
    setSelectedTopicTitle(topicTitle);
    if (!selectedSubject) return;

    try {
      const content = await generateTopicContent(
        selectedSubject.name,
        topicTitle,
        gradeLevel,
        selectedProvider,
        selectedModel
      );

      if (content) {
        setGeneratedContent({ ...content, title: topicTitle });
      }
    } catch (error) {
      console.error('Error generating topic content:', error);
      // Error is handled by the hook's error state
    }
  };

  const handleSaveTopics = async () => {
    if (!selectedSubject || generatedTopics.length === 0) return;
    setSaveSuccess(false);

    // Convert generated topics to proper Topic objects
    const topicsToSave = generatedTopics.map(topic => ({
      title: topic.title!,
      description: topic.description || null,
      content: topic.content || null,
      difficulty_level: topic.difficulty_level || 1,
      estimated_study_time_minutes: topic.estimated_study_time_minutes || 30,
      learning_objectives: topic.learning_objectives || null,
      display_order: 0,
      is_published: true,
      chapter_id: generateForChapter && selectedChapter ? selectedChapter.id : null, // Assign to chapter if selected
      // Enhanced curriculum fields
      syllabus_code: topic.syllabus_code || null,
      curriculum_board: topic.curriculum_board || curriculumBoard,
      tier: topic.tier || tier || null,
      official_syllabus_ref: topic.official_syllabus_ref || null,
    }));

    const success = await saveTopics(selectedSubject.id, topicsToSave);
    if (success) {
      setSaveSuccess(true);
      // Dispatch event to notify chapter components of new topics
      if (generateForChapter && selectedChapter) {
        document.dispatchEvent(new Event('topicsChanged'));
      }
    }
  };

  const handleSaveSingleTopic = async () => {
    if (!generatedContent || !selectedSubject) return;
    setSaveSuccess(false);

    const topicToSave: Partial<Topic> = {
      ...generatedContent,
      subject_id: selectedSubject.id,
      is_published: false, // Default to not published
    };

    const success = await saveSingleTopic(topicToSave);
    if (success) {
      setSaveSuccess(true);
      setGeneratedContent(null); // Clear the form on success
      setSelectedTopicTitle(null);
    }
  };

  // Reset the form
  const handleReset = () => {
    setGeneratedTopics([]);
    setSaveSuccess(false);
  };

  // Update existing topic titles when topics change
  useEffect(() => {
    setExistingTopicTitles(new Set(topics.map(t => t.title)));
  }, [topics]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Topic Generation</h2>
          <p className="text-neutral-600 mt-1">Create comprehensive topics with AI-generated content</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Generate topics → Review content → Save to database</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Panel - Generation Form */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Generation Settings
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* LLM Provider Selection */}
              <div>
                <LLMProviderSelector
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                  onProviderChange={setSelectedProvider}
                  onModelChange={setSelectedModel}
                  disabled={loading}
                />
              </div>

              {/* Subject Selection */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-2">
                  Target Subject *
                </label>
                {subjects.length > 0 ? (
                  <div className="relative">
                    <select
                      id="subject"
                      value={selectedSubject?.id || ''}
                      onChange={handleSubjectChange}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading}
                    >
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-medium">No subjects available</span>
                    </div>
                    <p className="mt-1 text-sm">Please create a subject first before generating topics.</p>
                  </div>
                )}
              </div>

              {/* Chapter-based Generation Toggle */}
              {selectedSubject && chapters.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="generateForChapter"
                      checked={generateForChapter}
                      onChange={(e) => {
                        setGenerateForChapter(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedChapter(null);
                        }
                      }}
                      className="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      disabled={loading}
                    />
                    <label htmlFor="generateForChapter" className="text-sm font-medium text-blue-900">
                      Generate topics for a specific chapter
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-blue-700">
                    Generate topics within an existing chapter structure for better organization
                  </p>
                </div>
              )}

              {/* Chapter Selection */}
              {generateForChapter && selectedSubject && chapters.length > 0 && (
                <div>
                  <label htmlFor="chapter" className="block text-sm font-medium text-neutral-700 mb-2">
                    Target Chapter *
                  </label>
                  <div className="relative">
                    <select
                      id="chapter"
                      value={selectedChapter?.id || ''}
                      onChange={(e) => {
                        const chapterId = e.target.value;
                        const chapter = chapters.find(c => c.id === chapterId) || null;
                        setSelectedChapter(chapter);
                      }}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading}
                    >
                      <option value="">Select a chapter...</option>
                      {chapters.map(chapter => (
                        <option key={chapter.id} value={chapter.id}>
                          {chapter.syllabus_code ? `${chapter.syllabus_code}. ` : ''}{chapter.title}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {selectedChapter && (
                    <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium">Chapter:</span> {selectedChapter.title}
                      </p>
                      {selectedChapter.description && (
                        <p className="text-sm text-neutral-600 mt-1">{selectedChapter.description}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Grade Level */}
              <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-neutral-700 mb-2">
                  Grade Levels
                </label>
                <input
                  id="gradeLevel"
                  type="text"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="e.g., 9-10, Grade 9, Year 10"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-neutral-500">
                  Specify the target grade levels for better content alignment
                </p>
              </div>

              {/* Curriculum Board */}
              <div>
                <label htmlFor="curriculumBoard" className="block text-sm font-medium text-neutral-700 mb-2">
                  Curriculum Board
                </label>
                <div className="relative">
                  <select
                    id="curriculumBoard"
                    value={curriculumBoard}
                    onChange={(e) => setCurriculumBoard(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                    disabled={loading}
                  >
                    <option value="Cambridge IGCSE">Cambridge IGCSE (CIE)</option>
                    <option value="Edexcel IGCSE">Edexcel IGCSE (Pearson)</option>
                    <option value="Oxford AQA IGCSE">Oxford AQA IGCSE</option>
                    <option value="Cambridge O Level">Cambridge O Level</option>
                    <option value="Custom">Custom Curriculum</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  Select the curriculum board for accurate syllabus alignment
                </p>
              </div>

              {/* Curriculum Tier */}
              {(curriculumBoard.includes('Cambridge') || curriculumBoard.includes('Edexcel')) && (
                <div>
                  <label htmlFor="tier" className="block text-sm font-medium text-neutral-700 mb-2">
                    Curriculum Tier
                  </label>
                  <div className="relative">
                    <select
                      id="tier"
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
                      disabled={loading}
                    >
                      <option value="">All Tiers</option>
                      {curriculumBoard.includes('Cambridge') ? (
                        <>
                          <option value="Core">Core</option>
                          <option value="Extended">Extended</option>
                        </>
                      ) : (
                        <>
                          <option value="Foundation">Foundation</option>
                          <option value="Higher">Higher</option>
                        </>
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {curriculumBoard.includes('Cambridge')
                      ? 'Core covers essential content, Extended includes additional advanced topics'
                      : 'Foundation covers basic content, Higher includes more challenging material'
                    }
                  </p>
                </div>
              )}

              {/* Generation Mode */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Generation Mode
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="radio"
                      name="generationMode"
                      checked={useComprehensiveGeneration}
                      onChange={() => setUseComprehensiveGeneration(true)}
                      className="mt-1 w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                      disabled={loading}
                    />
                    <div>
                      <div className="font-medium text-neutral-900">Comprehensive Curriculum (Recommended)</div>
                      <div className="text-sm text-neutral-600 mt-1">
                        Generate 50-100+ topics with complete syllabus coverage, hierarchical structure, and official syllabus alignment
                      </div>
                      <div className="text-xs text-primary-600 mt-1 font-medium">
                        ✓ 100% syllabus coverage • ✓ Hierarchical organization • ✓ Cost optimized
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="radio"
                      name="generationMode"
                      checked={!useComprehensiveGeneration}
                      onChange={() => setUseComprehensiveGeneration(false)}
                      className="mt-1 w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                      disabled={loading}
                    />
                    <div>
                      <div className="font-medium text-neutral-900">Quick Generation (Legacy)</div>
                      <div className="text-sm text-neutral-600 mt-1">
                        Generate 10-15 essential topics with basic coverage (15-25% of full syllabus)
                      </div>
                      <div className="text-xs text-amber-600 mt-1 font-medium">
                        ⚠ Limited coverage • Basic structure only
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Content Generation Option */}
              {useComprehensiveGeneration && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-neutral-900">Content Generation</h3>
                  <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeContentGeneration}
                      onChange={(e) => setIncludeContentGeneration(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500 rounded"
                      disabled={loading}
                    />
                    <div>
                      <div className="font-medium text-neutral-900">Generate Detailed Content</div>
                      <div className="text-sm text-neutral-600 mt-1">
                        Include comprehensive study material for each topic (500+ words per topic)
                      </div>
                      <div className="text-xs text-amber-600 mt-2 font-medium">
                        ⚠ Significantly increases generation time (5-15 minutes) and cost (~$5-15)
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="submit"
                  disabled={loading || subjects.length === 0 || !selectedSubject}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    loading || subjects.length === 0 || !selectedSubject
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-medium shadow-soft'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Topics...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Generate Topic List
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Progress Indicator */}
        {generationProgress && (
          <div className="xl:col-span-12 mb-6">
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-neutral-900">{generationProgress.phase}</h3>
                    <span className="text-sm text-neutral-600">
                      {Math.round(generationProgress.progress)}%
                      {generationProgress.startTime && (
                        <span className="ml-2">
                          ({Math.round((Date.now() - generationProgress.startTime) / 1000)}s)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${generationProgress.progress}%` }}
                    ></div>
                  </div>
                  {generationProgress.currentTopic && (
                    <p className="text-sm text-primary-600 mt-2 font-medium">
                      Current: {generationProgress.currentTopic}
                    </p>
                  )}
                  {useComprehensiveGeneration && generationProgress.progress < 90 && !generationProgress.currentTopic && (
                    <p className="text-sm text-neutral-500 mt-2">
                      Generating comprehensive curriculum with 50-100+ topics. This may take 30-60 seconds.
                    </p>
                  )}
                  {includeContentGeneration && generationProgress.progress >= 70 && (
                    <p className="text-sm text-amber-600 mt-2">
                      Generating detailed content for each topic. This may take several minutes.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Generated Content */}
        <div className="xl:col-span-7 space-y-6">
          {/* Empty State */}
          {!loading && generatedTopics.length === 0 && !generatedContent && !error && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ready to Generate Topics</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Select a subject and click "Generate Topic List" to create comprehensive topics with AI-powered content.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    AI-generated topics
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Detailed content
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Learning objectives
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Generation Error</span>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Generated Topics List */}
          {generatedTopics.length > 0 && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Generated Topics ({generatedTopics.length})
                  </h3>

                  {/* Performance Statistics */}
                  {generatedTopics.length > 0 && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-neutral-600">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>
                          {generatedTopics.length} topics generated
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>{curriculumBoard} {tier && `(${tier})`}</span>
                      </div>
                      {useComprehensiveGeneration && (
                        <div className="flex items-center gap-1 text-success-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Comprehensive Coverage</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSaveTopics}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    isSaving
                      ? 'bg-success-300 text-white cursor-not-allowed'
                      : 'bg-success-600 text-white hover:bg-success-700 hover:shadow-medium shadow-soft'
                  }`}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save All Topics
                    </span>
                  )}
                </button>
              </div>

              {/* Curriculum Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-neutral-50 rounded-xl">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {generatedTopics.length}
                  </div>
                  <div className="text-sm text-neutral-600">Total Topics</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-600">
                    {generateForChapter && selectedChapter ? selectedChapter.title : 'All Subjects'}
                  </div>
                  <div className="text-sm text-neutral-600">{generateForChapter ? 'Target Chapter' : 'Organization'}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-600">
                    {generatedTopics.reduce((sum, t) => sum + (t.estimated_study_time_minutes || 0), 0)}min
                  </div>
                  <div className="text-sm text-neutral-600">Total Study Time</div>
                </div>
              </div>

              {/* Hierarchical Topic Display */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {generatedTopics
                  .filter(topic => topic.topic_level === 1)
                  .map((majorArea, majorIndex) => {
                    const relatedTopics = generatedTopics.filter(
                      topic => topic.major_area === majorArea.title && topic.topic_level === 2
                    );

                    return (
                      <div key={majorIndex} className="border border-neutral-200 rounded-xl overflow-hidden">
                        {/* Major Area Header */}
                        <div className="bg-primary-50 border-b border-primary-100 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                                {majorArea.syllabus_code || majorIndex + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-primary-900">{majorArea.title}</h4>
                                <p className="text-sm text-primary-700">{majorArea.description}</p>
                              </div>
                            </div>
                            <div className="text-sm text-primary-600 font-medium">
                              {relatedTopics.length} topics
                            </div>
                          </div>
                        </div>

                        {/* Topics within Major Area */}
                        <div className="p-4 space-y-3">
                          {relatedTopics.map((topic, topicIndex) => {
                            const subtopics = generatedTopics.filter(
                              subtopic => subtopic.major_area === majorArea.title &&
                                         subtopic.topic_level === 3 &&
                                         subtopic.syllabus_code?.startsWith(topic.syllabus_code || '')
                            );
                            const isSaved = existingTopicTitles.has(topic.title || '');

                            return (
                              <div key={topicIndex} className="border border-neutral-100 rounded-lg overflow-hidden">
                                {/* Topic */}
                                <button
                                  type="button"
                                  onClick={() => handleTopicSelect(topic.title || '')}
                                  className={`w-full text-left p-3 transition-all duration-200 hover:bg-neutral-50 ${
                                    isSaved ? 'bg-success-50' : 'bg-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 bg-neutral-200 text-neutral-700 rounded text-xs font-medium flex items-center justify-center">
                                        {topic.syllabus_code?.split('.')[1] || topicIndex + 1}
                                      </div>
                                      <div>
                                        <div className="font-medium text-neutral-900">{topic.title}</div>
                                        <div className="text-sm text-neutral-600">{topic.description}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {topic.estimated_study_time_minutes && (
                                        <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                                          {topic.estimated_study_time_minutes}min
                                        </span>
                                      )}
                                      {isSaved && (
                                        <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </button>

                                {/* Subtopics */}
                                {subtopics.length > 0 && (
                                  <div className="bg-neutral-25 border-t border-neutral-100 p-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {subtopics.map((subtopic, subtopicIndex) => {
                                        const isSubtopicSaved = existingTopicTitles.has(subtopic.title || '');
                                        return (
                                          <button
                                            key={subtopicIndex}
                                            type="button"
                                            onClick={() => handleTopicSelect(subtopic.title || '')}
                                            className={`text-left p-2 rounded-lg text-sm transition-all duration-200 hover:bg-white ${
                                              isSubtopicSaved ? 'bg-success-50 text-success-800' : 'bg-neutral-50 hover:bg-white'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-neutral-300 text-neutral-600 rounded text-xs font-medium flex items-center justify-center">
                                                  {subtopic.syllabus_code?.split('.')[2] || subtopicIndex + 1}
                                                </div>
                                                <span className="font-medium">{subtopic.title}</span>
                                              </div>
                                              {isSubtopicSaved && (
                                                <svg className="w-3 h-3 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                              )}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Save Status Messages */}
          {saveSuccess && (
            <div className="bg-success-50 border border-success-200 text-success-800 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Success!</span>
              </div>
              <p className="mt-1">Topics saved successfully to the database.</p>
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Save Error</span>
              </div>
              <p className="mt-1">{saveError}</p>
            </div>
          )}

          {/* Content Generation Loading */}
          {contentLoading && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
                  <svg className="animate-spin w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Generating Detailed Content</h3>
                <p className="text-neutral-600">Creating comprehensive topic content with learning objectives...</p>
              </div>
            </div>
          )}

          {contentError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Content Generation Error</span>
              </div>
              <p className="mt-1">{contentError}</p>
            </div>
          )}
          {/* Content Editor */}
          {generatedContent && (
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Topic: {generatedContent.title}
                </h3>
                <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                  Draft
                </span>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Topic Description
                  </label>
                  <textarea
                    value={generatedContent.description || ''}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, description: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Brief description of what students will learn in this topic..."
                  />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={generatedContent.difficulty_level || 1}
                      onChange={(e) => setGeneratedContent({ ...generatedContent, difficulty_level: parseInt(e.target.value, 10) })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value={1}>1 - Beginner</option>
                      <option value={2}>2 - Elementary</option>
                      <option value={3}>3 - Intermediate</option>
                      <option value={4}>4 - Advanced</option>
                      <option value={5}>5 - Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Estimated Study Time
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="300"
                        step="5"
                        value={generatedContent.estimated_study_time_minutes || ''}
                        onChange={(e) => setGeneratedContent({ ...generatedContent, estimated_study_time_minutes: parseInt(e.target.value, 10) })}
                        className="w-full px-4 py-3 pr-20 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="30"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <span className="text-neutral-500 text-sm">minutes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Learning Objectives */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Learning Objectives
                  </label>
                  <textarea
                    value={(generatedContent.learning_objectives || []).join('\n')}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, learning_objectives: e.target.value.split('\n').filter(obj => obj.trim()) })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={4}
                    placeholder="Enter learning objectives, one per line..."
                  />
                  <p className="mt-1 text-sm text-neutral-500">
                    List what students will be able to do after studying this topic
                  </p>
                </div>

                {/* Content Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-700">
                      Topic Content
                    </label>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Markdown supported
                    </div>
                  </div>
                  <textarea
                    value={generatedContent.content || ''}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, content: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                    rows={20}
                    placeholder="Enter the main content for this topic. You can use Markdown formatting..."
                  />
                  <p className="mt-1 text-sm text-neutral-500">
                    Use **bold**, *italic*, # headings, - lists, and other Markdown syntax
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-neutral-200">
                  <button
                    onClick={handleSaveSingleTopic}
                    disabled={isSaving}
                    className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isSaving
                        ? 'bg-secondary-300 text-white cursor-not-allowed'
                        : 'bg-secondary-600 text-white hover:bg-secondary-700 hover:shadow-medium shadow-soft'
                    }`}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving Topic...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Save Topic to Database
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default TopicGeneratorForm;
