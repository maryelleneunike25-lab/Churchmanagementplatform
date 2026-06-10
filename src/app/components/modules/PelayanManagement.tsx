import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Search, ChevronDown, Users, Phone, User } from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

const PELAYAN_OPTIONS = [
  'Pastoral',
  'Sekretariat',
  'Perjamuan Kudus',
  'Usher',
  'Pemuji',
  'Pemusik',
  'Lighting',
  'Sound Audio',
  'Multimedia Propresenter',
  'Multimedia Produksi',
  'Multimedia Weekly News',
  'Fotografi',
  'Tim Doa',
  'Penari',
  'Pengurus ABI',
  'Pengurus Teens',
  'Pengurus Vessel',
  'Pengurus WBI',
  'Pengurus Kompas',
  'Pengurus Kowari',
  'Pengurus Koemas',
  'PKS',
  'Paduan Suara',
  'Welcoming Team',
  'Tim Kunjungan',
];

interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  status: string;
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
  const { accessToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(PELAYAN_OPTIONS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const headers = { Authorization: `Bearer ${accessToken || publicAnonKey}` };
    fetch(`${API_URL}/congregation/members`, { headers })
      .then(r => r.json())
      .then(d => { if (d.members) setMembers(d.members.filter((m: any) => m?.name)); })
      .finally(() => setLoading(false));
  }, []);

  // Count per bidang for the dropdown
  const countByBidang = useMemo(() => {
    const map: Record<string, number> = {};
    PELAYAN_OPTIONS.forEach(opt => {
      map[opt] = members.filter(m => m.pelayan?.includes(opt)).length;
    });
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    return members
      .filter(m => m.pelayan?.includes(selected))
      .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, selected, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Daftar Pelayan</h2>
        <p className="text-sm text-gray-500 mt-1">Lihat anggota tim pelayanan berdasarkan bidang masing-masing</p>
      </div>

      {/* Dropdown + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Bidang dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 shadow-sm min-w-56 justify-between"
          >
            <span className="flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              {selected}
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {countByBidang[selected] ?? 0}
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 z-30 bg-white border border-gray-100 rounded-2xl shadow-xl w-72 max-h-80 overflow-y-auto">
              {PELAYAN_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => { setSelected(opt); setDropdownOpen(false); setSearch(''); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-blue-50 transition-colors text-left ${selected === opt ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                >
                  <span>{opt}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countByBidang[opt] > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    {countByBidang[opt] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama pelayan..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl px-6 py-4 flex items-center justify-between text-white">
        <div>
          <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-0.5">Bidang Pelayanan</p>
          <p className="text-lg font-bold">{selected}</p>
        </div>
        <div className="text-right">
          <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-0.5">Total Pelayan</p>
          <p className="text-3xl font-bold">{filtered.length}</p>
        </div>
      </div>

      {/* Member cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <User size={28} className="text-gray-400" />
          </div>
          <p className="font-medium text-gray-600">
            {search ? 'Tidak ada pelayan yang cocok' : `Belum ada pelayan di bidang ${selected}`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Tambahkan bidang pelayanan lewat menu Data Jemaat
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => (
            <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
              {/* Avatar */}
              <div className={`w-12 h-12 rounded-2xl ${avatarColor(m.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {getInitials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {m.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                  {' · '}
                  <span className={`${m.status === 'active' ? 'text-emerald-600' : m.status === 'new' ? 'text-blue-600' : 'text-gray-400'}`}>
                    {m.status === 'active' ? 'Aktif' : m.status === 'new' ? 'Jemaat Baru' : 'Tidak Aktif'}
                  </span>
                </p>
                {m.phone && (
                  <a
                    href={`https://wa.me/${m.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    <Phone size={12} />
                    {m.phone}
                  </a>
                )}
                {/* Other bidang badges */}
                {m.pelayan && m.pelayan.length > 1 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.pelayan.filter(p => p !== selected).map(p => (
                      <span key={p} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}
