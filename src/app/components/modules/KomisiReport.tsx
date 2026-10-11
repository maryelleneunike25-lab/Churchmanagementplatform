import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, TrendingUp, CalendarDays, Users } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend,
} from 'recharts';

export interface ReportSession { id: string; title: string; date: string; presentIds: string[]; absentIds: string[]; }
export interface ReportMember { id: string; name: string; }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Yearly attendance report for one komisi: summary tiles, weekly + monthly charts, per-member table, Excel export. */
export default function KomisiReport({ komisiLabel, sessions, members }: {
  komisiLabel: string; sessions: ReportSession[]; members: ReportMember[];
}) {
  const years = useMemo(() => {
    const set = new Set<number>(sessions.map(s => new Date(s.date).getFullYear()));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [sessions]);
  const [year, setYear] = useState(new Date().getFullYear());

  const today = new Date().toISOString().slice(0, 10);
  // Only sessions that already happened count towards the report.
  const yearSessions = useMemo(
    () => sessions.filter(s => new Date(s.date).getFullYear() === year && s.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [sessions, year, today]
  );

  const total = members.length;
  const weekly = yearSessions.map(s => ({
    label: new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    hadir: s.presentIds.length,
    persen: total > 0 ? Math.round((s.presentIds.length / total) * 100) : 0,
  }));

  const monthly = MONTHS.map((label, i) => {
    const inMonth = yearSessions.filter(s => new Date(s.date).getMonth() === i);
    const avg = inMonth.length ? inMonth.reduce((n, s) => n + s.presentIds.length, 0) / inMonth.length : 0;
    return { label, rata: Math.round(avg * 10) / 10, persen: total > 0 ? Math.round((avg / total) * 100) : 0 };
  });

  const avgAll = yearSessions.length ? yearSessions.reduce((n, s) => n + s.presentIds.length, 0) / yearSessions.length : 0;
  const best = weekly.reduce((b, w) => (w.hadir > (b?.hadir ?? -1) ? w : b), null as null | (typeof weekly)[number]);

  const perMember = members.map(m => {
    const hadir = yearSessions.filter(s => s.presentIds.includes(m.id)).length;
    return { id: m.id, name: m.name, hadir, persen: yearSessions.length ? Math.round((hadir / yearSessions.length) * 100) : 0 };
  }).sort((a, b) => b.hadir - a.hadir || a.name.localeCompare(b.name, 'id'));

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perMember.map(r => ({
      Nama: r.name, Hadir: r.hadir, 'Total Sesi': yearSessions.length, 'Kehadiran (%)': r.persen,
    }))), 'Per Anggota');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(yearSessions.map(s => ({
      Tanggal: s.date, Sesi: s.title, Hadir: s.presentIds.length, 'Total Anggota': total,
      'Kehadiran (%)': total > 0 ? Math.round((s.presentIds.length / total) * 100) : 0,
    }))), 'Per Minggu');
    XLSX.writeFile(wb, `Laporan_Absensi_${komisiLabel.replace(/\s+/g, '_')}_${year}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-gray-900">Laporan Tahunan {komisiLabel}</h3>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={exportExcel} disabled={yearSessions.length === 0}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          <Download size={13} /> Export Excel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-600 flex items-center gap-1"><CalendarDays size={12} />Total Minggu</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{yearSessions.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-xs text-emerald-600 flex items-center gap-1"><Users size={12} />Rata-rata Hadir</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{avgAll.toFixed(1)} <span className="text-sm font-medium">/ {total}</span></p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
          <p className="text-xs text-purple-600 flex items-center gap-1"><TrendingUp size={12} />Tertinggi</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{best ? best.hadir : 0} <span className="text-sm font-medium">{best?.label}</span></p>
        </div>
      </div>

      {yearSessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl text-sm">
          Belum ada sesi di tahun {year}
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Kehadiran per Minggu</p>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={weekly} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, n: string) => [v, n === 'hadir' ? 'Hadir' : n]} />
                  <Bar dataKey="hadir" name="Hadir" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Rata-rata Kehadiran per Bulan (%)</p>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={monthly} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="persen" name="Kehadiran (%)" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <p className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-50">Kehadiran per Anggota</p>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {perMember.map(r => (
                <div key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                  <p className="flex-1 min-w-0 text-sm text-gray-800 break-words">{r.name}</p>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${r.persen}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{r.hadir}/{yearSessions.length} · {r.persen}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
