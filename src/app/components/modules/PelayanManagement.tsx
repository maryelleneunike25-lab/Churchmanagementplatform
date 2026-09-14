import { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Search, Phone, User } from 'lucide-react';

const KV = 'kv_store_561004a0';

// Must match CongregationManagement's SCHEDULE_DIVISIONS + PELAYAN_LAINNYA exactly
const SCHEDULE_PELAYAN = [
  { key: 'Pemuji',                 label: 'Pemuji',                  color: 'bg-blue-600' },
  { key: 'Pemusik',                label: 'Pemusik',                  color: 'bg-purple-600' },
  { key: 'Multimedia Produksi',    label: 'Multimedia Produksi',      color: 'bg-indigo-600' },
  { key: 'Multimedia Propresenter',label: 'Multimedia Propresenter',  color: 'bg-cyan-600' },
  { key: 'Sound Audio',            label: 'Sound Audio',              color: 'bg-emerald-600' },
  { key: 'Lighting',               label: 'Lighting',                 color: 'bg-amber-600' },
  { key: 'Tamborin',               label: 'Tamborin',                 color: 'bg-rose-600' },
];

const PELAYAN_LAINNYA = [
  'Pastoral', 'Sekretariat', 'Perjamuan Kudus', 'Usher',
  'Multimedia Weekly News', 'Fotografi', 'Tim Doa',
  'Pengurus ABI', 'Pengurus Teens', 'Pengurus Vessel',
  'Pengurus WBI', 'Pengurus Kompas', 'Pengurus Kowari',
  'Pengurus Koemas', 'PKS', 'Paduan Suara', 'Welcoming Team', 'Tim Kunjungan',
];

const ALL_PELAYAN = [
  ...SCHEDULE_PELAYAN.map(p => p.key),
  ...PELAYAN_LAINNYA,
];

interface Member {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  gender?: string;
  status?: string;
  pelayan?: string[];
  birthDate?: string;
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-indigo-500', 'bg-teal-500', 'bg-pink-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PelayanManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(ALL_PELAYAN[0]);
  const [search, setSearch] = useState('');

  const loadMembers = async () => {
    try {
      const toMember = (r: any): Member | null => {
        const m = r.value as any;
        if (!m?.name) return null;
        return {
          id: m.id || r.key,
          name: m.name,
          phone: m.phone || '',
          email: m.email || '',
          gender: m.gender || '',
          status: m.status || 'active',
          pelayan: m.pelayan || [],
          birthDate: m.birthDate || '',
        };
      };

      const [{ data: d1 }, { data: d2 }] = await Promise.all([
        supabaseAdmin.from(KV).select('key, value').like('key', 'congregation:member:%'),
        supabaseAdmin.from(KV).select('key, value').like('key', 'member:%'),
      ]);

      const seen = new Set<string>();
      const list: Member[] = [];
      for (const r of [...(d1 || []), ...(d2 || [])]) {
        const m = toMember(r);
        if (m && !seen.has(m.id)) { seen.add(m.id); list.push(m); }
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setMembers(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);
  useAutoRefresh(loadMembers, 10_000);

  const countByBidang = useMemo(() => {
    const map: Record<string, number> = {};
    ALL_PELAYAN.forEach(opt => {
      map[opt] = members.filter(m => (m.pelayan || []).includes(opt)).length;
    });
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    return members
      .filter(m => (m.pelayan || []).includes(selected))
      .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [members, selected, search]);

  const isScheduleLinked = SCHEDULE_PELAYAN.some(p => p.key === selected);
  const scheduleColor = SCHEDULE_PELAYAN.find(p => p.key === selected)?.color || 'bg-blue-700';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Daftar Pelayan</h2>
        <p className="text-sm text-gray-500 mt-1">Anggota tim pelayanan berdasarkan bidang — tersinkronisasi dari Data Jemaat</p>
      </div>

      {/* Division pills — schedule-linked at top */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bidang Jadwal Pelayanan</p>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_PELAYAN.map(p => (
            <button key={p.key} onClick={() => { setSelected(p.key); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selected === p.key
                  ? `${p.color} text-white border-transparent shadow-sm`
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              {p.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                selected === p.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{countByBidang[p.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Bidang Lainnya</p>
        <div className="flex flex-wrap gap-2">
          {PELAYAN_LAINNYA.map(opt => (
            <button key={opt} onClick={() => { setSelected(opt); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selected === opt
                  ? 'bg-gray-800 text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {opt}
              {countByBidang[opt] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selected === opt ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>{countByBidang[opt]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama pelayan..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Summary bar */}
      <div className={`${isScheduleLinked ? scheduleColor : 'bg-gradient-to-r from-gray-700 to-gray-800'} rounded-2xl px-6 py-4 flex items-center justify-between text-white`}>
        <div>
          <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-0.5">Bidang Pelayanan</p>
          <p className="text-lg font-bold">{selected}</p>
          {isScheduleLinked && <p className="text-white/60 text-xs mt-0.5">Terhubung ke Jadwal Pelayanan</p>}
        </div>
        <div className="text-right">
          <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-0.5">Total Pelayan</p>
          <p className="text-3xl font-bold">{filtered.length}</p>
        </div>
      </div>

      {/* Member cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Memuat data pelayan...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <User size={28} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-600">
            {search ? 'Tidak ada pelayan yang cocok' : `Belum ada pelayan di bidang ${selected}`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Tambahkan bidang pelayanan melalui menu <strong>Data Jemaat → Edit → Pelayanan</strong>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl ${avatarColor(m.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {getInitials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {m.gender === 'male' ? 'Laki-laki' : m.gender === 'female' ? 'Perempuan' : ''}
                  {m.gender && m.status ? ' · ' : ''}
                  <span className={m.status === 'active' ? 'text-emerald-600' : m.status === 'new' ? 'text-blue-600' : 'text-gray-400'}>
                    {m.status === 'active' ? 'Aktif' : m.status === 'new' ? 'Jemaat Baru' : 'Tidak Aktif'}
                  </span>
                </p>
                {m.phone && (
                  <a href={`https://wa.me/${m.phone.replace(/\D/g,'').replace(/^0/,'62')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
                    <Phone size={12} />{m.phone}
                  </a>
                )}
                {(m.pelayan || []).filter(p => p !== selected).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(m.pelayan || []).filter(p => p !== selected).map(p => (
                      <span key={p} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
