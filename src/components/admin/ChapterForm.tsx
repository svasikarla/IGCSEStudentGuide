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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-900">
          {chapter ? 'Edit Chapter' : 'Create New Chapter'}
        </h2>
        <button
          onClick={onCancel}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700">{saveError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
            Chapter Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.title ? 'border-red-300' : 'border-neutral-300'
            }`}
            placeholder="Enter chapter title..."
            disabled={isSaving}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.description ? 'border-red-300' : 'border-neutral-300'
            }`}
            placeholder="Enter chapter description..."
            disabled={isSaving}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Syllabus Code and Tier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="syllabus_code" className="block text-sm font-medium text-neutral-700 mb-2">
              Syllabus Code
            </label>
            <input
              type="text"
              id="syllabus_code"
              value={formData.syllabus_code}
              onChange={(e) => handleInputChange('syllabus_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.syllabus_code ? 'border-red-300' : 'border-neutral-300'
              }`}
              placeholder="e.g., 1, 2.1, 3.2.1"
              disabled={isSaving}
            />
            {errors.syllabus_code && (
              <p className="mt-1 text-sm text-red-600">{errors.syllabus_code}</p>
            )}
          </div>

          <div>
            <label htmlFor="tier" className="block text-sm font-medium text-neutral-700 mb-2">
              Tier
            </label>
            <select
              id="tier"
              value={formData.tier || ''}
              onChange={(e) => handleInputChange('tier', e.target.value || null)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSaving}
            >
              <option value="">Select tier...</option>
              {CHAPTER_TIER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Study Time and Display Order */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="estimated_study_time_minutes" className="block text-sm font-medium text-neutral-700 mb-2">
              Estimated Study Time (minutes)
            </label>
            <input
              type="number"
              id="estimated_study_time_minutes"
              value={formData.estimated_study_time_minutes}
              onChange={(e) => handleInputChange('estimated_study_time_minutes', parseInt(e.target.value) || 0)}
              min="15"
              max="600"
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.estimated_study_time_minutes ? 'border-red-300' : 'border-neutral-300'
              }`}
              disabled={isSaving}
            />
            {errors.estimated_study_time_minutes && (
              <p className="mt-1 text-sm text-red-600">{errors.estimated_study_time_minutes}</p>
            )}
          </div>

          <div>
            <label htmlFor="display_order" className="block text-sm font-medium text-neutral-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              id="display_order"
              value={formData.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Learning Objectives */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Learning Objectives
          </label>
          <div className="space-y-2">
            {formData.learning_objectives.map((objective, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm">
                  {objective}
                </span>
                <button
                  type="button"
                  onClick={() => removeLearningObjective(index)}
                  className="p-1 text-red-500 hover:text-red-700"
                  disabled={isSaving}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLearningObjective())}
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add learning objective..."
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={addLearningObjective}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={isSaving || !objectiveInput.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Status Toggles */}
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => handleInputChange('is_published', e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              disabled={isSaving}
            />
            <span className="ml-2 text-sm text-neutral-700">Published</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              disabled={isSaving}
            />
            <span className="ml-2 text-sm text-neutral-700">Active</span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-neutral-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              chapter ? 'Update Chapter' : 'Create Chapter'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChapterForm;
