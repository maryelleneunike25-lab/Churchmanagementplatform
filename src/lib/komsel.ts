import { useState, useEffect, useCallback } from 'react';
import { EdgeKV } from './edgeKvClient';

// Single source of truth is the app_kv store (same one Data Jemaat and Komisi write to).
const KV = 'app_kv';
const DEFAULT_PKS_NAMES = ['Sisca', 'Sandy', 'Damli', 'Risan', 'Gina Jaya', 'Willis', 'Merry', 'Ping & Hadi', 'Christopher'];

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
  /** true when the PKS exists only because of config/members and has no saved komsel record yet */
  virtual?: boolean;
}

export function normalizePksName(input: string): string {
  if (!input) return '';
  return input
    .toUpperCase()
    .replace(/^PKS\s*/i, '') // Remove leading PKS
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/** Loads congregation members from both key formats, deduplicated by id. */
export async function loadAllMembers(): Promise<any[]> {
  const [a, b] = await Promise.all([
    EdgeKV.from(KV).select('key,value').like('key', 'congregation:member:%'),
    EdgeKV.from(KV).select('key,value').like('key', 'member:%'),
  ]);
  const byId = new Map<string, any>();
  for (const row of [...(a.data || []), ...(b.data || [])]) {
    const v = row?.value;
    if (!v?.name) continue;
    const id = v.id || row.key;
    if (!byId.has(id) || row.key.startsWith('congregation:member:')) byId.set(id, { ...v, id });
  }
  return [...byId.values()];
}

/** Every distinct PKS name: the configured list plus any PKS found on members. */
export async function loadPksNames(members?: any[]): Promise<string[]> {
  const { data } = await EdgeKV.from(KV).select('value').eq('key', 'config:pks-names').maybeSingle();
  const configured: string[] = Array.isArray(data?.value) ? data.value : DEFAULT_PKS_NAMES;
  const seen = new Set(configured.map(normalizePksName));
  const names = [...configured];
  for (const m of members || []) {
    const n = normalizePksName(m.pksName || '');
    if (n && !seen.has(n)) { seen.add(n); names.push(m.pksName.trim()); }
  }
  return names;
}

export function useKomsels() {
  const [komsels, setKomsels] = useState<Komsel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKomsels = useCallback(async () => {
    try {
      const [{ data: rows }, members] = await Promise.all([
        EdgeKV.from(KV).select('key,value').like('key', 'komsel:%'),
        loadAllMembers(),
      ]);
      const saved: Komsel[] = (rows || []).map((r: any) => r.value).filter((v: any) => v?.id);
      const pksNames = await loadPksNames(members);

      // A saved komsel record wins; otherwise show the PKS as a virtual entry so no group is ever missing.
      const savedKeys = new Set(saved.map(k => normalizePksName(k.pksName || k.name)));
      const virtual: Komsel[] = pksNames
        .filter(n => !savedKeys.has(normalizePksName(n)))
        .map(n => ({
          id: `virtual:${normalizePksName(n)}`,
          name: n,
          pksName: n,
          status: 'active',
          createdAt: '',
          updatedAt: '',
          createdBy: '',
          leaderId: null,
          virtual: true,
        }));

      const all = [...saved, ...virtual]
        .map(k => {
          const key = normalizePksName(k.pksName || k.name);
          const memberDetails = members.filter(m => normalizePksName(m.pksName || '') === key);
          return { ...k, memberDetails, memberCount: memberDetails.length };
        })
        .sort((x, y) => (x.pksName || x.name).localeCompare(y.pksName || y.name));

      setKomsels(all);
    } catch (e) {
      console.error('Error fetching komsels:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKomsels();
  }, [fetchKomsels]);

  return { komsels, loading, refetch: fetchKomsels };
}

export async function saveKomsel(
  form: { pksName: string; name: string; status: string },
  existing: Komsel | null,
  createdBy = ''
): Promise<void> {
  const now = new Date().toISOString();
  const isNew = !existing || existing.virtual;
  const id = isNew ? crypto.randomUUID() : existing!.id;
  const value = {
    id,
    name: form.name.trim(),
    pksName: form.pksName.trim(),
    status: form.status,
    createdAt: isNew ? now : existing!.createdAt,
    updatedAt: now,
    createdBy: isNew ? createdBy : existing!.createdBy,
    leaderId: existing?.leaderId ?? null,
  };
  const { error } = isNew
    ? await EdgeKV.from(KV).insert({ key: `komsel:${id}`, value })
    : await EdgeKV.from(KV).update({ value }).eq('key', `komsel:${id}`);
  if (error) throw error;
}

export async function deleteKomsel(id: string): Promise<void> {
  const { error } = await EdgeKV.from(KV).delete().eq('key', `komsel:${id}`);
  if (error) throw error;
}
