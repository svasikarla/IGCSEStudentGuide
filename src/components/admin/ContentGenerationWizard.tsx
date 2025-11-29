import React, { useState, useEffect } from 'react';
import { useSubjects, Subject } from '../../hooks/useSubjects';
import { useChapters } from '../../hooks/useChapters';
import { useTopics, Topic } from '../../hooks/useTopics';
import { useLLMGeneration } from '../../hooks/useLLMGeneration';
import { useTopicListGeneration } from '../../hooks/useLLMGeneration';
import { LLMProvider } from '../../services/llmAdapter';
import LLMProviderSelector from './LLMProviderSelector';
import BulkContentGenerator from './BulkContentGenerator';
import { Chapter } from '../../types/chapter';

interface ContentGenerationWizardProps {
    className?: string;
}

type WizardStep = 'subject' | 'structure' | 'content';

const ContentGenerationWizard: React.FC<ContentGenerationWizardProps> = ({ className = '' }) => {
    const [currentStep, setCurrentStep] = useState<WizardStep>('subject');
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLMProvider.OPENAI);
    const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');

    // Data hooks
    const { subjects, createSubject } = useSubjects();
    const { chapters, fetchChapters: refreshChapters } = useChapters(selectedSubject?.id || null);
    const { topics, fetchTopics: refreshTopics } = useTopics(selectedSubject?.id || null);

    // Generation hooks
    const { generateComprehensiveCurriculum, loading: structureLoading, error: structureError } = useTopicListGeneration();

    const [isCreatingSubject, setIsCreatingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectCode, setNewSubjectCode] = useState('');

    // Local state for structure generation
    const [generatedStructure, setGeneratedStructure] = useState<any[]>([]);
    const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<string>('');

    // Step 1: Subject Selection
    const handleSubjectSelect = (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
            setSelectedSubject(subject);
        }
    };

    const handleCreateSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubjectName || !newSubjectCode) return;

        try {
            const newSubject = await createSubject({
                name: newSubjectName,
                code: newSubjectCode,
                description: `IGCSE ${newSubjectName} Curriculum`,
                grade_levels: [9, 10],
                color_hex: '#3B82F6', // Default blue
                icon_name: 'book',
                display_order: 0
            });

            if (newSubject) {
                setSelectedSubject(newSubject);
                setIsCreatingSubject(false);
            }
        } catch (err) {
            console.error('Failed to create subject:', err);
        }
    };

    // Step 2: Structure Generation
    const handleGenerateStructure = async () => {
        if (!selectedSubject) return;

        setIsGeneratingStructure(true);
        setGenerationProgress('Initializing...');

        try {
            // We'll use the existing hook but with specific IGCSE prompts
            // Note: The hook might need to be updated to accept custom prompts or we rely on its internal logic
            // For now, we'll use the comprehensive generation which we know exists

            const result = await generateComprehensiveCurriculum(
                selectedSubject.name,
                "Grade 9 and 10", // Explicitly targeting IGCSE grades
                selectedProvider,
                selectedModel,
                "Cambridge IGCSE",
                "Extended", // Default to Extended for comprehensive coverage
                false, // Don't generate content yet
                (phase, progress) => setGenerationProgress(`${phase} (${progress}%)`)
            );

            if (result) {
                setGeneratedStructure(result);
                // Refresh data to show what was saved (assuming the hook saves, if not we need to save)
                // The current hook implementation in TopicGeneratorForm saves MANUALLY. 
                // We need to check if generateComprehensiveCurriculum saves or just returns.
                // Looking at TopicGeneratorForm, it returns data and then user clicks save.
                // We should probably save it automatically or give a review step.
                // For this wizard, let's assume we want to review then save.
            }
        } catch (err) {
            console.error('Structure generation failed:', err);
        } finally {
            setIsGeneratingStructure(false);
            setGenerationProgress('');
        }
    };

    // Helper to save generated structure
    const { saveTopics } = useTopics(selectedSubject?.id || null);
    const [isSavingStructure, setIsSavingStructure] = useState(false);

    const handleSaveStructure = async () => {
        if (!selectedSubject || generatedStructure.length === 0) return;

        setIsSavingStructure(true);
        try {
            // Map partial topics to full topic objects for saving
            // Note: The hook returns Partial<Topic>, we need to ensure it matches what saveTopics expects
            const topicsToSave = generatedStructure.map(t => ({
                title: t.title,
                description: t.description || '',
                subject_id: selectedSubject.id,
                syllabus_code: t.syllabus_code,
                difficulty_level: t.difficulty_level || 3,
                estimated_study_time_minutes: t.estimated_study_time_minutes || 60,
                is_published: true
            }));

            await saveTopics(selectedSubject.id, topicsToSave);
            await refreshTopics();
            setCurrentStep('content');
        } catch (err) {
            console.error('Failed to save structure:', err);
        } finally {
            setIsSavingStructure(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden ${className}`}>
            {/* Wizard Header */}
            <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Content Generation Wizard</h2>
                <div className="flex items-center space-x-2 text-sm">
                    <span className={`px-3 py-1 rounded-full ${currentStep === 'subject' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-neutral-500'}`}>1. Subject</span>
                    <span className="text-neutral-300">→</span>
                    <span className={`px-3 py-1 rounded-full ${currentStep === 'structure' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-neutral-500'}`}>2. Structure</span>
                    <span className="text-neutral-300">→</span>
                    <span className={`px-3 py-1 rounded-full ${currentStep === 'content' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-neutral-500'}`}>3. Content</span>
                </div>
            </div>

            <div className="p-6">
                {/* Step 1: Subject Selection */}
                {currentStep === 'subject' && (
                    <div className="space-y-6">
                        <div className="max-w-xl mx-auto">
                            <h3 className="text-xl font-medium text-neutral-900 mb-4 text-center">Select or Create a Subject</h3>

                            {!isCreatingSubject ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">Existing Subjects</label>
                                        <select
                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            value={selectedSubject?.id || ''}
                                            onChange={(e) => handleSubjectSelect(e.target.value)}
                                        >
                                            <option value="">Select a subject...</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-neutral-200"></div>
                                        <span className="flex-shrink-0 mx-4 text-neutral-400 text-sm">OR</span>
                                        <div className="flex-grow border-t border-neutral-200"></div>
                                    </div>

                                    <button
                                        onClick={() => setIsCreatingSubject(true)}
                                        className="w-full py-3 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-500 hover:text-primary-600 transition-colors font-medium"
                                    >
                                        + Create New Subject
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateSubject} className="space-y-4 bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">Subject Name</label>
                                        <input
                                            type="text"
                                            value={newSubjectName}
                                            onChange={(e) => setNewSubjectName(e.target.value)}
                                            placeholder="e.g. Physics"
                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">Subject Code</label>
                                        <input
                                            type="text"
                                            value={newSubjectCode}
                                            onChange={(e) => setNewSubjectCode(e.target.value)}
                                            placeholder="e.g. 0625"
                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div className="flex space-x-3 pt-2">
                                        <button
                                            type="submit"
                                            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 font-medium"
                                        >
                                            Create Subject
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingSubject(false)}
                                            className="flex-1 bg-white border border-neutral-300 text-neutral-700 py-2 rounded-lg hover:bg-neutral-50 font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={() => setCurrentStep('structure')}
                                    disabled={!selectedSubject}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                                >
                                    Next: Structure Generation
                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Structure Generation */}
                {currentStep === 'structure' && selectedSubject && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Settings Panel */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                                    <h3 className="font-medium text-neutral-900 mb-4">Generation Settings</h3>

                                    <div className="space-y-4">
                                        <LLMProviderSelector
                                            selectedProvider={selectedProvider}
                                            selectedModel={selectedModel}
                                            onProviderChange={setSelectedProvider}
                                            onModelChange={setSelectedModel}
                                        />

                                        <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-100">
                                            <strong>Target:</strong> IGCSE Grade 9 & 10<br />
                                            <strong>Board:</strong> Cambridge IGCSE<br />
                                            <strong>Tier:</strong> Extended
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerateStructure}
                                        disabled={isGeneratingStructure || structureLoading}
                                        className="w-full mt-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium flex items-center justify-center"
                                    >
                                        {isGeneratingStructure ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generating...
                                            </>
                                        ) : (
                                            'Generate Structure'
                                        )}
                                    </button>

                                    {generationProgress && (
                                        <p className="text-sm text-neutral-500 mt-2 text-center">{generationProgress}</p>
                                    )}
                                </div>
                            </div>

                            {/* Preview Panel */}
                            <div className="lg:col-span-2">
                                <div className="bg-white border border-neutral-200 rounded-lg h-[500px] flex flex-col">
                                    <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                                        <h3 className="font-medium text-neutral-900">Curriculum Structure Preview</h3>
                                        <span className="text-sm text-neutral-500">
                                            {generatedStructure.length > 0 ? `${generatedStructure.length} Topics Generated` : 'No topics generated yet'}
                                        </span>
                                    </div>

                                    <div className="flex-grow overflow-y-auto p-4">
                                        {generatedStructure.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                                                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                <p>Click "Generate Structure" to build the curriculum tree</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {generatedStructure.map((topic, idx) => (
                                                    <div key={idx} className="p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium text-neutral-900">{topic.title}</h4>
                                                                <p className="text-sm text-neutral-500">{topic.description}</p>
                                                            </div>
                                                            <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                                                                {topic.syllabus_code || 'No Code'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-end space-x-3">
                                        <button
                                            onClick={() => setCurrentStep('subject')}
                                            className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-white font-medium"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleSaveStructure}
                                            disabled={generatedStructure.length === 0 || isSavingStructure}
                                            className="px-6 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 font-medium flex items-center"
                                        >
                                            {isSavingStructure ? 'Saving...' : 'Save & Continue to Content'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Content Generation */}
                {currentStep === 'content' && selectedSubject && (
                    <div className="space-y-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-green-800 font-medium">Structure saved successfully! Now let's generate content.</span>
                            </div>
                        </div>

                        <BulkContentGenerator
                            topics={topics}
                            subjectName={selectedSubject.name}
                            gradeLevel="Grade 9-10"
                            initialProvider={selectedProvider}
                            initialModel={selectedModel}
                            onComplete={() => {
                                // Optional: Show completion celebration or redirect
                            }}
                        />

                        <div className="mt-8 flex justify-start">
                            <button
                                onClick={() => setCurrentStep('structure')}
                                className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium mr-auto"
                            >
                                Back to Structure
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentGenerationWizard;
