import { useEffect, useRef, useState, useCallback } from 'react';
import { apiBase } from '../../lib/api';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'motion/react';
import {
  Clock, MapPin, Users, Heart, BookOpen, Star,
  ChevronDown, ArrowRight, ChevronLeft, ChevronRight, ImageIcon, Images, CalendarHeart, UserRound
} from 'lucide-react';
import PublicNavbar from '../components/public/PublicNavbar';
import { getMinistry, formatSchedules, ALL_MINISTRIES } from '../../lib/ministries';
import { useChurchStats, yearsServing } from '../../lib/stats';
import PublicFooter from '../components/public/PublicFooter';
import { CHURCH } from '../../lib/church';

const API_URL = `${apiBase()}/api/content`;

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

// Highlighted ministries on the home page; times come from the shared ministries data.
const HOME_SCHEDULES = [
  { id: 'umum', icon: BookOpen, color: 'from-blue-500 to-indigo-600' },
  { id: 'doa', icon: Heart, color: 'from-rose-500 to-orange-500' },
  { id: 'vessel', icon: Star, color: 'from-purple-500 to-pink-600' },
  { id: 'sekolah-minggu', icon: Users, color: 'from-emerald-500 to-teal-600' },
].flatMap(h => { const m = getMinistry(h.id); return m ? [{ ...h, title: m.name, time: formatSchedules(m.schedules) + ' WIB', location: m.location }] : []; });

export default function JemaatPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const stats = useChurchStats();
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/announcements`)
      .then(r => r.json())
      .then(d => { if (d.announcements) setAnnouncements(d.announcements.filter((a: Announcement) => a.active)); })
      .catch(() => {});
  }, []);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, 220]);
  const heroContentY = useTransform(scrollY, [0, 800], [0, -100]);
  const heroOpacity = useTransform(scrollY, [0, 450], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 700], [1, 0.94]);
  const heroGlowY = useTransform(scrollY, [0, 800], [0, 160]);
  const floatingBadge1Y = useTransform(scrollY, [0, 600], [0, -70]);
  const floatingBadge2Y = useTransform(scrollY, [0, 600], [0, -45]);
  const floatingBadge3Y = useTransform(scrollY, [0, 600], [0, -90]);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ── Hero ── */}
      <section
        className="relative min-h-[90vh] sm:min-h-[92vh] md:min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16 sm:py-24"
        style={{
          background: 'radial-gradient(ellipse 95% 75% at 50% 12%, #1e3a8a 0%, #0f172a 55%, #050814 100%)'
        }}
      >
        {/* Navbar floats on top */}
        <div className="absolute top-0 left-0 right-0 z-50">
          <PublicNavbar />
        </div>

        {/* Background video (if exists) with parallax */}
        {!videoFailed && (
          <motion.div style={{ y: heroY }} className="absolute inset-0 pointer-events-none">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              controls={false}
              disablePictureInPicture
              onError={() => setVideoFailed(true)}
              className="w-full h-full object-cover opacity-40 mix-blend-screen scale-110"
            >
              <source src="/hero.mp4" type="video/mp4" onError={() => setVideoFailed(true)} />
            </video>
          </motion.div>
        )}
        <div className="absolute inset-0 hero-aurora pointer-events-none opacity-60" />

        {/* Ambient celestial lighting layers with Parallax */}
        <motion.div style={{ y: heroGlowY }} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[760px] max-w-full h-[360px] bg-gradient-to-b from-amber-300/15 via-sky-400/15 to-transparent blur-3xl" />
          <div className="absolute top-1/4 left-1/10 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-blue-500/20 blur-3xl animate-pulse duration-1000" />
          <div className="absolute bottom-1/4 right-1/10 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-60 h-60 rounded-full bg-purple-500/15 blur-2xl" />
        </motion.div>

        {/* Floating Parallax Accents (Geometric & Glass Icons) */}
        <motion.div
          style={{ y: floatingBadge1Y }}
          className="absolute top-36 left-6 md:left-16 hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-4 py-2.5 rounded-2xl shadow-2xl pointer-events-none z-10"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
            <Star size={16} className="text-white" />
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs font-bold text-white">Komunitas Kasih</p>
            <p className="text-[10px] text-blue-200">Ibadah & Komsel</p>
          </div>
        </motion.div>

        <motion.div
          style={{ y: floatingBadge2Y }}
          className="absolute top-44 right-6 md:right-16 hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-4 py-2.5 rounded-2xl shadow-2xl pointer-events-none z-10"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
            <Heart size={16} className="text-white" />
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs font-bold text-white">Melayani Bersama</p>
            <p className="text-[10px] text-emerald-200">Bertumbuh dalam Iman</p>
          </div>
        </motion.div>

        <motion.div
          style={{ y: floatingBadge3Y }}
          className="absolute bottom-28 left-10 md:left-24 hidden lg:flex items-center gap-2.5 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-3.5 py-2 rounded-2xl shadow-2xl pointer-events-none z-10"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white">
            <MapPin size={14} />
          </div>
          <span className="text-xs text-blue-100 font-medium">Jakarta Utara & Barat</span>
        </motion.div>

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        {/* Hero Content with Parallax Scale & Offset */}
        <motion.div
          style={{ y: heroContentY, opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 sm:mb-6 mt-1 sm:mt-2"
          >
            <span className="inline-block text-xs sm:text-sm font-bold tracking-widest uppercase text-sky-300/90 mb-2 sm:mb-3 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              Gereja Bethel Indonesia
            </span>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.14]">
              Selamat Datang di <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-sky-200 via-blue-100 to-amber-200 bg-clip-text text-transparent drop-shadow-sm">
                GBI Jelambar Timur
              </span>
            </h1>
          </motion.div>

          {/* Subtitle / Church Mission */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.38 }}
            className="text-xs sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed font-normal px-2 drop-shadow-sm"
          >
            Komunitas iman yang hangat dan melayani dengan kasih. Kami menyambut Anda dan keluarga untuk bersekutu, beribadah, dan bertumbuh bersama dalam hadirat Tuhan.
          </motion.p>

          {/* Action CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.48 }}
            className="flex flex-row flex-wrap items-center justify-center gap-2.5 sm:gap-4 w-full sm:w-auto"
          >
            <a
              href="#jadwal"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 text-white font-semibold text-xs sm:text-sm px-5 py-3 sm:px-7 sm:py-3.5 rounded-full shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Lihat Jadwal Ibadah</span>
              <ArrowRight size={16} />
            </a>
            <a
              href={CHURCH.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-md border border-emerald-400/40 text-emerald-200 hover:text-white font-medium text-xs sm:text-sm px-5 py-3 sm:px-7 sm:py-3.5 rounded-full hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <MapPin size={16} className="text-emerald-300" />
              <span>Petunjuk Arah Maps</span>
            </a>
            <Link
              to="/galeri"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white font-medium text-xs sm:text-sm px-5 py-3 sm:px-7 sm:py-3.5 rounded-full hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Images size={16} />
              <span>Lihat Galeri</span>
            </Link>
          </motion.div>

          {/* Social Media Links */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.58 }}
            className="flex items-center justify-center gap-2 sm:gap-3 mt-5 sm:mt-7 flex-wrap"
          >
            <a
              href={CHURCH.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-white text-xs sm:text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
            >
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center text-white flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </span>
              <span>Instagram</span>
            </a>

            <a
              href={CHURCH.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-white text-xs sm:text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
            >
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </span>
              <span>YouTube</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll down indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 pointer-events-none hidden sm:block"
        >
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* ── Akses cepat ── */}
      <section className="relative z-20 -mt-6 sm:-mt-8 md:-mt-12 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-950/10 border border-gray-100 p-2 sm:p-4 grid grid-cols-4 gap-1 sm:gap-3">
          {[
            { href: '#jadwal', label: 'Jadwal', icon: Clock, color: 'from-blue-500 to-indigo-600' },
            { to: '/lokasi', label: 'Lokasi', icon: MapPin, color: 'from-emerald-500 to-teal-600' },
            { to: '/service', label: 'Daftar', icon: CalendarHeart, color: 'from-rose-500 to-orange-500' },
            { to: '/akun', label: 'Akun', icon: UserRound, color: 'from-purple-500 to-pink-600' },
          ].map(item => {
            const inner = (
              <>
                <span className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:-translate-y-1 group-hover:scale-105 transition-all duration-300`}>
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </span>
                <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-gray-700 mt-1.5 sm:mt-2 group-hover:text-blue-600 transition-colors">{item.label}</span>
              </>
            );
            const cls = 'group flex flex-col items-center py-1.5 sm:py-2 rounded-2xl hover:bg-gray-50/80 transition-colors cursor-pointer';
            return item.to
              ? <Link key={item.label} to={item.to} className={cls}>{inner}</Link>
              : <a key={item.label} href={item.href} className={cls}>{inner}</a>;
          })}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <FadeInSection>
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 mt-8 sm:mt-12 shadow-inner">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center text-white">
            {[
              { n: stats ? String(stats.members) : '–', label: 'Jemaat Terdaftar' },
              { n: String(ALL_MINISTRIES.length), label: 'Komunitas & Ibadah' },
              { n: stats ? String(stats.komsel) : '–', label: 'Kelompok Komsel' },
              { n: `${yearsServing()}+`, label: 'Tahun Melayani' },
            ].map(item => (
              <div key={item.label} className="p-2">
                <div className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">{item.n}</div>
                <div className="text-blue-200 text-xs sm:text-sm font-medium mt-1">{item.label}</div>
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
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">Info & Event Terkini</h2>
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
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Ibadah & Kegiatan</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Bergabunglah bersama kami dalam berbagai kegiatan ibadah yang tersedia setiap minggu.</p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HOME_SCHEDULES.map((s, i) => (
              <FadeInSection key={s.id} delay={i * 0.1}>
                <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
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
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Kelompok Sel</h2>
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

      {/* ── Lokasi Kami (Interactive Google Maps Section) ── */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-12">
              <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-100">
                Temukan Lokasi
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Kunjungi Kami di GBI Jelambar Timur</h2>
              <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
                {CHURCH.address}
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 group">
              <div className="h-72 sm:h-96 w-full relative">
                <iframe
                  title="Lokasi GBI Jelambar Timur Home"
                  src="https://maps.google.com/maps?q=Jl.+I+No.52,+RT.1/RW.6,+Pejagalan,+Kecamatan+Penjaringan,+Jkt+Utara&z=17&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/* Direct Google Maps link overlay button */}
                <a
                  href={CHURCH.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-white/95 hover:bg-white text-gray-900 font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-2xl border border-gray-200 hover:shadow-blue-500/25 hover:border-blue-500 transition-all duration-300 hover:scale-105 active:scale-95 group/mapbtn backdrop-blur-md cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover/mapbtn:bg-blue-600 group-hover/mapbtn:text-white transition-colors duration-300">
                    <MapPin size={15} />
                  </div>
                  <span>Buka Petunjuk Arah di Google Maps</span>
                  <ArrowRight size={14} className="text-gray-400 group-hover/mapbtn:text-blue-600 group-hover/mapbtn:translate-x-1 transition-all" />
                </a>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── Quick links to other pages ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Jelajahi Lebih Lanjut</h2>
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
      <PublicFooter />
    </div>
  );
}
