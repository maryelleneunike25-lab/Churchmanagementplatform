import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  Plus, Pencil, Trash2, Package, X, Check, Loader2, AlertCircle,
  Tag, ChevronDown, ArrowUpDown, Search, FolderOpen, Settings2,
  Camera, ImagePlus, Images, ZoomIn, ChevronLeft, ChevronRight
} from 'lucide-react';

const BUCKET = 'make-561004a0-gallery';
const KV = 'kv_store_561004a0';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  condition: 'good' | 'needs_repair' | 'broken';
  purchaseDate?: string;
  notes?: string;
  photoUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

interface PhotoEntry { file: File; preview: string; uploaded?: string; }

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  good:         { label: 'Baik',            color: 'bg-emerald-100 text-emerald-700' },
  needs_repair: { label: 'Perlu Perbaikan', color: 'bg-amber-100 text-amber-700' },
  broken:       { label: 'Rusak',           color: 'bg-red-100 text-red-700' },
};

const DEFAULT_CATEGORIES = [
  'Sound System', 'Proyektor & Layar', 'Kursi & Meja', 'Alat Musik',
  'Elektronik', 'Perlengkapan Ibadah', 'Kebersihan', 'Lainnya',
];

const SORT_OPTIONS = [
  { value: 'name-asc',  label: 'Nama A–Z' },
  { value: 'name-desc', label: 'Nama Z–A' },
  { value: 'qty-asc',   label: 'Jumlah Terkecil' },
  { value: 'qty-desc',  label: 'Jumlah Terbesar' },
  { value: 'date-desc', label: 'Terbaru' },
  { value: 'date-asc',  label: 'Terlama' },
];

const emptyForm = () => ({
  name: '', category: '', quantity: '', unit: '',
  location: '', condition: 'good' as const, purchaseDate: '', notes: '',
});

// ── Upload a single photo to storage ─────────────────────────────────────────
async function uploadInventoryPhoto(file: File, itemId: string, idx: number): Promise<string | null> {
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `inventory/${itemId}/photo_${idx}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('Upload error:', error.message); return null; }
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365 * 3);
  return signed?.signedUrl ?? null;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
  const [cur, setCur] = useState(start);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCur(c => (c + 1) % urls.length);
      if (e.key === 'ArrowLeft') setCur(c => (c - 1 + urls.length) % urls.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [urls.length, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white z-10"><X size={28} /></button>
      {urls.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setCur(c => (c - 1 + urls.length) % urls.length); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10">
          <ChevronLeft size={20} />
        </button>
        <button onClick={e => { e.stopPropagation(); setCur(c => (c + 1) % urls.length); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10">
          <ChevronRight size={20} />
        </button>
      </>}
      <img src={urls[cur]} alt="" className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">{cur + 1} / {urls.length}</div>
      )}
    </div>
  );
}

// ── Photo strip shown in table/card ──────────────────────────────────────────
function PhotoStrip({ urls, onOpen }: { urls: string[]; onOpen: (i: number) => void }) {
  if (!urls.length) return null;
  const show = urls.slice(0, 3);
  const extra = urls.length - show.length;
  return (
    <div className="flex gap-1 items-center">
      {show.map((u, i) => (
        <button key={i} onClick={e => { e.stopPropagation(); onOpen(i); }}
          className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 hover:opacity-80 transition-opacity">
          <img src={u} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
      {extra > 0 && (
        <button onClick={e => { e.stopPropagation(); onOpen(show.length); }}
          className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors">
          +{extra}
        </button>
      )}
    </div>
  );
}

// ── Photo picker in form ──────────────────────────────────────────────────────
function PhotoPicker({ photos, onAdd, onRemove }: {
  photos: PhotoEntry[];
  onAdd: (files: FileList) => void;
  onRemove: (i: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const openCamera = () => {
    // Create a temporary input with capture attribute and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files?.length) onAdd(files);
    };
    input.click();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Foto Dokumentasi
        <span className="text-gray-400 font-normal ml-1">({photos.length}/5, maks 5)</span>
      </label>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((p, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={p.preview} alt="" className="w-full h-full object-cover" />
              {p.uploaded === undefined && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Loader2 size={14} className="animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < 5 && (
        <div className="flex gap-2">
          {/* Camera — opens native camera directly */}
          <button
            type="button"
            onClick={openCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-300 text-emerald-700 py-3 rounded-xl text-sm font-semibold transition-all"
          >
            <Camera size={16} /> Ambil Foto
          </button>
          {/* Gallery */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-500 hover:text-blue-600 py-3 rounded-xl text-sm font-medium transition-all"
          >
            <ImagePlus size={16} /> Pilih dari Galeri
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) { onAdd(e.target.files); e.target.value = ''; } }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InventoryManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || user?.permissions?.editInventaris || false;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<string[]>(() => {
    try { const s = localStorage.getItem('gjt_inventory_categories'); return s ? JSON.parse(s) : DEFAULT_CATEGORIES; }
    catch { return DEFAULT_CATEGORIES; }
  });
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editCatIdx, setEditCatIdx] = useState<number | null>(null);
  const [editCatVal, setEditCatVal] = useState('');

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // URLs already saved
  const [newPhotos, setNewPhotos] = useState<PhotoEntry[]>([]);       // newly picked files
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);

  const saveCategories = (cats: string[]) => {
    setCategories(cats);
    localStorage.setItem('gjt_inventory_categories', JSON.stringify(cats));
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from(KV).select('key, value').like('key', 'inventory:%').order('key', { ascending: false });
      if (err) throw err;
      const list: InventoryItem[] = (data ?? []).map((r: any) => r.value as InventoryItem).filter(Boolean);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(list);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadItems(); }, []);

  const openCreate = () => {
    setEditId(null); setForm(emptyForm());
    setExistingPhotos([]); setNewPhotos([]);
    setShowForm(true); setError('');
  };

  const openEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setForm({
      name: item.name, category: item.category,
      quantity: String(item.quantity), unit: item.unit,
      location: item.location, condition: item.condition,
      purchaseDate: item.purchaseDate || '', notes: item.notes || '',
    });
    setExistingPhotos(item.photoUrls || []);
    setNewPhotos([]);
    setShowForm(true); setError('');
  };

  const handleAddPhotos = (files: FileList) => {
    const remaining = 5 - existingPhotos.length - newPhotos.length;
    const toAdd = Array.from(files).slice(0, remaining);
    const entries: PhotoEntry[] = toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setNewPhotos(p => [...p, ...entries]);
  };

  const removeExistingPhoto = (i: number) => setExistingPhotos(p => p.filter((_, idx) => idx !== i));
  const removeNewPhoto = (i: number) => setNewPhotos(p => p.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nama item tidak boleh kosong'); return; }
    if (!form.quantity || isNaN(Number(form.quantity))) { setError('Jumlah harus berupa angka'); return; }
    setSaving(true); setError('');
    try {
      const itemId = editId || crypto.randomUUID();

      // Upload new photos directly to storage
      const uploadedUrls: string[] = [];
      const startIdx = existingPhotos.length;
      for (let i = 0; i < newPhotos.length; i++) {
        const url = await uploadInventoryPhoto(newPhotos[i].file, itemId, startIdx + i);
        if (url) uploadedUrls.push(url);
      }

      const allPhotoUrls = [...existingPhotos, ...uploadedUrls];

      const now = new Date().toISOString();
      const item: InventoryItem = {
        id: itemId, ...form,
        quantity: parseInt(form.quantity),
        photoUrls: allPhotoUrls,
        createdAt: editId ? (items.find(i => i.id === editId)?.createdAt ?? now) : now,
        updatedAt: now,
      };
      if (editId) {
        const { error: err } = await supabase.from(KV).update({ value: item }).eq('key', `inventory:${editId}`);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from(KV).insert({ key: `inventory:${itemId}`, value: item });
        if (err) throw err;
      }
      setShowForm(false);
      await loadItems();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: err } = await supabase.from(KV).delete().eq('key', `inventory:${id}`);
      if (err) throw err;
      setDeleteConfirm(null);
      await loadItems();
    } catch (e: any) { setError(e.message); }
  };

  // Category manager
  const addCategory = () => {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    saveCategories([...categories, name]);
    setNewCatName('');
  };
  const deleteCategory = (idx: number) => saveCategories(categories.filter((_, i) => i !== idx));
  const saveEditCategory = (idx: number) => {
    const name = editCatVal.trim();
    if (!name) return;
    const updated = [...categories]; updated[idx] = name;
    saveCategories(updated); setEditCatIdx(null);
  };

  // Filter + sort
  const displayed = items
    .filter(item => {
      const q = search.toLowerCase();
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q) && !item.location.toLowerCase().includes(q)) return false;
      if (filterCat && item.category !== filterCat) return false;
      if (filterCondition && item.condition !== filterCondition) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':  return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'qty-asc':   return a.quantity - b.quantity;
        case 'qty-desc':  return b.quantity - a.quantity;
        case 'date-asc':  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const usedCategories = [...new Set(items.map(i => i.category).filter(Boolean))];

  // All photos in form (existing + new previews)
  const formPhotoCount = existingPhotos.length + newPhotos.length;
  const formPhotoPreviews = [
    ...existingPhotos.map(u => ({ src: u, isNew: false })),
    ...newPhotos.map((p, i) => ({ src: p.preview, isNew: true, idx: i })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventaris Gereja</h2>
          <p className="text-sm text-gray-500 mt-1">{items.length} item terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatManager(true)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            <Settings2 size={16} /> Kelola Kategori
          </button>
          {canEdit && (
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm">
              <Plus size={18} /> Tambah Item
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk akses edit.
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, kategori, lokasi..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="relative">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="pl-8 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer">
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer pr-8">
            <option value="">Semua Kondisi</option>
            <option value="good">Baik</option>
            <option value="needs_repair">Perlu Perbaikan</option>
            <option value="broken">Rusak</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="pl-8 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin mr-3" /> Memuat data...
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Package size={28} className="text-gray-400" />
          </div>
          <p className="font-medium text-gray-600 mb-1">
            {items.length === 0 ? 'Belum ada data inventaris' : 'Tidak ada item yang cocok'}
          </p>
          <p className="text-sm text-gray-400">
            {items.length === 0 ? 'Klik "Tambah Item" untuk mulai mencatat' : 'Coba ubah filter atau kata pencarian'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(item => {
            const photos = item.photoUrls ?? [];
            const hasPhoto = photos.length > 0;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Photo area — always shown, placeholder if none */}
                <div
                  className="relative w-full bg-gray-100 cursor-pointer"
                  style={{ aspectRatio: '16/9' }}
                  onClick={() => hasPhoto && setLightbox({ urls: photos, idx: 0 })}
                >
                  {hasPhoto ? (
                    <>
                      <img
                        src={photos[0]}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          {photos.slice(1, 4).map((u, i) => (
                            <div key={i} className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                              <img src={u} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {photos.length > 4 && (
                            <div className="w-8 h-8 rounded-lg bg-black/60 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                              +{photos.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Images size={10} /> {photos.length}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                      <Package size={32} />
                      <span className="text-xs">Belum ada foto</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{item.name}</p>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${CONDITION_LABELS[item.condition]?.color}`}>
                      {CONDITION_LABELS[item.condition]?.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      <Tag size={9} />{item.category || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
                    <div><span className="text-gray-400">Jumlah</span><br /><strong className="text-gray-800">{item.quantity} {item.unit}</strong></div>
                    <div><span className="text-gray-400">Lokasi</span><br /><strong className="text-gray-800">{item.location || '—'}</strong></div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-gray-400 italic line-clamp-2 mb-2">{item.notes}</p>
                  )}

                  {canEdit && (
                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
                      <button onClick={() => openEdit(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors font-medium">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setDeleteConfirm(item.id)}
                        className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Category Manager Modal ── */}
      {showCatManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Kelola Kategori</h3>
                <p className="text-xs text-gray-500 mt-0.5">Tambah, edit, atau hapus kategori barang</p>
              </div>
              <button onClick={() => setShowCatManager(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex gap-2">
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder="Nama kategori baru..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={addCategory}
                  className="flex items-center gap-1.5 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors">
                  <Plus size={16} /> Tambah
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                    <FolderOpen size={15} className="text-blue-400 flex-shrink-0" />
                    {editCatIdx === idx ? (
                      <>
                        <input value={editCatVal} onChange={e => setEditCatVal(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditCategory(idx)} autoFocus
                          className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => saveEditCategory(idx)} className="text-emerald-600 hover:text-emerald-700 p-1"><Check size={15} /></button>
                        <button onClick={() => setEditCatIdx(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-gray-800">{cat}</span>
                        {usedCategories.includes(cat) && (
                          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                            {items.filter(i => i.category === cat).length} item
                          </span>
                        )}
                        <button onClick={() => { setEditCatIdx(idx); setEditCatVal(cat); }} className="text-blue-500 hover:text-blue-700 p-1"><Pencil size={14} /></button>
                        <button onClick={() => deleteCategory(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowCatManager(false)}
                className="w-full bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800">
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900">{editId ? 'Edit Item' : 'Tambah Item Baru'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Speaker TOA, Kursi Plastik..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <div className="relative">
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-9">
                    <option value="">— Pilih Kategori —</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Qty + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                  <input type="number" min="0" value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="Unit, Pcs, Set..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ruang Ibadah, Gudang, Kantor..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kondisi</label>
                <div className="flex gap-2">
                  {(['good', 'needs_repair', 'broken'] as const).map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, condition: c }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.condition === c ? CONDITION_LABELS[c].color + ' border-current' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {CONDITION_LABELS[c].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembelian</label>
                <input type="date" value={form.purchaseDate}
                  onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Catatan tambahan tentang item ini..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* ── Photo section ── */}
              <div className="border-t border-gray-100 pt-4">
                {/* Preview grid (existing + new) */}
                {formPhotoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formPhotoPreviews.map((p, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={p.src} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => p.isNew ? removeNewPhoto((p as any).idx) : removeExistingPhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                        <button
                          onClick={() => setLightbox({ urls: formPhotoPreviews.map(x => x.src), idx: i })}
                          className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ZoomIn size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add buttons */}
                {formPhotoCount < 5 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Foto Dokumentasi <span className="text-gray-400 font-normal">({formPhotoCount}/5)</span>
                    </p>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-500 hover:text-blue-600 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer">
                        <ImagePlus size={16} /> Pilih dari Galeri
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={e => { if (e.target.files?.length) { handleAddPhotos(e.target.files); e.target.value = ''; } }} />
                      </label>
                      <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer">
                        <Camera size={16} /> Ambil Foto
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={e => { if (e.target.files?.length) { handleAddPhotos(e.target.files); e.target.value = ''; } }} />
                      </label>
                    </div>
                  </div>
                )}
                {formPhotoCount >= 5 && (
                  <p className="text-xs text-gray-400 text-center">Maksimal 5 foto per item</p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Check size={16} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Hapus Item?</h3>
            <p className="text-sm text-gray-500 mb-6">Data inventaris ini akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && <Lightbox urls={lightbox.urls} start={lightbox.idx} onClose={() => setLightbox(null)} />}
    </div>
  );
}
