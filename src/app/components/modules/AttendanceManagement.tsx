import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  Search, SortAsc, SortDesc, CheckCircle2, Circle, CheckSquare, Square,
  Save, Download, Calendar, Users, TrendingDown, ChevronLeft, ChevronRight,
  BarChart3, ClipboardList, AlertTriangle, Loader2
} from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

const SERVICE_TYPES = ['Ibadah Minggu', 'Ibadah Pemuda', 'Persekutuan Doa', 'Sekolah Minggu'];

interface Member {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  status?: string;
}

interface Session {
  id: string;
  date: string;
  serviceType: string;
  presentIds: string[];
  savedAt: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const monthLabel = (y: number, m: number) =>
  new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

// Get all Sundays in a given year-month
function sundaysInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 0) dates.push(fmt(new Date(d)));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// Inactive threshold: attended < 50% of sessions in last 4 weeks
function getInactiveMembers(members: Member[], sessions: Session[]): string[] {
  const now = new Date();
  const fourWeeksAgo = fmt(new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000));
  const recent = sessions.filter(s => s.date >= fourWeeksAgo);
  if (recent.length === 0) return [];
  return members
    .filter(m => {
      const count = recent.filter(s => s.presentIds.includes(m.id)).length;
      return count / recent.length < 0.5;
    })
    .map(m => m.id);
}

// ─── sub-components ──────────────────────────────────────────────────────────
function Avatar({ name, present }: { name: string; present: boolean }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${present ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
      {initials}
    </div>
  );
}

// ─── Daily Input Tab ─────────────────────────────────────────────────────────
function DailyInput({ members, sessions, onSessionSaved, authHeader }: {
  members: Member[];
  sessions: Session[];
  onSessionSaved: () => void;
  authHeader: Record<string, string>;
}) {
  const today = fmt(new Date());
  const [date, setDate] = useState(today);
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'hadir' | 'absen'>('all');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sessionId = `sess_${date}_${serviceType.replace(/\s+/g, '_')}`;
  const inactiveIds = useMemo(() => getInactiveMembers(members, sessions), [members, sessions]);

  // Load existing session for selected date + service
  useEffect(() => {
    const existing = sessions.find(s => s.id === sessionId);
    setPresent(new Set(existing?.presentIds || []));
    setSaved(!!existing);
  }, [sessionId, sessions]);

  const toggle = (id: string) =>
    setPresent(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const markAll = () => setPresent(new Set(filtered.map(m => m.id)));
  const clearAll = () => setPresent(new Set());

  const filtered = useMemo(() => {
    let list = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'hadir') list = list.filter(m => present.has(m.id));
    if (filter === 'absen') list = list.filter(m => !present.has(m.id));
    list = [...list].sort((a, b) =>
      sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
    return list;
  }, [members, search, filter, sortDir, present]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/attendance/sessions`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, serviceType, presentIds: [...present] }),
      });
      setSaved(true);
      onSessionSaved();
    } finally {
      setSaving(false);
    }
  };

  const presentCount = present.size;
  const absentCount = members.length - presentCount;

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Tanggal</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Jenis Ibadah</label>
          <select value={serviceType} onChange={e => setServiceType(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ml-auto ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-700 text-white hover:bg-blue-800'} disabled:opacity-50`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan Absensi'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{presentCount}</div>
          <div className="text-xs text-emerald-600 mt-1">Hadir</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{absentCount}</div>
          <div className="text-xs text-red-500 mt-1">Absen</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{members.length}</div>
          <div className="text-xs text-blue-600 mt-1">Total Jemaat</div>
        </div>
      </div>

      {/* Inactive alert */}
      {inactiveIds.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Jemaat Jarang Aktif ({inactiveIds.length} orang)</p>
            <p className="text-xs text-amber-600 mt-1">
              {members.filter(m => inactiveIds.includes(m.id)).map(m => m.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Search + Sort + Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama jemaat..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          {sortDir === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          {sortDir === 'asc' ? 'Asc' : 'Desc'}
        </button>
        {(['all', 'hadir', 'absen'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${filter === f ? 'bg-blue-700 text-white border-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'all' ? 'Semua' : f === 'hadir' ? 'Hadir' : 'Absen'}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={markAll} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50">
            <CheckSquare size={14} /> Semua Hadir
          </button>
          <button onClick={clearAll} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
            <Square size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Member checklist */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Tidak ada jemaat ditemukan</div>
        ) : (
          filtered.map((m, i) => {
            const isPresent = present.has(m.id);
            const isInactive = inactiveIds.includes(m.id);
            return (
              <div key={m.id}
                onClick={() => toggle(m.id)}
                className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors select-none ${i > 0 ? 'border-t border-gray-50' : ''} ${isPresent ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-gray-50'}`}>
                <Avatar name={m.name} present={isPresent} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                    {isInactive && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">Jarang Aktif</span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 ${isPresent ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {isPresent ? 'Hadir 🎉' : 'Belum hadir'}
                  </p>
                </div>
                {isPresent
                  ? <CheckCircle2 size={26} className="text-emerald-500 flex-shrink-0" />
                  : <Circle size={26} className="text-gray-300 flex-shrink-0" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Report Tab ──────────────────────────────────────────────────────────────
function ReportSummary({ members, sessions }: { members: Member[]; sessions: Session[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('Ibadah Minggu');

  const sundays = sundaysInMonth(year, month);

  // Sessions matching current filter
  const relevantSessions = useMemo(() => {
    if (view === 'monthly') {
      const prefix = `${year}-${pad2(month)}`;
      return sessions.filter(s => s.date.startsWith(prefix) && s.serviceType === serviceFilter);
    } else {
      return sessions.filter(s => s.date.startsWith(String(year)) && s.serviceType === serviceFilter);
    }
  }, [sessions, year, month, view, serviceFilter]);

  // Dates (columns) for the table
  const dateCols = useMemo(() => {
    if (view === 'monthly') return sundays;
    // yearly: collect all unique dates in sessions
    const all = relevantSessions.map(s => s.date);
    return [...new Set(all)].sort();
  }, [view, sundays, relevantSessions]);

  const filteredMembers = useMemo(() =>
    members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [members, search]);

  const getPresentSet = (date: string) =>
    relevantSessions.find(s => s.date === date)?.presentIds || [];

  const totalByDate = (date: string) => getPresentSet(date).length;
  const totalByMember = (memberId: string) =>
    dateCols.filter(d => getPresentSet(d).includes(memberId)).length;

  const exportCSV = () => {
    const header = ['No', 'Nama', ...dateCols.map(d => d.slice(5)), 'Total'];
    const rows = filteredMembers.map((m, i) => [
      i + 1,
      m.name,
      ...dateCols.map(d => getPresentSet(d).includes(m.id) ? '1' : '-'),
      totalByMember(m.id),
    ]);
    const totalRow = ['', 'TOTAL HADIR', ...dateCols.map(d => totalByDate(d)), ''];
    const csv = [header, ...rows, totalRow]
      .map(r => r.map(c => `"${c}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const exportName = view === 'monthly'
      ? `Ibadah Umum.${pad2(month)}.${year}`
      : `Ibadah Umum.${year}`;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['monthly', 'yearly'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === v ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'monthly' ? 'Per Bulan' : 'Per Tahun'}
            </button>
          ))}
        </div>

        {/* Service filter */}
        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
        </select>

        {/* Month/Year nav */}
        {view === 'monthly' ? (
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold min-w-32 text-center">{monthLabel(year, month)}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
        )}

        <button onClick={exportCSV}
          className="flex items-center gap-2 ml-auto bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
          <Download size={16} /> Export Excel (CSV)
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{relevantSessions.length}</div>
          <div className="text-xs text-blue-600 mt-1">Sesi Tersimpan</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">
            {relevantSessions.length > 0
              ? Math.round(relevantSessions.reduce((s, sess) => s + sess.presentIds.length, 0) / relevantSessions.length)
              : 0}
          </div>
          <div className="text-xs text-emerald-600 mt-1">Rata-rata Hadir/Minggu</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {relevantSessions.reduce((s, sess) => s + sess.presentIds.length, 0)}
          </div>
          <div className="text-xs text-purple-600 mt-1">Total Kehadiran</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 w-10">No</th>
              <th className="sticky left-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 min-w-40">Nama</th>
              {dateCols.map(d => (
                <th key={d} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 min-w-14">
                  <div>{d.slice(5, 7)}/{d.slice(8)}</div>
                  {view === 'yearly' && <div className="text-gray-400">{d.slice(0, 4)}</div>}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 min-w-14">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr><td colSpan={dateCols.length + 3} className="py-12 text-center text-gray-400">Belum ada data</td></tr>
            ) : (
              filteredMembers.map((m, i) => {
                const total = totalByMember(m.id);
                const pct = dateCols.length > 0 ? total / dateCols.length : 0;
                return (
                  <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="sticky left-0 bg-inherit px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="sticky left-10 bg-inherit px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {m.name}
                        {pct < 0.5 && dateCols.length >= 2 && (
                          <span title="Jarang hadir"><TrendingDown size={13} className="text-amber-500" /></span>
                        )}
                      </div>
                    </td>
                    {dateCols.map(d => {
                      const hadir = getPresentSet(d).includes(m.id);
                      return (
                        <td key={d} className="px-3 py-3 text-center">
                          {hadir
                            ? <span className="text-emerald-600 font-bold">✓</span>
                            : <span className="text-gray-300">–</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold text-blue-700">{total}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {dateCols.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-200">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-xs font-bold text-gray-700">TOTAL HADIR</td>
                {dateCols.map(d => (
                  <td key={d} className="px-3 py-3 text-center text-xs font-bold text-emerald-700">
                    {totalByDate(d)}
                  </td>
                ))}
                <td className="px-4 py-3 text-center text-xs font-bold text-blue-700">
                  {relevantSessions.reduce((s, sess) => s + sess.presentIds.length, 0)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AttendanceManagement() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<'input' | 'report'>('input');
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const authHeader = { Authorization: `Bearer ${accessToken || publicAnonKey}` };

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, sRes] = await Promise.all([
        fetch(`${API_URL}/congregation/members`, { headers: authHeader }),
        fetch(`${API_URL}/attendance/sessions`, { headers: authHeader }),
      ]);
      const mData = await mRes.json();
      const sData = await sRes.json();
      if (mData.members) setMembers(mData.members.filter((m: any) => m?.name));
      if (sData.sessions) setSessions(sData.sessions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useAutoRefresh(loadData, 30_000);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={28} className="animate-spin mr-3" /> Memuat data...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Absensi Jemaat</h2>
          <p className="text-sm text-gray-500 mt-1">Catat kehadiran dan lihat laporan per bulan / tahun</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('input')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'input' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <ClipboardList size={16} /> Input Absensi
          </button>
          <button onClick={() => setTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'report' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <BarChart3 size={16} /> Laporan
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {members.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-700 text-sm">
          <Users size={16} /> Belum ada data jemaat. Tambahkan jemaat di menu "Data Jemaat" terlebih dahulu.
        </div>
      )}

      {tab === 'input' ? (
        <DailyInput members={members} sessions={sessions} onSessionSaved={loadData} authHeader={authHeader} />
      ) : (
        <ReportSummary members={members} sessions={sessions} />
      )}
    </div>
  );
}
