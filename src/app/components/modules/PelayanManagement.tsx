import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Search, Phone, User, Users, CalendarCheck } from 'lucide-react';

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
  'Pastoral', 'Sekretariat', 'Perjamuan Kudus', 'Usher',
  'Multimedia Weekly News', 'Fotografi', 'Tim Doa',
  'Pengurus ABI', 'Pengurus Teens', 'Pengurus Vessel',
  'Pengurus WBI', 'Pengurus Kompas', 'Pengurus Kowari',
  'Pengurus Koemas', 'PKS', 'Paduan Suara', 'Welcoming Team', 'Tim Kunjungan',
];

interface Member {
  id: string;
  name: string;
  phone?: string;
  gender?: string;
  status?: string;
  pelayan?: string[];
  photoUrl?: string;
}

const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export default function PelayanManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(SCHEDULE_PELAYAN[0].key);
  const [search, setSearch] = useState('');

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
          id, name: m.name, phone: m.phone || (m.phones || [])[0] || '', gender: m.gender || '',
          status: m.status || 'active', pelayan: Array.isArray(m.pelayan) ? m.pelayan : [], photoUrl: m.photoUrl,
        });
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setMembers(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);
  useAutoRefresh(loadMembers, 30_000);

  // Any bidang found in the data but not in the known lists is still shown, so nothing is hidden.
  const extraBidang = useMemo(() => {
    const known = new Set([...SCHEDULE_PELAYAN.map(p => p.key), ...PELAYAN_LAINNYA]);
    const extra = new Set<string>();
    members.forEach(m => (m.pelayan || []).forEach(p => { if (p && !known.has(p)) extra.add(p); }));
    return [...extra].sort((a, b) => a.localeCompare(b, 'id'));
  }, [members]);

  const countOf = (key: string) => members.filter(m => (m.pelayan || []).includes(key)).length;
  const totalPelayan = members.filter(m => (m.pelayan || []).length > 0).length;
  const q = search.trim().toLowerCase();

  // Searching looks across every bidang; otherwise show the selected one.
  const filtered = useMemo(() => members
    .filter(m => (q ? true : (m.pelayan || []).includes(selected)))
    .filter(m => !q || (m.pelayan || []).length > 0)
    .filter(m => !q || m.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'id')), [members, selected, q]);

  const Tile = ({ k, label, color, linked }: { k: string; label: string; color?: string; linked?: boolean }) => {
    const active = selected === k && !q;
    const n = countOf(k);
    return (
      <button onClick={() => { setSelected(k); setSearch(''); }}
        className={`text-left rounded-xl border px-3 py-2.5 transition-all ${active
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

        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Terhubung ke Jadwal Pelayanan</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {SCHEDULE_PELAYAN.map(p => <Tile key={p.key} k={p.key} label={p.label} color={p.color} linked />)}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bidang Lainnya</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {PELAYAN_LAINNYA.map(p => <Tile key={p} k={p} label={p} />)}
            {extraBidang.map(p => <Tile key={p} k={p} label={p} />)}
          </div>
        </section>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama pelayan di semua bidang..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className={`${q ? 'bg-gray-800' : activeDef?.color || 'bg-gray-800'} rounded-2xl px-4 py-3 flex items-center justify-between`}>
          <div className="min-w-0">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{q ? 'Hasil Pencarian' : 'Bidang'}</p>
            <p className="text-white font-bold text-base break-words">{q ? `“${search}”` : selected}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white font-bold text-2xl leading-none">{loading ? '—' : filtered.length}</p>
            <p className="text-white/60 text-[10px]">pelayan</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Memuat data pelayan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3"><User size={24} className="text-gray-400" /></div>
            <p className="font-semibold text-gray-600 text-sm">{q ? 'Tidak ada yang cocok' : 'Belum ada pelayan di bidang ini'}</p>
            {!q && <p className="text-xs text-gray-400 mt-1">Tambah lewat Data Jemaat → Edit → Pelayanan</p>}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(m => (
              <div key={m.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                {m.photoUrl
                  ? <img src={m.photoUrl} alt={m.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                  : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">{initials(m.name)}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm break-words">{m.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {m.gender ? (m.gender === 'male' ? 'Laki-laki' : 'Perempuan') : ''}
                    {m.gender && m.status ? ' · ' : ''}
                    <span className={m.status === 'active' ? 'text-emerald-600' : m.status === 'new' ? 'text-blue-600' : 'text-gray-400'}>
                      {m.status === 'active' ? 'Aktif' : m.status === 'new' ? 'Baru' : 'Tidak Aktif'}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(m.pelayan || []).map(p => (
                      <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded-md ${p === selected && !q ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-500'}`}>{p}</span>
                    ))}
                  </div>
                </div>
                {m.phone && (
                  <a href={`https://wa.me/${m.phone.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Phone size={15} className="text-emerald-600" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
