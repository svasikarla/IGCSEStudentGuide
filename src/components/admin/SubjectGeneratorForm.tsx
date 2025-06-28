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
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Generate New Subject</h2>
        <p className="text-gray-600">Use AI to create a new IGCSE subject with comprehensive details</p>
      </div>

      {/* Success message */}
      {showSuccess && savedSubject && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Subject "{savedSubject.name}" created successfully!</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {validationResults && (validationResults.warnings.length > 0 || validationResults.errors.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Content Validation</h4>
          {validationResults.errors.length > 0 && (
            <div className="mb-2">
              <p className="font-medium text-red-800">Errors:</p>
              <ul className="list-disc list-inside text-sm">
                {validationResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validationResults.warnings.length > 0 && (
            <div>
              <p className="font-medium">Warnings:</p>
              <ul className="list-disc list-inside text-sm">
                {validationResults.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main prompt input */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Subject Description *
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            rows={4}
            placeholder="Describe the subject you want to generate. Be specific about the curriculum, grade levels, and key topics to cover..."
            disabled={generating || loading}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Example: "Generate a comprehensive IGCSE Biology subject covering cell biology, genetics, ecology, and human physiology for grades 9-10"
          </p>
        </div>

        {/* Advanced settings toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className={`w-4 h-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Advanced Settings
          </button>
        </div>

        {/* Advanced settings */}
        {showAdvanced && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">LLM Configuration</h4>
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
            className={`flex-1 px-6 py-3 rounded-lg text-white font-medium transition-all ${
              generating || loading || !prompt.trim()
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }`}
          >
            {generating || loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Subject'
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={generating || loading}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Generated subject preview */}
      {generatedSubject && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Generated Subject</h3>
            <span className="text-sm text-gray-500">Review and edit before saving</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
              <input
                type="text"
                value={generatedSubject.name}
                onChange={(e) => handleEdit('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Subject name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code *</label>
              <input
                type="text"
                value={generatedSubject.code}
                onChange={(e) => handleEdit('code', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., BIO"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={generatedSubject.description}
              onChange={(e) => handleEdit('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Subject description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color Theme</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={generatedSubject.color_hex}
                  onChange={(e) => handleEdit('color_hex', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={generatedSubject.color_hex}
                  onChange={(e) => handleEdit('color_hex', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#4285F4"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <select
                value={generatedSubject.icon_name}
                onChange={(e) => handleEdit('icon_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="book">Book</option>
                <option value="calculator">Calculator</option>
                <option value="flask">Flask</option>
                <option value="atom">Atom</option>
                <option value="globe">Globe</option>
                <option value="microscope">Microscope</option>
                <option value="dna">DNA</option>
                <option value="chart">Chart</option>
                <option value="language">Language</option>
                <option value="art">Art</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: generatedSubject.color_hex }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 21 12 17.77 5.82 21 7 13.87 2 9l6.91-.74L12 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-gray-900">{generatedSubject.name || 'Subject Name'}</h5>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{generatedSubject.description || 'Subject description...'}</p>
                <span className="inline-block bg-white px-2 py-1 rounded border text-xs text-gray-500 mt-2">
                  {generatedSubject.code || 'CODE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving || loading || !generatedSubject.name?.trim() || !generatedSubject.code?.trim()}
              className={`flex-1 px-6 py-3 rounded-lg text-white font-medium transition-all ${
                saving || loading || !generatedSubject.name?.trim() || !generatedSubject.code?.trim()
                  ? 'bg-green-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
              }`}
            >
              {saving || loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Subject'
              )}
            </button>
            <button
              onClick={() => setGeneratedSubject(null)}
              disabled={saving || loading}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Example prompt suggestions */}
      {!generatedSubject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Quick Start Examples</h3>
          <p className="text-blue-700 text-sm mb-4">Click any example below to get started quickly:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setPrompt('Generate a comprehensive IGCSE Biology subject covering cell biology, genetics, ecology, and human physiology for grades 9-10')}
              className="text-left p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              disabled={generating || loading}
            >
              <div className="font-medium text-blue-900">IGCSE Biology</div>
              <div className="text-sm text-blue-600 mt-1">Comprehensive biology curriculum</div>
            </button>
            <button
              onClick={() => setPrompt('Create a Physics subject for IGCSE students covering mechanics, waves, electricity, and modern physics')}
              className="text-left p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              disabled={generating || loading}
            >
              <div className="font-medium text-blue-900">IGCSE Physics</div>
              <div className="text-sm text-blue-600 mt-1">Core physics concepts and applications</div>
            </button>
            <button
              onClick={() => setPrompt('Generate a Mathematics subject for IGCSE curriculum covering algebra, geometry, statistics, and calculus fundamentals')}
              className="text-left p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              disabled={generating || loading}
            >
              <div className="font-medium text-blue-900">IGCSE Mathematics</div>
              <div className="text-sm text-blue-600 mt-1">Essential mathematical concepts</div>
            </button>
            <button
              onClick={() => setPrompt('Create a Chemistry subject for IGCSE students covering atomic structure, chemical bonding, organic chemistry, and practical skills')}
              className="text-left p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              disabled={generating || loading}
            >
              <div className="font-medium text-blue-900">IGCSE Chemistry</div>
              <div className="text-sm text-blue-600 mt-1">Chemical principles and laboratory work</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectGeneratorForm;
