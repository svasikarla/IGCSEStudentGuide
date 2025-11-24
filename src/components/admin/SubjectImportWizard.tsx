import React, { useState, useRef } from 'react';
import { useSubjectImport } from '../../hooks/useSubjectImport';
import { SubjectHierarchyData } from '../../services/subjectImportAPI';
import HierarchyTreeView from './HierarchyTreeView';

interface SubjectImportWizardProps {
  onImportComplete?: () => void;
  onCancel?: () => void;
}

type ImportMethod = 'upload' | 'paste' | 'template' | null;

const SubjectImportWizard: React.FC<SubjectImportWizardProps> = ({
  onImportComplete,
  onCancel,
}) => {
  // Wizard steps: 1-Method, 2-Data, 3-Preview, 4-Import, 5-Success
  const [step, setStep] = useState(1);
  const [importMethod, setImportMethod] = useState<ImportMethod>(null);
  const [jsonText, setJsonText] = useState('');
  const [parsedData, setParsedData] = useState<SubjectHierarchyData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    importing,
    progress,
    errors,
    warnings,
    result,
    importHierarchy,
    validateData,
    loadTemplateFile,
    reset,
  } = useSubjectImport();

  // Available templates
  const templates = [
    { id: 'chemistry-igcse.json', name: 'Chemistry (IGCSE)', description: 'Complete chemistry syllabus with 3 chapters and 10 topics' },
    { id: 'physics-igcse-sample.json', name: 'Physics (Sample)', description: 'Sample physics content with 2 chapters' },
  ];

  // Step 1: Choose import method
  const handleMethodSelect = (method: ImportMethod) => {
    setImportMethod(method);
    setParseError(null);
    setParsedData(null);
    setJsonText('');

    if (method === 'upload' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (method === 'template') {
      setStep(2);
    } else if (method === 'paste') {
      setStep(2);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonText(text);
      tryParseJSON(text);
      setStep(2);
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
    };
    reader.readAsText(file);
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    setLoadingTemplate(true);
    setParseError(null);

    try {
      console.log('Loading template:', templateId);
      const template = await loadTemplateFile(templateId);

      if (template) {
        console.log('Template loaded successfully:', template.subject?.name);
        setParsedData(template);
        setJsonText(JSON.stringify(template, null, 2));
        setParseError(null);
        setStep(3);
      } else {
        setParseError('Template loaded but returned empty data');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load template';
      setParseError(`${errorMessage}. Make sure templates are in public/templates/subjects/ folder.`);
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Try to parse JSON
  const tryParseJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const validation = validateData(parsed);

      if (!validation.isValid) {
        setParseError(`Invalid data structure: ${validation.errors.join(', ')}`);
        setParsedData(null);
        return false;
      }

      setParsedData(parsed);
      setParseError(null);
      return true;
    } catch (error) {
      setParseError('Invalid JSON format');
      setParsedData(null);
      return false;
    }
  };

  // Handle paste/edit
  const handleJSONChange = (value: string) => {
    setJsonText(value);
    if (value.trim()) {
      tryParseJSON(value);
    }
  };

  // Proceed to preview
  const handleProceedToPreview = () => {
    if (parsedData) {
      setStep(3);
    }
  };

  // Start import
  const handleStartImport = async () => {
    if (!parsedData) return;

    setStep(4);
    const result = await importHierarchy(parsedData);

    if (result) {
      setStep(5);
    } else {
      // Stay on import step to show errors
    }
  };

  // Complete and close
  const handleComplete = () => {
    reset();
    if (onImportComplete) {
      onImportComplete();
    }
  };

  // Cancel and close
  const handleCancel = () => {
    reset();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">Import Subject Hierarchy</h2>
        <p className="text-sm text-gray-600 mt-1">
          Import a complete subject with chapters and topics in a single operation
        </p>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {['Method', 'Data', 'Preview', 'Import', 'Complete'].map((label, index) => (
            <div key={label} className="flex items-center">
              <div className={`flex flex-col items-center ${index < step ? 'text-blue-600' : index === step ? 'text-blue-500' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  index < step ? 'bg-blue-600 text-white' :
                  index === step ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index < step ? '✓' : index + 1}
                </div>
                <span className="text-xs mt-1 font-medium">{label}</span>
              </div>
              {index < 4 && (
                <div className={`w-16 h-1 mx-2 ${index < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        {/* Step 1: Choose Method */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Import Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleMethodSelect('upload')}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex flex-col items-center text-center">
                  <svg className="w-12 h-12 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <h4 className="font-semibold text-gray-900 mb-1">Upload JSON File</h4>
                  <p className="text-sm text-gray-600">Upload a pre-formatted JSON file</p>
                </div>
              </button>

              <button
                onClick={() => handleMethodSelect('paste')}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex flex-col items-center text-center">
                  <svg className="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="font-semibold text-gray-900 mb-1">Paste JSON Data</h4>
                  <p className="text-sm text-gray-600">Paste JSON directly into editor</p>
                </div>
              </button>

              <button
                onClick={() => handleMethodSelect('template')}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex flex-col items-center text-center">
                  <svg className="w-12 h-12 text-purple-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <h4 className="font-semibold text-gray-900 mb-1">Use Template</h4>
                  <p className="text-sm text-gray-600">Start from a pre-built template</p>
                </div>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Enter/Edit Data */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            {importMethod === 'template' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Template</h3>

                {loadingTemplate && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
                      <span className="text-blue-800">Loading template...</span>
                    </div>
                  </div>
                )}

                {parseError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    <p className="font-medium">Error:</p>
                    <p className="text-sm">{parseError}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      disabled={loadingTemplate}
                      className={`w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left ${
                        loadingTemplate ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setStep(1)}
                  disabled={loadingTemplate}
                  className="mt-4 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  ← Back to method selection
                </button>
              </div>
            )}

            {importMethod === 'paste' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Paste JSON Data</h3>
                <textarea
                  value={jsonText}
                  onChange={(e) => handleJSONChange(e.target.value)}
                  className="w-full h-96 p-4 font-mono text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder='{"subject": {"name": "Chemistry", "code": "CHEM", ...}}'
                />

                {parseError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    <p className="font-medium">Parse Error:</p>
                    <p className="text-sm">{parseError}</p>
                  </div>
                )}

                {parsedData && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                    <p className="font-medium">✓ Valid JSON detected</p>
                    <p className="text-sm">
                      Subject: {parsedData.subject.name} ({parsedData.subject.code})
                      {parsedData.chapters && ` - ${parsedData.chapters.length} chapters`}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleProceedToPreview}
                    disabled={!parsedData}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      parsedData
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Preview →
                  </button>
                </div>
              </div>
            )}

            {importMethod === 'upload' && jsonText && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded JSON</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-auto">
                  <pre className="text-sm font-mono">{jsonText}</pre>
                </div>

                {parseError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    <p className="font-medium">Parse Error:</p>
                    <p className="text-sm">{parseError}</p>
                  </div>
                )}

                {parsedData && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                    <p className="font-medium">✓ Valid JSON</p>
                    <p className="text-sm">
                      Subject: {parsedData.subject.name} ({parsedData.subject.code})
                      {parsedData.chapters && ` - ${parsedData.chapters.length} chapters`}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleProceedToPreview}
                    disabled={!parsedData}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      parsedData
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Preview →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && parsedData && (
          <div className="max-w-5xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview & Validate</h3>

            <HierarchyTreeView data={parsedData} />

            {warnings.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-900 mb-2">⚠ Warnings:</p>
                <ul className="list-disc list-inside text-sm text-amber-800">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <button
                onClick={handleStartImport}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Import Subject
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="mb-6">
              {importing ? (
                <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
              ) : errors.length > 0 ? (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : null}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {importing ? 'Importing Subject...' : errors.length > 0 ? 'Import Failed' : 'Processing...'}
            </h3>
            <p className="text-gray-600 mb-6">
              {importing ? 'Please wait while we create your subject hierarchy' : ''}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">{progress}% complete</p>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="font-medium text-red-900 mb-2">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-800">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
                <button
                  onClick={() => setStep(3)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Go Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && result && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h3>
            <p className="text-gray-600 mb-8">
              Subject "{result.subject.name}" has been created successfully
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{result.stats.chaptersCreated}</div>
                <div className="text-sm text-gray-600 mt-1">Chapters</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{result.stats.topicsCreated}</div>
                <div className="text-sm text-gray-600 mt-1">Topics</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{Math.round(result.stats.totalStudyTimeMinutes / 60)}h</div>
                <div className="text-sm text-gray-600 mt-1">Study Time</div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {step < 4 && (
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default SubjectImportWizard;
