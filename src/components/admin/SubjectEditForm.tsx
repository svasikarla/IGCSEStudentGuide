import React, { useState, useEffect } from 'react';
import { Subject } from '../../hooks/useSubjects';
import { supabase } from '../../lib/supabase';

interface SubjectEditFormProps {
  subject: Subject;
  onEditComplete: () => void;
  onCancel: () => void;
}

const SubjectEditForm: React.FC<SubjectEditFormProps> = ({
  subject,
  onEditComplete,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: subject.name,
    code: subject.code,
    description: subject.description,
    color_hex: subject.color_hex,
    icon_name: subject.icon_name,
    display_order: subject.display_order,
    grade_levels: subject.grade_levels || []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGradeLevelsChange = (levels: string) => {
    try {
      const parsedLevels = levels.split(',').map(level => parseInt(level.trim())).filter(level => !isNaN(level));
      setFormData(prev => ({
        ...prev,
        grade_levels: parsedLevels
      }));
    } catch (err) {
      // Invalid input, keep previous value
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.description.trim()) {
      setError('Name, code, and description are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('subjects')
        .update({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim(),
          color_hex: formData.color_hex,
          icon_name: formData.icon_name,
          display_order: formData.display_order,
          grade_levels: formData.grade_levels
        })
        .eq('id', subject.id);

      if (updateError) throw updateError;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onEditComplete();
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subject';
      setError(errorMessage);
      console.error('Error updating subject:', err);
    } finally {
      setSaving(false);
    }
  };

  const iconOptions = [
    { value: 'book', label: 'Book' },
    { value: 'calculator', label: 'Calculator' },
    { value: 'flask', label: 'Flask' },
    { value: 'atom', label: 'Atom' },
    { value: 'globe', label: 'Globe' },
    { value: 'microscope', label: 'Microscope' },
    { value: 'dna', label: 'DNA' },
    { value: 'chart', label: 'Chart' },
    { value: 'language', label: 'Language' },
    { value: 'art', label: 'Art' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Edit Subject</h3>
          <p className="text-gray-600">Update subject information</p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          title="Cancel editing"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Success message */}
      {showSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Subject updated successfully!
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Biology"
              disabled={saving}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., BIO"
              disabled={saving}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Describe what this subject covers..."
            disabled={saving}
            required
          />
        </div>

        {/* Visual Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color_hex}
                onChange={(e) => handleInputChange('color_hex', e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                disabled={saving}
              />
              <input
                type="text"
                value={formData.color_hex}
                onChange={(e) => handleInputChange('color_hex', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="#4285F4"
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Icon
            </label>
            <select
              value={formData.icon_name}
              onChange={(e) => handleInputChange('icon_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              {iconOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="0"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade Levels
            </label>
            <input
              type="text"
              value={formData.grade_levels.join(', ')}
              onChange={(e) => handleGradeLevelsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="9, 10"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list of grade levels</p>
          </div>
        </div>

        {/* Preview */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: formData.color_hex }}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 21 12 17.77 5.82 21 7 13.87 2 9l6.91-.74L12 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900">{formData.name || 'Subject Name'}</h5>
              <p className="text-sm text-gray-600 mt-1">{formData.description || 'Subject description...'}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                <span className="bg-white px-2 py-1 rounded border">{formData.code || 'CODE'}</span>
                <span>Order: {formData.display_order}</span>
                {formData.grade_levels.length > 0 && (
                  <span>Grades: {formData.grade_levels.join(', ')}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className={`flex-1 px-4 py-2 rounded-md text-white font-medium transition-colors ${
              saving
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubjectEditForm;
