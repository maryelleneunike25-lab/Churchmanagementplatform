import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { CHURCH } from '../../../lib/church';

const LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/tentang', label: 'Tentang' },
  { to: '/galeri', label: 'Galeri' },
  { to: '/lokasi', label: 'Lokasi' },
  { to: '/service', label: 'Program Ibadah' },
  { to: '/akun', label: 'Akun Jemaat' },
];

/** Shared footer for every public page. */
export default function PublicFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-8 border-b border-gray-800">
          <div>
            <div className="text-white font-bold mb-1">{CHURCH.name}</div>
            <div className="text-gray-500 text-sm">{CHURCH.city}, Indonesia</div>
            <div className="text-gray-600 text-xs mt-1 max-w-xs">{CHURCH.address}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-sm">
            {LINKS.map(l => (
              <Link key={l.to} to={l.to} className="hover:text-white transition-colors py-1">{l.label}</Link>
            ))}
          </div>
        </div>
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} {CHURCH.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href={CHURCH.instagramUrl} target="_blank" rel="noopener noreferrer"
              className="bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 text-white text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 hover:scale-105 transition-all">
              {CHURCH.instagramHandle}
            </a>
            <a href={CHURCH.youtubeUrl} target="_blank" rel="noopener noreferrer"
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-full hover:scale-105 transition-all">
              YouTube
            </a>
            <a href={CHURCH.mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2 rounded-full transition-all">
              <MapPin size={12} />Google Maps
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
