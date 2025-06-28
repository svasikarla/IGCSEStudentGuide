import React, { useState } from 'react';
import { ExamPaper } from '../hooks/useExamPapers';
import PrintablePaper from './PrintablePaper';

interface PrintPreviewProps {
  paper: ExamPaper;
  subjectName?: string;
  topicTitle?: string;
  timeAllocation?: string;
  instructions?: string[];
}

const PrintPreview: React.FC<PrintPreviewProps> = (props) => {
  const [showPreview, setShowPreview] = useState(false);

  if (!showPreview) {
    return (
      <div className="text-center py-8">
        <button
          onClick={() => setShowPreview(true)}
          className="px-6 py-3 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 transition-colors font-medium shadow-soft"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Print Layout
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-neutral-900">Print Preview</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            A4 Format
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(false)}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* Print Preview Container */}
      <div className="bg-gray-100 p-8 rounded-xl">
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg">
          <PrintablePaper {...props} />
        </div>
      </div>

      {/* Print Tips */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
        <h4 className="font-semibold text-blue-900 mb-2">Print Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use A4 paper size for best results</li>
          <li>• Ensure margins are set to "Normal" or "Default"</li>
          <li>• Print in portrait orientation</li>
          <li>• Use black and white printing to save ink</li>
          <li>• Check print preview in your browser before printing</li>
        </ul>
      </div>
    </div>
  );
};

export default PrintPreview;
