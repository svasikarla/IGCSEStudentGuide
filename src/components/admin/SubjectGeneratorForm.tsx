import React, { useState } from 'react';
import { useSubjectGeneration } from '../../hooks/useSubjectGeneration';
import { Subject } from '../../hooks/useSubjects';
import { LLMProvider } from '../../services/llmAdapter';
import LLMProviderSelector from './LLMProviderSelector';

interface SubjectGeneratorFormProps {
  onGenerationComplete?: () => void;
}

/**
 * Enhanced form for generating and saving subjects using LLM
 */
const SubjectGeneratorForm: React.FC<SubjectGeneratorFormProps> = ({ onGenerationComplete }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedSubject, setGeneratedSubject] = useState<any | null>(null);
  const [savedSubject, setSavedSubject] = useState<Subject | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // LLM Provider state
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');

  const { generateSubject, saveSubject, loading, error, validationResults } = useSubjectGeneration();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const result = await generateSubject(prompt, selectedProvider, selectedModel);
      setGeneratedSubject(result);
    } catch (err) {
      console.error('Error generating subject:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Handle saving the generated subject
  const handleSave = async () => {
    if (!generatedSubject) return;

    setSaving(true);
    try {
      const result = await saveSubject(generatedSubject);
      if (result) {
        setSavedSubject(result);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          if (onGenerationComplete) {
            onGenerationComplete();
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Error saving subject:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle editing the generated subject
  const handleEdit = (field: string, value: string) => {
    if (!generatedSubject) return;
    
    setGeneratedSubject({
      ...generatedSubject,
      [field]: value
    });
  };

  // Reset the form
  const handleReset = () => {
    setPrompt('');
    setGeneratedSubject(null);
    setSavedSubject(null);
  };

  return (
    <div className="space-y-6">
      {/* Header - Using design system pattern */}
      <div className="border-b border-neutral-200 pb-4">
        <h2 className="text-2xl font-bold text-neutral-900 mb-1">Generate New Subject</h2>
        <p className="text-neutral-600">Use AI to create a new IGCSE subject with comprehensive details</p>
      </div>

      {/* Success message - Using design system pattern */}
      {showSuccess && savedSubject && (
        <div className="bg-success-50 border border-success-200 text-success-800 p-4 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Success!</p>
            <p className="text-sm mt-1">Subject "{savedSubject.name}" created successfully.</p>
          </div>
        </div>
      )}

      {/* Error message - Using design system pattern */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-800 p-4 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {validationResults && (validationResults.warnings.length > 0 || validationResults.errors.length > 0) && (
        <div className="bg-warning-50 border border-warning-200 text-warning-800 p-4 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold mb-2">Content Validation</p>
            {validationResults.errors.length > 0 && (
              <div className="mb-2">
                <p className="font-medium text-error-800">Errors:</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  {validationResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationResults.warnings.length > 0 && (
              <div>
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  {validationResults.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input form - Using design system pattern */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main prompt input */}
        <div className="space-y-2">
          <label htmlFor="prompt" className="block text-sm font-medium text-neutral-700">
            Subject Description
            <span className="text-error-600 ml-1">*</span>
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
            rows={4}
            placeholder="Describe the subject you want to generate. Be specific about the curriculum, grade levels, and key topics to cover..."
            disabled={generating || loading}
            required
          />
          <p className="text-sm text-neutral-500">
            Example: "Generate a comprehensive IGCSE Biology subject covering cell biology, genetics, ecology, and human physiology for grades 9-10"
          </p>
        </div>

        {/* Advanced settings toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <svg className={`w-4 h-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Advanced Settings
          </button>
        </div>

        {/* Advanced settings */}
        {showAdvanced && (
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-4">
            <h4 className="font-semibold text-neutral-900">LLM Configuration</h4>
            <LLMProviderSelector
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onProviderChange={setSelectedProvider}
              onModelChange={setSelectedModel}
              disabled={generating || loading}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={generating || loading || !prompt.trim()}
            className="flex-1 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft hover:shadow-medium"
          >
            {generating || loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Subject
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={generating || loading}
            className="px-6 py-2.5 bg-white text-neutral-700 font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus:ring-4 focus:ring-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Generated subject preview */}
      {generatedSubject && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-6 shadow-soft">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h3 className="text-lg font-semibold text-neutral-900">Generated Subject</h3>
            <span className="text-sm text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">Review & Edit</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Subject Name
                <span className="text-error-600 ml-1">*</span>
              </label>
              <input
                type="text"
                value={generatedSubject.name}
                onChange={(e) => handleEdit('name', e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Subject name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Subject Code
                <span className="text-error-600 ml-1">*</span>
              </label>
              <input
                type="text"
                value={generatedSubject.code}
                onChange={(e) => handleEdit('code', e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="e.g., BIO"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              Description
              <span className="text-error-600 ml-1">*</span>
            </label>
            <textarea
              value={generatedSubject.description}
              onChange={(e) => handleEdit('description', e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
              rows={4}
              placeholder="Subject description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Color Theme</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={generatedSubject.color_hex}
                  onChange={(e) => handleEdit('color_hex', e.target.value)}
                  className="w-12 h-10 border border-neutral-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={generatedSubject.color_hex}
                  onChange={(e) => handleEdit('color_hex', e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="#4285F4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Icon</label>
              <select
                value={generatedSubject.icon_name}
                onChange={(e) => handleEdit('icon_name', e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
              >
                <option value="book">📚 Book</option>
                <option value="calculator">🧮 Calculator</option>
                <option value="flask">⚗️ Flask</option>
                <option value="atom">⚛️ Atom</option>
                <option value="globe">🌍 Globe</option>
                <option value="microscope">🔬 Microscope</option>
                <option value="dna">🧬 DNA</option>
                <option value="chart">📊 Chart</option>
                <option value="language">🗣️ Language</option>
                <option value="art">🎨 Art</option>
              </select>
            </div>
          </div>

          {/* Preview Card */}
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3">Preview</h4>
            <div className="bg-white p-4 rounded-lg border border-neutral-200 flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft"
                style={{ backgroundColor: generatedSubject.color_hex }}
              >
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 21 12 17.77 5.82 21 7 13.87 2 9l6.91-.74L12 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-semibold text-neutral-900 truncate">{generatedSubject.name || 'Subject Name'}</h5>
                <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{generatedSubject.description || 'Subject description...'}</p>
                <span className="inline-block bg-neutral-100 px-2.5 py-1 rounded-full text-xs font-medium text-neutral-700 mt-2 border border-neutral-200">
                  {generatedSubject.code || 'CODE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button
              onClick={handleSave}
              disabled={saving || loading || !generatedSubject.name?.trim() || !generatedSubject.code?.trim()}
              className="flex-1 px-6 py-2.5 bg-success-600 text-white font-medium rounded-lg hover:bg-success-700 focus:ring-4 focus:ring-success-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft hover:shadow-medium"
            >
              {saving || loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Subject
                </span>
              )}
            </button>
            <button
              onClick={() => setGeneratedSubject(null)}
              disabled={saving || loading}
              className="px-6 py-2.5 bg-white text-neutral-700 font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus:ring-4 focus:ring-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Example prompt suggestions */}
      {!generatedSubject && (
        <div className="bg-info-50 border border-info-200 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-info-900 mb-1">Quick Start Examples</h3>
              <p className="text-info-700 text-sm">Click any example below to get started quickly:</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setPrompt('Generate a comprehensive IGCSE Biology subject covering cell biology, genetics, ecology, and human physiology for grades 9-10')}
              className="text-left p-4 bg-white border border-info-200 rounded-lg hover:border-info-400 hover:shadow-md transition-all disabled:opacity-50"
              disabled={generating || loading}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🧬</span>
                <span className="font-semibold text-info-900">IGCSE Biology</span>
              </div>
              <div className="text-sm text-info-700">Comprehensive biology curriculum</div>
            </button>
            <button
              onClick={() => setPrompt('Create a Physics subject for IGCSE students covering mechanics, waves, electricity, and modern physics')}
              className="text-left p-4 bg-white border border-info-200 rounded-lg hover:border-info-400 hover:shadow-md transition-all disabled:opacity-50"
              disabled={generating || loading}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⚛️</span>
                <span className="font-semibold text-info-900">IGCSE Physics</span>
              </div>
              <div className="text-sm text-info-700">Core physics concepts and applications</div>
            </button>
            <button
              onClick={() => setPrompt('Generate a Mathematics subject for IGCSE curriculum covering algebra, geometry, statistics, and calculus fundamentals')}
              className="text-left p-4 bg-white border border-info-200 rounded-lg hover:border-info-400 hover:shadow-md transition-all disabled:opacity-50"
              disabled={generating || loading}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📐</span>
                <span className="font-semibold text-info-900">IGCSE Mathematics</span>
              </div>
              <div className="text-sm text-info-700">Essential mathematical concepts</div>
            </button>
            <button
              onClick={() => setPrompt('Create a Chemistry subject for IGCSE students covering atomic structure, chemical bonding, organic chemistry, and practical skills')}
              className="text-left p-4 bg-white border border-info-200 rounded-lg hover:border-info-400 hover:shadow-md transition-all disabled:opacity-50"
              disabled={generating || loading}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⚗️</span>
                <span className="font-semibold text-info-900">IGCSE Chemistry</span>
              </div>
              <div className="text-sm text-info-700">Chemical principles and laboratory work</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectGeneratorForm;
