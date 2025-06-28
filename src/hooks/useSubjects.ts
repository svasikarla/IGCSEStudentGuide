import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  color_hex: string;
  icon_name: string;
  display_order: number;
  grade_levels: number[];
  created_at?: string;
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) {
          throw new Error(error.message);
        }
        
        setSubjects(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  return { subjects, loading, error };
}
