import { useState, useEffect, useRef } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  Plus, Trash2, Edit2, X, FolderOpen, Image, Upload,
  ChevronLeft, Check, AlertTriangle, ImageOff,
} from 'lucide-react';

const BUCKET = 'make-561004a0-gallery';
const KV = 'kv_store_561004a0';

interface Album {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  photoCount: number;
  createdAt: string;
}

interface Photo {
  id: string;
  albumId: string;
  path: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

async function getSignedUrl(path: string): Promise<string> {
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365 * 3);
  return data?.signedUrl ?? '';
}

export default function GalleryManagement() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumForm, setAlbumForm] = useState({ name: '', description: '' });
  const [savingAlbum, setSavingAlbum] = useState(false);

  const [deleteAlbum, setDeleteAlbum] = useState<Album | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState(false);

  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [deletePhoto, setDeletePhoto] = useState<Photo | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  const [lightbox, setLightbox] = useState<Photo | null>(null);

  // ── Load albums from kv_store ────────────────────────────────────────────
  const loadAlbums = async () => {
    try {
      const { data, error: err } = await supabaseAdmin
        .from(KV)
        .select('key, value')
        .like('key', 'gallery:album:%')
        .order('key', { ascending: false });
      if (err) throw err;
      const list: Album[] = (data ?? []).map((r: any) => r.value as Album).filter(Boolean);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAlbums(list);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const loadPhotos = async (album: Album) => {
    setPhotosLoading(true);
    try {
      const { data, error: err } = await supabaseAdmin
        .from(KV)
        .select('key, value')
        .like('key', `gallery:photo:${album.id}:%`)
        .order('key', { ascending: false });
      if (err) throw err;
      const list: Photo[] = (data ?? []).map((r: any) => r.value as Photo).filter(Boolean);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPhotos(list);
    } catch (e: any) { setError(e.message); }
    setPhotosLoading(false);
  };

  useEffect(() => { loadAlbums(); }, []);
  useAutoRefresh(loadAlbums, 30_000);

  const openFolder = (album: Album) => { setOpenAlbum(album); loadPhotos(album); };
  const closeFolder = () => { setOpenAlbum(null); setPhotos([]); setUploadFile(null); setUploadPreview(null); setUploadCaption(''); loadAlbums(); };

  // ── Album CRUD ─────────────────────────────────────────────────────────────
  const openNewAlbum = () => { setEditingAlbum(null); setAlbumForm({ name: '', description: '' }); setShowAlbumModal(true); };
  const openEditAlbum = (album: Album, e: React.MouseEvent) => { e.stopPropagation(); setEditingAlbum(album); setAlbumForm({ name: album.name, description: album.description }); setShowAlbumModal(true); };

  const handleSaveAlbum = async () => {
    if (!albumForm.name.trim()) return;
    setSavingAlbum(true);
    setError('');
    try {
      if (editingAlbum) {
        const updated = { ...editingAlbum, ...albumForm };
        await supabaseAdmin.from(KV).update({ value: updated }).eq('key', `gallery:album:${editingAlbum.id}`);
      } else {
        const id = crypto.randomUUID();
        const album: Album = { id, ...albumForm, coverUrl: null, photoCount: 0, createdAt: new Date().toISOString() };
        await supabaseAdmin.from(KV).insert({ key: `gallery:album:${id}`, value: album });
      }
      setShowAlbumModal(false);
      loadAlbums();
    } catch (e: any) { setError(e.message); }
    setSavingAlbum(false);
  };

  const handleDeleteAlbum = async () => {
    if (!deleteAlbum) return;
    setDeletingAlbum(true);
    try {
      // delete all photos in storage
      const { data: files } = await supabaseAdmin.storage.from(BUCKET).list(`gallery/${deleteAlbum.id}`);
      if (files && files.length > 0) {
        const paths = files.map((f: any) => `gallery/${deleteAlbum.id}/${f.name}`);
        await supabaseAdmin.storage.from(BUCKET).remove(paths);
      }
      // delete photo metadata from kv
      const { data: photoRows } = await supabaseAdmin.from(KV).select('key').like('key', `gallery:photo:${deleteAlbum.id}:%`);
      if (photoRows && photoRows.length > 0) {
        for (const row of photoRows) {
          await supabaseAdmin.from(KV).delete().eq('key', row.key);
        }
      }
      // delete album
      await supabaseAdmin.from(KV).delete().eq('key', `gallery:album:${deleteAlbum.id}`);
      setDeleteAlbum(null);
      loadAlbums();
    } catch (e: any) { setError(e.message); }
    setDeletingAlbum(false);
  };

  // ── Photo Upload ───────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!uploadFile || !openAlbum) return;
    setUploading(true);
    setError('');
    try {
      const ext = uploadFile.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const photoId = crypto.randomUUID();
      const path = `gallery/${openAlbum.id}/${photoId}.${ext}`;

      const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
      if (upErr) throw upErr;

      const imageUrl = await getSignedUrl(path);

      const photo: Photo = { id: photoId, albumId: openAlbum.id, path, imageUrl, caption: uploadCaption, createdAt: new Date().toISOString() };
      await supabaseAdmin.from(KV).insert({ key: `gallery:photo:${openAlbum.id}:${photoId}`, value: photo });

      // update album photoCount + coverUrl
      const newCount = openAlbum.photoCount + 1;
      const updatedAlbum = { ...openAlbum, photoCount: newCount, coverUrl: openAlbum.coverUrl ?? imageUrl };
      await supabaseAdmin.from(KV).update({ value: updatedAlbum }).eq('key', `gallery:album:${openAlbum.id}`);
      setOpenAlbum(updatedAlbum);

      setUploadFile(null); setUploadPreview(null); setUploadCaption('');
      if (fileRef.current) fileRef.current.value = '';
      loadPhotos(openAlbum);
    } catch (e: any) { setError(e.message); }
    setUploading(false);
  };

  const handleDeletePhoto = async () => {
    if (!deletePhoto || !openAlbum) return;
    setDeletingPhoto(true);
    try {
      await supabaseAdmin.storage.from(BUCKET).remove([deletePhoto.path]);
      await supabaseAdmin.from(KV).delete().eq('key', `gallery:photo:${openAlbum.id}:${deletePhoto.id}`);
      const newCount = Math.max(0, openAlbum.photoCount - 1);
      const isCover = openAlbum.coverUrl === deletePhoto.imageUrl;
      const remaining = photos.filter(p => p.id !== deletePhoto.id);
      const newCover = isCover ? (remaining[0]?.imageUrl ?? null) : openAlbum.coverUrl;
      const updatedAlbum = { ...openAlbum, photoCount: newCount, coverUrl: newCover };
      await supabaseAdmin.from(KV).update({ value: updatedAlbum }).eq('key', `gallery:album:${openAlbum.id}`);
      setOpenAlbum(updatedAlbum);
      setDeletePhoto(null);
      loadPhotos(openAlbum);
    } catch (e: any) { setError(e.message); }
    setDeletingPhoto(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        {openAlbum ? (
          <div className="flex items-center gap-3">
            <button onClick={closeFolder} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors">
              <ChevronLeft size={20} /><span className="text-sm">Semua Album</span>
            </button>
            <span className="text-gray-300">/</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{openAlbum.name}</h1>
              {openAlbum.description && <p className="text-sm text-gray-500">{openAlbum.description}</p>}
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Galeri Foto</h1>
            <p className="text-gray-500 text-sm mt-0.5">Kelola album dan foto gereja</p>
          </div>
        )}
        {!openAlbum && (
          <button onClick={openNewAlbum} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <Plus size={16} />Buat Album
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={16} />{error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Album Grid */}
      {!openAlbum && (
        albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FolderOpen size={48} className="mb-3 opacity-40" />
            <p className="font-medium">Belum ada album</p>
            <p className="text-sm mt-1">Klik "Buat Album" untuk mulai</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {albums.map(album => (
              <div key={album.id} onClick={() => openFolder(album)}
                className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-200 hover:-translate-y-1">
                <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Image size={36} className="text-blue-300" /></div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditAlbum(album, e)} className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center hover:bg-white text-gray-700"><Edit2 size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteAlbum(album); }} className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center hover:bg-red-50 text-red-500"><Trash2 size={12} /></button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">{album.photoCount} foto</div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-sm truncate">{album.name}</p>
                  {album.description && <p className="text-xs text-gray-500 truncate mt-0.5">{album.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Photos View */}
      {openAlbum && (
        <div>
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 mb-7">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Upload size={15} />Tambah Foto</h3>
            <div className="flex items-start gap-5 flex-wrap">
              <div onClick={() => fileRef.current?.click()}
                className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden flex-shrink-0">
                {uploadPreview ? (
                  <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400"><Image size={24} className="mx-auto mb-1" /><p className="text-xs">Pilih foto</p></div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              <div className="flex-1 min-w-[200px]">
                <input type="text" placeholder="Keterangan foto (opsional)" value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3 bg-white" />
                <button onClick={handleUploadPhoto} disabled={!uploadFile || uploading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">
                  {uploading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Mengupload...</>
                    : <><Upload size={15} />Upload Foto</>}
                </button>
              </div>
            </div>
          </div>

          {photosLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <ImageOff size={40} className="mb-3 opacity-40" /><p className="font-medium">Belum ada foto di album ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  {photo.imageUrl ? (
                    <img src={photo.imageUrl} alt={photo.caption || 'foto'}
                      className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setLightbox(photo)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageOff size={24} /></div>
                  )}
                  <button onClick={() => setDeletePhoto(photo)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-600">
                    <Trash2 size={12} />
                  </button>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white"><X size={28} /></button>
          <img src={lightbox.imageUrl} alt={lightbox.caption} className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          {lightbox.caption && <p className="absolute bottom-6 text-white/70 text-sm">{lightbox.caption}</p>}
        </div>
      )}

      {/* Album Modal */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editingAlbum ? 'Edit Album' : 'Buat Album Baru'}</h2>
              <button onClick={() => setShowAlbumModal(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Album *</label>
                <input type="text" value={albumForm.name} onChange={e => setAlbumForm({ ...albumForm, name: e.target.value })}
                  placeholder="contoh: Ibadah Minggu Mei 2026"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                <textarea value={albumForm.description} onChange={e => setAlbumForm({ ...albumForm, description: e.target.value })}
                  placeholder="Deskripsi singkat album (opsional)" rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAlbumModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveAlbum} disabled={!albumForm.name.trim() || savingAlbum}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {savingAlbum ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : <><Check size={15} />Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Album Modal */}
      {deleteAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} className="text-red-500" /></div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Hapus Album?</h2>
            <p className="text-sm text-gray-500 mb-6">Album <strong>"{deleteAlbum.name}"</strong> dan semua fotonya akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteAlbum(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
              <button onClick={handleDeleteAlbum} disabled={deletingAlbum}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors">
                {deletingAlbum ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Photo Modal */}
      {deletePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-500" /></div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Hapus Foto?</h2>
            {deletePhoto.imageUrl && <img src={deletePhoto.imageUrl} alt="" className="w-24 h-24 object-cover rounded-xl mx-auto mb-3" />}
            <p className="text-sm text-gray-500 mb-6">Foto ini akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePhoto(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
              <button onClick={handleDeletePhoto} disabled={deletingPhoto}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors">
                {deletingPhoto ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
