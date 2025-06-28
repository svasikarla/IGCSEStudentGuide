import React, { useState, useCallback } from 'react';
import { useExamPapers } from '../hooks/useExamPapers';

interface AnswerSheetUploaderProps {
  paperId: string;
  onUploadComplete: () => void; // Callback to refresh history or give feedback
}

const AnswerSheetUploader: React.FC<AnswerSheetUploaderProps> = ({ paperId, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uploadAnswerSheet } = useExamPapers();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setError(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    const success = await uploadAnswerSheet(paperId, file);

    setUploading(false);

    if (success) {
      setFile(null);
      onUploadComplete();
    } else {
      setError('Upload failed. Please try again.');
    }
  }, [file, paperId, uploadAnswerSheet, onUploadComplete]);

  return (
    <div className="flex items-center space-x-2 mt-2">
      <input
        type="file"
        onChange={handleFileChange}
        accept=".pdf,image/*"
        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
        disabled={uploading}
      />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default AnswerSheetUploader;
