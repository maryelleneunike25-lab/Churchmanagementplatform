import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Clock, MapPin, ChevronRight, X, CheckCircle, Loader2 } from 'lucide-react';
import PublicNavbar from '../components/public/PublicNavbar';
import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

/* ─────────── TYPES ─────────── */
interface Ministry {
  id: string;
  name: string;
  label: string;
  greeting: string;
  headline: string;
  description: string;
  schedules: { day: string; time: string }[];
  location: string;
  photo: string;
  accent: string;
}

interface LayananItem {
  id: string;
  name: string;
  description: string;
  hasForm: boolean;
  formType?: string;
  icon: string;
  accent: string;
  children?: { id: string; name: string; description: string; hasForm: boolean; formType?: string }[];
}

/* ─────────── DATA: ADULT ─────────── */
const ADULT: Ministry[] = [
  {
    id: 'umum',
    name: 'Ibadah Umum',
    label: 'Ibadah utama gereja',
    greeting: 'Selamat datang!',
    headline: 'PINTU TERBUKA UNTUK SEMUA',
    description: 'Ibadah Umum terbuka untuk siapa saja — jemaat lama, tamu, maupun yang baru pertama kali datang. Ada beberapa pilihan sesi setiap minggu, termasuk satu sesi di hari Rabu.',
    schedules: [
      { day: 'Minggu', time: '07.00 – 09.00' },
      { day: 'Minggu', time: '09.30 – 11.30' },
      { day: 'Minggu', time: '17.00 – 19.00' },
      { day: 'Rabu',   time: '18.30 – 20.30' },
    ],
    location: 'Gedung Utama Lantai 1',
    photo: 'https://images.unsplash.com/photo-1570786032462-2efc3ca8fccd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accent: '#60a5fa',
  },
  {
    id: 'koemas',
    name: 'Koemas',
    label: 'Komunitas Senior 55+',
    greeting: 'Hi seniors!',
    headline: 'BERBAGI HIKMAT, BERTUMBUH BERSAMA',
    description: 'Koemas adalah persekutuan untuk jemaat senior usia 55 tahun ke atas. Kegiatannya santai — ibadah bersama, sharing pengalaman hidup, dan saling mendoakan.',
    schedules: [{ day: 'Sabtu Ketiga', time: '10.00 – 12.00' }],
    location: 'Ruang Serbaguna Lantai 2',
    photo: 'https://images.unsplash.com/photo-1641135309090-635897be4dd3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accent: '#fb923c',
  },
  {
    id: 'kowari',
    name: 'Kowari',
    label: 'Komunitas Wanita Mandiri',
    greeting: 'Hi ladies!',
    headline: 'SALING MENGUATKAN, SALING MENDUKUNG',
    description: 'Wanita yang kuat dibutuhkan di rumah, gereja, dan masyarakat. Kowari hadir sebagai persekutuan kaum wanita GBI Jelambar Timur di mana kamu bisa beribadah, berbagi, dan bertumbuh bersama.',
    schedules: [{ day: 'Sabtu', time: '09.00 – 11.30' }],
    location: 'Ruang Utama Lantai 1',
    photo: 'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accent: '#e879f9',
  },
  {
    id: 'wbi',
    name: 'WBI',
    label: 'Wanita Bethel Indonesia',
    greeting: 'Hi sisters!',
    headline: 'SATU VISI, SATU BANGSA',
    description: 'WBI adalah gerakan persekutuan wanita Gereja Bethel Indonesia yang ada di seluruh Indonesia. Di GBI Jelambar Timur, WBI aktif mengadakan ibadah dan kegiatan yang menghubungkan wanita dalam misi yang lebih luas.',
    schedules: [{ day: 'Sabtu Kedua', time: '09.00 – 11.00' }],
    location: 'Ruang Serbaguna Lantai 2',
    photo: 'https://images.unsplash.com/photo-1524601500432-1e1a4c71d692?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accent: '#f472b6',
  },
  {
    id: 'kompas',
    name: 'Kompas',
    label: 'Komunitas Pasutri',
    greeting: 'Hi couples!',
    headline: 'KELUARGA YANG KUAT DIMULAI DARI SINI',
    description: 'Kompas adalah persekutuan khusus pasangan suami-istri yang ingin membangun keluarga di atas fondasi iman. Lewat ibadah dan sharing antar pasangan, Kompas hadir menemani setiap musim dalam pernikahan.',
    schedules: [{ day: 'Sabtu Pertama', time: '16.00 – 18.30' }],
    location: 'Ruang Serbaguna Lantai 2',
    photo: 'https://images.unsplash.com/photo-1645620549807-0aea79c18482?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accent: '#34d399',
  },
  {
    id: 'doa',
    name: 'Persekutuan Doa',
    label: 'Ibadah doa pagi',
    greeting: 'Mulai hari dengan doa.',
    headline: 'BERDOA BERSAMA, HADIRAT YANG NYATA',
    description: 'Persekutuan Doa diadakan dua pagi dalam seminggu — sederhana, tapi bermakna. Berkumpul bersama, berdoa untuk keluarga, gereja, dan bangsa, lalu memulai hari dengan lebih tenang.',
    schedules: [
      { day: 'Rabu',  time: '05.30 – 07.00' },
      { day: 'Jumat', time: '05.30 – 07.00' },
    ],
    location: 'Gedung Utama Lantai 1',
    photo: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accent: '#2dd4bf',
  },
];

/* ─────────── DATA: NXT GEN ─────────── */
const NXT_GEN: Ministry[] = [
  {
    id: 'vessel',
    name: 'Vessel',
    label: 'Pemuda 18–30 tahun',
    greeting: 'Hey pemuda!',
    headline: 'GENERASI YANG SIAP DIPAKAI TUHAN',
    description: 'Vessel adalah komunitas pemuda GBI Jelambar Timur untuk usia 18 sampai 30 tahun. Ibadahnya relevan, diskusinya jujur, dan suasananya jauh dari kaku. Tempat kamu bisa tumbuh dan terhubung dengan teman-teman yang satu iman.',
    schedules: [
      { day: 'Jumat',  time: '18.30 – 21.00' },
      { day: 'Minggu', time: '11.30 – 13.00' },
    ],
    location: 'Ruang Vessel Lantai 3',
    photo: 'https://images.unsplash.com/photo-1521574778337-d962ef81733d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    accent: '#818cf8',
  },
  {
    id: 'teens',
    name: 'Teens',
    label: 'Remaja 13–17 tahun',
    greeting: 'Hi remaja!',
    headline: 'IDENTITASMU LEBIH DARI YANG KAMU KIRA',
    description: 'Teens adalah komunitas remaja GBI Jelambar Timur untuk usia 13 sampai 17 tahun. Programnya dirancang sesuai dunia remaja — jujur, relevan, dan nggak menggurui. Ada ruang buat bertanya, berbagi, dan jadi diri sendiri.',
    schedules: [
      { day: 'Sabtu',  time: '16.00 – 18.00' },
      { day: 'Minggu', time: '09.30 – 11.30' },
    ],
    location: 'Ruang Teens Lantai 3',
    photo: 'https://images.unsplash.com/photo-1566135235200-616a028972c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    accent: '#a78bfa',
  },
];

/* ─────────── DATA: KIDS ─────────── */
const KIDS: Ministry[] = [
  {
    id: 'sekolah-minggu',
    name: 'Sekolah Minggu',
    label: 'Anak-anak 3–12 tahun',
    greeting: 'Hi anak-anak!',
    headline: 'MENGENAL TUHAN SEJAK KECIL',
    description: 'Sekolah Minggu adalah ibadah anak-anak GBI Jelambar Timur untuk usia 3 sampai 12 tahun. Materinya disampaikan lewat cerita Alkitab, lagu, dan aktivitas kreatif yang menyenangkan.',
    schedules: [
      { day: 'Minggu', time: '07.00 – 09.00' },
      { day: 'Minggu', time: '09.30 – 11.30' },
    ],
    location: 'Ruang Anak Lantai 2',
    photo: 'https://images.unsplash.com/photo-1713012633197-1426a345ca99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    accent: '#facc15',
  },
];

/* ─────────── DATA: LAYANAN ─────────── */
const LAYANAN: LayananItem[] = [
  {
    id: 'baptis',
    name: 'Baptisan Air',
    description: 'Baptisan air adalah pernyataan publik bahwa kamu sudah menerima Yesus sebagai Tuhan dan Juruselamat. Kalau kamu sudah siap mengambil langkah ini, daftar di sini dan tim kami akan menghubungi kamu.',
    hasForm: true,
    formType: 'baptis',
    icon: '💧',
    accent: '#38bdf8',
  },
  {
    id: 'penyerahan',
    name: 'Penyerahan Anak',
    description: 'Momen di mana orang tua secara resmi menyerahkan anak mereka kepada Tuhan di hadapan jemaat. Daftarkan anak kamu untuk mengikuti ibadah penyerahan anak.',
    hasForm: true,
    formType: 'penyerahan',
    icon: '🤲',
    accent: '#fb923c',
  },
  {
    id: 'konseling',
    name: 'Konseling',
    description: 'Tim pastoral GBI Jelambar Timur siap mendengar dan mendampingi kamu — apapun yang sedang kamu hadapi. Isi form di bawah dan kami akan menjadwalkan sesi konseling bersama kamu.',
    hasForm: true,
    formType: 'konseling',
    icon: '🫶',
    accent: '#34d399',
  },
  {
    id: 'pernikahan',
    name: 'Pernikahan',
    description: 'Layanan yang mendampingi pasangan dalam setiap tahap perjalanan pernikahan — dari persiapan awal hingga pemberkatan resmi.',
    hasForm: false,
    icon: '💍',
    accent: '#f472b6',
    children: [
      {
        id: 'pranikah',
        name: 'Kelas Pra-Nikah',
        description: 'Kelas persiapan pernikahan yang membahas fondasi rumah tangga Kristen. Wajib diikuti sebelum pemberkatan pernikahan di GBI Jelambar Timur.',
        hasForm: true,
        formType: 'pranikah',
      },
      {
        id: 'pemberkatan',
        name: 'Pemberkatan Pernikahan',
        description: 'Rayakan momen paling sakral dalam hidup kamu bersama jemaat. Hubungi kami untuk mendiskusikan tanggal dan persiapan pemberkatan.',
        hasForm: true,
        formType: 'pemberkatan',
      },
    ],
  },
  {
    id: 'komsel',
    name: 'Komsel',
    description: 'Kelompok Sel adalah komunitas kecil jemaat yang berkumpul secara rutin di luar ibadah minggu — berdoa, belajar firman, dan saling mendukung satu sama lain. Bergabung dengan komsel adalah cara paling efektif untuk punya komunitas yang dekat.',
    hasForm: false,
    icon: '🏠',
    accent: '#a78bfa',
  },
  {
    id: 'kedukaan',
    name: 'Pendampingan Kedukaan',
    description: 'Di saat kehilangan, kamu tidak perlu menanggungnya sendiri. Tim pastoral kami hadir untuk mendampingi keluarga yang sedang berduka — lewat doa, kehadiran, dan dukungan praktis.',
    hasForm: false,
    icon: '🕊️',
    accent: '#94a3b8',
  },
];

/* ─────────── FORM CONFIG ─────────── */
const FORM_FIELDS: Record<string, { label: string; type: string; name: string; options?: string[] }[]> = {
  baptis: [
    { label: 'Nama Lengkap', type: 'text', name: 'nama' },
    { label: 'Tanggal Lahir', type: 'date', name: 'tanggalLahir' },
    { label: 'Nomor Telepon / WhatsApp', type: 'tel', name: 'telepon' },
    { label: 'Sudah menerima Yesus sebagai Tuhan?', type: 'select', name: 'sudahTerima', options: ['Ya', 'Sedang dalam proses'] },
    { label: 'Pesan / Keterangan (opsional)', type: 'textarea', name: 'pesan' },
  ],
  penyerahan: [
    { label: 'Nama Ayah', type: 'text', name: 'namaAyah' },
    { label: 'Nama Ibu', type: 'text', name: 'namaIbu' },
    { label: 'Nama Anak', type: 'text', name: 'namaAnak' },
    { label: 'Tanggal Lahir Anak', type: 'date', name: 'tanggalLahirAnak' },
    { label: 'Nomor Telepon / WhatsApp', type: 'tel', name: 'telepon' },
    { label: 'Pesan / Keterangan (opsional)', type: 'textarea', name: 'pesan' },
  ],
  konseling: [
    { label: 'Nama Lengkap', type: 'text', name: 'nama' },
    { label: 'Nomor Telepon / WhatsApp', type: 'tel', name: 'telepon' },
    { label: 'Topik Konseling', type: 'select', name: 'topik', options: ['Pribadi', 'Keluarga', 'Pernikahan', 'Karir / Studi', 'Lainnya'] },
    { label: 'Ceritakan sedikit situasimu (opsional)', type: 'textarea', name: 'pesan' },
  ],
  pranikah: [
    { label: 'Nama Calon Pengantin Pria', type: 'text', name: 'namaPria' },
    { label: 'Nama Calon Pengantin Wanita', type: 'text', name: 'namaWanita' },
    { label: 'Rencana Tanggal Pernikahan', type: 'date', name: 'tanggalNikah' },
    { label: 'Nomor Telepon / WhatsApp', type: 'tel', name: 'telepon' },
    { label: 'Pesan / Pertanyaan (opsional)', type: 'textarea', name: 'pesan' },
  ],
  pemberkatan: [
    { label: 'Nama Mempelai Pria', type: 'text', name: 'namaPria' },
    { label: 'Nama Mempelai Wanita', type: 'text', name: 'namaWanita' },
    { label: 'Rencana Tanggal Pemberkatan', type: 'date', name: 'tanggalPemberkatan' },
    { label: 'Nomor Telepon / WhatsApp', type: 'tel', name: 'telepon' },
    { label: 'Estimasi Jumlah Tamu', type: 'text', name: 'jumlahTamu' },
    { label: 'Pesan / Keterangan (opsional)', type: 'textarea', name: 'pesan' },
  ],
};

/* ─────────── REGISTRATION MODAL ─────────── */
function RegistrationModal({ formType, title, onClose }: { formType: string; title: string; onClose: () => void }) {
  const fields = FORM_FIELDS[formType] || [];
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isOptional = (label: string) => label.toLowerCase().includes('opsional');
  const isRequired = (f: { label: string; type: string }) => !isOptional(f.label) && f.type !== 'textarea';

  const missingFields = fields.filter(f => isRequired(f) && !form[f.name]?.trim());
  const canSubmit = missingFields.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all required fields as touched to show errors
    const allTouched: Record<string, boolean> = {};
    fields.forEach(f => { allTouched[f.name] = true; });
    setTouched(allTouched);

    if (!canSubmit) return;

    setLoading(true);
    setError('');
    try {
      const id = crypto.randomUUID();
      const record = {
        id,
        type: formType,
        title,
        data: form,
        submittedAt: new Date().toISOString(),
        status: 'baru',
      };
      const { error: insertErr } = await supabaseAdmin
        .from('kv_store_561004a0')
        .insert({ key: `registration:${formType}:${id}`, value: record });
      if (insertErr) {
        if (insertErr.message.includes('row-level security') || insertErr.code === '42501') {
          throw new Error(
            'Service key belum ditambahkan. Tambahkan VITE_SUPABASE_SERVICE_KEY ke file .env.local — lihat instruksi di bawah.'
          );
        }
        throw new Error(insertErr.message);
      }
      setDone(true);
    } catch (err: any) {
      setError('Gagal mengirim: ' + (err?.message || 'Coba lagi ya.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10"
        style={{ background: '#111827' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-0.5">Formulir Pendaftaran</p>
            <h3 className="text-white font-bold text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
            <h4 className="text-white font-bold text-lg mb-2">Pendaftaran Terkirim!</h4>
            <p className="text-white/45 text-sm mb-6">Tim kami akan menghubungi kamu segera melalui WhatsApp yang kamu daftarkan.</p>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-colors">
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
            {fields.map(f => {
              const req = isRequired(f);
              const showErr = touched[f.name] && req && !form[f.name]?.trim();
              return (
              <div key={f.name}>
                <label className="block text-white/50 text-xs font-semibold mb-1.5">
                  {f.label}
                  {req && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[f.name] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/25 resize-none"
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={form[f.name] || ''}
                    onBlur={() => setTouched(p => ({ ...p, [f.name]: true }))}
                    onChange={e => { setForm(p => ({ ...p, [f.name]: e.target.value })); setTouched(p => ({ ...p, [f.name]: true })); }}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none transition-colors ${showErr ? 'border-red-500/60' : 'border-white/10 focus:border-white/25'}`}
                    style={{ background: '#1f2937' }}
                  >
                    <option value="">Pilih...</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={form[f.name] || ''}
                    onBlur={() => setTouched(p => ({ ...p, [f.name]: true }))}
                    onChange={e => { setForm(p => ({ ...p, [f.name]: e.target.value })); }}
                    className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none transition-colors ${showErr ? 'border-red-500/60' : 'border-white/10 focus:border-white/25'}`}
                  />
                )}
                {showErr && <p className="text-red-400 text-xs mt-1">Kolom ini wajib diisi</p>}
              </div>
              );
            })}
            {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Menyimpan...' : canSubmit ? 'Kirim Pendaftaran' : `Lengkapi ${missingFields.length} kolom lagi`}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ─────────── LAYANAN CARD ─────────── */
function LayananCard({ item, featured }: { item: LayananItem; featured?: boolean }) {
  const [modalType, setModalType] = useState<{ type: string; title: string } | null>(null);

  return (
    <>
      <div className={`rounded-2xl border border-white/8 overflow-hidden flex flex-col ${featured ? 'sm:col-span-2' : ''}`}
        style={{ background: 'rgba(255,255,255,0.025)' }}>

        {/* Accent top bar */}
        <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${item.accent}, ${item.accent}30)` }} />

        <div className="p-6 flex flex-col flex-1">
          {/* Icon + Name row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${item.accent}18` }}>
              {item.icon}
            </div>
            <h3 className="text-white font-bold text-base">{item.name}</h3>
          </div>

          <p className="text-white/50 text-sm leading-relaxed mb-5">{item.description}</p>

          {/* Sub-items (Pernikahan) */}
          {item.children && (
            <div className={`grid gap-3 mb-5 ${featured ? 'sm:grid-cols-2' : ''}`}>
              {item.children.map(child => (
                <div key={child.id} className="rounded-xl border border-white/6 p-4"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-white/80 text-sm font-semibold mb-1">{child.name}</p>
                  <p className="text-white/38 text-xs leading-relaxed mb-3">{child.description}</p>
                  {child.hasForm && child.formType && (
                    <button
                      onClick={() => setModalType({ type: child.formType!, title: child.name })}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-full transition-all"
                      style={{ background: `${item.accent}18`, color: item.accent, border: `1px solid ${item.accent}35` }}
                    >
                      Daftar →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Spacer to push button to bottom */}
          <div className="flex-1" />

          {/* Action */}
          <div className="mt-auto pt-3 border-t border-white/6 flex items-center justify-between">
            {item.hasForm && item.formType ? (
              <button
                onClick={() => setModalType({ type: item.formType!, title: item.name })}
                className="text-sm font-bold px-5 py-2 rounded-full transition-all"
                style={{ background: `${item.accent}18`, color: item.accent, border: `1px solid ${item.accent}35` }}
              >
                Daftar Sekarang
              </button>
            ) : !item.children ? (
              <Link to="/lokasi" className="text-sm font-semibold flex items-center gap-1.5 transition-colors"
                style={{ color: item.accent }}>
                Hubungi Kami <ChevronRight size={13} />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalType && (
          <RegistrationModal
            formType={modalType.type}
            title={modalType.title}
            onClose={() => setModalType(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────── INFO BLOCK (shared) ─────────── */
function InfoBlock({ m }: { m: Ministry }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: m.accent }}>{m.label}</p>
      <p className="text-2xl mb-1" style={{ fontFamily: 'Caveat, cursive', color: 'rgba(255,255,255,0.5)' }}>{m.greeting}</p>
      <h2 className="text-xl md:text-2xl font-black text-white mb-4 leading-tight tracking-wide">{m.headline}</h2>
      <p className="text-white/55 text-sm leading-relaxed mb-6">{m.description}</p>
      <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 mb-4">
        <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-3">Jadwal</p>
        <div className="space-y-2">
          {m.schedules.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-white/50 text-sm">
              <Clock size={11} className="flex-shrink-0 opacity-40" />
              <span className="text-white/80 font-medium">{s.day}</span>
              <span className="text-white/25">·</span>
              <span>{s.time}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-white/22 text-xs">
        <MapPin size={10} /> {m.location}
      </div>
    </div>
  );
}

/* ─────────── ADULT PANEL ─────────── */
function MinistryPanel({ m }: { m: Ministry }) {
  return (
    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="flex-1 min-w-0">
      <div className="h-px mb-7" style={{ background: `linear-gradient(to right, ${m.accent}50, transparent)` }} />
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <InfoBlock m={m} />
        <div className="relative rounded-2xl overflow-hidden h-60 md:h-[320px]">
          <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,15,30,0.45) 0%, transparent 50%)' }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── PARALLAX CARD (NXT GEN) ─────────── */
function ParallaxCard({ m }: { m: Ministry }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  return (
    <div ref={ref} className="grid md:grid-cols-2 rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="relative h-64 md:h-auto overflow-hidden order-last md:order-first">
        <motion.img src={m.photo} alt={m.name} style={{ y: photoY }} className="w-full h-[116%] object-cover absolute inset-0" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 55%, rgba(10,15,30,0.65) 100%)' }} />
        <div className="absolute inset-0 md:hidden" style={{ background: 'linear-gradient(to top, rgba(10,15,30,0.65) 0%, transparent 55%)' }} />
        <div className="absolute top-4 left-4">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: `${m.accent}20`, color: m.accent, border: `1px solid ${m.accent}35` }}>{m.label}</span>
        </div>
      </div>
      <div className="p-7 md:p-10 flex flex-col justify-center"><InfoBlock m={m} /></div>
    </div>
  );
}

/* ─────────── KIDS CARD ─────────── */
function KidsCard({ m }: { m: Ministry }) {
  return (
    <div className="grid md:grid-cols-2 rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="relative h-56 md:h-auto overflow-hidden">
        <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 55%, rgba(10,15,30,0.65) 100%)' }} />
        <div className="absolute top-4 left-4">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: `${m.accent}20`, color: m.accent, border: `1px solid ${m.accent}35` }}>{m.label}</span>
        </div>
      </div>
      <div className="p-7 md:p-10 flex flex-col justify-center"><InfoBlock m={m} /></div>
    </div>
  );
}

/* ─────────── MAIN PAGE ─────────── */
const TABS = [
  { id: 'adult',   label: 'Adult',   sub: 'Dewasa & Pasangan' },
  { id: 'nxtgen',  label: 'NXT GEN', sub: 'Pemuda & Remaja' },
  { id: 'kids',    label: 'Kids',    sub: 'Anak-anak' },
  { id: 'layanan', label: 'Layanan', sub: 'Sakramen & Khusus' },
] as const;
type TabId = typeof TABS[number]['id'];

export default function ServicePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const validTab = TABS.find(t => t.id === tabParam)?.id ?? 'adult';

  const [activeTab, setActiveTab] = useState<TabId>(validTab);
  const [selected, setSelected] = useState<Ministry>(ADULT[0]);

  useEffect(() => {
    const t = (searchParams.get('tab') as TabId) ?? 'adult';
    if (TABS.find(x => x.id === t)) setActiveTab(t);
  }, [searchParams]);

  const handleTab = (t: TabId) => {
    setActiveTab(t);
    setSearchParams({ tab: t });
    if (t === 'adult') setSelected(ADULT[0]);
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      <PublicNavbar />

      {/* Hero */}
      <section className="pt-36 pb-14 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1e1b4b 0%, #0a0f1e 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="text-blue-400 text-xs font-bold uppercase tracking-[0.22em] mb-3">Program Ibadah</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Layanan &amp; Ibadah</motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
            className="text-white/35 max-w-md mx-auto text-sm leading-relaxed">
            Temukan komunitas ibadah yang pas buat kamu dan keluarga.
          </motion.p>
        </div>
      </section>

      {/* Sticky tabs */}
      <div className="sticky top-16 z-40 border-b border-white/6" style={{ background: 'rgba(10,15,30,0.94)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-5xl mx-auto px-6 flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTab(t.id)}
              className={`relative flex-shrink-0 flex-1 min-w-[90px] py-4 text-center transition-colors duration-200 ${activeTab === t.id ? 'text-white' : 'text-white/28 hover:text-white/55'}`}>
              <span className="block text-sm font-bold">{t.label}</span>
              <span className="block text-[10px] mt-0.5 opacity-45 hidden sm:block">{t.sub}</span>
              {activeTab === t.id && (
                <motion.div layoutId="svc-tab" className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-blue-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">

          {activeTab === 'adult' && (
            <motion.div key="adult" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="flex gap-5 min-h-[520px]">
              <div className="w-44 flex-shrink-0 border-r border-white/6 pr-3 space-y-0.5 pt-1">
                {ADULT.map(m => {
                  const active = selected?.id === m.id;
                  return (
                    <button key={m.id} onClick={() => setSelected(m)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${active ? 'text-white bg-white/7' : 'text-white/32 hover:text-white/60 hover:bg-white/[0.035]'}`}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200" style={{
                        backgroundColor: active ? m.accent : 'transparent',
                        boxShadow: active ? `0 0 5px ${m.accent}` : 'none',
                      }} />
                      {m.name}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                {selected && <MinistryPanel key={selected.id} m={selected} />}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'nxtgen' && (
            <motion.div key="nxtgen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
              {NXT_GEN.map(m => <ParallaxCard key={m.id} m={m} />)}
            </motion.div>
          )}

          {activeTab === 'kids' && (
            <motion.div key="kids" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
              {KIDS.map(m => <KidsCard key={m.id} m={m} />)}
            </motion.div>
          )}

          {activeTab === 'layanan' && (
            <motion.div key="layanan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <p className="text-white/25 text-xs font-bold uppercase tracking-widest mb-6">Sakramen &amp; Layanan Khusus</p>
              {/* 3-column grid — Pernikahan spans 2 cols on sm+ */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LAYANAN.map(item => (
                  <LayananCard key={item.id} item={item} featured={item.id === 'pernikahan'} />
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center">
                <p className="text-white/35 text-sm">Butuh bantuan atau informasi lebih lanjut?</p>
                <Link to="/lokasi" className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-semibold mt-2 transition-colors">
                  Hubungi kami langsung <ChevronRight size={13} />
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* CTA */}
      <section className="border-t border-white/5 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-white/22 text-[10px] font-bold uppercase tracking-widest mb-3">Ada yang ingin ditanyakan?</p>
          <h3 className="text-2xl font-bold text-white mb-3">Kami Siap Menyambut Kamu</h3>
          <p className="text-white/30 text-sm mb-7 max-w-sm mx-auto leading-relaxed">
            Masih ada pertanyaan soal program ibadah kami? Datang langsung atau hubungi kami.
          </p>
          <Link to="/lokasi" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-7 py-3.5 rounded-full transition-all shadow-lg shadow-blue-900/40">
            Temukan Lokasi &amp; Kontak <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-white/15 text-xs">
        © 2026 GBI Jelambar Timur. All rights reserved.
      </footer>
    </div>
  );
}
