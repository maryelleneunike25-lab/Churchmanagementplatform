import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  Users, Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Search,
  SortAsc, SortDesc, UserPlus, UserMinus, Phone, Calendar, Clock,
  MapPin, AlertTriangle, CheckCircle2, MessageSquare, AlertCircle,
  Ban, RefreshCw, Send, Check
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, TextField, Select, MenuItem,
  FormControl, InputLabel, Button
} from '@mui/material';
import {
  useKomsels, saveKomsel, deleteKomsel, setMemberPks, loadAllMembers,
  normalizePksName, Komsel, PksPlot, loadAllPlots, savePlot, deletePlot,
  setPlotStatus, detectPlotConflicts, STANDARD_ROOMS, getLeadersForPks,
  PksLeaderContact
} from '../../../lib/komsel';

const BLANK_FORM = { pksName: '', name: '', status: 'active' as 'active' | 'inactive' };

function MemberAvatar({ m }: { m: any }) {
  const initials = (m.name || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  return m.photoUrl
    ? <img src={m.photoUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200" />
    : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{initials}</div>;
}

function openWhatsApp(phone: string, message: string) {
  if (!phone) return;
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

export default function KomselManagement() {
  const [searchParams] = useSearchParams();
  const pksParam = searchParams.get('pks') || searchParams.get('search') || '';
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || (user?.permissions as any)?.editKomsel || false;

  // Active Main Tab: 'list' (Daftar PKS) vs 'plot' (Plotting Ruangan & Jadwal)
  const [activeTab, setActiveTab] = useState<'list' | 'plot'>('list');

  // Komsel data
  const { komsels, loading, refetch: loadKomsels } = useKomsels();
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKomsel, setEditingKomsel] = useState<Komsel | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedPks, setExpandedPks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ ...BLANK_FORM });

  const [search, setSearch] = useState(() => pksParam);
  const [sortKey, setSortKey] = useState<'name' | 'count'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Add-member picker
  const [pickerFor, setPickerFor] = useState<Komsel | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Plotting State
  // -------------------------------------------------------------
  const [plots, setPlots] = useState<PksPlot[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [openPlotDialog, setOpenPlotDialog] = useState(false);
  const [editingPlot, setEditingPlot] = useState<PksPlot | null>(null);
  const [plotSaving, setPlotSaving] = useState(false);

  // Plot form state
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [plotForm, setPlotForm] = useState({
    pksName: '',
    room: STANDARD_ROOMS[0],
    customRoom: '',
    date: todayStr,
    startTime: '10:00',
    endTime: '12:00',
    status: 'active' as 'active' | 'berhalangan' | 'completed',
    notes: '',
    leaders: [] as PksLeaderContact[],
  });

  // Plot filter
  const [plotWeekFilter, setPlotWeekFilter] = useState<'all' | 'this_week' | 'next_week'>('all');
  const [plotRoomFilter, setPlotRoomFilter] = useState<string>('all');
  const [plotSearch, setPlotSearch] = useState<string>('');

  const fetchPlots = async () => {
    try {
      setLoadingPlots(true);
      const data = await loadAllPlots();
      setPlots(data);
    } catch (e: any) {
      console.error('Error fetching plots:', e);
    } finally {
      setLoadingPlots(false);
    }
  };

  useEffect(() => {
    fetchPlots();
    loadAllMembers().then(setAllMembers).catch(console.error);
  }, []);

  useAutoRefresh(() => {
    loadKomsels();
    fetchPlots();
  }, 30_000);

  useEffect(() => {
    if (pksParam) {
      setSearch(pksParam);
      const match = komsels.find(k =>
        (k.pksName || k.name).toLowerCase().includes(pksParam.toLowerCase())
      );
      if (match) {
        setExpandedPks(prev => new Set(prev).add(match.id));
      }
    }
  }, [pksParam, komsels]);

  // Detected conflicts
  const conflicts = useMemo(() => detectPlotConflicts(plots), [plots]);

  // Conflict lookup set for fast card badge display
  const conflictPlotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflicts) {
      ids.add(c.plotA.id);
      ids.add(c.plotB.id);
    }
    return ids;
  }, [conflicts]);

  // Filtered plots
  const filteredPlots = useMemo(() => {
    const now = new Date();
    // Monday of current week
    const day = now.getDay();
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
    const monThisWeek = new Date(now.setDate(diffToMon));
    monThisWeek.setHours(0, 0, 0, 0);

    const sunThisWeek = new Date(monThisWeek);
    sunThisWeek.setDate(sunThisWeek.getDate() + 6);
    sunThisWeek.setHours(23, 59, 59, 999);

    const monNextWeek = new Date(monThisWeek);
    monNextWeek.setDate(monNextWeek.getDate() + 7);

    const sunNextWeek = new Date(monNextWeek);
    sunNextWeek.setDate(sunNextWeek.getDate() + 6);
    sunNextWeek.setHours(23, 59, 59, 999);

    return plots.filter(p => {
      // Week filter
      if (plotWeekFilter === 'this_week') {
        const pDate = new Date(p.date + 'T00:00:00');
        if (pDate < monThisWeek || pDate > sunThisWeek) return false;
      } else if (plotWeekFilter === 'next_week') {
        const pDate = new Date(p.date + 'T00:00:00');
        if (pDate < monNextWeek || pDate > sunNextWeek) return false;
      }

      // Room filter
      if (plotRoomFilter !== 'all' && p.room.toLowerCase() !== plotRoomFilter.toLowerCase()) {
        return false;
      }

      // Search filter
      if (plotSearch.trim()) {
        const q = plotSearch.toLowerCase();
        const pksMatch = p.pksName.toLowerCase().includes(q);
        const roomMatch = p.room.toLowerCase().includes(q);
        const leaderMatch = p.leaders.some(l => l.name.toLowerCase().includes(q) || l.phone.includes(q));
        if (!pksMatch && !roomMatch && !leaderMatch) return false;
      }

      return true;
    });
  }, [plots, plotWeekFilter, plotRoomFilter, plotSearch]);

  // Live conflict warning inside Plot Dialog
  const dialogConflict = useMemo(() => {
    if (!openPlotDialog) return null;
    const roomToTest = (plotForm.room === 'Lainnya' ? plotForm.customRoom.trim() : plotForm.room.trim()).toLowerCase();
    if (!roomToTest || !plotForm.date || !plotForm.startTime || !plotForm.endTime) return null;
    if (plotForm.status === 'berhalangan') return null;

    const start = plotForm.startTime.replace(':', '');
    const end = plotForm.endTime.replace(':', '');

    const collision = plots.find(p => {
      if (editingPlot && p.id === editingPlot.id) return false;
      if (p.status !== 'active') return false;
      if (p.date !== plotForm.date) return false;
      if (p.room.trim().toLowerCase() !== roomToTest) return false;

      const pStart = p.startTime.replace(':', '');
      const pEnd = p.endTime.replace(':', '');
      return start < pEnd && end > pStart;
    });

    return collision || null;
  }, [openPlotDialog, plotForm, plots, editingPlot]);

  // -------------------------------------------------------------
  // PKS List Handlers
  // -------------------------------------------------------------
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = komsels.filter(k => {
      if (!q) return true;
      return (k.pksName || k.name).toLowerCase().includes(q)
        || (k.memberDetails || []).some((m: any) => (m.name || '').toLowerCase().includes(q));
    });
    return list.sort((a, b) => {
      const d = sortKey === 'count'
        ? (a.memberCount || 0) - (b.memberCount || 0)
        : (a.pksName || a.name).localeCompare(b.pksName || b.name, 'id');
      return sortDir === 'asc' ? d : -d;
    });
  }, [komsels, search, sortKey, sortDir]);

  const expandAll = () => setExpandedPks(new Set(komsels.map(k => k.id)));
  const collapseAll = () => setExpandedPks(new Set());

  const handleOpenDialog = (komsel?: Komsel) => {
    if (komsel) {
      setEditingKomsel(komsel);
      setFormData({ pksName: komsel.pksName || komsel.name, name: komsel.name, status: (komsel.status as any) || 'active' });
    } else {
      setEditingKomsel(null);
      setFormData({ ...BLANK_FORM });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    const pks = formData.pksName.trim();
    if (!pks) return;
    setSaving(true);
    try {
      const oldPks = editingKomsel?.pksName || editingKomsel?.name || '';
      await saveKomsel({ ...formData, pksName: pks, name: formData.name.trim() || pks }, editingKomsel, user?.email || '');
      if (editingKomsel && oldPks && normalizePksName(oldPks) !== normalizePksName(pks)) {
        for (const m of editingKomsel.memberDetails || []) await setMemberPks(m.id, pks);
      }
      await loadKomsels();
      setOpenDialog(false);
      setSuccessMsg(`PKS ${pks} berhasil disimpan`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (komsel: Komsel) => {
    const pksName = komsel.pksName || komsel.name;
    if (!confirm(`Hapus PKS ${pksName}? Anggota tetap ada di Data Jemaat dan hanya dilepas dari PKS ini.`)) return;
    try {
      await deleteKomsel(komsel.virtual ? '' : komsel.id, pksName);
      await loadKomsels();
      setSuccessMsg(`PKS ${pksName} berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus');
    }
  };

  const openPicker = async (k: Komsel) => {
    setPickerFor(k);
    setPickerSearch('');
    try { setAllMembers(await loadAllMembers()); } catch (e: any) { setError(e.message); }
  };

  const assign = async (memberId: string, pks: string) => {
    setBusyId(memberId);
    try {
      await setMemberPks(memberId, pks);
      await loadKomsels();
      if (pickerFor) setAllMembers(await loadAllMembers());
    } catch (e: any) { setError(e.message || 'Gagal memperbarui anggota'); }
    setBusyId(null);
  };

  const pickerList = useMemo(() => {
    if (!pickerFor) return [];
    const key = normalizePksName(pickerFor.pksName || pickerFor.name);
    const q = pickerSearch.trim().toLowerCase();
    return allMembers
      .filter(m => normalizePksName(m.pksName || '') !== key)
      .filter(m => !q || (m.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'))
      .slice(0, 50);
  }, [pickerFor, pickerSearch, allMembers]);

  // -------------------------------------------------------------
  // Plotting Handlers
  // -------------------------------------------------------------
  const handleOpenPlotDialog = (plot?: PksPlot, defaultPksName?: string) => {
    if (plot) {
      setEditingPlot(plot);
      const isCustomRoom = !STANDARD_ROOMS.includes(plot.room);
      setPlotForm({
        pksName: plot.pksName,
        room: isCustomRoom ? 'Lainnya' : plot.room,
        customRoom: isCustomRoom ? plot.room : '',
        date: plot.date,
        startTime: plot.startTime,
        endTime: plot.endTime,
        status: plot.status,
        notes: plot.notes || '',
        leaders: plot.leaders && plot.leaders.length > 0 ? [...plot.leaders] : getLeadersForPks(plot.pksName, allMembers),
      });
    } else {
      setEditingPlot(null);
      const pks = defaultPksName || (komsels[0] ? (komsels[0].pksName || komsels[0].name) : '');
      const leaders = pks ? getLeadersForPks(pks, allMembers) : [];
      setPlotForm({
        pksName: pks,
        room: STANDARD_ROOMS[0],
        customRoom: '',
        date: todayStr,
        startTime: '10:00',
        endTime: '12:00',
        status: 'active',
        notes: '',
        leaders,
      });
    }
    setOpenPlotDialog(true);
  };

  const handlePksSelectInPlot = (selectedPks: string) => {
    const leaders = getLeadersForPks(selectedPks, allMembers);
    setPlotForm(prev => ({
      ...prev,
      pksName: selectedPks,
      leaders,
    }));
  };

  const handleSavePlot = async () => {
    const pks = plotForm.pksName.trim();
    const finalRoom = plotForm.room === 'Lainnya' ? plotForm.customRoom.trim() : plotForm.room.trim();
    if (!pks || !finalRoom || !plotForm.date || !plotForm.startTime || !plotForm.endTime) {
      setError('Mohon lengkapi semua field yang wajib diisi.');
      return;
    }

    setPlotSaving(true);
    try {
      const matchKomsel = komsels.find(k => normalizePksName(k.pksName || k.name) === normalizePksName(pks));
      await savePlot({
        id: editingPlot ? editingPlot.id : undefined,
        pksId: matchKomsel?.id,
        pksName: pks,
        room: finalRoom,
        date: plotForm.date,
        startTime: plotForm.startTime,
        endTime: plotForm.endTime,
        status: plotForm.status,
        notes: plotForm.notes.trim(),
        leaders: plotForm.leaders,
      }, user?.email || '');

      await fetchPlots();
      setOpenPlotDialog(false);
      setSuccessMsg(`Plot ruangan ${finalRoom} untuk PKS ${pks} berhasil disimpan.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan plotting ruangan');
    } finally {
      setPlotSaving(false);
    }
  };

  const handleDeletePlot = async (plot: PksPlot) => {
    if (!confirm(`Hapus jadwal plot ${plot.room} untuk PKS ${plot.pksName} pada ${plot.date}?`)) return;
    try {
      await deletePlot(plot.id);
      await fetchPlots();
      setSuccessMsg('Jadwal plot berhasil dihapus.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus plot');
    }
  };

  const handleTogglePlotBerhalangan = async (plot: PksPlot) => {
    const newStatus = plot.status === 'berhalangan' ? 'active' : 'berhalangan';
    try {
      await setPlotStatus(plot.id, newStatus);
      await fetchPlots();
      setSuccessMsg(newStatus === 'berhalangan' ? `PKS ${plot.pksName} ditandai Berhalangan (Ruangan dilepas).` : `Jadwal PKS ${plot.pksName} diaktifkan kembali.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Gagal mengubah status');
    }
  };

  if (loading && plots.length === 0) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-gray-900">
            <Users className="text-blue-600" size={24} />Manajemen PKS & Plotting Ruangan
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola data PKS, anggota, plotting tempat & jadwal ruangan tanpa tabrakan.</p>
        </div>

        {/* Tab Pill Selector */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={15} />Daftar Komsel & PKS ({komsels.length})
          </button>
          <button
            onClick={() => setActiveTab('plot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${
              activeTab === 'plot' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar size={15} />Plotting Ruangan & Jadwal ({plots.length})
            {conflicts.length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertCircle size={17} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-700"><X size={15} /></button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={17} className="flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-400 hover:text-emerald-700"><X size={15} /></button>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 1: DAFTAR KOMSEL & PKS                                    */}
      {/* ============================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={expandAll} className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Buka Semua</button>
              <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Tutup Semua</button>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPlotDialog()}
                  className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Calendar size={14} />Plot Ruangan PKS
                </button>
                <button
                  onClick={() => handleOpenDialog()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  <Plus size={15} />Tambah Komsel Baru
                </button>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 text-center shadow-xs">
              <p className="text-2xl font-bold text-purple-700">{komsels.length}</p>
              <p className="text-xs font-medium text-purple-600 mt-0.5">Komsel/PKS</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-center shadow-xs">
              <p className="text-2xl font-bold text-blue-700">{komsels.reduce((sum, k) => sum + (k.memberCount || 0), 0)}</p>
              <p className="text-xs font-medium text-blue-600 mt-0.5">Total Anggota</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center shadow-xs">
              <p className="text-2xl font-bold text-emerald-700">{komsels.filter(k => k.status === 'active').length}</p>
              <p className="text-xs font-medium text-emerald-600 mt-0.5">Komsel Aktif</p>
            </div>
          </div>

          {/* Search & Sort */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari PKS atau nama anggota..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as any)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="name">Sort: Nama PKS</option>
              <option value="count">Sort: Jumlah Anggota</option>
            </select>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 bg-white"
            >
              {sortDir === 'asc' ? <SortAsc size={15} /> : <SortDesc size={15} />}{sortDir === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>

          {!canEdit && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
              Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk akses edit.
            </div>
          )}

          {/* PKS Cards List */}
          <div className="space-y-3">
            {shown.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                Belum ada data Komsel/PKS
              </div>
            ) : shown.map(komsel => {
              const members = (komsel.memberDetails || []).slice().sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'id'));
              const expanded = expandedPks.has(komsel.id) || (!!search.trim() && members.some((m: any) => (m.name || '').toLowerCase().includes(search.trim().toLowerCase())));
              const pksName = komsel.pksName || komsel.name;
              const leaders = getLeadersForPks(pksName, allMembers);

              return (
                <div key={komsel.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden transition-all hover:border-gray-200">
                  <div
                    onClick={() => setExpandedPks(prev => { const n = new Set(prev); n.has(komsel.id) ? n.delete(komsel.id) : n.add(komsel.id); return n; })}
                    className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500">
                      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 break-words">
                          PKS {pksName}
                        </h3>
                        {komsel.status !== 'active' && (
                          <span className="text-[11px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">Nonaktif</span>
                        )}
                      </div>
                      {/* Leader chips preview */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {leaders.map((ldr, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200/60 px-2 py-0.5 rounded-md">
                            <span className="font-medium text-gray-800">{ldr.name}</span>
                            {ldr.phone && <span className="text-gray-400">({ldr.phone})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-blue-700">{members.length} Orang</p>
                    </div>
                  </div>

                  {expanded && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/40 space-y-4">
                      {/* Leader Contact Card */}
                      <div className="bg-white p-3 rounded-xl border border-gray-200/70 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                            <Phone size={13} className="text-indigo-600" /> Kontak Ketua PKS:
                          </span>
                          {leaders.map((ldr, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs">
                              <span className="font-medium text-indigo-900">{ldr.name}</span>
                              {ldr.phone ? (
                                <div className="flex items-center gap-1 ml-1">
                                  <button
                                    onClick={() => openWhatsApp(ldr.phone, `Shalom ${ldr.name}, kami dari Admin GBI Jeltim terkait PKS ${pksName}...`)}
                                    className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-0.5"
                                    title="Kirim pesan WhatsApp"
                                  >
                                    <MessageSquare size={12} /> {ldr.phone}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">(Belum ada no telp)</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenPlotDialog(undefined, pksName)}
                              className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200"
                            >
                              <Calendar size={13} /> Plot Jadwal/Ruangan
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      {canEdit && (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button onClick={() => openPicker(komsel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                            <UserPlus size={13} /> Tambah Anggota
                          </button>
                          <button onClick={() => handleOpenDialog(komsel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">
                            <Edit2 size={13} /> Edit PKS
                          </button>
                          <button onClick={() => handleDelete(komsel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">
                            <Trash2 size={13} /> Hapus PKS
                          </button>
                        </div>
                      )}

                      {/* Members Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {members.map((m: any) => (
                          <div key={m.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs flex items-start gap-3">
                            <MemberAvatar m={m} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-gray-900 break-words">{m.name}</p>
                              {m.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} />{m.phone}</p>}
                              {m.address && <p className="text-[11px] text-gray-400 break-words">{m.address}</p>}
                            </div>
                            {canEdit && (
                              <button
                                title="Keluarkan dari PKS"
                                disabled={busyId === m.id}
                                onClick={() => assign(m.id, '')}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 flex-shrink-0"
                              >
                                <UserMinus size={15} />
                              </button>
                            )}
                          </div>
                        ))}
                        {members.length === 0 && (
                          <p className="text-xs text-gray-400 col-span-full py-4 text-center">
                            Belum ada jemaat di PKS ini. Pilih PKS ini di Data Jemaat, atau klik Tambah Anggota.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: PLOTTING RUANGAN & JADWAL PKS                           */}
      {/* ============================================================= */}
      {activeTab === 'plot' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Plot Actions & Filter */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" /> Jadwal Plotting Ruangan Per Minggu
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Pantau alokasi ruangan setiap PKS dan cegah jadwal bertabrakan secara real-time.</p>
            </div>
            {canEdit && (
              <button
                onClick={() => handleOpenPlotDialog()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
              >
                <Plus size={15} />Tambah Plot Ruangan
              </button>
            )}
          </div>

          {/* Conflict Alert Banner (If Any Collision Exists) */}
          {conflicts.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm animate-pulse-subtle">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 text-red-700 rounded-xl flex-shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-red-900 text-sm">
                      PERINGATAN: Terdeteksi {conflicts.length} Jadwal Ruangan Bertabrakan!
                    </h4>
                    <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Konflik Ruangan
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    Ada beberapa PKS yang di-plot pada ruangan yang sama di jam yang bertabrakan. Hubungi Ketua PKS terkait untuk koordinasi pergeseran ruangan atau jam:
                  </p>

                  <div className="mt-3 space-y-2.5">
                    {conflicts.map((conf, idx) => {
                      const ldrA = conf.plotA.leaders[0] || { name: conf.plotA.pksName, phone: '' };
                      const ldrB = conf.plotB.leaders[0] || { name: conf.plotB.pksName, phone: '' };

                      return (
                        <div key={idx} className="bg-white/90 p-3 rounded-xl border border-red-200 text-xs text-gray-800 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-red-700">{conf.room}</span> &bull; <span className="font-semibold">{conf.date}</span>
                            <div className="mt-0.5 text-gray-600">
                              <span className="font-semibold text-gray-900">PKS {conf.plotA.pksName}</span> ({conf.plotA.startTime}-{conf.plotA.endTime})
                              <span className="text-red-600 font-bold mx-1.5">&times;</span>
                              <span className="font-semibold text-gray-900">PKS {conf.plotB.pksName}</span> ({conf.plotB.startTime}-{conf.plotB.endTime})
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* WhatsApp to Leader A */}
                            {ldrA.phone ? (
                              <button
                                onClick={() => openWhatsApp(
                                  ldrA.phone,
                                  `Shalom ${ldrA.name}, mohon koordinasi dari Admin GBI Jeltim terkait plot ruangan ${conf.room} pada ${conf.date} jam ${conf.plotA.startTime}-${conf.plotA.endTime} yang bertabrakan dengan PKS ${conf.plotB.pksName}. Mohon konfirmasi untuk pergeseran ruangan/jadwal. Terima kasih!`
                                )}
                                className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-medium shadow-2xs"
                              >
                                <MessageSquare size={12} /> WA {conf.plotA.pksName} ({ldrA.name})
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400">PKS {conf.plotA.pksName} (no telp belum diisi)</span>
                            )}

                            {/* WhatsApp to Leader B */}
                            {ldrB.phone ? (
                              <button
                                onClick={() => openWhatsApp(
                                  ldrB.phone,
                                  `Shalom ${ldrB.name}, mohon koordinasi dari Admin GBI Jeltim terkait plot ruangan ${conf.room} pada ${conf.date} jam ${conf.plotB.startTime}-${conf.plotB.endTime} yang bertabrakan dengan PKS ${conf.plotA.pksName}. Mohon konfirmasi untuk pergeseran ruangan/jadwal. Terima kasih!`
                                )}
                                className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-medium shadow-2xs"
                              >
                                <MessageSquare size={12} /> WA {conf.plotB.pksName} ({ldrB.name})
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400">PKS {conf.plotB.pksName} (no telp belum diisi)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Week Pill Filter */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setPlotWeekFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${plotWeekFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Semua Tanggal
                </button>
                <button
                  onClick={() => setPlotWeekFilter('this_week')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${plotWeekFilter === 'this_week' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Minggu Ini
                </button>
                <button
                  onClick={() => setPlotWeekFilter('next_week')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${plotWeekFilter === 'next_week' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Minggu Depan
                </button>
              </div>

              {/* Room Filter */}
              <select
                value={plotRoomFilter}
                onChange={e => setPlotRoomFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white text-gray-700"
              >
                <option value="all">Semua Ruangan</option>
                {STANDARD_ROOMS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Plot Search */}
            <div className="relative min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={plotSearch}
                onChange={e => setPlotSearch(e.target.value)}
                placeholder="Cari PKS, ruangan, ketua..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>
          </div>

          {/* Plot List / Cards */}
          <div className="space-y-3">
            {filteredPlots.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 space-y-2">
                <Calendar size={32} className="mx-auto text-gray-300" />
                <p className="text-sm font-medium">Belum ada plotting ruangan untuk filter ini</p>
                {canEdit && (
                  <button
                    onClick={() => handleOpenPlotDialog()}
                    className="text-xs font-semibold text-indigo-600 hover:underline inline-block mt-1"
                  >
                    + Buat Plotting Ruangan Pertama
                  </button>
                )}
              </div>
            ) : (
              filteredPlots.map(plot => {
                const hasConflict = conflictPlotIds.has(plot.id);
                const isBerhalangan = plot.status === 'berhalangan';

                return (
                  <div
                    key={plot.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                      hasConflict
                        ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20'
                        : isBerhalangan
                        ? 'border-amber-200 bg-amber-50/20 opacity-90'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      {/* Left: Info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-base">
                            PKS {plot.pksName}
                          </span>

                          {/* Status Pill */}
                          {isBerhalangan ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Ban size={11} /> Berhalangan (Ruang Bebas)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> Terjadwal Aktif
                            </span>
                          )}

                          {/* Conflict Badge */}
                          {hasConflict && (
                            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                              <AlertTriangle size={11} /> Tabrakan Jadwal!
                            </span>
                          )}
                        </div>

                        {/* Room, Date, Time details */}
                        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            <MapPin size={13} /> {plot.room}
                          </span>
                          <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg font-medium">
                            <Calendar size={13} /> {plot.date}
                          </span>
                          <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg font-medium">
                            <Clock size={13} /> {plot.startTime} - {plot.endTime} WIB
                          </span>
                        </div>

                        {plot.notes && (
                          <p className="text-xs text-gray-500 italic mt-1">Catatan: {plot.notes}</p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      {canEdit && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleTogglePlotBerhalangan(plot)}
                            title={isBerhalangan ? "Aktifkan kembali jadwal" : "Tandai PKS berhalangan"}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-colors ${
                              isBerhalangan
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <Ban size={12} /> {isBerhalangan ? 'Aktifkan' : 'Berhalangan'}
                          </button>
                          <button
                            onClick={() => handleOpenPlotDialog(plot)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200"
                            title="Edit Plot Ruangan"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePlot(plot)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-gray-200"
                            title="Hapus Plot Ruangan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Leader Phone & Direct WA Box */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          Ketua PKS:
                        </span>
                        {plot.leaders.map((ldr, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg text-xs">
                            <span className="font-semibold text-gray-800">{ldr.name}</span>
                            {ldr.phone ? (
                              <div className="flex items-center gap-1.5 ml-1">
                                <a
                                  href={`tel:${ldr.phone}`}
                                  className="text-gray-500 hover:text-gray-800 flex items-center gap-0.5"
                                  title="Telepon Langsung"
                                >
                                  <Phone size={11} /> {ldr.phone}
                                </a>
                                <button
                                  onClick={() => openWhatsApp(
                                    ldr.phone,
                                    `Shalom ${ldr.name}, berikut info plot ruangan untuk PKS ${plot.pksName}:\n📍 Ruangan: ${plot.room}\n📅 Tanggal: ${plot.date}\n⏰ Waktu: ${plot.startTime} - ${plot.endTime}\nStatus: ${isBerhalangan ? 'Berhalangan' : 'Terjadwal'}\n\nTerima kasih Tuhan memberkati!`
                                  )}
                                  className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 ml-1"
                                  title="Kirim Info via WhatsApp"
                                >
                                  <MessageSquare size={12} /> WA
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px] italic">(no telp belum diisi)</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Quick Coordinate via WA Button */}
                      {plot.leaders.some(l => l.phone) && (
                        <button
                          onClick={() => {
                            const first = plot.leaders.find(l => l.phone);
                            if (first) {
                              openWhatsApp(
                                first.phone,
                                `Shalom ${first.name}, kami dari Admin GBI Jeltim terkait plot ruangan PKS ${plot.pksName} (${plot.room}, ${plot.date} jam ${plot.startTime}-${plot.endTime})...`
                              );
                            }
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Send size={11} /> Koordinasi Ketua PKS
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 1: ADD/EDIT KOMSEL                                      */}
      {/* ============================================================= */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingKomsel ? 'Edit Komsel' : 'Tambah Komsel Baru'}</DialogTitle>
        <DialogContent className="space-y-4 pt-2">
          <TextField
            label="Nama PKS (pemimpin)"
            value={formData.pksName}
            onChange={e => setFormData({ ...formData, pksName: e.target.value })}
            fullWidth
            size="small"
            required
            sx={{ mt: 1 }}
            helperText="Nama ini otomatis muncul sebagai pilihan PKS di Data Jemaat"
          />
          <TextField
            label="Nama Komsel (opsional)"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              label="Status"
            >
              <MenuItem value="active">Aktif</MenuItem>
              <MenuItem value="inactive">Nonaktif</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <div className="p-4 flex justify-end gap-2 border-t">
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>Batal</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving || !formData.pksName.trim()}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL 2: ADD/EDIT PLOTTING RUANGAN                            */}
      {/* ============================================================= */}
      <Dialog open={openPlotDialog} onClose={() => setOpenPlotDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center gap-2 font-bold text-gray-900">
          <Calendar size={20} className="text-indigo-600" />
          {editingPlot ? 'Edit Plotting Ruangan PKS' : 'Tambah Plotting Ruangan Baru'}
        </DialogTitle>
        <DialogContent className="space-y-4 pt-2">
          {/* Live Conflict Banner Inside Modal */}
          {dialogConflict && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Perhatian: Ruangan Bertabrakan!</p>
                <p className="mt-0.5">
                  Ruang <strong>{dialogConflict.room}</strong> sudah di-plot oleh <strong>PKS {dialogConflict.pksName}</strong> pada jam {dialogConflict.startTime} - {dialogConflict.endTime}.
                </p>
                <p className="text-[11px] text-red-600 mt-1">
                  Anda tetap bisa menyimpan jika memang disengaja, atau ganti ruangan/jam untuk mencegah bentrok.
                </p>
              </div>
            </div>
          )}

          {/* Select PKS */}
          <FormControl fullWidth size="small" sx={{ mt: 1 }} required>
            <InputLabel>Pilih PKS</InputLabel>
            <Select
              value={plotForm.pksName}
              onChange={e => handlePksSelectInPlot(e.target.value)}
              label="Pilih PKS"
            >
              {komsels.map(k => {
                const name = k.pksName || k.name;
                return (
                  <MenuItem key={k.id} value={name}>
                    PKS {name} ({k.memberCount || 0} orang)
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Select Ruangan */}
          <FormControl fullWidth size="small" sx={{ mt: 2 }} required>
            <InputLabel>Ruangan / Lokasi</InputLabel>
            <Select
              value={plotForm.room}
              onChange={e => setPlotForm({ ...plotForm, room: e.target.value })}
              label="Ruangan / Lokasi"
            >
              {STANDARD_ROOMS.map(r => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
              <MenuItem value="Lainnya">Ruangan Lainnya (Kustom)...</MenuItem>
            </Select>
          </FormControl>

          {plotForm.room === 'Lainnya' && (
            <TextField
              label="Nama Ruangan Kustom"
              value={plotForm.customRoom}
              onChange={e => setPlotForm({ ...plotForm, customRoom: e.target.value })}
              fullWidth
              size="small"
              required
              sx={{ mt: 2 }}
              placeholder="contoh: Lantai 2 R. Kasih"
            />
          )}

          {/* Date Picker */}
          <TextField
            label="Tanggal"
            type="date"
            value={plotForm.date}
            onChange={e => setPlotForm({ ...plotForm, date: e.target.value })}
            fullWidth
            size="small"
            required
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          {/* Time Pickers */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <TextField
              label="Jam Mulai"
              type="time"
              value={plotForm.startTime}
              onChange={e => setPlotForm({ ...plotForm, startTime: e.target.value })}
              fullWidth
              size="small"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Jam Selesai"
              type="time"
              value={plotForm.endTime}
              onChange={e => setPlotForm({ ...plotForm, endTime: e.target.value })}
              fullWidth
              size="small"
              required
              InputLabelProps={{ shrink: true }}
            />
          </div>

          {/* Status */}
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>Status Jadwal</InputLabel>
            <Select
              value={plotForm.status}
              onChange={e => setPlotForm({ ...plotForm, status: e.target.value as any })}
              label="Status Jadwal"
            >
              <MenuItem value="active">🟢 Terjadwal Aktif</MenuItem>
              <MenuItem value="berhalangan">🟡 Berhalangan (Ruang Bebas)</MenuItem>
              <MenuItem value="completed">⚪ Selesai</MenuItem>
            </Select>
          </FormControl>

          {/* Leaders section (Auto populated & editable) */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700">Kontak Ketua / Pemimpin PKS:</label>
              <button
                type="button"
                onClick={() => setPlotForm(prev => ({
                  ...prev,
                  leaders: [...prev.leaders, { name: '', phone: '', role: 'Co-Leader' }]
                }))}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus size={12} /> Tambah Ketua/Kontak
              </button>
            </div>

            {plotForm.leaders.map((ldr, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                <div className="col-span-6">
                  <input
                    value={ldr.name}
                    onChange={e => {
                      const updated = [...plotForm.leaders];
                      updated[idx].name = e.target.value;
                      setPlotForm({ ...plotForm, leaders: updated });
                    }}
                    placeholder="Nama Ketua PKS"
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div className="col-span-5">
                  <input
                    value={ldr.phone}
                    onChange={e => {
                      const updated = [...plotForm.leaders];
                      updated[idx].phone = e.target.value;
                      setPlotForm({ ...plotForm, leaders: updated });
                    }}
                    placeholder="No. Telp / WhatsApp (08...)"
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = plotForm.leaders.filter((_, i) => i !== idx);
                      setPlotForm({ ...plotForm, leaders: updated });
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <TextField
            label="Catatan Tambahan (opsional)"
            value={plotForm.notes}
            onChange={e => setPlotForm({ ...plotForm, notes: e.target.value })}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={{ mt: 2 }}
            placeholder="contoh: Membutuhkan projector dan sound system"
          />
        </DialogContent>
        <div className="p-4 flex justify-end gap-2 border-t">
          <Button onClick={() => setOpenPlotDialog(false)} disabled={plotSaving}>Batal</Button>
          <Button
            variant="contained"
            onClick={handleSavePlot}
            disabled={plotSaving || !plotForm.pksName || !plotForm.date}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            {plotSaving ? 'Menyimpan...' : 'Simpan Plotting'}
          </Button>
        </div>
      </Dialog>

      {/* Member Picker Dialog */}
      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Tambah ke PKS {pickerFor.pksName || pickerFor.name}</h3>
              <button onClick={() => setPickerFor(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-4 border-b">
              <input
                autoFocus
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Cari nama jemaat..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {pickerList.map(m => (
                <button
                  key={m.id}
                  disabled={busyId === m.id}
                  onClick={() => assign(m.id, pickerFor.pksName || pickerFor.name)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  <MemberAvatar m={m} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 break-words">{m.name}</p>
                    {m.pksName && <p className="text-xs text-purple-600">Saat ini: PKS {m.pksName}</p>}
                  </div>
                  <Plus size={16} className="text-emerald-600 flex-shrink-0" />
                </button>
              ))}
              {pickerList.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Tidak ada jemaat yang cocok</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
