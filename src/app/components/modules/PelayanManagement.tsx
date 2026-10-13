import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { getAge, getAgeGroup, AGE_GROUP_STYLES } from '../../../lib/age';
import { IBADAH_LABEL } from '../../../lib/ibadahOptions';
import {
  Search, Phone, User, Users, CalendarCheck, Info, Trash2, X,
  Cake, Heart, Baby, MapPin, Mail, AlertTriangle, ExternalLink,
  Check, Loader2, Plus, UserPlus
} from 'lucide-react';

const KV = 'kv_store_561004a0';

// Bidang that feed the Jadwal Pelayanan dropdowns
const SCHEDULE_PELAYAN = [
  { key: 'Pemuji',                  label: 'Pemuji',                 color: 'bg-blue-600' },
  { key: 'Pemusik',                 label: 'Pemusik',                color: 'bg-purple-600' },
  { key: 'Multimedia Produksi',     label: 'Multimedia Produksi',    color: 'bg-indigo-600' },
  { key: 'Multimedia Propresenter', label: 'Multimedia Propresenter', color: 'bg-cyan-600' },
  { key: 'Sound Audio',             label: 'Sound Audio',            color: 'bg-emerald-600' },
  { key: 'Lighting',                label: 'Lighting',               color: 'bg-amber-600' },
  { key: 'Tamborin',                label: 'Tamborin',               color: 'bg-rose-600' },
];

const PELAYAN_LAINNYA = [
  'Dekorasi', 'Pastoral', 'Sekretariat', 'Perjamuan Kudus', 'Usher',
  'Multimedia Weekly News', 'Fotografi', 'Tim Doa',
  'Pengurus ABI', 'Pengurus Teens', 'Pengurus Vessel',
  'Pengurus WBI', 'Pengurus Kompas', 'Pengurus Kowari',
  'Pengurus Koemas', 'PKS', 'Paduan Suara', 'Welcoming Team', 'Tim Kunjungan',
];

const IBADAH_TO_KOMISI: Record<string, string> = {
  WBI: 'wbi',
  ABI: 'sekolah-minggu',
  RBI: 'teens',
  PBI: 'vessel',
  KOMPAS: 'kompas',
  KOWARI: 'kowari',
  KOEMAS: 'koemas',
};

interface Member {
  id: string;
  _storeKey?: string;
  name: string;
  nickname?: string;
  phone?: string;
  phones?: string[];
  email?: string;
  address?: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: string;
  maritalStatus?: string;
  spouseName?: string;
  children?: { name: string; birthDate?: string }[];
  baptismStatus?: string;
  baptismDate?: string;
  status?: string;
  pksName?: string;
  ibadah?: string[];
  pelayan?: string[];
  photoUrl?: string;
  joinDate?: string;
  createdAt?: string;
}

const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  inactive: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  new: 'Jemaat Baru',
  inactive: 'Tidak Aktif',
};

export default function PelayanManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || (user?.permissions as any)?.editJemaat || (user?.permissions as any)?.editPelayan || false;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(() => {
    return searchParams.get('bidang') || searchParams.get('pelayan') || SCHEDULE_PELAYAN[0].key;
  });
  const [search, setSearch] = useState(() => searchParams.get('search') || '');

  // Modals state
  const [infoMember, setInfoMember] = useState<Member | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ member: Member; bidang: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync selected bidang with URL param if it changes
  useEffect(() => {
    const b = searchParams.get('bidang') || searchParams.get('pelayan');
    if (b) {
      setSelected(b);
    }
    const s = searchParams.get('search');
    if (s !== null && s !== undefined) {
      setSearch(s);
    }
  }, [searchParams]);

  const loadMembers = async () => {
    try {
      const [{ data: d1 }, { data: d2 }] = await Promise.all([
        supabase.from(KV).select('key, value').like('key', 'congregation:member:%'),
        supabase.from(KV).select('key, value').like('key', 'member:%'),
      ]);
      const seen = new Set<string>();
      const list: Member[] = [];
      for (const r of [...(d1 || []), ...(d2 || [])]) {
        const m = r.value as any;
        if (!m?.name) continue;
        const id = m.id || r.key;
        if (seen.has(id)) continue;
        seen.add(id);
        list.push({
          id,
          _storeKey: r.key,
          name: m.name,
          nickname: m.nickname,
          phone: m.phone || (m.phones || [])[0] || '',
          phones: m.phones && m.phones.length > 0 ? m.phones : (m.phone ? [m.phone] : []),
          email: m.email || '',
          address: m.address || '',
          birthDate: m.birthDate || '',
          birthPlace: m.birthPlace || '',
          gender: m.gender || '',
          maritalStatus: m.maritalStatus || 'single',
          spouseName: m.spouseName || '',
          children: Array.isArray(m.children) ? m.children : [],
          baptismStatus: m.baptismStatus || 'belum',
          baptismDate: m.baptismDate || '',
          status: m.status || 'active',
          pksName: m.pksName || '',
          ibadah: Array.isArray(m.ibadah) ? m.ibadah : [],
          pelayan: Array.isArray(m.pelayan) ? m.pelayan : [],
          photoUrl: m.photoUrl,
          joinDate: m.joinDate || '',
          createdAt: m.createdAt || '',
        });
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setMembers(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);
  useAutoRefresh(loadMembers, 30_000);

  // Auto hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const extraBidang = useMemo(() => {
    const known = new Set([...SCHEDULE_PELAYAN.map(p => p.key), ...PELAYAN_LAINNYA]);
    const extra = new Set<string>();
    members.forEach(m => (m.pelayan || []).forEach(p => { if (p && !known.has(p)) extra.add(p); }));
    return [...extra].sort((a, b) => a.localeCompare(b, 'id'));
  }, [members]);

  const countOf = (key: string) => members.filter(m => (m.pelayan || []).includes(key)).length;
  const totalPelayan = members.filter(m => (m.pelayan || []).length > 0).length;
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => members
    .filter(m => (q ? true : (m.pelayan || []).includes(selected)))
    .filter(m => !q || (m.pelayan || []).length > 0)
    .filter(m => !q || m.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'id')), [members, selected, q]);

  // Add Member Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  // Handle adding a member from congregation to selected bidang
  const handleAddMemberToBidang = async (targetMember: Member) => {
    if (!canEdit) return;
    setAddingMemberId(targetMember.id);
    try {
      const currentPelayan = targetMember.pelayan || [];
      if (currentPelayan.includes(selected)) {
        setToastMessage(`${targetMember.name} sudah terdaftar di bidang ${selected}`);
        return;
      }

      const newPelayan = [...currentPelayan, selected];
      const key = targetMember._storeKey || (targetMember.id.startsWith('congregation:member:') ? targetMember.id : `congregation:member:${targetMember.id}`);

      const { data: cur } = await supabase.from(KV).select('value').eq('key', key).maybeSingle();
      const updatedValue = {
        ...(cur?.value || targetMember),
        pelayan: newPelayan,
        updatedAt: new Date().toISOString(),
      };
      await supabase.from(KV).update({ value: updatedValue }).eq('key', key);

      // Update state
      setMembers(prev => prev.map(m => m.id === targetMember.id ? { ...m, pelayan: newPelayan } : m));
      setToastMessage(`${targetMember.name} berhasil ditambahkan ke bidang ${selected}`);
    } catch (err: any) {
      alert(`Gagal menambahkan pelayan: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setAddingMemberId(null);
    }
  };

  // Handle removing pelayan role
  const handleRemovePelayan = async () => {
    if (!deleteConfirm) return;
    const { member, bidang } = deleteConfirm;
    setDeleting(true);
    try {
      const newPelayan = (member.pelayan || []).filter(p => p !== bidang);
      const key = member._storeKey || (member.id.startsWith('congregation:member:') ? member.id : `congregation:member:${member.id}`);

      // Fetch existing record or update directly
      const { data: cur } = await supabase.from(KV).select('value').eq('key', key).maybeSingle();
      const updatedValue = {
        ...(cur?.value || member),
        pelayan: newPelayan,
        updatedAt: new Date().toISOString(),
      };
      await supabase.from(KV).update({ value: updatedValue }).eq('key', key);

      // Update local state
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, pelayan: newPelayan } : m));
      setToastMessage(`${member.name} berhasil dihapus dari bidang ${bidang}`);
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(`Gagal menghapus pelayan: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setDeleting(false);
    }
  };

  const Tile = ({ k, label, color, linked }: { k: string; label: string; color?: string; linked?: boolean }) => {
    const active = selected === k && !q;
    const n = countOf(k);
    return (
      <button onClick={() => { setSelected(k); setSearch(''); }}
        className={`text-left rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${active
          ? `${color || 'bg-gray-800'} text-white border-transparent shadow-md`
          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold leading-tight break-words">{label}</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${active ? 'bg-white/25' : n > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>{n}</span>
        </div>
        {linked && <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${active ? 'text-white/70' : 'text-gray-400'}`}><CalendarCheck size={9} />Jadwal</p>}
      </button>
    );
  };

  const activeDef = SCHEDULE_PELAYAN.find(p => p.key === selected);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto w-full">
        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
            <Check size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{loading ? '—' : totalPelayan}</p>
            <p className="text-xs text-blue-600">Total Pelayan</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{SCHEDULE_PELAYAN.filter(p => countOf(p.key) > 0).length + PELAYAN_LAINNYA.filter(p => countOf(p) > 0).length + extraBidang.length}</p>
            <p className="text-xs text-emerald-600">Bidang Terisi</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{members.length}</p>
            <p className="text-xs text-purple-600">Total Jemaat</p>
          </div>
        </div>

        {/* Schedule connected */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Terhubung ke Jadwal Pelayanan</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {SCHEDULE_PELAYAN.map(p => <Tile key={p.key} k={p.key} label={p.label} color={p.color} linked />)}
          </div>
        </section>

        {/* Other divisions */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bidang Lainnya</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {PELAYAN_LAINNYA.map(p => <Tile key={p} k={p} label={p} />)}
            {extraBidang.map(p => <Tile key={p} k={p} label={p} />)}
          </div>
        </section>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama pelayan di semua bidang..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Selected header banner */}
        <div className={`${q ? 'bg-gray-800' : activeDef?.color || 'bg-gray-800'} rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm`}>
          <div className="min-w-0">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{q ? 'Hasil Pencarian' : 'Bidang Pelayanan'}</p>
            <p className="text-white font-bold text-base break-words">{q ? `“${search}”` : selected}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {canEdit && !q && (
              <button
                type="button"
                onClick={() => { setPickerSearch(''); setPickerOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer border border-white/20 shadow-xs"
                title={`Tambah anggota jemaat ke bidang ${selected}`}
              >
                <UserPlus size={14} />
                <span>Tambah Anggota</span>
              </button>
            )}
            <div className="text-right">
              <p className="text-white font-bold text-2xl leading-none">{loading ? '—' : filtered.length}</p>
              <p className="text-white/60 text-[10px]">pelayan</p>
            </div>
          </div>
        </div>

        {/* List of pelayan cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Memuat data pelayan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3"><User size={24} className="text-gray-400" /></div>
            <p className="font-semibold text-gray-600 text-sm">{q ? 'Tidak ada yang cocok' : `Belum ada pelayan di bidang ${selected}`}</p>
            {!q && canEdit && (
              <button
                type="button"
                onClick={() => { setPickerSearch(''); setPickerOpen(true); }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Pilih dari Data Jemaat</span>
              </button>
            )}
            {!q && !canEdit && <p className="text-xs text-gray-400 mt-1">Tambah lewat Data Jemaat → Edit → Pelayanan</p>}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(m => (
              <div key={m.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                {m.photoUrl
                  ? <img src={m.photoUrl} alt={m.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                  : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">{initials(m.name)}</div>}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm break-words">{m.name}</p>
                    {m.nickname && <span className="text-xs text-gray-400">({m.nickname})</span>}
                  </div>
                  
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {m.gender ? (m.gender === 'male' ? 'Laki-laki' : 'Perempuan') : ''}
                    {m.gender && m.status ? ' · ' : ''}
                    <span className={m.status === 'active' ? 'text-emerald-600 font-medium' : m.status === 'new' ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                      {STATUS_LABEL[m.status || 'active'] || m.status}
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(m.pelayan || []).map(p => (
                      <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded-md ${p === selected && !q ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-500'}`}>{p}</span>
                    ))}
                  </div>
                </div>

                {/* Actions: Phone WA, Info Detail, Hapus */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {m.phone && (
                    <a href={`https://wa.me/${m.phone.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors text-emerald-600"
                      title="Hubungi WhatsApp">
                      <Phone size={14} />
                    </a>
                  )}
                  
                  {/* Info Button */}
                  <button
                    type="button"
                    onClick={() => setInfoMember(m)}
                    className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors cursor-pointer"
                    title="Lihat Info Detail Jemaat">
                    <Info size={14} />
                  </button>

                  {/* Hapus Button */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ member: m, bidang: selected })}
                      className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors cursor-pointer"
                      title={`Hapus dari ${selected}`}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── INFO MODAL (Detail Jemaat) ── */}
      {infoMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-900 text-base">Info Lengkap Jemaat</h3>
              </div>
              <button onClick={() => setInfoMember(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1">
              {/* Profile Card Header */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                {infoMember.photoUrl ? (
                  <img src={infoMember.photoUrl} alt={infoMember.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    {initials(infoMember.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-bold text-gray-900 leading-snug break-words">{infoMember.name}</h4>
                  {infoMember.nickname && <p className="text-xs text-gray-500">Panggilan: {infoMember.nickname}</p>}
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[infoMember.status || 'active'] || STATUS_STYLE.active}`}>
                      {STATUS_LABEL[infoMember.status || 'active'] || infoMember.status}
                    </span>
                    {infoMember.gender && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {infoMember.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    )}
                    {infoMember.birthDate && getAge(infoMember.birthDate) >= 0 && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${AGE_GROUP_STYLES[getAgeGroup(infoMember.birthDate)]}`}>
                        {getAgeGroup(infoMember.birthDate)} · {getAge(infoMember.birthDate)} thn
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kontak & Alamat</p>
                <div className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-2 text-xs">
                  {infoMember.phones && infoMember.phones.length > 0 ? (
                    infoMember.phones.map((ph, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone size={14} className="text-emerald-500 flex-shrink-0" />
                          <span className="font-medium">{ph}</span>
                        </div>
                        <a href={`https://wa.me/${ph.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors">
                          Kirim WhatsApp
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone size={14} /> Belum ada nomor telepon
                    </div>
                  )}

                  {infoMember.email && (
                    <div className="flex items-center gap-2 text-gray-700 pt-1 border-t border-gray-50">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <a href={`mailto:${infoMember.email}`} className="text-blue-600 hover:underline">{infoMember.email}</a>
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-gray-700 pt-1 border-t border-gray-50">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{infoMember.address || 'Alamat belum diisi'}</span>
                  </div>
                </div>
              </div>

              {/* Personal & Family Details */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data Pribadi & Keluarga</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-1 flex items-center gap-1.5"><Cake size={13} className="text-pink-500" /> Kelahiran</span>
                    <p className="font-semibold text-gray-800">
                      {infoMember.birthPlace ? `${infoMember.birthPlace}, ` : ''}{formatDate(infoMember.birthDate)}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-1 flex items-center gap-1.5"><Heart size={13} className="text-rose-500" /> Pernikahan</span>
                    <p className="font-semibold text-gray-800 capitalize">
                      {infoMember.maritalStatus || 'Single'}
                      {infoMember.spouseName ? ` · ${infoMember.spouseName}` : ''}
                    </p>
                  </div>

                  {infoMember.children && infoMember.children.length > 0 && (
                    <div className="col-span-full p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block mb-1 flex items-center gap-1.5"><Baby size={13} className="text-sky-500" /> Anak-anak ({infoMember.children.length})</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {infoMember.children.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs">
                            {c.name} {c.birthDate ? `(${formatDate(c.birthDate)})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-1">Status Baptis</span>
                    <p className="font-semibold text-gray-800">
                      {infoMember.baptismStatus === 'sudah' ? 'Sudah Baptis' : 'Belum Baptis'}
                      {infoMember.baptismDate ? ` (${formatDate(infoMember.baptismDate)})` : ''}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-1">Tanggal Bergabung</span>
                    <p className="font-semibold text-gray-800">{formatDate(infoMember.joinDate || infoMember.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Ministries & Communities */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Komsel, Komisi & Pelayanan</p>
                <div className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-3 text-xs">
                  {/* Komsel */}
                  <div>
                    <span className="text-gray-400 block mb-1">Komsel (PKS):</span>
                    {infoMember.pksName ? (
                      <button
                        type="button"
                        onClick={() => {
                          setInfoMember(null);
                          navigate(`/dashboard?tab=komsel&pks=${encodeURIComponent(infoMember.pksName!)}`);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors inline-flex items-center gap-1 cursor-pointer">
                        <span>PKS {infoMember.pksName}</span>
                        <ExternalLink size={11} />
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">Belum terdaftar di komsel</span>
                    )}
                  </div>

                  {/* Komisi / Ibadah */}
                  <div>
                    <span className="text-gray-400 block mb-1">Komisi / Ibadah:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {infoMember.ibadah && infoMember.ibadah.length > 0 ? (
                        infoMember.ibadah.map(code => {
                          const komId = IBADAH_TO_KOMISI[code];
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => {
                                setInfoMember(null);
                                if (komId) navigate(`/dashboard?tab=komisi&komisi=${encodeURIComponent(komId)}`);
                                else if (code === 'IR') navigate('/dashboard?tab=absensi');
                                else navigate('/dashboard?tab=komisi');
                              }}
                              className="px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer inline-flex items-center gap-1">
                              <span>{IBADAH_LABEL[code] || code}</span>
                              <ExternalLink size={10} />
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-gray-400 italic">Tidak ada komisi tercatat</span>
                      )}
                    </div>
                  </div>

                  {/* Bidang Pelayanan */}
                  <div>
                    <span className="text-gray-400 block mb-1">Semua Bidang Pelayanan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {infoMember.pelayan && infoMember.pelayan.length > 0 ? (
                        infoMember.pelayan.map(p => (
                          <span
                            key={p}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              p === selected ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700'
                            }`}>
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">Tidak ada bidang pelayanan</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setInfoMember(null);
                  navigate(`/dashboard?tab=jemaat&search=${encodeURIComponent(infoMember.name)}`);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                <Users size={14} /> Lihat di Data Jemaat
              </button>
              <button
                type="button"
                onClick={() => setInfoMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Hapus dari Bidang Pelayanan</h3>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.member.name}</strong> dari bidang pelayanan <strong>{deleteConfirm.bidang}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 mb-5">
              <strong>Catatan:</strong> Data jemaat tetap tersimpan di Data Jemaat. Hanya peran pelayanan di bidang ini yang akan dilepas.
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer">
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleRemovePelayan}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MEMBER PICKER MODAL ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Tambah Anggota ke Bidang</h3>
                <p className="text-xs text-gray-500 font-medium">Bidang: <span className="font-bold text-blue-600">{selected}</span></p>
              </div>
              <button onClick={() => setPickerOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari nama jemaat..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-1 divide-y divide-gray-50 max-h-[50vh]">
              {members
                .filter(m => {
                  const q = pickerSearch.trim().toLowerCase();
                  if (!q) return true;
                  return m.name.toLowerCase().includes(q) || (m.nickname || '').toLowerCase().includes(q);
                })
                .slice(0, 50)
                .map(m => {
                  const alreadyIn = (m.pelayan || []).includes(selected);
                  const isBusy = addingMemberId === m.id;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl transition-colors pt-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {initials(m.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {m.phone || 'Tanpa no. telepon'}
                            {m.pksName ? ` · PKS ${m.pksName}` : ''}
                          </p>
                        </div>
                      </div>

                      {alreadyIn ? (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex-shrink-0">
                          Terdaftar
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAddMemberToBidang(m)}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                          <span>{isBusy ? 'Menambahkan...' : 'Pilih'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              {members.filter(m => m.name.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  Tidak ada jemaat yang cocok
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
