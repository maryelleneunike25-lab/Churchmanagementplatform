import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { Plus, Edit, Trash2, Users, ChevronDown, ChevronRight, X, Check, Phone, MapPin, Calendar } from 'lucide-react';
import { projectId } from '/utils/supabase/info';
import { IBADAH_LABEL } from '../../../lib/ibadahOptions';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const KV = 'kv_store_561004a0';
const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface Komsel {
  id: string;
  pksName: string;
  name: string;
  day: string;
  time: string;
  location: string;
  memberCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface CongMember {
  id: string;
  name: string;
  nickname?: string;
  phone?: string;
  gender: 'male' | 'female';
  birthDate: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  spouseName?: string;
  children?: { name: string; birthDate?: string }[];
  ibadah?: string[];
  pelayan?: string[];
  baptismStatus?: 'sudah' | 'belum';
  pksName?: string;
  status: 'active' | 'inactive' | 'new';
}

const BLANK_FORM = {
  pksName: '', name: '', day: '', time: '', location: '', status: 'active' as 'active' | 'inactive',
};

function getAge(birthDate: string) {
  if (!birthDate) return -1;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return -1;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function KomselManagement() {
  const { accessToken, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || (user?.permissions as any)?.editKomsel || false;

  const [komsels, setKomsels] = useState<Komsel[]>([]);
  const [congMembers, setCongMembers] = useState<CongMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKomsel, setEditingKomsel] = useState<Komsel | null>(null);
  const [formData, setFormData] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [expandedPks, setExpandedPks] = useState<Set<string>>(new Set());

  // ── Load komsel schedule data from API ────────────────────────────────────
  const loadKomsels = async () => {
    try {
      const res = await fetch(`${API_URL}/komsel/list`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.success) setKomsels(result.komsels || []);
      else setError(result.error || 'Gagal memuat data komsel');
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── Load congregation members directly from kv_store ─────────────────────
  const loadCongMembers = async () => {
    const [{ data: d1 }, { data: d2 }] = await Promise.all([
      supabaseAdmin.from(KV).select('key,value').like('key', 'congregation:member:%'),
      supabaseAdmin.from(KV).select('key,value').like('key', 'member:%'),
    ]);
    const seen = new Set<string>();
    const members: CongMember[] = [];
    for (const r of [...(d1 || []), ...(d2 || [])]) {
      const m = r.value as any;
      if (!m?.id || seen.has(m.id)) continue;
      seen.add(m.id);
      members.push(m as CongMember);
    }
    setCongMembers(members);
  };

  useEffect(() => {
    Promise.all([loadKomsels(), loadCongMembers()]).finally(() => setLoading(false));
  }, []);

  useAutoRefresh(() => { loadKomsels(); loadCongMembers(); }, 30_000);

  // ── Group congregation members by pksName ─────────────────────────────────
  const membersByPks = useMemo(() => {
    const map: Record<string, CongMember[]> = {};
    for (const m of congMembers) {
      const pks = m.pksName?.trim();
      if (!pks) continue;
      if (!map[pks]) map[pks] = [];
      map[pks].push(m);
    }
    // Sort members within each PKS by name
    for (const pks of Object.keys(map)) {
      map[pks].sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [congMembers]);

  // All unique PKS names from both komsel data and congregation members
  const allPksNames = useMemo(() => {
    const s = new Set<string>();
    komsels.forEach(k => { if (k.pksName) s.add(k.pksName); });
    Object.keys(membersByPks).forEach(p => s.add(p));
    return Array.from(s).sort();
  }, [komsels, membersByPks]);

  const toggleExpand = (pks: string) => {
    setExpandedPks(prev => {
      const next = new Set(prev);
      if (next.has(pks)) next.delete(pks); else next.add(pks);
      return next;
    });
  };

  const expandAll = () => setExpandedPks(new Set(allPksNames));
  const collapseAll = () => setExpandedPks(new Set());

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const handleOpenDialog = (komsel?: Komsel) => {
    if (komsel) {
      setEditingKomsel(komsel);
      setFormData({ pksName: komsel.pksName || '', name: komsel.name, day: komsel.day, time: komsel.time, location: komsel.location, status: komsel.status });
    } else {
      setEditingKomsel(null);
      setFormData({ ...BLANK_FORM });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.pksName.trim() || !formData.name.trim()) return;
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
    if (!confirm('Hapus jadwal komsel ini?')) return;
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
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{allPksNames.length}</p>
          <p className="text-xs text-purple-600 mt-0.5">PKS Aktif</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{congMembers.filter(m => m.pksName).length}</p>
          <p className="text-xs text-blue-600 mt-0.5">Jemaat di PKS</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{komsels.filter(k => k.status === 'active').length}</p>
          <p className="text-xs text-green-600 mt-0.5">Jadwal Aktif</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── PKS Cards ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {allPksNames.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
            Belum ada data PKS/Komsel
          </div>
        ) : (
          allPksNames.map(pksName => {
            const komsel = komsels.find(k => k.pksName === pksName);
            const members = membersByPks[pksName] || [];
            const expanded = expandedPks.has(pksName);

            return (
              <div key={pksName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* PKS Header Row */}
                <div
                  onClick={() => toggleExpand(pksName)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/80 transition-colors cursor-pointer select-none">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">PKS {pksName}</h3>
                      {komsel ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${komsel.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {komsel.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-600">
                          Belum ada jadwal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                      {komsel && komsel.day && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />{komsel.day}{komsel.time ? `, ${komsel.time}` : ''}
                        </span>
                      )}
                      {komsel && komsel.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />{komsel.location}
                        </span>
                      )}
                      <span className="font-medium text-purple-600">{members.length} jemaat</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {canEdit && (
                      <button
                        onClick={e => { e.stopPropagation(); handleOpenDialog(komsel || { pksName } as Komsel); }}
                        title={komsel ? 'Edit jadwal' : 'Tambah jadwal'}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        {komsel ? <Edit size={14} /> : <Plus size={14} />}
                      </button>
                    )}
                    {canEdit && komsel && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(komsel.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                    {expanded
                      ? <ChevronDown size={18} className="text-gray-400" />
                      : <ChevronRight size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded: congregation members list */}
                {expanded && (
                  <div className="border-t border-gray-100">
                    {members.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-400 italic">
                        Tidak ada jemaat terdaftar di PKS ini
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {members.map(m => {
                          const age = getAge(m.birthDate);
                          return (
                            <div key={m.id} className="px-5 py-3 flex items-start gap-3">
                              {/* Avatar */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Name row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-gray-900">{m.name}</p>
                                  {m.nickname && <span className="text-xs text-gray-400">({m.nickname})</span>}
                                  {age >= 0 && <span className="text-xs text-gray-400">{age} thn</span>}
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : m.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {m.status === 'active' ? 'Aktif' : m.status === 'new' ? 'Baru' : 'Non-aktif'}
                                  </span>
                                  {m.baptismStatus === 'sudah' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-50 text-cyan-600 border border-cyan-100">Baptis ✓</span>
                                  )}
                                </div>
                                {/* Phone */}
                                {m.phone && (
                                  <a href={`https://wa.me/${m.phone.replace(/\D/g,'').replace(/^0/,'62')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1 mt-0.5">
                                    <Phone size={10} />{m.phone}
                                  </a>
                                )}
                                {/* Ibadah badges */}
                                {m.ibadah && m.ibadah.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {m.ibadah.map(code => (
                                      <span key={code} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        {IBADAH_LABEL[code] || code}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {/* Pelayan badges */}
                                {m.pelayan && m.pelayan.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {m.pelayan.map((p, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-orange-50 text-orange-600 border border-orange-100">{p}</span>
                                    ))}
                                  </div>
                                )}
                                {/* Family info */}
                                {(m.spouseName || (m.children && m.children.length > 0)) && (
                                  <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                                    {m.spouseName && (
                                      <div>♥ Pasangan: <span className="font-medium text-gray-700">{m.spouseName}</span></div>
                                    )}
                                    {m.children && m.children.length > 0 && (
                                      <div>
                                        Anak: {m.children.map((c, i) => (
                                          <span key={i} className="font-medium text-gray-700">
                                            {c.name}{c.birthDate ? ` (${c.birthDate.slice(0, 4)})` : ''}{i < (m.children?.length ?? 0) - 1 ? ', ' : ''}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Add/Edit Dialog ────────────────────────────────────────────────── */}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">
                {editingKomsel ? 'Edit Komsel' : 'Tambah Komsel Baru'}
              </h2>
              <button onClick={() => setOpenDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama PKS *</label>
                <input type="text" placeholder="e.g. Budi, Sari, Sandy" value={formData.pksName}
                  onChange={e => setFormData(p => ({ ...p, pksName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Komsel *</label>
                <input type="text" placeholder="Komsel Rabu Malam, dll" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hari</label>
                  <input type="text" placeholder="Rabu" value={formData.day}
                    onChange={e => setFormData(p => ({ ...p, day: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Waktu</label>
                  <input type="time" value={formData.time}
                    onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lokasi</label>
                <input type="text" placeholder="Alamat lengkap komsel" value={formData.location}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setOpenDialog(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSubmit}
                disabled={!formData.pksName.trim() || !formData.name.trim() || saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                {saving
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Check size={14} />}
                {editingKomsel ? 'Simpan Perubahan' : 'Tambah Komsel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
