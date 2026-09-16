import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

export interface Komsel {
  id: string;
  name: string;
  pksName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  leaderId: string | null;
  memberCount?: number;
  memberDetails?: any[];
}

export function normalizePksName(input: string): string {
  if (!input) return '';
  return input
    .toUpperCase()
    .replace(/^PKS\s*/i, '') // Remove leading PKS
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export function useKomsels() {
  const [komsels, setKomsels] = useState<Komsel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKomsels = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`${API_URL}/komsel/list`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load komsels');
      const result = await res.json();
      
      if (result.success && result.data) {
        setKomsels(result.data);
      }
    } catch (e) {
      console.error('Error fetching komsels:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKomsels();
  }, []);

  return { komsels, loading, refetch: fetchKomsels };
}
