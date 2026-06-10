import { Alert, AlertTitle } from '@mui/material';
import { AlertCircle } from 'lucide-react';

export default function DeploymentAlert() {
  return (
    <Alert severity="error" icon={<AlertCircle />} className="mb-4">
      <AlertTitle><strong>🚨 PENTING: Supabase Edge Function Belum Di-Deploy!</strong></AlertTitle>
      <div className="space-y-3">
        <p className="font-semibold">Error "Missing authorization header" berarti backend server belum aktif.</p>

        <div className="bg-white bg-opacity-50 p-3 rounded">
          <p className="font-semibold mb-2">Langkah-langkah Deploy:</p>
          <ol className="list-decimal ml-5 space-y-2 text-sm">
            <li>Klik <strong>ikon Settings (⚙️)</strong> di toolbar Make</li>
            <li>Scroll ke bawah ke section <strong>"Supabase"</strong></li>
            <li>Klik tombol <strong>"Deploy Edge Function"</strong> atau <strong>"Redeploy"</strong></li>
            <li>Tunggu proses deployment selesai (biasanya 10-30 detik)</li>
            <li>Lihat notifikasi sukses "Edge function deployed successfully"</li>
            <li><strong>Refresh halaman ini</strong> dan coba signup lagi</li>
          </ol>
        </div>

        <div className="bg-red-50 p-2 rounded text-xs">
          <p><strong>⚠️ Catatan Penting:</strong></p>
          <ul className="list-disc ml-5 mt-1">
            <li>Deploy hanya perlu dilakukan <strong>SATU KALI</strong></li>
            <li>Setelah deploy, server akan aktif permanen</li>
            <li>Pastikan ada notifikasi sukses sebelum mencoba signup</li>
          </ul>
        </div>
      </div>
    </Alert>
  );
}
