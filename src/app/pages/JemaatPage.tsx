import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'motion/react';
import {
  Clock, MapPin, Users, Heart, BookOpen, Star,
  ChevronDown, ArrowRight, ChevronLeft, ChevronRight, ImageIcon, Images
} from 'lucide-react';
import { publicAnonKey, projectId } from '/utils/supabase/info';
import PublicNavbar from '../components/public/PublicNavbar';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface Announcement {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
}

// ── Flyer Carousel ──────────────────────────────────────────────────────────
function FlyerCarousel({ items }: { items: Announcement[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<any>(null);

  const go = useCallback((idx: number, dir: number) => { setDirection(dir); setCurrent(idx); }, []);
  const prev = () => go((current - 1 + items.length) % items.length, -1);
  const next = useCallback(() => go((current + 1) % items.length, 1), [current, items.length, go]);

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(next, 10000);
    return () => clearInterval(timerRef.current);
  }, [next, items.length]);

  if (items.length === 0) return null;

  const item = items[current];
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl bg-gray-900" style={{ aspectRatio: '16/9' }}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div key={item.id} custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }} className="absolute inset-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-800 to-indigo-900 text-white">
              <ImageIcon size={48} className="opacity-40 mb-4" />
              <p className="text-xl font-bold">{item.title}</p>
              {item.description && <p className="text-sm opacity-70 mt-2 max-w-sm text-center px-4">{item.description}</p>}
            </div>
          )}
          {(item.title || item.description) && item.imageUrl && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <p className="text-white font-bold text-lg leading-tight">{item.title}</p>
              {item.description && <p className="text-white/80 text-sm mt-1">{item.description}</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {items.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"><ChevronLeft size={22} /></button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"><ChevronRight size={22} /></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {items.map((_, i) => (
              <button key={i} onClick={() => go(i, i > current ? 1 : -1)} className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

const schedules = [
  { title: 'Ibadah Minggu', time: 'Minggu, 08:00 – 10:00 WIB', location: 'Gedung Utama', icon: BookOpen, color: 'from-blue-500 to-indigo-600' },
  { title: 'Ibadah Pemuda', time: 'Sabtu, 18:00 – 20:00 WIB', location: 'Ruang Pemuda', icon: Star, color: 'from-purple-500 to-pink-600' },
  { title: 'Persekutuan Doa', time: 'Rabu, 19:00 – 21:00 WIB', location: 'Gedung Utama', icon: Heart, color: 'from-rose-500 to-orange-500' },
  { title: 'Sekolah Minggu', time: 'Minggu, 08:00 – 10:00 WIB', location: 'Ruang Anak', icon: Users, color: 'from-emerald-500 to-teal-600' },
];

export default function JemaatPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/announcements`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(r => r.json())
      .then(d => { if (d.announcements) setAnnouncements(d.announcements.filter((a: Announcement) => a.active)); })
      .catch(() => {});
  }, []);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0]);
  const heroContentY = useTransform(scrollY, [0, 600], [0, -60]);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="relative h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)' }}>

        {/* Navbar floats on top of video */}
        <div className="absolute top-0 left-0 right-0 z-50">
          <PublicNavbar />
        </div>

        {/* Background video — covers full section including navbar area */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="https://nnzqvhkhreesgcjallof.supabase.co/storage/v1/object/sign/video/vid%20homepage.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMTQwMDFhYS1iZTYwLTQzODUtYjM3Zi1kMTZlZDc0YmJjODMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWRlby92aWQgaG9tZXBhZ2UubXA0Iiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4MTE5NTM2NywiZXhwIjoyMDk2NTU1MzY3fQ.6TtevDVxZlexuuZdEM4XVIx1h_mgiV0RX1-nxYWBnEA"
          style={{ opacity: 0.5 }}
        />

        {/* Gradient overlay on top of video */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, #1e3a8aCC 0%, #312e81CC 50%, #1e1b4bCC 100%)' }} />

        <motion.div style={{ y: heroY }} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-purple-400/10 blur-2xl" />
        </motion.div>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <motion.div style={{ y: heroContentY, opacity: heroOpacity }} className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-8 text-white/90 text-sm font-medium">
            <Heart size={14} className="text-rose-400" />
            Melayani dengan Kasih, Membangun dalam Iman
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Gereja Jelambar
            <span className="block text-blue-300">Timur</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5 }}
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Komunitas iman yang berdedikasi untuk melayani Tuhan dan sesama,
            hadir di tengah-tengah Jakarta Barat sejak puluhan tahun.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#jadwal" className="inline-flex items-center gap-2 bg-white text-blue-900 font-semibold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
              Lihat Jadwal Ibadah <ArrowRight size={18} />
            </a>
            <Link to="/galeri" className="inline-flex items-center gap-2 border border-white/30 text-white font-medium px-8 py-3.5 rounded-full hover:bg-white/10 transition-all duration-200">
              <Images size={18} /> Lihat Galeri
            </Link>
          </motion.div>

          {/* Sosmed */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.8 }}
            className="flex items-center justify-center gap-4 mt-2">
            <span className="text-white/40 text-xs">Ikuti kami</span>
            <div className="w-px h-3 bg-white/20" />
            <a href="https://www.instagram.com/gbi_jeltim/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-all hover:scale-105 text-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @gbi_jeltim
            </a>
            <div className="w-px h-3 bg-white/20" />
            <a href="https://www.youtube.com/@gbijelambartimur" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-all hover:scale-105 text-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              GBI Jelambar Timur
            </a>
          </motion.div>

        </motion.div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40">
          <ChevronDown size={28} />
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <FadeInSection>
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700">
          <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            {[
              { n: '500+', label: 'Jemaat Aktif' },
              { n: '4', label: 'Ibadah Per Minggu' },
              { n: '20+', label: 'Kelompok Komsel' },
              { n: '30+', label: 'Tahun Melayani' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-3xl font-bold">{item.n}</div>
                <div className="text-blue-200 text-sm mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── Pengumuman / Flyer ── */}
      {announcements.length > 0 && (
        <section id="pengumuman" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <FadeInSection>
              <div className="text-center mb-8">
                <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Pengumuman</span>
                <h2 className="text-3xl font-bold text-gray-900">Info & Event Terkini</h2>
              </div>
            </FadeInSection>
            <FadeInSection delay={0.1}><FlyerCarousel items={announcements} /></FadeInSection>
          </div>
        </section>
      )}

      {/* ── Jadwal ── */}
      <section id="jadwal" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-14">
              <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Jadwal</span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Ibadah & Kegiatan</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Bergabunglah bersama kami dalam berbagai kegiatan ibadah yang tersedia setiap minggu.</p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schedules.map((s, i) => (
              <FadeInSection key={s.title} delay={i * 0.1}>
                <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <div className={`h-2 bg-gradient-to-r ${s.color}`} />
                  <div className="p-7 flex items-start gap-5">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      <s.icon size={22} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1"><Clock size={14} /><span>{s.time}</span></div>
                      <div className="flex items-center gap-2 text-gray-500 text-sm"><MapPin size={14} /><span>{s.location}</span></div>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Komsel ── */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-400/10 blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <FadeInSection>
            <div className="text-center mb-12">
              <span className="inline-block text-blue-300 text-sm font-semibold uppercase tracking-widest mb-3">Komsel</span>
              <h2 className="text-4xl font-bold text-white mb-4">Kelompok Sel</h2>
              <p className="text-blue-200 max-w-xl mx-auto leading-relaxed">
                Bergabunglah dengan kelompok kecil kami di mana Anda dapat belajar firman Tuhan, berdoa bersama, dan saling mendukung.
              </p>
            </div>
          </FadeInSection>
          <FadeInSection delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                { icon: BookOpen, title: 'Belajar Firman', desc: 'Mendalami Alkitab bersama dalam suasana yang akrab dan hangat' },
                { icon: Heart, title: 'Doa Bersama', desc: 'Saling mendoakan dan menguatkan satu dengan yang lain' },
                { icon: Users, title: 'Komunitas', desc: 'Membangun persahabatan yang tulus dan bermakna dalam iman' },
              ].map(card => (
                <div key={card.title} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-7 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-5">
                    <card.icon size={22} className="text-blue-200" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{card.title}</h3>
                  <p className="text-blue-200 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </FadeInSection>
          <FadeInSection delay={0.2}>
            <div className="text-center">
              <Link to="/lokasi" className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-8 py-4 rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-200">
                Daftar Komsel Sekarang <ArrowRight size={18} />
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── Quick links to other pages ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Jelajahi Lebih Lanjut</h2>
              <p className="text-gray-500">Kenali kami lebih dekat melalui halaman-halaman berikut</p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { to: '/tentang', label: 'Tentang Kami', desc: 'Sejarah, visi misi, dan tim pelayanan gereja', color: 'from-blue-500 to-indigo-600', icon: Heart },
              { to: '/galeri', label: 'Galeri Foto', desc: 'Foto-foto kegiatan dan momen bersama jemaat', color: 'from-purple-500 to-pink-600', icon: Images },
              { to: '/lokasi', label: 'Lokasi & Kontak', desc: 'Peta, alamat, jam ibadah, dan cara menghubungi', color: 'from-emerald-500 to-teal-600', icon: MapPin },
            ].map((item, i) => (
              <FadeInSection key={item.to} delay={i * 0.1}>
                <Link to={item.to} className="group block bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                    <item.icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{item.label}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-blue-600 text-xs font-semibold group-hover:gap-2 transition-all">
                    Selengkapnya <ArrowRight size={12} />
                  </span>
                </Link>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 text-gray-400 py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 pb-10 border-b border-gray-800">
            <div>
              <div className="text-white font-bold mb-1">GBI Jelambar Timur</div>
              <div className="text-gray-500 text-sm">Jakarta Barat, Indonesia</div>
              <div className="text-gray-600 text-xs mt-1">Melayani sejak 1993</div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              {[
                { to: '/jemaat', label: 'Beranda' },
                { to: '/tentang', label: 'Tentang' },
                { to: '/galeri', label: 'Galeri' },
                { to: '/lokasi', label: 'Lokasi' },
              ].map(link => (
                <Link key={link.to} to={link.to} className="hover:text-white transition-colors py-1">{link.label}</Link>
              ))}
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>© 2026 GBI Jelambar Timur. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/gbi_jeltim/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 text-white text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 hover:scale-105 transition-all">
                <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                @gbi_jeltim
              </a>
              <a href="https://www.youtube.com/@gbijelambartimur" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-full hover:scale-105 transition-all">
                <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </a>
              <a href="https://www.google.com/maps/place/Gereja+Bethel+Indonesia+Jelambar+Timur/@-6.1420644,106.7821437,17z" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2 rounded-full transition-all">
                <MapPin size={12} />Google Maps
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
