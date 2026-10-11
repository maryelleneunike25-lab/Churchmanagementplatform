import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Users, Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Search, SortAsc, SortDesc, UserPlus, UserMinus, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, TextField, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import { useKomsels, saveKomsel, deleteKomsel, setMemberPks, loadAllMembers, normalizePksName, Komsel } from '../../../lib/komsel';

const BLANK_FORM = { pksName: '', name: '', status: 'active' as 'active' | 'inactive' };

function MemberAvatar({ m }: { m: any }) {
  const initials = (m.name || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  return m.photoUrl
    ? <img src={m.photoUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200" />
    : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{initials}</div>;
}

export default function KomselManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || (user?.permissions as any)?.editKomsel || false;

  const { komsels, loading, refetch: loadKomsels } = useKomsels();
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKomsel, setEditingKomsel] = useState<Komsel | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedPks, setExpandedPks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ ...BLANK_FORM });

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'count'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Add-member picker
  const [pickerFor, setPickerFor] = useState<Komsel | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useAutoRefresh(() => { loadKomsels(); }, 30_000);

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
      // Members are linked by PKS name, so keep the old members attached if the PKS is renamed.
      const oldPks = editingKomsel?.pksName || editingKomsel?.name || '';
      await saveKomsel({ ...formData, pksName: pks, name: formData.name.trim() || pks }, editingKomsel, user?.email || '');
      if (editingKomsel && oldPks && normalizePksName(oldPks) !== normalizePksName(pks)) {
        for (const m of editingKomsel.memberDetails || []) await setMemberPks(m.id, pks);
      }
      await loadKomsels();
      setOpenDialog(false);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (komsel: Komsel) => {
    if (!confirm(`Hapus komsel ${komsel.pksName || komsel.name}? Anggota tidak dihapus dari Data Jemaat, hanya dilepas dari PKS.`)) return;
    try {
      for (const m of komsel.memberDetails || []) await setMemberPks(m.id, '');
      await deleteKomsel(komsel.id);
      await loadKomsels();
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

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={22} />Manajemen Komsel & PKS
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={expandAll} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg">Buka Semua</button>
          <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg">Tutup Semua</button>
          {canEdit && (
            <button onClick={() => handleOpenDialog()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors">
              <Plus size={15} />Tambah Komsel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{komsels.length}</p>
          <p className="text-xs text-purple-600 mt-0.5">Komsel/PKS</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{komsels.reduce((sum, k) => sum + (k.memberCount || 0), 0)}</p>
          <p className="text-xs text-blue-600 mt-0.5">Total Anggota</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{komsels.filter(k => k.status === 'active').length}</p>
          <p className="text-xs text-green-600 mt-0.5">Komsel Aktif</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari PKS atau nama anggota..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={sortKey} onChange={e => setSortKey(e.target.value as any)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="name">Sort: Nama PKS</option>
          <option value="count">Sort: Jumlah Anggota</option>
        </select>
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          {sortDir === 'asc' ? <SortAsc size={15} /> : <SortDesc size={15} />}{sortDir === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk akses edit.
        </div>
      )}

      <div className="space-y-3">
        {shown.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">Belum ada data Komsel/PKS</div>
        ) : shown.map(komsel => {
          const members = (komsel.memberDetails || []).slice().sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'id'));
          const expanded = expandedPks.has(komsel.id) || (!!search.trim() && members.some((m: any) => (m.name || '').toLowerCase().includes(search.trim().toLowerCase())));
          const pksName = komsel.pksName || komsel.name;
          return (
            <div key={komsel.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div onClick={() => setExpandedPks(prev => { const n = new Set(prev); n.has(komsel.id) ? n.delete(komsel.id) : n.add(komsel.id); return n; })}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500">{expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 break-words">PKS {pksName} {komsel.status !== 'active' && <span className="text-xs text-red-500 font-normal ml-2">(Nonaktif)</span>}</h3>
                  {komsel.name && komsel.name !== pksName && <p className="text-xs text-gray-500 break-words">{komsel.name}</p>}
                </div>
                <p className="text-sm font-semibold text-blue-700 flex-shrink-0">{members.length} Orang</p>
              </div>

              {expanded && (
                <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                  {canEdit && (
                    <div className="flex flex-wrap justify-end gap-2 mb-4">
                      <button onClick={() => openPicker(komsel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                        <UserPlus size={13} /> Tambah Anggota
                      </button>
                      <button onClick={() => handleOpenDialog(komsel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">
                        <Edit2 size={13} /> Edit
                      </button>
                      {!komsel.virtual && (
                        <button onClick={() => handleDelete(komsel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">
                          <Trash2 size={13} /> Hapus
                        </button>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {members.map((m: any) => (
                      <div key={m.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3">
                        <MemberAvatar m={m} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 break-words">{m.name}</p>
                          {m.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} />{m.phone}</p>}
                          {m.address && <p className="text-[11px] text-gray-400 break-words">{m.address}</p>}
                        </div>
                        {canEdit && (
                          <button title="Keluarkan dari PKS" disabled={busyId === m.id} onClick={() => assign(m.id, '')}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 flex-shrink-0">
                            <UserMinus size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                    {members.length === 0 && <p className="text-xs text-gray-400 col-span-full py-4 text-center">Belum ada jemaat di PKS ini. Pilih PKS ini di Data Jemaat, atau klik Tambah Anggota.</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add member picker */}
      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Tambah ke PKS {pickerFor.pksName || pickerFor.name}</h3>
              <button onClick={() => setPickerFor(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-4 border-b">
              <input autoFocus value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Cari nama jemaat..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {pickerList.map(m => (
                <button key={m.id} disabled={busyId === m.id} onClick={() => assign(m.id, pickerFor.pksName || pickerFor.name)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 disabled:opacity-50">
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingKomsel ? 'Edit Komsel' : 'Tambah Komsel Baru'}</DialogTitle>
        <DialogContent className="space-y-4 pt-2">
          <TextField label="Nama PKS (pemimpin)" value={formData.pksName} onChange={e => setFormData({ ...formData, pksName: e.target.value })}
            fullWidth size="small" required sx={{ mt: 1 }} helperText="Nama ini otomatis muncul sebagai pilihan PKS di Data Jemaat" />
          <TextField label="Nama Komsel (opsional)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} fullWidth size="small" sx={{ mt: 2 }} />
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} label="Status">
              <MenuItem value="active">Aktif</MenuItem>
              <MenuItem value="inactive">Nonaktif</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <div className="p-4 flex justify-end gap-2 border-t">
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>Batal</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving || !formData.pksName.trim()}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </Dialog>
    </div>
  );
}
