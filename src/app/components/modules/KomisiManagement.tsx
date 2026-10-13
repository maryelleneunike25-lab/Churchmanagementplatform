import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { EdgeKV as supabaseAdmin } from '../../../lib/edgeKvClient';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '/utils/supabase/info';
import { getAge, getAgeGroup, AGE_GROUP_STYLES } from '../../../lib/age';
import KomisiReport from './KomisiReport';
import {
  Users, Plus, Trash2, Edit2, X, Check, ChevronDown, AlertTriangle,
  ClipboardList, Download, Calendar, UserCheck, UserX, Link, Unlink,
  Search, RefreshCw, ShieldAlert, Info, Activity, Circle, Save,
} from 'lucide-react';

const KV = 'kv_store_561004a0';
const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

export const KOMISI_LIST = [
  { id: 'sekolah-minggu', label: 'Sekolah Minggu',          color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'teens',          label: 'Teens',                   color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'wbi',            label: 'Wanita Bethel Indonesia',  color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'vessel',         label: 'Vessel Youth Community',   color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'koemas',         label: 'Koemas',                   color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'kompas',         label: 'Komunitas Pasutri',        color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'kowari',         label: 'Komunitas Wanita Mandiri', color: 'bg-rose-100 text-rose-800 border-rose-200' },
] as const;

export type KomisiId = typeof KOMISI_LIST[number]['id'];
type Tab = 'anggota' | 'absensi' | 'laporan';

export interface KomisiMember {
  id: string;
  name: string;
  phone: string;
  address?: string;
  birthDate?: string;
  role?: 'anggota' | 'pengurus' | 'guru';
  joinedAt: string;
  jemaatId?: string;
  komisiId: KomisiId;
}

interface AbsenSession {
  id: string;
  komisiId: KomisiId;
  title: string;
  date: string;
  createdAt: string;
  presentIds: string[];
  absentIds: string[];
}

interface JemaatMember {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  role?: 'anggota' | 'pengurus' | 'guru';
}

interface MatchResult {
  jemaat: JemaatMember;
  score: number;
  reasons: string[];
}

// ── Matching algorithm ────────────────────────────────────────────────────────
function calcMatchScore(
  candidate: { name: string; phone?: string; address?: string; birthDate?: string },
  jemaat: JemaatMember
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  const cName = candidate.name.toLowerCase().trim();
  const jName = jemaat.name.toLowerCase().trim();

  if (cName === jName) { score += 50; reasons.push('nama sama persis'); }
  else if (cName.includes(jName) || jName.includes(cName)) { score += 25; reasons.push('nama mirip'); }
  else {
    const cWords = cName.split(' ').filter(w => w.length > 2);
    const jWords = jName.split(' ').filter(w => w.length > 2);
    const overlap = cWords.filter(w => jWords.includes(w)).length;
    if (overlap >= 2) { score += 20; reasons.push(`${overlap} kata nama cocok`); }
    else if (overlap === 1) { score += 8; }
  }

  if (candidate.birthDate && jemaat.birthDate && candidate.birthDate === jemaat.birthDate) {
    score += 40; reasons.push('tanggal lahir sama');
  }

  if (candidate.phone && jemaat.phone) {
    const pC = candidate.phone.replace(/\D/g, '').slice(-8);
    const pJ = jemaat.phone.replace(/\D/g, '').slice(-8);
    if (pC.length >= 6 && pC === pJ) { score += 20; reasons.push('nomor HP sama'); }
  }

  if (candidate.address && jemaat.address) {
    const aC = candidate.address.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 25);
    const aJ = jemaat.address.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 25);
    if (aC.length > 8 && aJ.includes(aC.slice(0, 15))) { score += 15; reasons.push('alamat cocok'); }
  }

  return { jemaat, score, reasons };
}

function formatDate(iso: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The Sunday that ends the current Mon–Sun week (today if it is Sunday). Attendance resets every Monday. */
function currentWeekSunday(): string {
  const d = new Date();
  if (d.getDay() === 0 && d.getHours() < 8) d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return isoDate(d);
}

/** Age bands of the age-based komisi; used to flag members who have outgrown theirs. */
const KOMISI_AGE_RANGE: Record<string, [number, number]> = { 'sekolah-minggu': [0, 12], teens: [13, 17], vessel: [18, 30] };

// ── Badge components ──────────────────────────────────────────────────────────
export function KomisiBadge({ id }: { id: string }) {
  const k = KOMISI_LIST.find(k => k.id === id);
  if (!k) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${k.color}`}>{k.label}</span>;
}


export default function KomisiManagement() {
  const { user, accessToken } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const permissions = user?.permissions;

  // Which komisi this user can see
  const visibleKomisi = useMemo(() => {
    if (isSuperAdmin || permissions?.editKomisi || permissions?.viewKomisi) return [...KOMISI_LIST];
    const leaderOf = permissions?.komisiLeaderOf || [];
    const visible = KOMISI_LIST.filter(k => leaderOf.includes(k.id));
    return visible;
  }, [isSuperAdmin, permissions]);

  const [searchParams] = useSearchParams();
  const komisiParam = searchParams.get('komisi');

  const [activeKomisi, setActiveKomisi] = useState<KomisiId>(() => {
    if (komisiParam) {
      const match = KOMISI_LIST.find(k => k.id === komisiParam || k.label.toLowerCase() === komisiParam.toLowerCase());
      if (match) return match.id as KomisiId;
    }
    return (visibleKomisi[0]?.id as KomisiId) ?? 'sekolah-minggu';
  });

  useEffect(() => {
    if (komisiParam) {
      const match = KOMISI_LIST.find(k => k.id === komisiParam || k.label.toLowerCase() === komisiParam.toLowerCase());
      if (match) {
        setActiveKomisi(match.id as KomisiId);
      }
    }
  }, [komisiParam]);

  const [tab, setTab] = useState<Tab>('anggota');

  const canEdit = isSuperAdmin || permissions?.editKomisi ||
    (permissions?.komisiLeaderOf || []).includes(activeKomisi);

  const [members, setMembers] = useState<KomisiMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [jemaatList, setJemaatList] = useState<JemaatMember[]>([]);

  const [sessions, setSessions] = useState<AbsenSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeSession, setActiveSession] = useState<AbsenSession | null>(null);
  const [draftPresentIds, setDraftPresentIds] = useState<Set<string>>(new Set());
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(true);

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editMember, setEditMember] = useState<KomisiMember | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', address: '', birthDate: '', role: 'anggota' as 'anggota' | 'pengurus' | 'guru' });
  const [savingMember, setSavingMember] = useState(false);
  const [selectedJemaatId, setSelectedJemaatId] = useState('');
  const [linkSearch, setLinkSearch] = useState('');


  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: '', date: new Date().toISOString().slice(0, 10) });
  const [savingSession, setSavingSession] = useState(false);

  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [deletingMember, setDeletingMember] = useState<KomisiMember | null>(null);

  const komisiInfo = KOMISI_LIST.find(k => k.id === activeKomisi)!;

  // ── Load jemaat directly from kv_store (union both formats) ─────────────
  const loadJemaat = useCallback(async () => {
    try {
      const toJ = (r: any): JemaatMember | null => {
        const m = r.value as any;
        if (!m?.name) return null;
        return { id: m.id || r.key, name: m.name, phone: m.phone || '', address: m.address || '', birthDate: m.birthDate || '' };
      };

      const [{ data: d1 }, { data: d2 }] = await Promise.all([
        supabaseAdmin.from(KV).select('key, value').like('key', 'congregation:member:%'),
        supabaseAdmin.from(KV).select('key, value').like('key', 'member:%'),
      ]);

      const seen = new Set<string>();
      const list: JemaatMember[] = [];
      for (const r of [...(d1 || []), ...(d2 || [])]) {
        const j = toJ(r);
        if (j && !seen.has(j.id)) { seen.add(j.id); list.push(j); }
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setJemaatList(list);
    } catch {}
  }, []);

  // ── Load komisi members ───────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const { data, error: err } = await supabaseAdmin
        .from(KV).select('key, value')
        .like('key', `komisi:${activeKomisi}:member:%`);
      if (err) throw err;
      const list = (data ?? []).map((r: any) => r.value as KomisiMember).filter(Boolean);
      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setMembers(list);
    } catch (e: any) { setError(e.message); }
    setLoadingMembers(false);
  }, [activeKomisi]);

  // ── Load attendance sessions ──────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const { data, error: err } = await supabaseAdmin
        .from(KV).select('key, value')
        .like('key', `komisi:${activeKomisi}:absen:%`);
      if (err) throw err;
      const list = (data ?? []).map((r: any) => r.value as AbsenSession).filter(Boolean);

      // One session per week, created automatically. Last weeks' sessions stay saved and feed the Laporan tab.
      const weekDate = currentWeekSunday();
      let current = list.find(x => x.date === weekDate);
      if (!current) {
        const dt = new Date(weekDate + 'T00:00:00');
        current = {
          id: `week-${weekDate}`, komisiId: activeKomisi, date: weekDate,
          title: `Ibadah Minggu ${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]} ${dt.getFullYear()}`,
          createdAt: new Date().toISOString(), presentIds: [], absentIds: [],
        } as AbsenSession;
        await supabaseAdmin.from(KV).insert({ key: `komisi:${activeKomisi}:absen:${current.id}`, value: current });
        list.push(current);
      }

      // Tidy up: earlier versions pre-created a blank session for every Sunday of the year.
      const blanks = list.filter(x => x.id.startsWith('week-') && x.date !== weekDate && x.presentIds.length + x.absentIds.length === 0);
      if (blanks.length > 0) {
        for (let i = 0; i < blanks.length; i += 10) {
          await Promise.all(blanks.slice(i, i + 10).map(x => supabaseAdmin.from(KV).delete().eq('key', `komisi:${activeKomisi}:absen:${x.id}`)));
        }
      }
      const kept = list.filter(x => !blanks.includes(x));

      kept.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(kept);
      setActiveSession(kept.find(x => x.date === weekDate) ?? null);
    } catch (e: any) { setError(e.message); }
    setLoadingSessions(false);
  }, [activeKomisi]);

  useEffect(() => { loadJemaat(); }, [loadJemaat]);
  useEffect(() => {
    setActiveSession(null); setDraftPresentIds(new Set()); setAttendanceSaved(true); setSearch('');
    loadMembers(); loadSessions();
  }, [activeKomisi]);
  useEffect(() => { setDraftPresentIds(new Set(activeSession?.presentIds || [])); setAttendanceSaved(true); }, [activeSession?.id]);

  // ── Jemaat lookup map ─────────────────────────────────────────────────────
  const jemaatMap = useMemo(() => {
    const m: Record<string, JemaatMember> = {};
    jemaatList.forEach(j => { m[j.id] = j; });
    return m;
  }, [jemaatList]);

  // ── Live suggestions when typing in form ─────────────────────────────────
  const formSuggestions = useMemo((): MatchResult[] => {
    // Manual link-search: simple substring, always shows results
    if (linkSearch.length >= 2) {
      const q = linkSearch.toLowerCase().trim();
      return jemaatList
        .filter(j => j.name.toLowerCase().includes(q))
        .map(j => ({ jemaat: j, score: 100, reasons: ['pencarian manual'] }))
        .slice(0, 10);
    }
    // Auto-suggest from form data
    if (!memberForm.name.trim() || memberForm.name.length < 2) return [];
    return jemaatList
      .map(j => calcMatchScore({
        name: memberForm.name,
        phone: memberForm.phone,
        address: memberForm.address,
        birthDate: memberForm.birthDate,
      }, j))
      .filter(r => r.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [linkSearch, memberForm, jemaatList]);

  // Auto-suggestions when name/birthDate/address filled
  const autoSuggestion = useMemo((): MatchResult | null => {
    if (!memberForm.name.trim()) return null;
    const results = jemaatList
      .map(j => calcMatchScore({
        name: memberForm.name,
        phone: memberForm.phone,
        address: memberForm.address,
        birthDate: memberForm.birthDate,
      }, j))
      .filter(r => r.score >= 80)
      .sort((a, b) => b.score - a.score);
    return results[0] ?? null;
  }, [memberForm, jemaatList]);


  // ── Member CRUD ───────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() =>
    members.filter(m => m.name.toLowerCase().includes(search.toLowerCase())),
    [members, search]);

  const linkedCount = members.filter(m => m.jemaatId && jemaatMap[m.jemaatId]).length;

  const openAddMember = () => {
    setEditMember(null);
    setMemberForm({ name: '', phone: '', address: '', birthDate: '', role: 'anggota' });
    setSelectedJemaatId(''); setLinkSearch('');
    setShowMemberForm(true);
  };

  const openEditMember = (m: KomisiMember) => {
    setEditMember(m);
    setMemberForm({ name: m.name, phone: m.phone, address: m.address || '', birthDate: m.birthDate || '', role: m.role || 'anggota' });
    setSelectedJemaatId(m.jemaatId || ''); setLinkSearch('');
    setShowMemberForm(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name.trim()) return;
    setSavingMember(true);
    try {
      const id = editMember?.id || crypto.randomUUID();
      const member: KomisiMember = {
        id, komisiId: activeKomisi,
        name: memberForm.name.trim(),
        phone: memberForm.phone.trim(),
          address: memberForm.address.trim(),
          birthDate: memberForm.birthDate,
          role: memberForm.role,
        joinedAt: editMember?.joinedAt || new Date().toISOString(),
        ...(selectedJemaatId ? { jemaatId: selectedJemaatId } : {}),
      };
      const key = `komisi:${activeKomisi}:member:${id}`;
      if (editMember) {
        await supabaseAdmin.from(KV).update({ value: member }).eq('key', key);
      } else {
        await supabaseAdmin.from(KV).insert({ key, value: member });
      }
      setShowMemberForm(false);
      loadMembers();
    } catch (e: any) { setError(e.message); }
    setSavingMember(false);
  };

  const handleDeleteMember = (m: KomisiMember) => setDeletingMember(m);

  const confirmDeleteMember = async () => {
    if (!deletingMember) return;
    await supabaseAdmin.from(KV).delete().eq('key', `komisi:${activeKomisi}:member:${deletingMember.id}`);
    setDeletingMember(null);
    loadMembers();
  };

  // ── Attendance ────────────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    if (!sessionForm.title.trim() || !sessionForm.date) return;
    setSavingSession(true);
    try {
      const id = crypto.randomUUID();
      const session: AbsenSession = {
        id, komisiId: activeKomisi,
        title: sessionForm.title.trim(), date: sessionForm.date,
        createdAt: new Date().toISOString(), presentIds: [], absentIds: [],
      };
      await supabaseAdmin.from(KV).insert({ key: `komisi:${activeKomisi}:absen:${id}`, value: session });
      setShowSessionForm(false);
      setSessionForm({ title: '', date: new Date().toISOString().slice(0, 10) });
      await loadSessions();
      setActiveSession(session);
    } catch (e: any) { setError(e.message); }
    setSavingSession(false);
  };

  const toggleAttendance = (id: string) => { if (!canEdit) return; setDraftPresentIds(old => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; }); setAttendanceSaved(false); };
  const markAll = (present: boolean) => { if (!canEdit) return; setDraftPresentIds(new Set(present ? members.map(m => m.id) : [])); setAttendanceSaved(false); };
  const saveAttendance = async () => { if (!activeSession || !canEdit) return; setSavingAttendance(true); try { const presentIds = [...draftPresentIds]; const updated = { ...activeSession, presentIds, absentIds: members.map(m => m.id).filter(id => !draftPresentIds.has(id)), updatedAt: new Date().toISOString() }; const result = await supabaseAdmin.from(KV).update({ value: updated }).eq('key', 'komisi:' + activeKomisi + ':absen:' + activeSession.id); if (result.error) throw result.error; setActiveSession(updated); setSessions(old => old.map(x => x.id === updated.id ? updated : x)); setAttendanceSaved(true); } catch (e: any) { setError(e.message || 'Gagal menyimpan absensi'); } finally { setSavingAttendance(false); } };

  const [deletingSession, setDeletingSession] = useState<AbsenSession | null>(null);

  const handleDeleteSession = (session: AbsenSession) => setDeletingSession(session);

  const confirmDeleteSession = async () => {
    if (!deletingSession) return;
    await supabaseAdmin.from(KV).delete().eq('key', `komisi:${activeKomisi}:absen:${deletingSession.id}`);
    if (activeSession?.id === deletingSession.id) setActiveSession(null);
    setDeletingSession(null);
    loadSessions();
  };

  // ── Excel exports ─────────────────────────────────────────────────────────
  const exportMembers = () => {
    const rows = members.map(m => ({
      'Nama': m.name,
      'No. Telepon': m.phone,
      'Alamat Domisili': m.address || '',
      'Tanggal Lahir': m.birthDate || '',
      'Peran': m.role === 'pengurus' ? 'Pengurus' : m.role === 'guru' ? 'Guru' : 'Anggota',
      'Bergabung': formatDate(m.joinedAt),
      'Status Jemaat Umum': m.jemaatId && jemaatMap[m.jemaatId] ? 'Terdaftar' : 'Belum di database umum',
      'Komisi': komisiInfo.label,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Anggota');
    XLSX.writeFile(wb, `Komisi_${komisiInfo.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportAttendance = (session: AbsenSession) => {
    const rows = members.map(m => ({
      'Nama': m.name, 'No. Telepon': m.phone,
      'Status': session.presentIds.includes(m.id) ? 'Hadir'
        : session.absentIds.includes(m.id) ? 'Tidak Hadir' : 'Belum dicatat',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Absensi');
    XLSX.writeFile(wb, `Absen_${komisiInfo.label.replace(/\s+/g, '_')}_${session.date}.xlsx`);
  };

  // ── No access ─────────────────────────────────────────────────────────────
  if (visibleKomisi.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400">
        <ShieldAlert size={48} className="mx-auto mb-4 opacity-40" />
        <p className="font-semibold text-gray-600">Tidak ada akses komisi</p>
        <p className="text-sm mt-1">Hubungi Super Admin untuk mendapatkan akses komisi.</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Komisi</h1>
          <p className="text-gray-500 text-sm mt-0.5">Data anggota & absensi per komisi gereja</p>
        </div>
        <div className="relative">
          <select value={activeKomisi} onChange={e => setActiveKomisi(e.target.value as KomisiId)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm cursor-pointer">
            {visibleKomisi.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap text-sm">
        <KomisiBadge id={activeKomisi} />
        <span className="flex items-center gap-1 text-gray-500"><Users size={13} />{members.length} anggota</span>
        <span className="flex items-center gap-1 text-emerald-600"><Link size={13} />{linkedCount} terhubung ke jemaat umum</span>
        {members.length - linkedCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle size={13} />{members.length - linkedCount} belum di database umum
          </span>
        )}
        {!canEdit && (
          <span className="flex items-center gap-1 text-gray-400 ml-auto"><Info size={12} />View only</span>
        )}
        <button onClick={() => { loadMembers(); loadSessions(); }} className="text-gray-400 hover:text-gray-600 p-1 ml-auto">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={15} />{error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {!canEdit && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk akses edit.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(['anggota', 'absensi', 'laporan'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'anggota'
              ? <span className="flex items-center gap-1.5"><Users size={13} />Data Anggota</span>
              : t === 'absensi'
                ? <span className="flex items-center gap-1.5"><ClipboardList size={13} />Absensi</span>
                : <span className="flex items-center gap-1.5"><Calendar size={13} />Laporan</span>}
          </button>
        ))}
      </div>

      {/* ── ANGGOTA TAB ── */}
      {tab === 'anggota' && (
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Cari anggota..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <button onClick={exportMembers}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
              <Download size={14} />Export
            </button>
            {canEdit && (
              <button onClick={openAddMember}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors">
                <Plus size={15} />Tambah Anggota
              </button>
            )}
          </div>

          {loadingMembers ? (
            <div className="text-center py-16 text-gray-400">Memuat data...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Belum ada anggota di {komisiInfo.label}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(m => {
                const linked = m.jemaatId ? jemaatMap[m.jemaatId] : null;
                const notInDb = !linked;
                // Linked members always follow Data Jemaat; the age is computed today, so it rolls over on each birthday.
                const birthDate = linked?.birthDate || m.birthDate || '';
                const age = birthDate ? getAge(birthDate) : -1;
                const range = KOMISI_AGE_RANGE[activeKomisi];
                const outOfRange = !!range && age >= 0 && (age < range[0] || age > range[1]);
                return (
                  <div key={m.id} className={`bg-white border rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm ${notInDb ? 'border-amber-200' : 'border-gray-100'}`}>
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-sm">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                        {linked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Link size={10} />Terhubung ke Jemaat Umum
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} />Belum di database umum — belum ikut ibadah umum
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                        {m.phone && <span>{m.phone}</span>}
                        {birthDate && <span>· {formatDate(birthDate)}</span>}
                        {age >= 0 && <span className={`px-1.5 py-0.5 rounded-full font-semibold ${AGE_GROUP_STYLES[getAgeGroup(birthDate)]}`}>{age} thn</span>}
                        {outOfRange && <span className="px-1.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">usia di luar rentang komisi</span>}
                        {m.address && <span>· {m.address}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEditMember(m)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteMember(m)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'laporan' && (
        <KomisiReport
          komisiLabel={KOMISI_LIST.find(k => k.id === activeKomisi)?.label || ''}
          sessions={sessions}
          members={members.map(m => ({ id: m.id, name: m.name }))}
        />
      )}

      {/* ── ABSENSI TAB: this week only ── */}
      {tab === 'absensi' && (
        <div>
          {loadingSessions || !activeSession ? (
            <div className="text-center py-16 text-gray-400 text-sm">Memuat absensi minggu ini...</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 rounded-full px-2.5 py-1 mb-2">Minggu ini</span>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{activeSession.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {activeSession.presentIds.length} hadir · {activeSession.absentIds.length} absen · {Math.max(0, members.length - activeSession.presentIds.length - activeSession.absentIds.length)} belum dicatat
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {canEdit && (
                    <>
                      <button onClick={() => markAll(true)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50">Hadir Semua</button>
                      <button onClick={() => markAll(false)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Reset</button>
                    </>
                  )}
                  <button onClick={() => exportAttendance(activeSession)}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50">
                    <Download size={13} />Export
                  </button>
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 text-blue-700 text-xs rounded-xl px-3.5 py-2.5 mb-4">
                Absensi minggu ini tersimpan setelah tombol <strong>Simpan Absensi</strong> ditekan. Minggu sebelumnya tetap tersedia di tab <strong>Laporan</strong>.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {members.map(m => {
                  const isPresent = draftPresentIds.has(m.id);
                  return (
                    <div key={m.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 break-words">{m.name}</p>
                        <p className="text-xs text-gray-400">
                          {m.phone}
                          {(() => { const bd = (m.jemaatId && jemaatMap[m.jemaatId]?.birthDate) || m.birthDate; const a = bd ? getAge(bd) : -1; return a >= 0 ? `${m.phone ? ' · ' : ''}${a} thn` : ''; })()}
                        </p>
                      </div>
                      {canEdit ? <button type="button" onClick={() => toggleAttendance(m.id)} aria-label={'Tandai kehadiran: ' + m.name} aria-pressed={isPresent} className={'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (isPresent ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-gray-300')} >{isPresent ? <Check size={20} /> : <Circle size={20} />}</button> : <span className={'text-xs font-semibold px-2 py-1 rounded-full ' + (isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400')}>{isPresent ? 'Hadir' : 'Absen'}</span>}
                    </div>
                  );
                })}
              </div>
              {canEdit && <div className="sticky bottom-2 z-20 mt-4 flex justify-center px-2"><button onClick={saveAttendance} disabled={savingAttendance || attendanceSaved} className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-lg bg-blue-600 disabled:bg-emerald-600">{savingAttendance ? <RefreshCw size={17} className="animate-spin" /> : attendanceSaved ? <Check size={17} /> : <Save size={17} />}{savingAttendance ? 'Menyimpan...' : attendanceSaved ? 'Absensi Tersimpan' : 'Simpan Absensi'}</button></div>}
            </>
          )}
        </div>
      )}

      {/* ── Member Form Modal ── */}
      {showMemberForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editMember ? 'Edit Anggota' : 'Tambah Anggota Baru'}</h2>
              <button onClick={() => setShowMemberForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* Auto-suggestion banner */}
              {!selectedJemaatId && autoSuggestion && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-3">
                  <Activity size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-800">Ditemukan di database jemaat umum</p>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      <strong>{autoSuggestion.jemaat.name}</strong>
                      {autoSuggestion.jemaat.birthDate && ` · ${formatDate(autoSuggestion.jemaat.birthDate)}`}
                      {autoSuggestion.jemaat.phone && ` · ${autoSuggestion.jemaat.phone}`}
                    </p>
                    <p className="text-xs text-indigo-500 mt-0.5">Alasan: {autoSuggestion.reasons.join(', ')}</p>
                  </div>
                  <button onClick={() => setSelectedJemaatId(autoSuggestion.jemaat.id)}
                    className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg font-semibold flex-shrink-0">
                    <Link size={10} />Hubungkan
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap *</label>
                <input type="text" value={memberForm.name} onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
                  <input type="date" value={memberForm.birthDate} onChange={e => setMemberForm(p => ({ ...p, birthDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">Isi untuk membantu pencocokan otomatis</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Peran</label>
                  <select value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="anggota">Anggota</option>
                    <option value="pengurus">Pengurus / PIC</option>
                    <option value="guru">Guru (Khusus Sekolah Minggu)</option>
                  </select>
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Telepon / WA</label>
                <input type="tel" value={memberForm.phone} onChange={e => setMemberForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat Domisili</label>
                <input type="text" value={memberForm.address} onChange={e => setMemberForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Manual link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Link size={13} />Hubungkan ke Jemaat Umum
                </label>
                {selectedJemaatId ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                    <Check size={14} className="text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-emerald-800 font-semibold">{jemaatMap[selectedJemaatId]?.name || selectedJemaatId}</p>
                      {jemaatMap[selectedJemaatId]?.birthDate && (
                        <p className="text-xs text-emerald-600">{formatDate(jemaatMap[selectedJemaatId].birthDate!)} · {jemaatMap[selectedJemaatId].phone}</p>
                      )}
                    </div>
                    <button onClick={() => setSelectedJemaatId('')} className="text-emerald-500 hover:text-red-500"><Unlink size={14} /></button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder={`Cari dari ${jemaatList.length} jemaat umum...`} value={linkSearch}
                        onChange={e => setLinkSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    {/* Inline results — NOT absolute, so overflow-y-auto parent won't clip it */}
                    {linkSearch.length >= 2 && formSuggestions.length > 0 && (
                      <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                        {formSuggestions.map(r => (
                          <button key={r.jemaat.id}
                            onMouseDown={e => { e.preventDefault(); setSelectedJemaatId(r.jemaat.id); setLinkSearch(''); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                            <p className="font-semibold text-gray-900 text-sm">{r.jemaat.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {r.jemaat.birthDate && `${formatDate(r.jemaat.birthDate)} · `}
                              {r.jemaat.phone && `${r.jemaat.phone}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {linkSearch.length >= 2 && formSuggestions.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 px-1">Tidak ditemukan di {jemaatList.length} data jemaat umum</p>
                    )}
                    {jemaatList.length === 0 && (
                      <p className="text-xs text-red-400 mt-1.5 px-1">Belum ada data jemaat umum — tambahkan di menu Data Jemaat</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowMemberForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveMember} disabled={!memberForm.name.trim() || savingMember}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                {savingMember ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                {editMember ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Session Form Modal ── */}
      {showSessionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Buat Sesi Absensi</h2>
              <button onClick={() => setShowSessionForm(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Sesi *</label>
                <input type="text" placeholder="contoh: Ibadah Minggu 27 Juli" value={sessionForm.title}
                  onChange={e => setSessionForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal *</label>
                <input type="date" value={sessionForm.date} onChange={e => setSessionForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSessionForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
              <button onClick={handleCreateSession} disabled={!sessionForm.title.trim() || savingSession}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold">
                {savingSession ? 'Membuat...' : 'Buat Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete session confirm ── */}
      {deletingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-base text-center">Hapus Sesi?</h3>
              <p className="text-sm text-gray-500 text-center">
                Sesi <strong>{deletingSession.title}</strong> dan semua data absensinya akan dihapus.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingSession(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
              <button onClick={confirmDeleteSession} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete member confirm ── */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-base text-center">Hapus Anggota?</h3>
              <p className="text-sm text-gray-500 text-center">
                <strong>{deletingMember.name}</strong> akan dihapus dari <strong>{komisiInfo.label}</strong>.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingMember(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
              <button onClick={confirmDeleteMember} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
