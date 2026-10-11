import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
// @ts-ignore
import gbiLogo from '../../../imports/pngegg__1_-1.png';

/** Shared look for the admin portal's login and sign-up: dark and secure, clearly different from the public website. */
export default function AdminAuthShell({ title, subtitle, footer, children }: {
  title: string; subtitle: string; footer?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-10 safe-top safe-bottom"
      style={{ background: 'linear-gradient(135deg, #0b1226 0%, #1e3a8a 55%, #312e81 100%)' }}>
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto ring-4 ring-white/15 shadow-2xl bg-white">
            <img src={gbiLogo} alt="GBI" className="w-full h-full object-cover" />
          </div>
          <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-blue-100 text-[11px] font-semibold tracking-widest uppercase">
            <ShieldCheck size={12} /> Portal Admin
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-blue-200/80">{subtitle}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-6 sm:p-8">{children}</div>

        {footer && <div className="mt-5 text-center text-sm text-blue-100/80">{footer}</div>}
        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-blue-200/70 hover:text-white transition-colors">
            <ArrowLeft size={12} /> Kembali ke website GBI Jelambar Timur
          </Link>
        </div>
      </div>
    </div>
  );
}
