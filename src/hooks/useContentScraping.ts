import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface ScrapingJob {
  id: string;
  status: 'starting' | 'running' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  startTime: string;
  endTime?: string;
  error?: string;
  type?: 'scraping' | 'processing';
}

export interface ScrapingResult {
  url: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface ScrapingJobDetails extends ScrapingJob {
  results?: ScrapingResult[];
}

export interface StartScrapingParams {
  sources: string[];
  sourceType: string;
  subject?: string;
  subjectId?: string;
  topicId?: string;
  topicName?: string;
  syllabusCode?: string;
  difficultyLevel?: number;
  generateQuestions?: boolean;
  generateFlashcards?: boolean;
}

export function useContentScraping() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }, [session]);

  /**
   * Start a new scraping job
   */
  const startScraping = useCallback(async (params: StartScrapingParams): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/scraping/trigger', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        return data.jobId;
      } else {
        throw new Error(data.error || 'Failed to start scraping');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error starting scraping:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Start content processing job
   */
  const startProcessing = useCallback(async (contentIds?: string[]): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/scraping/process', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contentIds })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        return data.jobId;
      } else {
        throw new Error(data.error || 'Failed to start processing');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error starting processing:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Get job status
   */
  const getJobStatus = useCallback(async (jobId: string): Promise<ScrapingJobDetails | null> => {
    try {
      const response = await fetch(`http://localhost:3001/api/scraping/status/${jobId}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        return data.job;
      } else {
        throw new Error(data.error || 'Failed to get job status');
      }
    } catch (err) {
      console.error('Error getting job status:', err);
      return null;
    }
  }, [getAuthHeaders]);

  /**
   * Get all jobs
   */
  const getAllJobs = useCallback(async (): Promise<ScrapingJob[]> => {
    try {
      const response = await fetch('http://localhost:3001/api/scraping/jobs', {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        return data.jobs;
      } else {
        throw new Error(data.error || 'Failed to get jobs');
      }
    } catch (err) {
      console.error('Error getting jobs:', err);
      return [];
    }
  }, [getAuthHeaders]);

  /**
   * Poll job status until completion
   */
  const pollJobStatus = useCallback(async (
    jobId: string,
    onUpdate: (job: ScrapingJobDetails) => void,
    intervalMs: number = 2000
  ): Promise<ScrapingJobDetails | null> => {
    return new Promise((resolve) => {
      const poll = async () => {
        const job = await getJobStatus(jobId);
        if (job) {
          onUpdate(job);
          
          if (job.status === 'completed' || job.status === 'failed') {
            resolve(job);
            return;
          }
        }
        
        setTimeout(poll, intervalMs);
      };
      
      poll();
    });
  }, [getJobStatus]);

  return {
    loading,
    error,
    startScraping,
    startProcessing,
    getJobStatus,
    getAllJobs,
    pollJobStatus
  };
}
