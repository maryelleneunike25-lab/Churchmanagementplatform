import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  baptis:      'Baptisan Air',
  penyerahan:  'Penyerahan Anak',
  konseling:   'Konseling',
  pranikah:    'Kelas Pra-Nikah',
  pemberkatan: 'Pemberkatan Pernikahan',
};

const TYPE_COLORS: Record<string, string> = {
  baptis:      'bg-sky-100 text-sky-700',
  penyerahan:  'bg-orange-100 text-orange-700',
  konseling:   'bg-emerald-100 text-emerald-700',
  pranikah:    'bg-pink-100 text-pink-700',
  pemberkatan: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  baru:     'bg-blue-100 text-blue-700',
  diproses: 'bg-yellow-100 text-yellow-700',
  selesai:  'bg-green-100 text-green-700',
};

interface Registration {
  id: string;
  type: string;
  title: string;
  data: Record<string, string>;
  submittedAt: string;
  status: string;
}



export default function RegistrationManagement() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase
        .from('kv_store_561004a0')
        .select('key, value')
        .like('key', 'registration:%')
        .order('key', { ascending: false });
      if (error) throw error;
      const regs = (data ?? []).map((row: any) => row.value as Registration).filter(Boolean);
      regs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setRegistrations(regs);
    } catch (e: any) {
      setLoadError(e?.message || 'Gagal memuat data. Pastikan SQL migration sudah dijalankan.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (reg: Registration, status: string) => {
    const updated = { ...reg, status };
    await supabase
      .from('kv_store_561004a0')
      .update({ value: updated })
      .eq('key', `registration:${reg.type}:${reg.id}`);
    setRegistrations(prev => prev.map(r => r.id === reg.id ? updated : r));
  };

  const deleteReg = async (reg: Registration) => {
    if (!confirm('Hapus pendaftaran ini?')) return;
    await supabase
      .from('kv_store_561004a0')
      .delete()
      .eq('key', `registration:${reg.type}:${reg.id}`);
    setRegistrations(prev => prev.filter(r => r.id !== reg.id));
  };

  const filtered = filter === 'all' ? registrations : registrations.filter(r => r.type === filter);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const FIELD_LABELS: Record<string, string> = {
    nama: 'Nama Lengkap', namaAyah: 'Nama Ayah', namaIbu: 'Nama Ibu',
    namaAnak: 'Nama Anak', tanggalLahir: 'Tanggal Lahir', tanggalLahirAnak: 'Tanggal Lahir Anak',
    telepon: 'No. Telepon / WA', sudahTerima: 'Sudah Menerima Kristus', topik: 'Topik Konseling',
    namaPria: 'Nama Pria', namaWanita: 'Nama Wanita', tanggalNikah: 'Rencana Nikah',
    tanggalPemberkatan: 'Tanggal Pemberkatan', jumlahTamu: 'Jumlah Tamu', pesan: 'Pesan',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pendaftaran Layanan</h2>
          <p className="text-gray-500 text-sm mt-0.5">Form pendaftaran dari halaman Service</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {loadError} — pastikan edge function sudah di-deploy.
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Semua ({registrations.length})
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => {
          const count = registrations.filter(r => r.type === key).length;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Belum ada pendaftaran</p>
          <p className="text-sm mt-1 text-gray-300">Pendaftaran dari jemaat akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reg => {
            const isOpen = expandedId === reg.id;
            const entries = Object.entries(reg.data || {});
            return (
              <div key={reg.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${TYPE_COLORS[reg.type] || 'bg-gray-100 text-gray-700'}`}>
                        {TYPE_LABELS[reg.type] || reg.type}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[reg.status] || 'bg-gray-100 text-gray-600'}`}>
                        {reg.status === 'baru' ? 'Baru' : reg.status === 'diproses' ? 'Diproses' : 'Selesai'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(reg.submittedAt)}</p>
                  </div>

                  <select
                    value={reg.status}
                    onChange={e => updateStatus(reg, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="baru">Baru</option>
                    <option value="diproses">Diproses</option>
                    <option value="selesai">Selesai</option>
                  </select>

                  <button onClick={() => deleteReg(reg)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>

                  <button onClick={() => setExpandedId(isOpen ? null : reg.id)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-50">
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-4">
                      {entries.map(([key, val]) => {
                        const isPhone = key === 'telepon';
                        const waNumber = isPhone && val ? val.replace(/\D/g, '').replace(/^0/, '62') : null;
                        return (
                          <div key={key}>
                            <p className="text-xs text-gray-400 font-medium mb-0.5">
                              {FIELD_LABELS[key] || key}
                            </p>
                            {isPhone && waNumber ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm text-gray-800 font-medium">{val}</p>
                                <a
                                  href={`https://wa.me/${waNumber}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded-full transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  Chat WA
                                </a>
                                <a
                                  href={`tel:+${waNumber}`}
                                  className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full transition-colors"
                                >
                                  Telepon
                                </a>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-800 font-medium break-words">{val || '—'}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
