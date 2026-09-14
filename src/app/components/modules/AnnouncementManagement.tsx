import { useState, useEffect, useRef } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ImageIcon, X, Check, Loader2, AlertCircle
} from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface Announcement {
  id: string;
  title: string;
  description: string;
  imagePath: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
}

interface FormState {
  title: string;
  description: string;
  active: boolean;
  imageFile: File | null;
  imagePreview: string | null;
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  active: true,
  imageFile: null,
  imagePreview: null,
});

export default function AnnouncementManagement() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken || publicAnonKey}`,
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/announcements`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat data');
      setItems(data.announcements || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(fetchAll, 30_000);
  useEffect(() => { fetchAll(); }, []);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip the data URL prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, imageFile: file }));
    const url = URL.createObjectURL(file);
    setForm(f => ({ ...f, imagePreview: url }));
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError('');
  };

  const openEdit = (item: Announcement) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      active: item.active,
      imageFile: null,
      imagePreview: item.imageUrl || null,
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Judul tidak boleh kosong'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        active: form.active,
      };

      if (form.imageFile) {
        payload.imageBase64 = await toBase64(form.imageFile);
        payload.imageMimeType = form.imageFile.type;
      }

      const url = editId
        ? `${API_URL}/announcements/${editId}`
        : `${API_URL}/announcements`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      setShowForm(false);
      await fetchAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: Announcement) => {
    try {
      const res = await fetch(`${API_URL}/announcements/${item.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ active: !item.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/announcements/${id}`, { method: 'DELETE', headers });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDeleteConfirm(null);
      await fetchAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pengumuman & Flyer</h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola poster/flyer yang tampil di halaman utama website
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm"
        >
          <Plus size={18} /> Tambah Flyer
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900">
                {editId ? 'Edit Flyer' : 'Tambah Flyer Baru'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Flyer (16:9)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative cursor-pointer border-2 border-dashed border-gray-300 rounded-xl overflow-hidden hover:border-blue-400 transition-colors"
                  style={{ aspectRatio: '16/9' }}
                >
                  {form.imagePreview ? (
                    <img src={form.imagePreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-sm">Klik untuk upload gambar</span>
                      <span className="text-xs mt-1">JPG, PNG, WebP — rasio 16:9 disarankan</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {form.imagePreview && (
                  <button
                    onClick={() => setForm(f => ({ ...f, imageFile: null, imagePreview: null }))}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Hapus gambar
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Contoh: Ibadah Natal 2024"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Informasi tambahan tentang event atau pengumuman..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-medium text-gray-800">Tampilkan di Homepage</div>
                  <div className="text-xs text-gray-500">Flyer akan muncul di carousel halaman jemaat</div>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${form.active ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Check size={16} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Hapus Flyer?</h3>
            <p className="text-sm text-gray-500 mb-6">Tindakan ini tidak bisa dibatalkan. Flyer akan dihapus dari homepage.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin mr-3" /> Memuat data...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <ImageIcon size={28} className="text-gray-400" />
          </div>
          <p className="font-medium text-gray-600 mb-1">Belum ada flyer</p>
          <p className="text-sm text-gray-400">Klik "Tambah Flyer" untuk membuat pengumuman pertama</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${item.active ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'}`}>
              {/* 16:9 image */}
              <div className="relative bg-gray-100" style={{ aspectRatio: '16/9' }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <ImageIcon size={40} />
                  </div>
                )}
                {/* Active badge */}
                <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-semibold ${item.active ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}`}>
                  {item.active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1 truncate">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
                )}
                <p className="text-xs text-gray-400 mb-4">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(item)}
                    title={item.active ? 'Nonaktifkan' : 'Aktifkan'}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {item.active ? <EyeOff size={14} /> : <Eye size={14} />}
                    {item.active ? 'Nonaktif' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
