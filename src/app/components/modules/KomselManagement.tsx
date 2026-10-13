import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  Users, Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Search,
  SortAsc, SortDesc, UserPlus, UserMinus, Phone, Calendar, Clock,
  MapPin, AlertTriangle, CheckCircle2, MessageSquare, AlertCircle,
  Ban, RefreshCw, Send, Check, Lock, Settings, DoorOpen, Loader2
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, TextField, Select, MenuItem,
  FormControl, InputLabel, Button
} from '@mui/material';
import {
  useKomsels, saveKomsel, deleteKomsel, setMemberPks, loadAllMembers,
  normalizePksName, Komsel, PksPlot, loadAllPlots, savePlot, deletePlot,
  setPlotStatus, detectPlotConflicts, STANDARD_ROOMS, loadRooms, saveRooms,
  getLeadersForPks, PksLeaderContact
} from '../../../lib/komsel';
import ModernDatePicker from '../common/ModernDatePicker';

const BLANK_FORM = {
  pksName: '',
  name: '',
  leader1Name: '',
  leader2Name: '',
  status: 'active' as 'active' | 'inactive',
};

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

  // Managed Rooms State
  const [roomsList, setRoomsList] = useState<string[]>([...STANDARD_ROOMS]);
  const [openRoomsDialog, setOpenRoomsDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [editingRoomVal, setEditingRoomVal] = useState('');
  const [savingRooms, setSavingRooms] = useState(false);

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
      const [data, loadedRooms] = await Promise.all([
        loadAllPlots(),
        loadRooms(),
      ]);
      setPlots(data);
      if (loadedRooms && loadedRooms.length > 0) {
        setRoomsList(loadedRooms);
      }
    } catch (e: any) {
      console.error('Error fetching plots/rooms:', e);
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
      return p.room.trim().toLowerCase() === roomToTest;
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
    if (allMembers.length === 0) {
      loadAllMembers().then(setAllMembers).catch(console.error);
    }
    if (komsel) {
      setEditingKomsel(komsel);
      const existingLeaders = komsel.leaders && komsel.leaders.length > 0
        ? komsel.leaders
        : getLeadersForPks(komsel.pksName || komsel.name, allMembers, komsel.leaders);

      setFormData({
        pksName: komsel.pksName || komsel.name,
        name: komsel.name,
        leader1Name: existingLeaders[0]?.name || komsel.pksName || komsel.name,
        leader2Name: existingLeaders[1]?.name || '',
        status: (komsel.status as any) || 'active',
      });
    } else {
      setEditingKomsel(null);
      setFormData({ ...BLANK_FORM });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    const ldr1 = formData.leader1Name.trim();
    const ldr2 = formData.leader2Name.trim();
    const fallbackPks = ldr1 ? (ldr2 ? `${ldr1} & ${ldr2}` : ldr1) : '';
    const pks = (formData.pksName.trim() || fallbackPks).trim();
    if (!pks) return;

    setSaving(true);
    try {
      const chosenLeaders: PksLeaderContact[] = [];
      if (ldr1) {
        const m1 = allMembers.find(m => m.name.toLowerCase() === ldr1.toLowerCase());
        chosenLeaders.push({
          name: m1?.name || ldr1,
          phone: m1?.phone || (Array.isArray(m1?.phones) ? m1.phones[0] : '') || '',
          role: 'Ketua PKS',
        });
      }
      if (ldr2) {
        const m2 = allMembers.find(m => m.name.toLowerCase() === ldr2.toLowerCase());
        chosenLeaders.push({
          name: m2?.name || ldr2,
          phone: m2?.phone || (Array.isArray(m2?.phones) ? m2.phones[0] : '') || '',
          role: 'Wakil / Co-Leader',
        });
      }

      const oldPks = editingKomsel?.pksName || editingKomsel?.name || '';
      await saveKomsel(
        {
          ...formData,
          pksName: pks,
          name: formData.name.trim() || pks,
          leaders: chosenLeaders.length > 0 ? chosenLeaders : undefined,
        },
        editingKomsel,
        user?.email || ''
      );
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
  // Room Management Handlers (Super Admin Only)
  // -------------------------------------------------------------
  const handleAddRoom = async () => {
    if (!isSuperAdmin) return;
    const name = newRoomName.trim();
    if (!name) return;
    if (roomsList.some(r => r.toLowerCase() === name.toLowerCase())) {
      setError('Ruangan sudah ada di daftar.');
      return;
    }
    const updated = [...roomsList, name];
    setSavingRooms(true);
    try {
      await saveRooms(updated);
      setRoomsList(updated);
      setNewRoomName('');
      setSuccessMsg(`Ruangan "${name}" berhasil ditambahkan.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan ruangan');
    } finally {
      setSavingRooms(false);
    }
  };

  const handleUpdateRoom = async (index: number) => {
    if (!isSuperAdmin) return;
    const val = editingRoomVal.trim();
    if (!val) return;
    const updated = [...roomsList];
    updated[index] = val;
    setSavingRooms(true);
    try {
      await saveRooms(updated);
      setRoomsList(updated);
      setEditingRoomIndex(null);
      setEditingRoomVal('');
      setSuccessMsg('Nama ruangan berhasil diperbarui.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Gagal mengubah ruangan');
    } finally {
      setSavingRooms(false);
    }
  };

  const handleDeleteRoom = async (index: number) => {
    if (!isSuperAdmin) return;
    const targetRoom = roomsList[index];
    if (!confirm(`Hapus ruangan "${targetRoom}" dari daftar?`)) return;
    const updated = roomsList.filter((_, i) => i !== index);
    setSavingRooms(true);
    try {
      await saveRooms(updated);
      setRoomsList(updated);
      setSuccessMsg(`Ruangan "${targetRoom}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus ruangan');
    } finally {
      setSavingRooms(false);
    }
  };

  // -------------------------------------------------------------
  // Plotting Handlers
  // -------------------------------------------------------------
  const handleOpenPlotDialog = (plot?: PksPlot, defaultPksName?: string) => {
    if (plot) {
      setEditingPlot(plot);
      const isCustomRoom = !roomsList.includes(plot.room);
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
        room: roomsList[0] || 'Ruang Ibadah Utama',
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
              const leaders = getLeadersForPks(pksName, allMembers, (komsel as any).leaders);

              return (
                <div key={komsel.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:border-indigo-200 hover:shadow-sm">
                  <div
                    onClick={() => setExpandedPks(prev => { const n = new Set(prev); n.has(komsel.id) ? n.delete(komsel.id) : n.add(komsel.id); return n; })}
                    className="flex items-center gap-3.5 p-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex-shrink-0">
                      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight break-words">
                          PKS {pksName}
                        </h3>
                        {komsel.status !== 'active' ? (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Nonaktif
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Aktif
                          </span>
                        )}
                        {komsel.name && komsel.name !== pksName && (
                          <span className="text-[11px] text-slate-400 font-medium">({komsel.name})</span>
                        )}
                      </div>
                      {/* Leader chips preview */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {leaders.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Belum ada ketua</span>
                        ) : leaders.map((ldr, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-lg">
                            <span className="font-semibold text-slate-800">{ldr.name}</span>
                            {ldr.phone && <span className="text-slate-400">({ldr.phone})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-2xs">
                        <Users size={13} className="text-indigo-500" />
                        <span>{members.length} Orang</span>
                      </span>
                    </div>
                  </div>

                  {expanded && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {/* Control Bar: Leader contact + Quick Actions */}
                      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                            <Phone size={13} className="text-indigo-600" /> Kontak Ketua PKS:
                          </span>
                          {leaders.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Belum ditentukan</span>
                          ) : (
                            leaders.map((ldr, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs">
                                <span className="font-bold text-indigo-950">{ldr.name}</span>
                                {ldr.phone ? (
                                  <button
                                    type="button"
                                    onClick={() => openWhatsApp(ldr.phone, `Shalom ${ldr.name}, kami dari Admin GBI Jeltim terkait PKS ${pksName}...`)}
                                    className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer ml-1"
                                    title="Hubungi via WhatsApp"
                                  >
                                    <MessageSquare size={12} className="text-emerald-600" /> {ldr.phone}
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">(Tanpa no telp)</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Action buttons */}
                        {canEdit && (
                          <div className="flex flex-wrap items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenPlotDialog(undefined, pksName)}
                              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200/80 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Calendar size={13} className="text-indigo-600" />
                              <span>Plot Ruangan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openPicker(komsel)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
                            >
                              <UserPlus size={13} />
                              <span>+ Tambah Anggota</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDialog(komsel)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
                            >
                              <Edit2 size={13} className="text-slate-500" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(komsel)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200/80 rounded-xl transition-colors shadow-2xs cursor-pointer"
                            >
                              <Trash2 size={13} className="text-red-500" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Members Grid Header & Cards */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5 px-1">
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Daftar Anggota PKS ({members.length})
                          </p>
                          {canEdit && members.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openPicker(komsel)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                            >
                              <UserPlus size={12} />
                              <span>Tambah Anggota</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {members.map((m: any) => (
                            <div
                              key={m.id}
                              className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex items-start gap-3"
                            >
                              <MemberAvatar m={m} />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-slate-900 leading-tight break-words">{m.name}</p>
                                {m.phone && (
                                  <button
                                    type="button"
                                    onClick={() => openWhatsApp(m.phone, `Shalom ${m.name}...`)}
                                    className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 mt-1 transition-colors text-left"
                                    title="Hubungi WhatsApp"
                                  >
                                    <Phone size={11} className="text-emerald-600" />
                                    <span>{m.phone}</span>
                                  </button>
                                )}
                                {m.address && (
                                  <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1 break-words line-clamp-2 leading-relaxed">
                                    <MapPin size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                    <span>{m.address}</span>
                                  </p>
                                )}
                              </div>
                              {canEdit && (
                                <button
                                  type="button"
                                  title="Keluarkan dari PKS"
                                  disabled={busyId === m.id}
                                  onClick={() => assign(m.id, '')}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors disabled:opacity-40 flex-shrink-0 cursor-pointer"
                                >
                                  <UserMinus size={14} />
                                </button>
                              )}
                            </div>
                          ))}

                          {members.length === 0 && (
                            <div className="col-span-full py-8 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
                              <Users size={24} className="mx-auto text-slate-300" />
                              <p className="text-xs font-semibold text-slate-600">
                                Belum ada anggota jemaat yang terdaftar di PKS {pksName}
                              </p>
                              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                Anda dapat menambahkan anggota dengan memilih PKS ini pada menu Data Jemaat atau mengklik tombol Tambah Anggota di bawah.
                              </p>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openPicker(komsel)}
                                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  <UserPlus size={13} />
                                  <span>+ Tambah Anggota Sekarang</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
              <p className="text-xs text-gray-500 mt-0.5">Pantau alokasi ruangan setiap PKS dan kelola ruangan tanpa bentrok.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setOpenRoomsDialog(true)}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                title="Kelola Daftar Ruangan"
              >
                <Settings size={14} className="text-gray-500" />
                Kelola Ruangan
                {!isSuperAdmin && <Lock size={12} className="text-amber-500 ml-0.5" />}
              </button>
              {canEdit && (
                <button
                  onClick={() => handleOpenPlotDialog()}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus size={15} />Tambah Plot Ruangan
                </button>
              )}
            </div>
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
                      PERINGATAN: Terdeteksi Ruangan Bertabrakan!
                    </h4>
                    <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Konflik Ruangan
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    Ruangan berikut digunakan oleh lebih dari satu PKS. Hubungi Ketua PKS terkait untuk koordinasi pergeseran ruangan:
                  </p>

                  <div className="mt-3 space-y-2.5">
                    {conflicts.map((conf, idx) => {
                      const ldrA = conf.plotA.leaders[0] || { name: conf.plotA.pksName, phone: '' };
                      const ldrB = conf.plotB.leaders[0] || { name: conf.plotB.pksName, phone: '' };

                      return (
                        <div key={idx} className="bg-white/90 p-3 rounded-xl border border-red-200 text-xs text-gray-800 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-red-700 text-sm">Ruangan {conf.room}</span>
                            <div className="mt-0.5 text-gray-700 font-medium">
                              Digunakan bersamaan oleh <span className="font-bold text-gray-900">PKS {conf.plotA.pksName}</span> dan <span className="font-bold text-gray-900">PKS {conf.plotB.pksName}</span>
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
                {roomsList.map(r => (
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
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
          }
        }}
      >
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {editingKomsel ? 'Edit Data Komsel / PKS' : 'Tambah Komsel Baru'}
              </h3>
              <p className="text-xs text-indigo-200/80">Kelola kelompok sel dan pemimpin PKS terintegrasi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenDialog(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <DialogContent className="p-6 space-y-4 bg-slate-50/50">
          {/* Ketua PKS 1 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Ketua PKS 1 (dari Data Jemaat) <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">Tersinkron Jemaat</span>
            </label>
            <input
              type="text"
              list="congregation-member-list"
              value={formData.leader1Name}
              onChange={e => {
                const val = e.target.value;
                const nextPks = val + (formData.leader2Name ? ` & ${formData.leader2Name}` : '');
                setFormData({
                  ...formData,
                  leader1Name: val,
                  pksName: nextPks,
                });
              }}
              placeholder="Ketik untuk mencari dari Data Jemaat..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Ketua PKS utama (ketik untuk mencari dari Data Jemaat yang sudah ada)
            </p>
          </div>

          {/* Ketua PKS 2 / Co-Leader */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Ketua PKS 2 / Co-Leader (Opsional)</span>
              <span className="text-[10px] text-slate-400 font-normal">Boleh kosong</span>
            </label>
            <input
              type="text"
              list="congregation-member-list"
              value={formData.leader2Name}
              onChange={e => {
                const val = e.target.value;
                const nextPks = (formData.leader1Name || '') + (val ? ` & ${val}` : '');
                setFormData({
                  ...formData,
                  leader2Name: val,
                  pksName: nextPks,
                });
              }}
              placeholder="Kosongkan jika hanya 1 ketua..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Hanya nama yang dipilih yang akan ditampilkan pada daftar & kontak
            </p>
          </div>

          <datalist id="congregation-member-list">
            {allMembers.map(m => (
              <option key={m.id} value={m.name}>
                {m.name} {m.phone ? `(${m.phone})` : ''}
              </option>
            ))}
          </datalist>

          {/* Nama PKS / Tampilan Label */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Nama PKS (Label Grup) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.pksName}
              onChange={e => setFormData({ ...formData, pksName: e.target.value })}
              placeholder="contoh: AGUS DURANTES"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Label PKS (otomatis terisi dari ketua yang dipilih atau sesuaikan manual)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nama Komsel (Opsional) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Nama Komsel (Opsional)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="contoh: Betlehem"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Status */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Status Komsel</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="active">🟢 Aktif</option>
                <option value="inactive">🔴 Nonaktif</option>
              </select>
            </div>
          </div>
        </DialogContent>

        <div className="px-6 py-4 bg-white flex items-center justify-end gap-2.5 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setOpenDialog(false)}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || (!formData.pksName.trim() && !formData.leader1Name.trim())}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Komsel</span>
            )}
          </button>
        </div>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL 2: ADD/EDIT PLOTTING RUANGAN                            */}
      {/* ============================================================= */}
      <Dialog 
        open={openPlotDialog} 
        onClose={() => setOpenPlotDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
          }
        }}
      >
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {editingPlot ? 'Edit Plotting Ruangan PKS' : 'Plot Ruangan & Jadwal PKS'}
              </h3>
              <p className="text-xs text-indigo-200/80">Atur ruangan komsel dan koordinasi jadwal secara rapi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenPlotDialog(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <DialogContent className="p-6 space-y-5 bg-slate-50/50">
          {/* Live Conflict Banner Inside Modal (Room Collision Only) */}
          {dialogConflict && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-xs text-red-800 flex items-start gap-3 shadow-xs">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-900 text-sm">Peringatan: Ruangan Bertabrakan!</p>
                <p className="mt-1 text-red-800">
                  Ruangan <strong>&quot;{dialogConflict.room}&quot;</strong> sudah digunakan oleh <strong>PKS {dialogConflict.pksName}</strong>.
                </p>
                <p className="text-[11px] text-red-600 mt-1">
                  Pilih ruangan lain untuk menghindari bentrok ruangan antar kelompok sel.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field: Pilih PKS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Pilih PKS <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">{komsels.length} PKS Terdaftar</span>
              </label>
              <select
                value={plotForm.pksName}
                onChange={e => handlePksSelectInPlot(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="">-- Pilih Kelompok PKS --</option>
                {komsels.map(k => {
                  const name = k.pksName || k.name;
                  return (
                    <option key={k.id} value={name}>
                      PKS {name} ({k.memberCount || 0} orang)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Field: Ruangan / Lokasi */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <DoorOpen size={14} className="text-indigo-600" />
                  <span>Ruangan / Lokasi <span className="text-rose-500">*</span></span>
                </label>
                <button
                  type="button"
                  onClick={() => setOpenRoomsDialog(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                  title="Kelola Ruangan (Super Admin)"
                >
                  <Settings size={12} />
                  <span>Daftar Ruangan</span>
                  {!isSuperAdmin && <Lock size={10} className="text-amber-500" />}
                </button>
              </div>

              <select
                value={plotForm.room}
                onChange={e => setPlotForm({ ...plotForm, room: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                {roomsList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="Lainnya">+ Ruangan Lainnya (Kustom)...</option>
              </select>

              {plotForm.room === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Ketik nama ruangan kustom..."
                  value={plotForm.customRoom}
                  onChange={e => setPlotForm({ ...plotForm, customRoom: e.target.value })}
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              )}
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tanggal */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal <span className="text-rose-500">*</span>
                </label>
                <ModernDatePicker
                  value={plotForm.date}
                  onChange={val => setPlotForm({ ...plotForm, date: val })}
                  placeholder="Pilih tanggal plotting"
                  minYear={new Date().getFullYear() - 1}
                  maxYear={new Date().getFullYear() + 5}
                />
              </div>

              {/* Jam Mulai */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jam Mulai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={plotForm.startTime}
                  onChange={e => setPlotForm({ ...plotForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Jam Selesai */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jam Selesai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={plotForm.endTime}
                  onChange={e => setPlotForm({ ...plotForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Status Jadwal (Pill Selector) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Status Jadwal</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlotForm({ ...plotForm, status: 'active' })}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  plotForm.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/30'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Terjadwal Aktif</span>
              </button>
              <button
                type="button"
                onClick={() => setPlotForm({ ...plotForm, status: 'berhalangan' })}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  plotForm.status === 'berhalangan'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Berhalangan (Bebas)</span>
              </button>
              <button
                type="button"
                onClick={() => setPlotForm({ ...plotForm, status: 'completed' })}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  plotForm.status === 'completed'
                    ? 'bg-slate-200 text-slate-800 border-slate-400 ring-2 ring-slate-400/30'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Selesai</span>
              </button>
            </div>
          </div>

          {/* Leaders Section */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" />
                <span>Kontak Ketua / Pemimpin PKS (Sync Data Jemaat):</span>
              </label>
              <button
                type="button"
                onClick={() => setPlotForm(prev => ({
                  ...prev,
                  leaders: [...prev.leaders, { name: '', phone: '', role: 'Co-Leader' }]
                }))}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg"
              >
                <Plus size={12} /> Tambah Kontak
              </button>
            </div>

            {plotForm.leaders.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                Belum ada kontak ketua. Pilih PKS di atas atau klik Tambah Kontak.
              </p>
            ) : (
              <div className="space-y-2">
                {plotForm.leaders.map((ldr, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="col-span-6">
                      <input
                        value={ldr.name}
                        list="congregation-member-list"
                        onChange={e => {
                          const val = e.target.value;
                          const updated = [...plotForm.leaders];
                          updated[idx].name = val;
                          const found = allMembers.find(m => m.name.toLowerCase() === val.trim().toLowerCase());
                          if (found && (found.phone || (found.phones && found.phones[0])) && !updated[idx].phone) {
                            updated[idx].phone = found.phone || found.phones[0];
                          }
                          setPlotForm({ ...plotForm, leaders: updated });
                        }}
                        placeholder="Nama Ketua PKS (dari Data Jemaat)"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = plotForm.leaders.filter((_, i) => i !== idx);
                          setPlotForm({ ...plotForm, leaders: updated });
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Hapus kontak"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Catatan Tambahan (opsional)</label>
            <textarea
              value={plotForm.notes}
              onChange={e => setPlotForm({ ...plotForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="contoh: Membutuhkan proyektor dan kabel HDMI tambahan"
            />
          </div>
        </DialogContent>

        <div className="px-6 py-4 bg-white flex items-center justify-end gap-2.5 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setOpenPlotDialog(false)}
            disabled={plotSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSavePlot}
            disabled={plotSaving || !plotForm.pksName || !plotForm.date}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
          >
            {plotSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Plotting</span>
            )}
          </button>
        </div>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL 3: KELOLA RUANGAN (SUPER ADMIN ONLY FOR EDIT/DELETE)    */}
      {/* ============================================================= */}
      <Dialog 
        open={openRoomsDialog} 
        onClose={() => setOpenRoomsDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
          }
        }}
      >
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Kelola Daftar Ruangan</h3>
              <p className="text-xs text-indigo-200/80">Atur ruangan yang tersedia untuk plotting komsel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-full border border-indigo-400/30">
                Super Admin
              </span>
            ) : (
              <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-200 px-2.5 py-1 rounded-full border border-amber-400/30 flex items-center gap-1">
                <Lock size={10} /> Terkunci
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpenRoomsDialog(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <DialogContent className="p-6 space-y-4 bg-slate-50/50">
          {!isSuperAdmin && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2.5 shadow-2xs">
              <Lock size={16} className="text-amber-600 flex-shrink-0" />
              <span>Daftar ruangan terkunci. Anda dapat melihat dan memilih ruangan, namun hanya <strong>Super Admin</strong> yang memiliki izin menambah, mengubah, atau menghapus ruangan.</span>
            </div>
          )}

          {/* Add Room input (Super admin only) */}
          {isSuperAdmin && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Tambah Ruangan Baru</label>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Ketik nama ruangan baru (contoh: Ruang Rapat 2)..."
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRoom();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRoom}
                  disabled={savingRooms || !newRoomName.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex-shrink-0"
                >
                  {savingRooms ? 'Menyimpan...' : '+ Tambah'}
                </button>
              </div>
            </div>
          )}

          {/* Rooms list */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden divide-y divide-slate-100">
            {roomsList.map((r, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                {editingRoomIndex === idx ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editingRoomVal}
                      onChange={e => setEditingRoomVal(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 border border-indigo-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdateRoom(idx);
                        if (e.key === 'Escape') setEditingRoomIndex(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateRoom(idx)}
                      disabled={savingRooms || !editingRoomVal.trim()}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoomIndex(null)}
                      className="text-xs text-slate-500 hover:bg-slate-100 px-2.5 py-2 rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-2xs" />
                      <span className="text-sm font-semibold text-slate-800">{r}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSuperAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoomIndex(idx);
                              setEditingRoomVal(r);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Ubah Nama Ruangan"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Ruangan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 px-2 py-1 flex items-center gap-1 text-[11px] bg-slate-100 rounded-lg" title="Terkunci (Hanya Super Admin)">
                          <Lock size={11} className="text-amber-500" />
                          <span className="text-[10px] text-slate-500 font-semibold">Terkunci</span>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {roomsList.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center italic">Belum ada ruangan yang terdaftar.</p>
            )}
          </div>
        </DialogContent>

        <div className="px-6 py-4 bg-white flex justify-end border-t border-slate-200">
          <button
            type="button"
            onClick={() => setOpenRoomsDialog(false)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
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
