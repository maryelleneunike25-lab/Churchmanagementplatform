import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '@mui/material';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import PendingApprovals from './PendingApprovals';
import CongregationManagement from '../modules/CongregationManagement';
import AttendanceManagement from '../modules/AttendanceManagement';
import KomselManagement from '../modules/KomselManagement';
import FinanceManagement from '../modules/FinanceManagement';
import InventoryManagement from '../modules/InventoryManagement';
import UserManagement from '../modules/UserManagement';
import AnnouncementManagement from '../modules/AnnouncementManagement';
import PelayanManagement from '../modules/PelayanManagement';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import gbiLogo from '../../../imports/pngegg__1_-1.png';
import {
  LayoutDashboard, Users, ClipboardCheck, CalendarCheck, Group,
  Wallet, Package, HandHelping, Megaphone, ShieldCheck, Menu, X,
  LogOut, ChevronRight, Cake, Gift
} from 'lucide-react';

// ── Birthday helpers ──────────────────────────────────────────────────────────
function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function birthdayInfo(birthDate: string): { daysUntil: number; age: number } | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  const thisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  let daysUntil = Math.round((thisYear.getTime() - today.setHours(0,0,0,0)) / 86400000);
  if (daysUntil < 0) daysUntil += 365;
  const age = new Date().getFullYear() - birth.getFullYear() + (daysUntil === 0 ? 0 : 1);
  return { daysUntil, age };
}

const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

const NAV_ICONS: Record<string, any> = {
  dashboard:       LayoutDashboard,
  userManagement:  ShieldCheck,
  pendingApprovals:ClipboardCheck,
  jemaat:          Users,
  absensi:         CalendarCheck,
  komsel:          Group,
  keuangan:        Wallet,
  inventaris:      Package,
  pelayan:         HandHelping,
  pengumuman:      Megaphone,
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalKomsel: 0,
    pendingApprovals: 0,
    todayAttendance: 0,
  });
  const [members, setMembers] = useState<any[]>([]);

  const isSuperAdmin = user?.role === 'super_admin';
  const permissions = user?.permissions || {};

  const navItems = [
    { label: 'Dashboard',         key: 'dashboard',        visible: true },
    { label: 'User Management',   key: 'userManagement',   visible: isSuperAdmin },
    { label: 'Pending Approvals', key: 'pendingApprovals', visible: isSuperAdmin },
    { label: 'Data Jemaat',       key: 'jemaat',           visible: isSuperAdmin || permissions.viewJemaat },
    { label: 'Absensi',           key: 'absensi',          visible: isSuperAdmin || permissions.viewAbsensi },
    { label: 'Komsel',            key: 'komsel',           visible: isSuperAdmin || permissions.viewKomsel },
    { label: 'Keuangan',          key: 'keuangan',         visible: isSuperAdmin || permissions.viewKeuangan },
    { label: 'Inventaris',        key: 'inventaris',       visible: isSuperAdmin || permissions.viewInventaris },
    { label: 'Pelayan',           key: 'pelayan',          visible: isSuperAdmin || permissions.viewJemaat },
    { label: 'Pengumuman',        key: 'pengumuman',       visible: isSuperAdmin || permissions.viewPengumuman },
  ].filter(t => t.visible);

  const currentLabel = navItems.find(n => n.key === activeTab)?.label ?? 'Dashboard';

  useEffect(() => { loadStats(); loadMembers(); }, []);

  // Auto-refresh stats + members every 30 seconds, and on tab focus
  useAutoRefresh(() => { loadStats(); loadMembers(); }, 30_000);

  const loadMembers = async () => {
    try {
      const res = await fetch(`${API_URL}/congregation/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.members) setMembers(data.members.filter((m: any) => m?.name));
    } catch {}
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_URL}/stats/dashboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) setStats(result.stats);
      }
    } catch {}
  };

  const handleSignOut = async () => { await signOut(); navigate('/jemaat'); };

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-gradient-to-b from-blue-900 to-indigo-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'}`}>

        {/* Logo / toggle */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 min-w-0">
              <img src={gbiLogo} alt="GBI Logo" className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-white" />
              <span className="text-sm font-semibold leading-tight truncate">GBI Jelambar<br/>Timur</span>
            </div>
          )}
          {!sidebarOpen && (
            <img src={gbiLogo} alt="GBI Logo" className="w-8 h-8 rounded-full object-cover bg-white" />
          )}
          <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {navItems.map(item => {
            const Icon = NAV_ICONS[item.key] ?? LayoutDashboard;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                  ${active ? 'bg-white text-blue-900 shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {active && <ChevronRight size={14} className="opacity-50" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className={`border-t border-white/10 p-3 ${sidebarOpen ? '' : 'flex flex-col items-center'}`}>
          {sidebarOpen && (
            <div className="mb-3 px-2">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-blue-300 truncate">{isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            title={!sidebarOpen ? 'Keluar' : undefined}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{currentLabel}</h1>
            <p className="text-xs text-gray-400">Gereja Jelambar Timur</p>
          </div>
          <div className="flex items-center gap-3">
            {stats.pendingApprovals > 0 && isSuperAdmin && (
              <button onClick={() => setActiveTab('pendingApprovals')}
                className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-orange-100">
                <ClipboardCheck size={14} />
                {stats.pendingApprovals} Pending
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 space-y-6">

          {/* Dashboard overview */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Jemaat',    value: stats.totalMembers,    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: Users },
                  { label: 'Komsel Aktif',    value: stats.totalKomsel,     color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Group },
                  { label: 'Pending Approval',value: stats.pendingApprovals,color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: ClipboardCheck },
                  { label: 'Absensi Hari Ini',value: stats.todayAttendance, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: CalendarCheck },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-gray-500">{s.label}</p>
                      <s.icon size={16} className={s.color} />
                    </div>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Welcome message */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-6 text-white">
                <h2 className="text-lg font-bold mb-1">Selamat datang, {user?.name} 👋</h2>
                <p className="text-blue-200 text-sm">
                  {isSuperAdmin
                    ? 'Anda login sebagai Super Admin dengan akses penuh ke semua fitur.'
                    : 'Anda login sebagai Admin. Menu tampil sesuai permissions yang diberikan Super Admin.'}
                </p>
              </div>

              {/* Quick nav */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Akses Cepat</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {navItems.filter(n => n.key !== 'dashboard').map(item => {
                    const Icon = NAV_ICONS[item.key] ?? LayoutDashboard;
                    return (
                      <button key={item.key} onClick={() => setActiveTab(item.key)}
                        className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm text-left">
                        <Icon size={18} className="text-blue-600 flex-shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Birthday section */}
              {(() => {
                const withBirthday = members
                  .map(m => ({ ...m, bday: birthdayInfo(m.birthDate) }))
                  .filter(m => m.bday && m.bday.daysUntil <= 30)
                  .sort((a, b) => a.bday!.daysUntil - b.bday!.daysUntil);

                const todayBdays = withBirthday.filter(m => m.bday!.daysUntil === 0);
                const upcomingBdays = withBirthday.filter(m => m.bday!.daysUntil > 0);

                if (withBirthday.length === 0) return null;

                return (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Cake size={16} className="text-pink-500" /> Ulang Tahun
                    </h3>

                    {/* Today */}
                    {todayBdays.length > 0 && (
                      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-5 text-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Gift size={18} />
                          <span className="font-bold text-sm">Ulang Tahun Hari Ini 🎉</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {todayBdays.map(m => {
                            const birth = new Date(m.birthDate);
                            const age = new Date().getFullYear() - birth.getFullYear();
                            const initials = m.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase();
                            return (
                              <div key={m.id} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2">
                                <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">{initials}</div>
                                <div>
                                  <p className="text-sm font-semibold leading-tight">{m.name}</p>
                                  <p className="text-xs text-white/80">Usia {age} tahun 🎂</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Upcoming */}
                    {upcomingBdays.length > 0 && (
                      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                          <Cake size={15} className="text-pink-400" />
                          <span className="text-sm font-semibold text-gray-700">30 Hari ke Depan</span>
                          <span className="ml-auto bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">{upcomingBdays.length} orang</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                          {upcomingBdays.map(m => {
                            const birth = new Date(m.birthDate);
                            const nextAge = new Date().getFullYear() - birth.getFullYear() + 1;
                            const initials = m.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase();
                            const dateStr = `${birth.getDate()} ${MONTHS_ID[birth.getMonth()]}`;
                            const urgent = m.bday!.daysUntil <= 7;
                            return (
                              <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${urgent ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                                  <p className="text-xs text-gray-400">{dateStr} · Usia {nextAge} tahun</p>
                                </div>
                                <div className={`text-right flex-shrink-0 ${urgent ? 'text-pink-600' : 'text-gray-400'}`}>
                                  <p className="text-xs font-semibold">{m.bday!.daysUntil} hari lagi</p>
                                  {urgent && <p className="text-xs">⚡ Segera</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {!isSuperAdmin && (
                <Alert severity="info">
                  Beberapa menu mungkin tidak terlihat karena terbatas oleh permissions. Hubungi Super Admin untuk perubahan akses.
                </Alert>
              )}
            </div>
          )}

          {activeTab === 'userManagement'   && <UserManagement />}
          {activeTab === 'pendingApprovals' && <PendingApprovals onApprovalChange={loadStats} />}
          {activeTab === 'jemaat'           && <CongregationManagement />}
          {activeTab === 'absensi'          && <AttendanceManagement />}
          {activeTab === 'komsel'           && <KomselManagement />}
          {activeTab === 'keuangan'         && <FinanceManagement />}
          {activeTab === 'inventaris'       && <InventoryManagement />}
          {activeTab === 'pelayan'          && <PelayanManagement />}
          {activeTab === 'pengumuman'       && <AnnouncementManagement />}
        </main>
      </div>
    </div>
  );
}
