import React, { useState, useEffect } from 'react';
import { Chapter, ChapterFormData, DEFAULT_CHAPTER_VALUES, CHAPTER_TIER_OPTIONS } from '../../types/chapter';
import { useChapters } from '../../hooks/useChapters';

interface ChapterFormProps {
  subjectId: string;
  chapter?: Chapter | null; // null for create, Chapter for edit
  onSave: (chapter: Chapter) => void;
  onCancel: () => void;
}

const ChapterForm: React.FC<ChapterFormProps> = ({
  subjectId,
  chapter,
  onSave,
  onCancel
}) => {
  const { createChapter, updateChapter, isSaving, saveError } = useChapters(subjectId);
  const [formData, setFormData] = useState<ChapterFormData>({
    title: '',
    description: '',
    syllabus_code: '',
    curriculum_board: 'Cambridge IGCSE',
    tier: null,
    display_order: 0,
    color_hex: '#6366f1',
    icon_name: 'folder',
    estimated_study_time_minutes: 120,
    learning_objectives: [],
    is_published: true,
    is_active: true,
    ...DEFAULT_CHAPTER_VALUES
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [objectiveInput, setObjectiveInput] = useState('');

  // Initialize form data when chapter changes
  useEffect(() => {
    if (chapter) {
      setFormData({
        title: chapter.title,
        description: chapter.description || '',
        syllabus_code: chapter.syllabus_code || '',
        curriculum_board: chapter.curriculum_board,
        tier: chapter.tier,
        display_order: chapter.display_order,
        color_hex: chapter.color_hex,
        icon_name: chapter.icon_name,
        estimated_study_time_minutes: chapter.estimated_study_time_minutes,
        learning_objectives: chapter.learning_objectives || [],
        is_published: chapter.is_published,
        is_active: chapter.is_active,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        syllabus_code: '',
        curriculum_board: 'Cambridge IGCSE',
        tier: null,
        display_order: 0,
        color_hex: '#6366f1',
        icon_name: 'folder',
        estimated_study_time_minutes: 120,
        learning_objectives: [],
        is_published: true,
        is_active: true,
        ...DEFAULT_CHAPTER_VALUES
      });
    }
    setErrors({});
  }, [chapter]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (formData.syllabus_code && !/^[0-9]+(\.[0-9]+)*$/.test(formData.syllabus_code)) {
      newErrors.syllabus_code = 'Syllabus code must be in format like "1" or "1.2.3"';
    }

    if (formData.estimated_study_time_minutes < 15 || formData.estimated_study_time_minutes > 600) {
      newErrors.estimated_study_time_minutes = 'Study time must be between 15 and 600 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      let result: Chapter | null = null;

      if (chapter) {
        // Update existing chapter
        result = await updateChapter({
          id: chapter.id,
          ...formData
        });
      } else {
        // Create new chapter
        result = await createChapter({
          subject_id: subjectId,
          ...formData
        });
      }

      if (result) {
        onSave(result);
      }
    } catch (err) {
      console.error('Error saving chapter:', err);
    }
  };

  const handleInputChange = (field: keyof ChapterFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addLearningObjective = () => {
    if (objectiveInput.trim()) {
      setFormData(prev => ({
        ...prev,
        learning_objectives: [...prev.learning_objectives, objectiveInput.trim()]
      }));
      setObjectiveInput('');
    }
  };

  const removeLearningObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_objectives: prev.learning_objectives.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
      {/* Header - Using design system pattern */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">
            {chapter ? 'Edit Chapter' : 'Create New Chapter'}
          </h2>
          <p className="text-neutral-600 text-sm">
            {chapter ? 'Update chapter details below' : 'Add a new chapter to organize your course content'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error message - Using design system pattern */}
      {saveError && (
        <div className="mb-6 bg-error-50 border border-error-200 text-error-800 p-4 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{saveError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title - Using design system pattern */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
            Chapter Title
            <span className="text-error-600 ml-1">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              errors.title ? 'border-error-600' : 'border-neutral-300'
            }`}
            placeholder="Enter chapter title..."
            disabled={isSaving}
          />
          {errors.title && (
            <p className="text-sm text-error-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.title}
            </p>
          )}
        </div>

        {/* Description - Using design system pattern */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
              errors.description ? 'border-error-600' : 'border-neutral-300'
            }`}
            placeholder="Enter chapter description..."
            disabled={isSaving}
          />
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500">Brief overview of the chapter content</span>
            <span className="text-neutral-400">{formData.description.length}/1000</span>
          </div>
          {errors.description && (
            <p className="text-sm text-error-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.description}
            </p>
          )}
        </div>

        {/* Syllabus Code and Tier - Using design system pattern */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="syllabus_code" className="block text-sm font-medium text-neutral-700">
              Syllabus Code
            </label>
            <input
              type="text"
              id="syllabus_code"
              value={formData.syllabus_code}
              onChange={(e) => handleInputChange('syllabus_code', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.syllabus_code ? 'border-error-600' : 'border-neutral-300'
              }`}
              placeholder="e.g., 1, 2.1, 3.2.1"
              disabled={isSaving}
            />
            {errors.syllabus_code && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.syllabus_code}
              </p>
            )}
            {!errors.syllabus_code && (
              <p className="text-sm text-neutral-500">Optional reference to official syllabus</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="tier" className="block text-sm font-medium text-neutral-700">
              Tier
            </label>
            <select
              id="tier"
              value={formData.tier || ''}
              onChange={(e) => handleInputChange('tier', e.target.value || null)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
              disabled={isSaving}
            >
              <option value="">Select tier...</option>
              {CHAPTER_TIER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-neutral-500">Optional difficulty tier classification</p>
          </div>
        </div>

        {/* Study Time and Display Order - Using design system pattern */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="estimated_study_time_minutes" className="block text-sm font-medium text-neutral-700">
              Estimated Study Time (minutes)
            </label>
            <input
              type="number"
              id="estimated_study_time_minutes"
              value={formData.estimated_study_time_minutes}
              onChange={(e) => handleInputChange('estimated_study_time_minutes', parseInt(e.target.value) || 0)}
              min="15"
              max="600"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.estimated_study_time_minutes ? 'border-error-600' : 'border-neutral-300'
              }`}
              disabled={isSaving}
            />
            {errors.estimated_study_time_minutes && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.estimated_study_time_minutes}
              </p>
            )}
            {!errors.estimated_study_time_minutes && (
              <p className="text-sm text-neutral-500">Recommended time: 15-600 minutes</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="display_order" className="block text-sm font-medium text-neutral-700">
              Display Order
            </label>
            <input
              type="number"
              id="display_order"
              value={formData.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              disabled={isSaving}
            />
            <p className="text-sm text-neutral-500">Lower numbers appear first</p>
          </div>
        </div>

        {/* Learning Objectives - Using design system pattern */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700">
            Learning Objectives
          </label>
          <div className="space-y-2">
            {formData.learning_objectives.map((objective, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800">
                  {objective}
                </div>
                <button
                  type="button"
                  onClick={() => removeLearningObjective(index)}
                  className="p-2 text-error-600 hover:text-error-700 hover:bg-error-50 rounded-lg transition-colors"
                  disabled={isSaving}
                  aria-label="Remove objective"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLearningObjective())}
                className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Add learning objective..."
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={addLearningObjective}
                className="px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft"
                disabled={isSaving || !objectiveInput.trim()}
              >
                Add
              </button>
            </div>
          </div>
          <p className="text-sm text-neutral-500">Press Enter or click Add to include an objective</p>
        </div>

        {/* Status Toggles - Using design system pattern */}
        <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-neutral-900 mb-3">Publication Settings</h4>
          <div className="flex items-center gap-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => handleInputChange('is_published', e.target.checked)}
                className="rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                disabled={isSaving}
              />
              <span className="ml-2 text-sm text-neutral-700">Published</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                disabled={isSaving}
              />
              <span className="ml-2 text-sm text-neutral-700">Active</span>
            </label>
          </div>
          <p className="text-xs text-neutral-500 mt-2">Published chapters are visible to students. Active chapters appear in the course navigation.</p>
        </div>

        {/* Form Actions - Using design system pattern */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 bg-white text-neutral-700 font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus:ring-4 focus:ring-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft hover:shadow-medium"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {chapter ? 'Update Chapter' : 'Create Chapter'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChapterForm;
