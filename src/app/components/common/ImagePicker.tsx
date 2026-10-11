import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { uploadImage } from '../../../lib/upload';

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  /** square avatar (default) or wide banner preview */
  shape?: 'round' | 'square' | 'wide';
  size?: number;
}

/** Take a photo with the camera or pick from the gallery; uploads immediately and returns the saved URL. */
export default function ImagePicker({ value, onChange, label = 'Foto', shape = 'round', size = 96 }: Props) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try { onChange(await uploadImage(file)); }
    catch (err: any) { setError(err?.message || 'Upload gagal'); }
    finally { setBusy(false); }
  };

  const rounding = shape === 'round' ? 'rounded-full' : 'rounded-xl';
  const dims = shape === 'wide' ? { width: '100%', height: size * 1.6 } : { width: size, height: size };

  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`relative overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 ${rounding}`} style={dims}>
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={24} className="text-gray-300" />}
          {busy && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={22} /></div>}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={busy} onClick={() => camRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">
            <Camera size={14} /> Ambil Foto
          </button>
          <button type="button" disabled={busy} onClick={() => galRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold disabled:opacity-50">
            <ImagePlus size={14} /> Pilih dari Galeri
          </button>
          {value && !busy && (
            <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1.5 text-xs text-red-600">
              <X size={12} /> Hapus foto
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}
