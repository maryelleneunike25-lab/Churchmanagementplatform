import { useEffect, useState } from 'react';
import { publicGet } from './api';

export const FOUNDED_YEAR = 1993;
export const yearsServing = () => new Date().getFullYear() - FOUNDED_YEAR;

/** Live aggregate numbers (jemaat, komsel) for the public site; null until loaded or if unavailable. */
export function useChurchStats() {
  const [stats, setStats] = useState<{ members: number; komsel: number } | null>(null);
  useEffect(() => {
    publicGet('/api/content/stats').then(d => { if (d.success) setStats({ members: d.members, komsel: d.komsel }); }).catch(() => {});
  }, []);
  return stats;
}
