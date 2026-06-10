import { useEffect, useRef, useState, useCallback } from 'react';
import gbiLogo from '../../imports/pngegg__1_-1.png';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'motion/react';
import {
  Calendar, MapPin, Phone, Mail, Clock, Users, Heart, BookOpen, Star,
  ChevronDown, Menu, X, ArrowRight, ChevronLeft, ChevronRight, ImageIcon
} from 'lucide-react';
import { publicAnonKey } from '/utils/supabase/info';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface Announcement {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
}

function FlyerCarousel({ items }: { items: Announcement[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<any>(null);

  const go = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrent(idx);
  }, []);

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
        <motion.div
          key={item.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0"
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-800 to-indigo-900 text-white">
              <ImageIcon size={48} className="opacity-40 mb-4" />
              <p className="text-xl font-bold">{item.title}</p>
              {item.description && <p className="text-sm opacity-70 mt-2 max-w-sm text-center px-4">{item.description}</p>}
            </div>
          )}
          {/* Caption overlay */}
          {(item.title || item.description) && item.imageUrl && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <p className="text-white font-bold text-lg leading-tight">{item.title}</p>
              {item.description && <p className="text-white/80 text-sm mt-1">{item.description}</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
          >
            <ChevronRight size={22} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i > current ? 1 : -1)}
                className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function useParallax(value: any, distance: number) {
  return useTransform(value, [0, 1], [-distance, distance]);
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
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

const values = [
  { label: 'Kasih', desc: 'Mengasihi Tuhan dan sesama dengan tulus dan sepenuh hati', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
  { label: 'Iman', desc: 'Bertumbuh dalam pengenalan akan Kristus setiap harinya', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'Pelayanan', desc: 'Melayani dengan rendah hati dan penuh sukacita', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Persekutuan', desc: 'Membangun komunitas yang kuat dan saling mendukung', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export default function JemaatPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);


  useEffect(() => {
    fetch(`${API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.announcements) {
          setAnnouncements(d.announcements.filter((a: Announcement) => a.active));
        }
      })
      .catch(() => {});
  }, []);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0]);
  const heroContentY = useTransform(scrollY, [0, 600], [0, -60]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#jadwal', label: 'Jadwal Ibadah' },
    { href: '#tentang', label: 'Tentang Kami' },
    { href: '#komsel', label: 'Komsel' },
    { href: '#kontak', label: 'Kontak' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <img src={gbiLogo} alt="GBI Logo" className="w-10 h-10 rounded-full object-cover shadow-md bg-white" />
            <span className={`font-semibold text-sm leading-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              GBI Jelambar<br />
              <span className="font-normal opacity-80 text-xs">Timur</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:bg-white/20 ${
                  scrolled ? 'text-gray-700 hover:bg-gray-100 hover:text-blue-700' : 'text-white/90 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/20'}`}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-lg px-6 py-4 space-y-1"
          >
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-gray-700 font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </motion.header>

      {/* Hero with Parallax */}
      <section
        className="relative h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)' }}
      >
        {/* Parallax BG shapes */}
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-purple-400/10 blur-2xl" />
        </motion.div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <motion.div
          style={{ y: heroContentY, opacity: heroOpacity }}
          className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-8 text-white/90 text-sm font-medium"
          >
            <Heart size={14} className="text-rose-400" />
            Melayani dengan Kasih, Membangun dalam Iman
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Gereja Jelambar
            <span className="block text-blue-300">Timur</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Komunitas iman yang berdedikasi untuk melayani Tuhan dan sesama,
            hadir di tengah-tengah Jakarta Barat sejak puluhan tahun.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="#jadwal"
              className="inline-flex items-center gap-2 bg-white text-blue-900 font-semibold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              Lihat Jadwal Ibadah
              <ArrowRight size={18} />
            </a>
            <a
              href="#kontak"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-medium px-8 py-3.5 rounded-full hover:bg-white/10 transition-all duration-200"
            >
              Hubungi Kami
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40"
        >
          <ChevronDown size={28} />
        </motion.div>
      </section>

      {/* Stats bar */}
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

      {/* Flyer Carousel Section */}
      {announcements.length > 0 && (
        <section id="pengumuman" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <FadeInSection>
              <div className="text-center mb-8">
                <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Pengumuman</span>
                <h2 className="text-3xl font-bold text-gray-900">Info & Event Terkini</h2>
              </div>
            </FadeInSection>
            <FadeInSection delay={0.1}>
              <FlyerCarousel items={announcements} />
            </FadeInSection>
          </div>
        </section>
      )}

      {/* Jadwal Ibadah */}
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
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                        <Clock size={14} />
                        <span>{s.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <MapPin size={14} />
                        <span>{s.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Tentang Kami */}
      <section id="tentang" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeInSection>
              <div>
                <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Tentang Kami</span>
                <h2 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  Komunitas Iman yang<br />Penuh Kasih
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Gereja Jelambar Timur adalah komunitas iman yang berdedikasi untuk melayani Tuhan
                  dan sesama. Kami percaya bahwa setiap orang berharga di mata Tuhan dan memiliki
                  tujuan yang unik dalam kehidupan mereka.
                </p>
                <p className="text-gray-600 leading-relaxed mb-8">
                  Visi kami adalah menjadi gereja yang penuh kasih, dimana setiap orang dapat
                  bertumbuh dalam iman, membangun hubungan yang bermakna, dan melayani dengan sukacita.
                </p>
                <a
                  href="#kontak"
                  className="inline-flex items-center gap-2 bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-blue-800 hover:shadow-lg transition-all duration-200"
                >
                  Hubungi Kami <ArrowRight size={18} />
                </a>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                {values.map((v, i) => (
                  <div key={v.label} className={`${v.bg} rounded-2xl p-6`}>
                    <div className={`w-10 h-10 rounded-xl ${v.bg} border-2 border-white shadow-sm flex items-center justify-center mb-4`}>
                      <v.icon size={20} className={v.color} />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">{v.label}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Komsel */}
      <section id="komsel" className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)' }}>
        {/* Parallax shapes */}
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
                Bergabunglah dengan kelompok kecil kami dimana Anda dapat belajar firman Tuhan,
                berdoa bersama, dan saling mendukung dalam kehidupan sehari-hari.
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
              <a
                href="#kontak"
                className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-8 py-4 rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-200"
              >
                Daftar Komsel Sekarang <ArrowRight size={18} />
              </a>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Kontak */}
      <section id="kontak" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-14">
              <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Kontak</span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Hubungi Kami</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Kami siap menyambut Anda. Jangan ragu untuk menghubungi kami.</p>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: MapPin,
                title: 'Alamat',
                lines: ['Jl. Jelambar Timur No. 123', 'Jakarta Barat 11460', 'DKI Jakarta, Indonesia'],
                color: 'from-blue-500 to-indigo-600',
              },
              {
                icon: Phone,
                title: 'Telepon',
                lines: ['+62 21 1234 5678', 'Senin – Sabtu', '09:00 – 17:00 WIB'],
                color: 'from-emerald-500 to-teal-600',
              },
              {
                icon: Mail,
                title: 'Email',
                lines: ['info@gerejajelambartimur.org', '', 'Kami akan membalas', 'dalam 1x24 jam'],
                color: 'from-rose-500 to-orange-500',
              },
            ].map((item, i) => (
              <FadeInSection key={item.title} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-md`}>
                    <item.icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-3">{item.title}</h3>
                  {item.lines.map((line, j) => (
                    <p key={j} className="text-gray-600 text-sm leading-relaxed">{line}</p>
                  ))}
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={gbiLogo} alt="GBI Logo" className="w-9 h-9 rounded-full object-cover bg-white" />
            <div>
              <div className="text-white font-semibold text-sm">GBI Jelambar Timur</div>
              <div className="text-gray-500 text-xs">Jakarta Barat, Indonesia</div>
            </div>
          </div>
          <div className="text-sm text-center">
            <p>© 2024 Gereja Jelambar Timur. All rights reserved.</p>
            <p className="text-gray-600 mt-1">Dibangun dengan kasih untuk melayani jemaat</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {[
              { href: '#jadwal', label: 'Jadwal' },
              { href: '#tentang', label: 'Tentang' },
              { href: '#kontak', label: 'Kontak' },
            ].map(link => (
              <a key={link.href} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
