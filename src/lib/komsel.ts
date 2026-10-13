import { useState, useEffect, useCallback } from 'react';
import { EdgeKV } from './edgeKvClient';

// Single source of truth is the app_kv store (same one Data Jemaat and Komisi write to).
const KV = 'app_kv';
export const DEFAULT_PKS_NAMES = ['Sisca', 'Sandy', 'Damli', 'Risan', 'Gina Jaya', 'Merry', 'Hadi & Pink', 'Christopher'];

export interface PksLeaderContact {
  name: string;
  phone: string;
  role?: string;
}

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

export interface PksPlot {
  id: string;
  pksId?: string;
  pksName: string;
  room: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'active' | 'berhalangan' | 'completed';
  notes?: string;
  leaders: PksLeaderContact[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PlotConflict {
  plotA: PksPlot;
  plotB: PksPlot;
  room: string;
  date: string;
  message: string;
}

export const STANDARD_ROOMS = [
  'Ruang Serbaguna',
  'Ruang Konseling',
  'Ruang Remaja',
  'Ruang Anak',
  'Ruang Musik',
  'Ruang Rapat',
  'Sanctuary / Main Hall',
  'Ruang PKS 1',
  'Ruang PKS 2',
];

/** Loads rooms from config:rooms in KV store, falling back to STANDARD_ROOMS */
export async function loadRooms(): Promise<string[]> {
  try {
    const { data } = await EdgeKV.from(KV).select('value').eq('key', 'config:rooms').maybeSingle();
    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      return data.value;
    }
  } catch (err) {
    console.error('Error loading rooms:', err);
  }
  return [...STANDARD_ROOMS];
}

/** Saves rooms to config:rooms in KV store */
export async function saveRooms(rooms: string[]): Promise<void> {
  const { error } = await EdgeKV.from(KV).update({ value: rooms }).eq('key', 'config:rooms');
  if (error) {
    const { error: insError } = await EdgeKV.from(KV).insert({ key: 'config:rooms', value: rooms });
    if (insError) throw insError;
  }
}

export const KNOWN_PKS_LEADERS: Record<string, PksLeaderContact[]> = {
  'NAOMI': [
    { name: 'Naomi Ikarani S.', phone: '089517472022', role: 'Ketua PKS' }
  ],
  'NAOMI IKARANI S.': [
    { name: 'Naomi Ikarani S.', phone: '089517472022', role: 'Ketua PKS' }
  ],
  'NAOMI IKARANI': [
    { name: 'Naomi Ikarani S.', phone: '089517472022', role: 'Ketua PKS' }
  ],
  'NAOMI NATALIA': [
    { name: 'Naomi Natalia', phone: '081807480352', role: 'Ketua PKS' }
  ],
  'PINK': [
    { name: 'Elizabeth Damaira (Pink)', phone: '081807754691', role: 'Ketua PKS' },
    { name: 'Hadi Susanto', phone: '08111137289', role: 'Ketua PKS' }
  ],
  'HADI & PINK': [
    { name: 'Elizabeth Damaira (Pink)', phone: '081807754691', role: 'Ketua PKS' },
    { name: 'Hadi Susanto', phone: '08111137289', role: 'Ketua PKS' }
  ],
  'PING & HADI': [
    { name: 'Elizabeth Damaira (Pink)', phone: '081807754691', role: 'Ketua PKS' },
    { name: 'Hadi Susanto', phone: '08111137289', role: 'Ketua PKS' }
  ],
  'STEFFANY & SINCO': [
    { name: 'Steffany Mei Hun', phone: '081513005955', role: 'Ketua PKS' },
    { name: 'Halim Sinco Sudi', phone: '08161114994', role: 'Ketua PKS' }
  ],
  'SISCA': [
    { name: 'Sisca', phone: '081315867494', role: 'Ketua PKS' }
  ],
  'WILIS WIHARTATI': [
    { name: 'Wilis Wihartarti The', phone: '081519113144', role: 'Ketua PKS' }
  ],
  'DAMLI & RETNA': [
    { name: 'Damli Husni', phone: '087782790903', role: 'Ketua PKS' }
  ],
  'DAMLI': [
    { name: 'Damli Husni', phone: '087782790903', role: 'Ketua PKS' }
  ],
  'RISAN': [
    { name: 'Risan Sutanto', phone: '087808780025', role: 'Ketua PKS' }
  ],
  'AGUS DURANTES': [
    { name: 'Agus Durantes', phone: '081298427200', role: 'Ketua PKS' }
  ],
  'ANDRES': [
    { name: 'Andres', phone: '081310004283', role: 'Ketua PKS' }
  ],
  'BUDI HARMANTO & SUMY': [
    { name: 'Budi Harmanto', phone: '08111315699', role: 'Ketua PKS' }
  ],
  'PAULUS': [
    { name: 'Paulus Widyanto', phone: '08990092036', role: 'Ketua PKS' }
  ],
  'LISNI': [
    { name: 'Lisni Sutijono', phone: '089693616605', role: 'Ketua PKS' }
  ],
  'NINI': [
    { name: 'Nini', phone: '081314670235', role: 'Ketua PKS' }
  ],
  'MARIANI': [
    { name: 'Mariani', phone: '081314150696', role: 'Ketua PKS' }
  ],
  'LUCKY ANDRE': [
    { name: 'Lucky Andreas Wairissal', phone: '085692165007', role: 'Ketua PKS' }
  ],
  'MARCELLO': [
    { name: 'Marcello Wong', phone: '082298694909', role: 'Ketua PKS' }
  ],
  'CHRISTOPHER': [
    { name: 'Christopher Alexander', phone: '08953360000000', role: 'Ketua PKS' }
  ],
  'MERRY': [
    { name: 'Merry', phone: '', role: 'Ketua PKS' }
  ]
};

export function normalizePksName(input: string): string {
  if (!input) return '';
  return input
    .toUpperCase()
    .replace(/^PKS\s*/i, '') // Remove leading PKS
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/** Resolves known or detected leaders for a PKS. Strict matching prevents unwanted similar names from leaking. */
export function getLeadersForPks(
  pksName: string,
  allMembers?: any[],
  explicitLeaders?: PksLeaderContact[]
): PksLeaderContact[] {
  // If explicitly chosen leaders are provided and valid, return them directly
  if (explicitLeaders && explicitLeaders.length > 0) {
    const valid = explicitLeaders.filter(l => l && l.name && l.name.trim());
    if (valid.length > 0) return valid;
  }

  const rawPks = (pksName || '').trim();
  const cleanPks = rawPks.replace(/^PKS\s*/i, '').trim();
  if (!cleanPks) return [];

  // Split multi-leader names if any: e.g. "Budi & Merry", "Budi / Merry", "Budi, Merry", "Budi dan Merry"
  const nameParts = cleanPks
    .split(/\s*(?:&|\/|,|\bdan\b)\s*/i)
    .map(p => p.trim())
    .filter(Boolean);

  const resolved: PksLeaderContact[] = [];

  for (const part of nameParts) {
    const normPart = normalizePksName(part);

    // 1. Check exact match in KNOWN_PKS_LEADERS first
    if (KNOWN_PKS_LEADERS[normPart]) {
      resolved.push(...KNOWN_PKS_LEADERS[normPart]);
      continue;
    }

    // 2. Strict matching against allMembers
    let memberMatch: any = null;
    if (allMembers && allMembers.length > 0) {
      // Priority A: Exact full name match (case-insensitive)
      memberMatch = allMembers.find(m => (m.name || '').trim().toLowerCase() === part.toLowerCase());

      // Priority B: Exact normalized match
      if (!memberMatch) {
        memberMatch = allMembers.find(m => normalizePksName(m.name || '') === normPart);
      }

      // Priority C: If name has multiple words (e.g. "Naomi Ikarani"), member name must contain ALL constituent words
      if (!memberMatch && part.includes(' ')) {
        const words = part.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        memberMatch = allMembers.find(m => {
          const mLower = (m.name || '').toLowerCase();
          return words.every(w => mLower.includes(w));
        });
      }
    }

    if (memberMatch) {
      resolved.push({
        name: memberMatch.name,
        phone: memberMatch.phone || (Array.isArray(memberMatch.phones) ? memberMatch.phones[0] : '') || '',
        role: resolved.length === 0 ? 'Ketua PKS' : 'Wakil / Co-Leader',
      });
      continue;
    }

    // 3. Fallback: use the provided name directly
    resolved.push({
      name: part,
      phone: '',
      role: resolved.length === 0 ? 'Ketua PKS' : 'Wakil / Co-Leader',
    });
  }

  // Deduplicate leaders by name
  const seen = new Set<string>();
  const finalLeaders: PksLeaderContact[] = [];
  for (const l of resolved) {
    const key = l.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      finalLeaders.push(l);
    }
  }

  return finalLeaders.length > 0 ? finalLeaders : [{ name: cleanPks, phone: '', role: 'Ketua PKS' }];
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
  const names = new Map<string, string>();
  for (const name of configured) {
    const key = normalizePksName(name);
    if (key && !names.has(key)) names.set(key, String(name).replace(/^PKS\s*/i, '').trim());
  }

  // Include explicitly-created PKS groups that are genuine records
  const { data: rows } = await EdgeKV.from(KV).select('value').like('key', 'komsel:%');
  for (const row of rows || []) {
    if (!row.value || !row.value.id || row.value.raw_value) continue; // Skip legacy pointers
    const name = String(row.value?.pksName || row.value?.name || '').trim();
    const key = normalizePksName(name);
    if (key && !names.has(key)) names.set(key, name.replace(/^PKS\s*/i, '').trim());
  }
  for (const member of members || []) {
    const name = String(member.pksName || '').trim();
    const key = normalizePksName(name);
    if (key && !names.has(key)) names.set(key, name.replace(/^PKS\s*/i, '').trim());
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'id'));
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
      const saved: Komsel[] = (rows || [])
        .map((r: any) => r.value)
        .filter((v: any) => v?.id && !v.raw_value);

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
  form: { pksName: string; name: string; status: string; leaders?: PksLeaderContact[] },
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
    leaders: form.leaders || existing?.leaders || [],
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

export async function deleteKomsel(id: string, pksName?: string): Promise<void> {
  const normalized = normalizePksName(pksName || '');

  // 1. Delete by direct ID if not virtual
  if (id && !id.startsWith('virtual:')) {
    await EdgeKV.from(KV).delete().eq('key', `komsel:${id}`);
  }

  // 2. Also search and delete any matching records in komsel:% (including legacy pointers, duplicates)
  if (normalized) {
    const { data: rows } = await EdgeKV.from(KV).select('key,value').like('key', 'komsel:%');
    for (const r of rows || []) {
      const rowPks = normalizePksName(r.value?.pksName || r.value?.name || '');
      const keySuffix = normalizePksName(r.key.replace(/^komsel:(pks:)?/, ''));
      if (rowPks === normalized || keySuffix === normalized || (r.value?.id && r.value.id === id)) {
        await EdgeKV.from(KV).delete().eq('key', r.key);
      }
    }

    // 3. Clear member assignments
    const members = await loadAllMembers();
    for (const member of members.filter(m => normalizePksName(m.pksName || '') === normalized)) {
      await setMemberPks(member.id, '');
    }

    // 4. Update config:pks-names
    const { data } = await EdgeKV.from(KV).select('value').eq('key', 'config:pks-names').maybeSingle();
    const configured: string[] = Array.isArray(data?.value) ? data.value : DEFAULT_PKS_NAMES;
    const remaining = configured.filter((name: string) => normalizePksName(name) !== normalized);
    await EdgeKV.from(KV).update({ value: remaining }).eq('key', 'config:pks-names');
  }
}

/** Assigns (or clears, with an empty name) the PKS of one congregation member. */
export async function setMemberPks(memberId: string, pksName: string): Promise<void> {
  for (const key of [`congregation:member:${memberId}`, `member:${memberId}`]) {
    const { data } = await EdgeKV.from(KV).select('value').eq('key', key).maybeSingle();
    if (!data?.value) continue;
    const value = { ...data.value, pksName: pksName.trim() || '', updatedAt: new Date().toISOString() };
    const { error } = await EdgeKV.from(KV).update({ value }).eq('key', key);
    if (error) throw error;
    return;
  }
  throw new Error('Data jemaat tidak ditemukan');
}

// -------------------------------------------------------------
// PKS Plotting (Ruangan, Tanggal, Jam & Deteksi Konflik)
// -------------------------------------------------------------

export async function loadAllPlots(): Promise<PksPlot[]> {
  const { data } = await EdgeKV.from(KV).select('key,value').like('key', 'pks_plot:%');
  const list: PksPlot[] = (data || [])
    .map((r: any) => r.value)
    .filter((v: any) => v && v.id && v.date);
  return list.sort((a, b) => {
    const cmp = (a.date || '').localeCompare(b.date || '');
    if (cmp !== 0) return cmp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
}

export async function savePlot(
  plot: Partial<PksPlot> & { pksName: string; room: string; date: string; startTime: string; endTime: string },
  createdBy = ''
): Promise<PksPlot> {
  const now = new Date().toISOString();
  const isNew = !plot.id;
  const id = plot.id || crypto.randomUUID();
  const fullPlot: PksPlot = {
    id,
    pksId: plot.pksId,
    pksName: plot.pksName.trim(),
    room: plot.room.trim(),
    date: plot.date,
    startTime: plot.startTime,
    endTime: plot.endTime,
    status: plot.status || 'active',
    notes: plot.notes || '',
    leaders: plot.leaders && plot.leaders.length > 0 ? plot.leaders : getLeadersForPks(plot.pksName),
    createdAt: isNew ? now : (plot.createdAt || now),
    updatedAt: now,
    createdBy: isNew ? createdBy : (plot.createdBy || createdBy),
  };

  const { error } = await EdgeKV.from(KV).update({ value: fullPlot }).eq('key', `pks_plot:${id}`);
  if (error) throw error;
  return fullPlot;
}

export async function deletePlot(id: string): Promise<void> {
  const { error } = await EdgeKV.from(KV).delete().eq('key', `pks_plot:${id}`);
  if (error) throw error;
}

export async function setPlotStatus(id: string, status: 'active' | 'berhalangan' | 'completed'): Promise<void> {
  const { data } = await EdgeKV.from(KV).select('value').eq('key', `pks_plot:${id}`).maybeSingle();
  if (!data?.value) throw new Error('Data plotting tidak ditemukan');
  const updated: PksPlot = { ...data.value, status, updatedAt: new Date().toISOString() };
  const { error } = await EdgeKV.from(KV).update({ value: updated }).eq('key', `pks_plot:${id}`);
  if (error) throw error;
}

/** Detects all room conflicts between active plots (only checks room conflict) */
export function detectPlotConflicts(plots: PksPlot[]): PlotConflict[] {
  const conflicts: PlotConflict[] = [];
  const active = plots.filter(p => p.status === 'active');

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.room.trim().toLowerCase() !== b.room.trim().toLowerCase()) continue;

      conflicts.push({
        plotA: a,
        plotB: b,
        room: a.room,
        date: a.date,
        message: `Konflik Ruangan ${a.room}: Digunakan oleh PKS ${a.pksName} dan PKS ${b.pksName}`,
      });
    }
  }

  return conflicts;
}
