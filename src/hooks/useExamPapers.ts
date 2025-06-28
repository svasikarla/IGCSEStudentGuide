import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types for our exam paper data structure
export interface ExamPaperQuestion {
  id: string;
  question_text: string;
  marks: number;
  answer_text?: string;
  explanation?: string;
  question_order: number;
}

export interface ExamPaper {
  id: string;
  total_marks: 20 | 50;
  generated_at: string;
  topic_title?: string; // Optional: for history list
  questions: ExamPaperQuestion[];
}

export interface PaperHistoryItem {
  id: string;
  total_marks: 20 | 50;
  generated_at: string;
  topic_title: string;
  submission_status?: 'PENDING' | 'EVALUATED' | 'ERROR' | null;
  submission_score?: number | null;
  ocr_raw_text?: string | null;
}

export function useExamPapers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePaper = useCallback(async (topicId: string, totalMarks: 20 | 50) => {
    if (!user) {
      setError('You must be logged in to generate a paper.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('generate_exam_paper', {
        p_user_id: user.id,
        p_topic_id: topicId,
        p_total_marks: totalMarks,
      });

      if (rpcError) {
        throw rpcError;
      }

      return data; // This will be the new exam paper's ID
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Error generating exam paper:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getPaperDetails = useCallback(async (paperId: string): Promise<ExamPaper | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('user_exam_papers')
        .select(`
          id,
          total_marks,
          generated_at,
          user_exam_paper_questions(
            question_order,
            exam_questions(*)
          )
        `)
        .eq('id', paperId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Format the data into our desired structure
      const formattedPaper: ExamPaper = {
        id: data.id,
        total_marks: data.total_marks,
        generated_at: data.generated_at,
        questions: data.user_exam_paper_questions
          .map((pq: any) => ({ // Using any here for simplicity, consider defining a type for the raw query result
            ...pq.exam_questions,
            question_order: pq.question_order,
          }))
          .sort((a, b) => a.question_order - b.question_order),
      };

      return formattedPaper;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Error fetching paper details:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPaperHistory = useCallback(async (): Promise<PaperHistoryItem[]> => {
    if (!user) return [];

    setLoading(true);
    setError(null);
    try {
      // First, get the user's exam papers
      const { data: paperData, error: paperError } = await supabase
        .from('user_exam_papers')
        .select(`
          id,
          total_marks,
          generated_at,
          topics!topic_id(title)
        `)
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (paperError) throw paperError;

      // Then, get any submissions for these papers
      const paperIds = paperData.map((p: any) => p.id);
      
      let submissionsData: any[] = [];
      if (paperIds.length > 0) {
        const { data: subData, error: subError } = await supabase
          .from('user_exam_submissions')
          .select('exam_paper_id, created_at, total_score, evaluation, ocr_raw_text')
          .in('exam_paper_id', paperIds);
          
        if (subError) throw subError;
        submissionsData = subData || [];
      }
      
      // Map the papers with their submissions
      return paperData.map((p: any) => {
        // Find submissions for this paper
        const paperSubmissions = submissionsData.filter((s: any) => s.exam_paper_id === p.id);
        
        // Find the most recent submission if any
        const latestSubmission = paperSubmissions.length > 0
          ? paperSubmissions.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;

        return {
          id: p.id,
          total_marks: p.total_marks,
          generated_at: p.generated_at,
          topic_title: p.topics?.title ?? 'Unknown Topic',
          submission_status: latestSubmission?.evaluation ?? null,
          submission_score: latestSubmission?.total_score,
          ocr_raw_text: latestSubmission?.ocr_raw_text,
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Error fetching paper history:', errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const uploadAnswerSheet = useCallback(async (paperId: string, file: File): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to upload an answer sheet.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Define the file path. Use a unique name to prevent collisions.
      const fileExtension = file.name.split('.').pop();
      const filePath = `${user.id}/${paperId}-${Date.now()}.${fileExtension}`;

      // 2. Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('answer_sheets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Do not upsert, as we want a new record for each submission attempt
          metadata: {}, // Explicitly set empty metadata to ensure valid JSON
        });

      if (uploadError) {
        throw new Error(`Storage Error: ${uploadError.message}`);
      }

      // 3. Create a submission record in the database
      // Use upsert to handle cases where a user re-uploads an answer sheet for the same paper
      const { error: dbError } = await supabase
        .from('user_exam_submissions')
        .upsert({
          user_id: user.id,
          exam_paper_id: paperId,
          file_path: filePath,
        }, {
          onConflict: 'user_id, exam_paper_id'
        });

      if (dbError) {
        // If upsert fails, try to remove the orphaned file from storage
        await supabase.storage.from('answer_sheets').remove([filePath]);
        throw new Error(`Database Error: ${dbError.message}`);
      }

      // 4. Directly invoke the Edge Function to process the uploaded file
      try {
        console.log('Invoking Edge Function for OCR processing...');
        
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || '';
        
        const functionResponse = await fetch(
          'https://yznyaczemseqkpydwetn.supabase.co/functions/v1/evaluate-answer-sheet',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              record: { name: filePath }
            })
          }
        );

        if (!functionResponse.ok) {
          const errorData = await functionResponse.json();
          console.warn('Edge Function invocation warning:', errorData);
          // Don't throw here - we still want to return success for the upload
        } else {
          const result = await functionResponse.json();
          console.log('OCR processing initiated:', result);
        }
      } catch (functionError) {
        // Log the error but don't fail the upload process
        console.error('Error invoking Edge Function:', functionError);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during upload.';
      console.error('Error uploading answer sheet:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { generatePaper, getPaperDetails, getPaperHistory, uploadAnswerSheet, loading, error };
}
