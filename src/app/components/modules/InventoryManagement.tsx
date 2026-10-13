import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import ModernDatePicker from '../common/ModernDatePicker';
import {
  Plus, Pencil, Trash2, Package, X, Check, Loader2, AlertCircle,
  Tag, ChevronDown, ArrowUpDown, Search, FolderOpen, Settings2,
  Camera, ImagePlus, Images, ZoomIn, ChevronLeft, ChevronRight
} from 'lucide-react';

const BUCKET = 'make-561004a0-gallery';
const KV = 'kv_store_561004a0';

interface InventoryItem {
  id: string;
  _storeKey?: string;
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

// Sesuai permintaan: pcs, unit, set, box, pack, botol, liter, ml, kg, gram, lembar
const INVENTORY_UNITS = [
  'pcs',
  'unit',
  'set',
  'box',
  'pack',
  'botol',
  'liter',
  'ml',
  'kg',
  'gram',
  'lembar',
];

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
  name: '',
  category: '',
  quantity: '',
  unit: 'pcs',
  location: '',
  condition: 'good' as const,
  purchaseDate: '',
  notes: '',
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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10 cursor-pointer">
          <ChevronLeft size={20} />
        </button>
        <button onClick={e => { e.stopPropagation(); setCur(c => (c + 1) % urls.length); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10 cursor-pointer">
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
          className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer">
          <img src={u} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
      {extra > 0 && (
        <button onClick={e => { e.stopPropagation(); onOpen(show.length); }}
          className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer">
          +{extra}
        </button>
      )}
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
  const [deleting, setDeleting] = useState(false);
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
  const [editKey, setEditKey] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // URLs already saved
  const [newPhotos, setNewPhotos] = useState<PhotoEntry[]>([]);       // newly picked files
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; key: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);

  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top whenever form opens
  useEffect(() => {
    if (showForm && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [showForm]);

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
      
      const list: InventoryItem[] = (data ?? []).map((r: any) => {
        const val = r.value || {};
        return {
          ...val,
          id: val.id || r.key.replace(/^inventory:/, ''),
          _storeKey: r.key,
        };
      }).filter(Boolean);

      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setItems(list);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadItems(); }, []);

  const openCreate = () => {
    setEditId(null);
    setEditKey(null);
    setForm(emptyForm());
    setExistingPhotos([]);
    setNewPhotos([]);
    setShowForm(true);
    setError('');
    setTimeout(() => {
      if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
    }, 50);
  };

  const openEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setEditKey(item._storeKey || (item.id.startsWith('inventory:') ? item.id : `inventory:${item.id}`));
    setForm({
      name: item.name || '',
      category: item.category || '',
      quantity: String(item.quantity ?? ''),
      unit: item.unit ? (INVENTORY_UNITS.includes(item.unit.toLowerCase()) ? item.unit.toLowerCase() : item.unit) : 'pcs',
      location: item.location || '',
      condition: item.condition || 'good',
      purchaseDate: item.purchaseDate || '',
      notes: item.notes || '',
    });
    setExistingPhotos(item.photoUrls || []);
    setNewPhotos([]);
    setShowForm(true);
    setError('');
    setTimeout(() => {
      if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
    }, 50);
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
    setSaving(true);
    setError('');
    try {
      const itemId = editId || crypto.randomUUID();
      const targetKey = editKey || `inventory:${itemId}`;

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
        id: itemId,
        _storeKey: targetKey,
        ...form,
        quantity: parseInt(form.quantity),
        photoUrls: allPhotoUrls,
        createdAt: editId ? (items.find(i => i.id === editId)?.createdAt ?? now) : now,
        updatedAt: now,
      };

      if (editId) {
        const { error: err } = await supabase.from(KV).update({ value: item }).eq('key', targetKey);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from(KV).insert({ key: targetKey, value: item });
        if (err) throw err;
      }

      setShowForm(false);
      await loadItems();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan item');
    } finally {
      setSaving(false);
    }
  };

  // ── FIX DELETE LOGIC ────────────────────────────────────────────────────────
  const handleDelete = async (target: { id: string; key: string }) => {
    setDeleting(true);
    try {
      // 1. Delete by actual KV store key
      const { error: err } = await supabase.from(KV).delete().eq('key', target.key);
      if (err) throw err;

      // 2. Also attempt deleting by key fallback if it was different
      if (target.id && `inventory:${target.id}` !== target.key) {
        await supabase.from(KV).delete().eq('key', `inventory:${target.id}`).catch(() => {});
      }

      // 3. Immediately remove from local state so UI updates without waiting
      setItems(prev => prev.filter(i => i.id !== target.id && i._storeKey !== target.key));
      setDeleteConfirm(null);

      // 4. Reload from database to ensure sync
      await loadItems();
    } catch (e: any) {
      alert(`Gagal menghapus item: ${e.message || 'Terjadi kesalahan'}`);
    } finally {
      setDeleting(false);
    }
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
      if (sortBy === 'name-asc')  return a.name.localeCompare(b.name, 'id');
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'id');
      if (sortBy === 'qty-asc')   return a.quantity - b.quantity;
      if (sortBy === 'qty-desc')  return b.quantity - a.quantity;
      if (sortBy === 'date-asc')  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const usedCategories = [...new Set(items.map(i => i.category).filter(Boolean))];

  // For form photo previews
  const formPhotoPreviews = [
    ...existingPhotos.map(u => ({ src: u, isNew: false })),
    ...newPhotos.map((p, idx) => ({ src: p.preview, isNew: true, idx })),
  ];
  const formPhotoCount = formPhotoPreviews.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventaris Gereja</h2>
          <p className="text-sm text-gray-500 mt-1">{items.length} item terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatManager(true)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer bg-white">
            <Settings2 size={16} /> Kelola Kategori
          </button>
          {canEdit && (
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm cursor-pointer">
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
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, kategori, lokasi..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="relative">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
          <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <Package size={40} className="mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">Tidak ada item inventaris</p>
          <p className="text-xs text-gray-400 mt-1">
            {search || filterCat || filterCondition ? 'Coba ubah filter pencarian' : 'Mulai dengan menambahkan item baru'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map(item => {
            const hasPhotos = item.photoUrls && item.photoUrls.length > 0;
            const primaryPhoto = hasPhotos ? item.photoUrls![0] : null;

            return (
              <div key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                {/* Photo banner */}
                <div className="relative w-full h-44 bg-gray-100 overflow-hidden group">
                  {primaryPhoto ? (
                    <>
                      <img src={primaryPhoto} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <button onClick={() => setLightbox({ urls: item.photoUrls!, idx: 0 })}
                        className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold cursor-pointer">
                        <ZoomIn size={16} /> Lihat Foto
                      </button>
                      {item.photoUrls!.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Images size={10} /> {item.photoUrls!.length}
                        </span>
                      )}
                      <div className="absolute top-2 left-2">
                        <PhotoStrip urls={item.photoUrls!} onOpen={i => setLightbox({ urls: item.photoUrls!, idx: i })} />
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
                    <p className="font-semibold text-gray-900 text-sm leading-snug break-words">{item.name}</p>
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
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors font-medium cursor-pointer">
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({
                          id: item.id,
                          name: item.name,
                          key: item._storeKey || (item.id.startsWith('inventory:') ? item.id : `inventory:${item.id}`)
                        })}
                        className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Hapus Item">
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
              <button onClick={() => setShowCatManager(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex gap-2">
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder="Nama kategori baru..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                <button onClick={addCategory}
                  className="flex items-center gap-1.5 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors cursor-pointer">
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
                          className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        <button onClick={() => saveEditCategory(idx)} className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"><Check size={15} /></button>
                        <button onClick={() => setEditCatIdx(null)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"><X size={15} /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-gray-800">{cat}</span>
                        {usedCategories.includes(cat) && (
                          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                            {items.filter(i => i.category === cat).length} item
                          </span>
                        )}
                        <button onClick={() => { setEditCatIdx(idx); setEditCatVal(cat); }} className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"><Pencil size={14} /></button>
                        <button onClick={() => deleteCategory(idx)} className="text-red-400 hover:text-red-600 p-1 cursor-pointer"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowCatManager(false)}
                className="w-full bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 cursor-pointer">
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] sm:max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile handle indicator */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 sm:hidden" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-gray-50/70">
              <h3 className="font-bold text-gray-900 text-base">{editId ? 'Edit Item Inventaris' : 'Tambah Item Baru'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"><X size={20} /></button>
            </div>

            {/* Form scroll container that starts cleanly at top */}
            <div ref={modalScrollRef} className="p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Speaker TOA, Kursi Plastik..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <div className="relative">
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-9 cursor-pointer">
                    <option value="">— Pilih Kategori —</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Qty + Unit Dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                  <input type="number" min="0" value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satuan *</label>
                  <div className="relative">
                    <select
                      value={form.unit || 'pcs'}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-9 cursor-pointer">
                      {/* If current item has legacy unit, keep it visible */}
                      {form.unit && !INVENTORY_UNITS.includes(form.unit.toLowerCase()) && (
                        <option value={form.unit}>{form.unit}</option>
                      )}
                      {INVENTORY_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ruang Ibadah, Gudang, Pastori, Kantor..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kondisi</label>
                <div className="flex gap-2">
                  {(['good', 'needs_repair', 'broken'] as const).map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, condition: c }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${form.condition === c ? CONDITION_LABELS[c].color + ' border-current shadow-xs' : 'border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'}`}>
                      {CONDITION_LABELS[c].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembelian</label>
                <ModernDatePicker
                  value={form.purchaseDate}
                  onChange={val => setForm(f => ({ ...f, purchaseDate: val }))}
                  placeholder="Pilih tanggal pembelian"
                  minYear={1990}
                  maxYear={new Date().getFullYear() + 2}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Catatan tambahan tentang item ini..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" />
              </div>

              {/* ── Photo section ── */}
              <div className="border-t border-gray-100 pt-4">
                {formPhotoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formPhotoPreviews.map((p, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={p.src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => p.isNew ? removeNewPhoto((p as any).idx) : removeExistingPhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLightbox({ urls: formPhotoPreviews.map(x => x.src), idx: i })}
                          className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors cursor-pointer">
                Batal
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Check size={16} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Hapus Item?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Item <strong>{deleteConfirm.name}</strong> akan dihapus permanen dari inventaris gereja.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : null}
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && <Lightbox urls={lightbox.urls} start={lightbox.idx} onClose={() => setLightbox(null)} />}
    </div>
  );
}
