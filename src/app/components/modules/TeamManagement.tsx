import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../../../lib/supabaseClient';
import {
  Plus, Pencil, Trash2, X, Loader2, UserCircle,
  ImageIcon, Users, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;
const BUCKET = 'make-561004a0-gallery';

async function uploadPhotoToStorage(file: File, memberId: string): Promise<string | null> {
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `team/${memberId}/photo.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('Storage upload error:', error.message); return null; }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

const TIERS = [
  { value: 'gembala_sidang',  label: 'Gembala Sidang',         color: 'bg-yellow-50 border-yellow-200 text-yellow-800',  dot: 'bg-yellow-400'  },
  { value: 'penerus_gembala', label: 'Penerus Gembala Sidang', color: 'bg-blue-50 border-blue-200 text-blue-800',        dot: 'bg-blue-500'    },
  { value: 'wakil_gembala',   label: 'Wakil Gembala',          color: 'bg-indigo-50 border-indigo-200 text-indigo-800',  dot: 'bg-indigo-500'  },
  { value: 'pastoral',        label: 'Pastoral',               color: 'bg-emerald-50 border-emerald-200 text-emerald-800', dot: 'bg-emerald-500' },
  { value: 'koordinator',     label: 'Koordinator Pelayanan',  color: 'bg-gray-100 border-gray-200 text-gray-600',       dot: 'bg-gray-400'    },
];

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tier: string;
  order: number;
  photoUrl: string | null;
  spouseName?: string;
  spouseRole?: string;
}

interface FormState {
  name: string;
  role: string;
  tier: string;
  order: number;
  isCouple: boolean;
  spouseName: string;
  spouseRole: string;
  photoFile: File | null;
  photoPreview: string | null;
}

const emptyForm = (): FormState => ({
  name: '', role: '', tier: 'koordinator', order: 0,
  isCouple: false, spouseName: '', spouseRole: '',
  photoFile: null, photoPreview: null,
});


// ── Photo picker circle ──────────────────────────────────────────────────────
function PhotoPicker({ preview, onChange, onClear, size = 'lg' }: {
  preview: string | null;
  onChange: (f: File) => void;
  onClear: () => void;
  size?: 'lg' | 'sm';
}) {
  const ref = useRef<HTMLInputElement>(null);
  const dim = size === 'lg' ? 'w-28 h-28' : 'w-16 h-16';
  const iconSize = size === 'lg' ? 44 : 24;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => ref.current?.click()}
        className={`${dim} relative rounded-2xl cursor-pointer overflow-hidden border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 transition-colors flex items-center justify-center group`}
      >
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <div className="flex flex-col items-center gap-1 text-gray-300">
              <UserCircle size={iconSize} />
              {size === 'lg' && <span className="text-[10px]">Klik untuk unggah</span>}
            </div>
        }
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ImageIcon size={size === 'lg' ? 20 : 14} className="text-white" />
          {size === 'lg' && <span className="text-white text-[10px] font-medium">Ganti foto</span>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }} />
      {preview && (
        <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700 transition-colors">
          Hapus foto
        </button>
      )}
    </div>
  );
}

// ── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const t = TIERS.find(x => x.value === tier);
  if (!t) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${t.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
}

// ── Member card ──────────────────────────────────────────────────────────────
function MemberCard({ m, onEdit, onDelete }: {
  m: TeamMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isCouple = !!(m.spouseName?.trim());
  const displayName = isCouple ? `${m.name} & ${m.spouseName}` : m.name;
  const displayRole = isCouple && m.spouseRole ? `${m.role} & ${m.spouseRole}` : m.role;

  return (
    <div className="group flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all">
      {/* Photo */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
        {m.photoUrl
          ? <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover object-top" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center">
              <UserCircle size={28} className="text-gray-300" />
            </div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {isCouple && <Users size={12} className="text-pink-400 flex-shrink-0" />}
          <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
        </div>
        {displayRole && <p className="text-xs text-gray-500 truncate">{displayRole}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} title="Edit"
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <Pencil size={15} />
        </button>
        <button onClick={onDelete} title="Hapus"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Section block per tier ───────────────────────────────────────────────────
function TierSection({ tier, members, onAdd, onEdit, onDelete }: {
  tier: typeof TIERS[number];
  members: TeamMember[];
  onAdd: () => void;
  onEdit: (m: TeamMember) => void;
  onDelete: (m: TeamMember) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Section header */}
      <div className={`flex items-center gap-3 px-5 py-4 ${open ? 'border-b border-gray-100' : ''}`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tier.dot}`} />
        <h3 className="font-bold text-gray-800 flex-1 text-sm">{tier.label}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{members.length}</span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} /> Tambah
        </button>
        <button onClick={() => setOpen(o => !o)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Members list */}
      {open && (
        <div className="bg-gray-50/50 p-3 space-y-2">
          {members.length === 0
            ? <div className="text-center py-6 text-gray-400">
                <Users size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Belum ada anggota di kategori ini</p>
                <button onClick={onAdd} className="mt-2 text-xs text-blue-500 hover:underline">+ Tambah sekarang</button>
              </div>
            : members.map(m => (
                <MemberCard key={m.id} m={m}
                  onEdit={() => onEdit(m)}
                  onDelete={() => onDelete(m)} />
              ))
          }
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TeamManagement() {
  const { accessToken } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notDeployed, setNotDeployed] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [presetTier, setPresetTier] = useState('koordinator');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken || publicAnonKey}`,
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/team`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
      if (!res.ok) { setNotDeployed(true); return; }
      const data = JSON.parse(await res.text());
      if (data.success) { setMembers(data.members || []); setNotDeployed(false); }
    } catch { setNotDeployed(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const openCreate = (tier: string) => {
    setEditId(null);
    setPresetTier(tier);
    setForm({ ...emptyForm(), tier });
    setError('');
    setShowForm(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditId(m.id);
    setPresetTier(m.tier);
    setForm({
      name: m.name,
      role: m.role,
      tier: m.tier,
      order: m.order,
      isCouple: !!(m.spouseName?.trim()),
      spouseName: m.spouseName || '',
      spouseRole: m.spouseRole || '',
      photoFile: null,
      photoPreview: m.photoUrl || null,
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nama tidak boleh kosong'); return; }
    setSaving(true); setError('');
    try {
      const memberId = editId || crypto.randomUUID();

      const payload: any = {
        id: memberId,
        name: form.name.trim(),
        role: form.role.trim(),
        tier: form.tier,
        order: Number(form.order),
        spouseName: form.isCouple ? form.spouseName.trim() : '',
        spouseRole: form.isCouple ? form.spouseRole.trim() : '',
      };

      if (form.photoFile) {
        // Try direct browser-to-storage upload first (no edge function needed)
        const uploaded = await uploadPhotoToStorage(form.photoFile, memberId);
        if (uploaded) {
          payload.photoUrl = uploaded;
        } else {
          // Fallback: send base64 to edge function for server-side upload
          const base64 = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res((r.result as string).split(',')[1]);
            r.onerror = rej;
            r.readAsDataURL(form.photoFile!);
          });
          payload.photoBase64 = base64;
          payload.photoMimeType = form.photoFile.type;
        }
      }

      const url = editId ? `${API_URL}/team/${editId}` : `${API_URL}/team`;
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers, body: JSON.stringify(payload) });
      if (res.status === 404) { setError('Endpoint belum aktif. Jalankan: supabase functions deploy make-server-561004a0 --project-ref nnzqvhkhreesgcjallof'); return; }
      const data = JSON.parse(await res.text());
      if (!data.success) throw new Error(data.error || 'Gagal menyimpan');
      setShowForm(false);
      await fetchAll();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/team/${deleteTarget.id}`, { method: 'DELETE', headers });
      const data = JSON.parse(await res.text());
      if (!data.success) throw new Error(data.error);
      setDeleteTarget(null);
      await fetchAll();
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const byTier = (tier: string) => members.filter(m => m.tier === tier);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Not deployed state ─────────────────────────────────────────────────────
  if (notDeployed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-amber-600" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">Edge Function Belum Aktif</h3>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            Modul Tim Pelayanan membutuhkan Edge Function yang sudah di-deploy. Jalankan perintah berikut di terminal:
          </p>
          <code className="block bg-gray-900 text-green-400 text-xs px-4 py-3 rounded-xl font-mono mb-4 break-all">
            supabase functions deploy make-server-561004a0 --project-ref nnzqvhkhreesgcjallof
          </code>
          <button onClick={fetchAll} className="text-sm text-amber-700 font-semibold hover:underline">
            Coba lagi setelah deploy →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tim Pelayanan</h2>
          <p className="text-sm text-gray-500 mt-0.5">Kelola hamba-hamba Tuhan GBI Jelambar Timur</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{members.length} anggota</span>
          <a
            href="/tentang"
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-200 px-3 py-2 rounded-xl transition-colors"
          >
            <Eye size={13} /> Preview
          </a>
        </div>
      </div>

      {/* Sections per tier */}
      <div className="space-y-4">
        {TIERS.map(tier => (
          <TierSection
            key={tier.value}
            tier={tier}
            members={byTier(tier.value)}
            onAdd={() => openCreate(tier.value)}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* ── Form Modal ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">{editId ? 'Edit Anggota' : 'Tambah Anggota'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Photo upload */}
              <div className="flex justify-center">
                <PhotoPicker
                  preview={form.photoPreview}
                  onChange={f => {
                    setField('photoFile', f);
                    const url = URL.createObjectURL(f);
                    setField('photoPreview', url);
                  }}
                  onClear={() => { setField('photoFile', null); setField('photoPreview', null); }}
                  size="lg"
                />
              </div>

              {/* Couple toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-pink-50 border border-pink-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Pasangan / Couple?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Tampil sebagai 2 nama dalam 1 foto</p>
                </div>
                <button
                  onClick={() => setField('isCouple', !form.isCouple)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isCouple ? 'bg-pink-400' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isCouple ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Name fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    {form.isCouple ? 'Nama Orang Pertama *' : 'Nama Lengkap *'}
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder={form.isCouple ? 'Pdt. John Doe' : 'Pdt. John Doe'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    {form.isCouple ? 'Jabatan Orang Pertama' : 'Jabatan / Pelayanan'}
                  </label>
                  <input
                    value={form.role}
                    onChange={e => setField('role', e.target.value)}
                    placeholder="Gembala Sidang"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Second person (couple only) */}
                {form.isCouple && (
                  <div className="pt-2 border-t border-pink-100 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Orang Kedua</label>
                      <input
                        value={form.spouseName}
                        onChange={e => setField('spouseName', e.target.value)}
                        placeholder="Ny. Jane Doe"
                        className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Jabatan Orang Kedua</label>
                      <input
                        value={form.spouseRole}
                        onChange={e => setField('spouseRole', e.target.value)}
                        placeholder="Pendeta"
                        className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                      />
                    </div>
                    {/* Preview */}
                    {(form.name || form.spouseName) && (
                      <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-xl py-2 px-3">
                        Tampil sebagai: <span className="font-semibold text-gray-800">
                          {[form.name, form.spouseName].filter(Boolean).join(' & ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tier selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Kategori / Jajaran</label>
                <div className="flex flex-wrap gap-2">
                  {TIERS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setField('tier', t.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.tier === t.value ? t.color + ' ring-2 ring-offset-1 ring-blue-300' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Urutan Tampil</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setField('order', Number(e.target.value))}
                  min={0}
                  className="w-24 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400 ml-2">angka lebih kecil = tampil duluan</span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Tambah Anggota')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={26} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Hapus Anggota?</h3>
              <p className="text-gray-500 text-sm mt-2">
                <span className="font-semibold text-gray-700">{deleteTarget.name}</span>
                {deleteTarget.spouseName && ` & ${deleteTarget.spouseName}`} akan dihapus permanen dari daftar.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
