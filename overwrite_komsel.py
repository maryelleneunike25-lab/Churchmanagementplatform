import os

code = '''import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Users, Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, User as UserIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, TextField, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import { projectId } from '/utils/supabase/info';
import { useKomsels, Komsel } from '../../../lib/komsel';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

const BLANK_FORM = {
  pksName: '', name: '', status: 'active' as 'active' | 'inactive',
};

export default function KomselManagement() {
  const { user, accessToken } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || (user?.permissions as any)?.editKomsel || false;

  const { komsels, loading, refetch: loadKomsels } = useKomsels();
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKomsel, setEditingKomsel] = useState<Komsel | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedPks, setExpandedPks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ ...BLANK_FORM });

  const expandAll = () => setExpandedPks(new Set(komsels.map(k => k.id)));
  const collapseAll = () => setExpandedPks(new Set());

  useAutoRefresh(() => { loadKomsels(); }, 30_000);

  // CRUD
  const handleOpenDialog = (komsel?: Komsel) => {
    if (komsel) {
      setEditingKomsel(komsel);
      setFormData({ pksName: komsel.pksName || '', name: komsel.name, status: (komsel.status as any) || 'active' });
    } else {
      setEditingKomsel(null);
      setFormData({ ...BLANK_FORM });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const url = editingKomsel ? `${API_URL}/komsel/${editingKomsel.id}` : `${API_URL}/komsel/create`;
      const res = await fetch(url, {
        method: editingKomsel ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) { await loadKomsels(); setOpenDialog(false); }
      else setError(result.error || 'Gagal menyimpan');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus komsel ini?')) return;
    try {
      const res = await fetch(`${API_URL}/komsel/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.success) await loadKomsels();
      else setError(result.error || 'Gagal menghapus');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={22} />Manajemen Komsel & PKS
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg">
            Buka Semua
          </button>
          <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg">
            Tutup Semua
          </button>
          {canEdit && (
            <button onClick={() => handleOpenDialog()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors">
              <Plus size={15} />Tambah Komsel
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {komsels.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
            Belum ada data Komsel/PKS
          </div>
        ) : (
          komsels.map(komsel => {
            const members = komsel.memberDetails || [];
            const expanded = expandedPks.has(komsel.id);
            const pksName = komsel.pksName || komsel.name;

            return (
              <div key={komsel.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                <div onClick={() => setExpandedPks(prev => {
                  const n = new Set(prev);
                  if (n.has(komsel.id)) n.delete(komsel.id);
                  else n.add(komsel.id);
                  return n;
                })}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                  <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500">
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{pksName} {komsel.status !== 'active' && <span className="text-xs text-red-500 font-normal ml-2">(Nonaktif)</span>}</h3>
                    <p className="text-xs text-gray-500">{komsel.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-700">{members.length} Orang</p>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                    {canEdit && (
                      <div className="flex justify-end gap-2 mb-4">
                        <button onClick={() => handleOpenDialog(komsel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          <Edit2 size={13} /> Edit
                        </button>
                        <button onClick={() => handleDelete(komsel.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {members.map(m => (
                        <div key={m.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <UserIcon size={16} className="text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{m.name}</p>
                            {m.phone && <p className="text-xs text-gray-500 truncate">{m.phone}</p>}
                            {m.address && <p className="text-[10px] text-gray-400 truncate">{m.address}</p>}
                          </div>
                        </div>
                      ))}
                      {members.length === 0 && (
                        <p className="text-xs text-gray-400 col-span-full py-4 text-center">Belum ada jemaat di PKS ini</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingKomsel ? 'Edit Komsel' : 'Tambah Komsel Baru'}</DialogTitle>
        <DialogContent className="space-y-4 pt-2">
          <TextField label="Nama PKS (Opsional)" value={formData.pksName} onChange={e => setFormData({ ...formData, pksName: e.target.value })} fullWidth size="small" sx={{ mt: 1 }} />
          <TextField label="Nama Komsel" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} fullWidth size="small" required />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} label="Status">
              <MenuItem value="active">Aktif</MenuItem>
              <MenuItem value="inactive">Nonaktif</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <div className="p-4 flex justify-end gap-2 border-t">
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>Batal</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </Dialog>
    </div>
  );
}
'''

with open('src/app/components/modules/KomselManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("done")
