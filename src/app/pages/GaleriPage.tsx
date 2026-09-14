import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen, ImageIcon, ChevronLeft, ChevronRight, X, ZoomIn, Images } from 'lucide-react';
import PublicNavbar from '../components/public/PublicNavbar';
import { publicAnonKey, projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface Album {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  photoCount: number;
}

interface Photo {
  id: string;
  imageUrl: string | null;
  caption: string;
}

function Lightbox({ photos, index, onClose }: { photos: Photo[]; index: number; onClose: () => void }) {
  const [cur, setCur] = useState(index);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCur(c => (c + 1) % photos.length);
      if (e.key === 'ArrowLeft') setCur(c => (c - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photos.length, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 right-5 text-white/70 hover:text-white z-10"><X size={30} /></button>
      {photos.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setCur(c => (c - 1 + photos.length) % photos.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10">
            <ChevronLeft size={24} />
          </button>
          <button onClick={e => { e.stopPropagation(); setCur(c => (c + 1) % photos.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10">
            <ChevronRight size={24} />
          </button>
        </>
      )}
      <img src={photos[cur].imageUrl || ''} alt={photos[cur].caption} className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
      {photos[cur].caption && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full max-w-xs text-center">{photos[cur].caption}</div>
      )}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/50 text-sm">{cur + 1} / {photos.length}</div>
    </div>
  );
}

export default function GaleriPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/gallery/albums`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(r => r.json())
      .then(d => { if (d.albums) setAlbums(d.albums); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openFolder = async (album: Album) => {
    setOpenAlbum(album);
    setPhotosLoading(true);
    try {
      const res = await fetch(`${API_URL}/gallery/albums/${album.id}/photos`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
      const d = await res.json();
      setPhotos(d.photos || []);
    } catch {}
    setPhotosLoading(false);
  };

  const closeFolder = () => { setOpenAlbum(null); setPhotos([]); setLightboxIdx(null); };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 60%, #1e1b4b 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-5">
            <Images size={28} className="text-white" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4">
            Galeri Foto
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-blue-200 text-lg max-w-xl mx-auto">
            Kenangan indah bersama keluarga besar GBI Jelambar Timur
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">

          {/* Breadcrumb */}
          {openAlbum && (
            <div className="flex items-center gap-2 mb-8">
              <button onClick={closeFolder} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                <ChevronLeft size={16} />Semua Album
              </button>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-gray-900">{openAlbum.name}</span>
              {openAlbum.description && <span className="text-gray-500 text-sm">— {openAlbum.description}</span>}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Albums grid */}
          {!loading && !openAlbum && (
            albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Images size={52} className="mb-4 opacity-25" />
                <p className="font-medium text-lg">Belum ada album galeri</p>
                <p className="text-sm mt-1">Foto-foto kegiatan akan segera hadir</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {albums.map((album, i) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    onClick={() => openFolder(album)}
                    className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
                      {album.coverUrl ? (
                        <img src={album.coverUrl} alt={album.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderOpen size={36} className="text-blue-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center">
                          <ZoomIn size={24} className="mx-auto mb-1" />
                          <span className="text-xs font-semibold">Buka Album</span>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ImageIcon size={10} />{album.photoCount} foto
                      </div>
                    </div>
                    <div className="p-3.5">
                      <p className="font-semibold text-gray-900 text-sm truncate">{album.name}</p>
                      {album.description && <p className="text-xs text-gray-500 truncate mt-0.5">{album.description}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}

          {/* Photos grid */}
          {!loading && openAlbum && (
            photosLoading ? (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid rounded-xl overflow-hidden bg-gray-200 animate-pulse" style={{ height: `${160 + (i % 3) * 60}px` }} />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <ImageIcon size={40} className="mb-3 opacity-30" />
                <p>Belum ada foto di album ini</p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                {photos.map((photo, idx) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: idx * 0.04 }}
                    onClick={() => setLightboxIdx(idx)}
                    className="group relative break-inside-avoid rounded-xl overflow-hidden cursor-zoom-in bg-gray-100 shadow-sm hover:shadow-md transition-all"
                  >
                    {photo.imageUrl ? (
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption || 'foto'}
                        loading={idx < 6 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={idx === 0 ? 'high' : 'auto'}
                        className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="aspect-square flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <ZoomIn size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs">{photo.caption}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {lightboxIdx !== null && photos.length > 0 && (
        <Lightbox photos={photos} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <footer className="bg-gray-950 text-gray-500 py-8 text-center text-sm">
        <p>© 2026 GBI Jelambar Timur. All rights reserved.</p>
      </footer>
    </div>
  );
}
