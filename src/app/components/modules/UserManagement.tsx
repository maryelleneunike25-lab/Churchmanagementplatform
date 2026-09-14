import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip } from '@mui/material';
import { Edit, UserX, UserCheck, Shield, Key, Trash2, AlertTriangle } from 'lucide-react';
import { KOMISI_LIST } from './KomisiManagement';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  churchBranchId: string;
  permissions?: {
    viewDashboard: boolean;
    viewJemaat: boolean;
    editJemaat: boolean;
    deleteJemaat: boolean;
    viewAbsensi: boolean;
    manageAbsensi: boolean;
    viewKomsel: boolean;
    editKomsel: boolean;
    viewKeuangan: boolean;
    editKeuangan: boolean;
    viewInventaris: boolean;
    editInventaris: boolean;
    viewPelayan: boolean;
    editPelayan: boolean;
    viewPengumuman: boolean;
    editPengumuman: boolean;
    viewGaleri: boolean;
    editGaleri: boolean;
    viewPendaftaran: boolean;
    viewReports: boolean;
    komisiLeaderOf?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function UserManagement() {
  const { accessToken, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openPermissionsDialog, setOpenPermissionsDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as 'super_admin' | 'admin',
    churchBranchId: ''
  });
  const [permissions, setPermissions] = useState({
    viewDashboard: true,
    viewJemaat: false,
    editJemaat: false,
    deleteJemaat: false,
    viewAbsensi: false,
    manageAbsensi: false,
    viewKomsel: false,
    editKomsel: false,
    viewKeuangan: false,
    editKeuangan: false,
    viewInventaris: false,
    editInventaris: false,
    viewPelayan: false,
    editPelayan: false,
    viewPengumuman: false,
    editPengumuman: false,
    viewGaleri: false,
    editGaleri: false,
    viewPendaftaran: false,
    viewReports: false,
  });
  const [komisiLeaderOf, setKomisiLeaderOf] = useState<string[]>([]);
  const [isKomisiLeader, setIsKomisiLeader] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const text = await response.text();
      let result: any = {};
      try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }

      if (result.success) {
        setUsers(result.users || []);
      } else {
        setError(result.error || '');
      }
    } catch (error: any) {
      console.error('Load users error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      churchBranchId: user.churchBranchId
    });
    setOpenEditDialog(true);
  };

  const handleOpenPermissions = (user: User) => {
    setEditingUser(user);
    const perms = user.permissions || permissions;
    setPermissions({ ...permissions, ...perms });
    const leaderOf = perms.komisiLeaderOf || [];
    setKomisiLeaderOf(leaderOf);
    setIsKomisiLeader(leaderOf.length > 0);
    setOpenPermissionsDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`${API_URL}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const text = await response.text();
      let result: any = {};
      try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }

      if (result.success) {
        await loadUsers();
        setOpenEditDialog(false);
        setEditingUser(null);
      } else {
        setError(result.error || `Error ${response.status}`);
      }
    } catch (error: any) {
      console.error('Update user error:', error);
      setError(error.message);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`${API_URL}/admin/users/${editingUser.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: { ...permissions, komisiLeaderOf: isKomisiLeader ? komisiLeaderOf : [] } }),
      });

      const text = await response.text();
      let result: any = {};
      try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }

      if (result.success) {
        await loadUsers();
        setOpenPermissionsDialog(false);
        setEditingUser(null);
      } else {
        setError(result.error || `Error ${response.status}`);
      }
    } catch (error: any) {
      console.error('Update permissions error:', error);
      setError(error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmName.trim().toLowerCase() !== deleteTarget.name.toLowerCase()) {
      setError('Nama tidak cocok. Silakan ketik nama dengan benar.');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const text = await res.text();
      let result: any = {};
      try { result = text ? JSON.parse(text) : {}; } catch { result = { error: text || 'Unknown error' }; }
      if (result.success) {
        setDeleteTarget(null);
        setDeleteConfirmName('');
        await loadUsers();
      } else {
        setError(result.error || `Error ${res.status}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleChangeStatus = async (userId: string, newStatus: 'approved' | 'suspended') => {
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';
    if (!confirm(`Apakah Anda yakin ingin ${action} user ini?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        await loadUsers();
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Change status error:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const statusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'suspended') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex justify-between items-center">
        <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
          <Shield size={20} />
          User Management
        </h2>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      <Alert severity="info" className="text-sm">
        Super Admin memiliki full access ke semua menu.
      </Alert>

      {users.length === 0 ? (
        <div className="text-center py-10 text-gray-400">Belum ada user</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Nama</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Aksi</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.role === 'super_admin' ? 'Super Admin' : 'Admin'} color={user.role === 'super_admin' ? 'error' : 'primary'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={user.status} color={user.status === 'approved' ? 'success' : user.status === 'suspended' ? 'error' : user.status === 'pending' ? 'warning' : 'default'} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Button size="small" startIcon={<Edit size={14} />} onClick={() => handleOpenEdit(user)} disabled={user.id === currentUser?.id}>Edit</Button>
                          <Button size="small" startIcon={<Key size={14} />} onClick={() => handleOpenPermissions(user)} disabled={user.role === 'super_admin'}>Permissions</Button>
                          {user.status === 'approved' ? (
                            <Button size="small" color="error" startIcon={<UserX size={14} />} onClick={() => handleChangeStatus(user.id, 'suspended')} disabled={user.id === currentUser?.id}>Suspend</Button>
                          ) : user.status === 'suspended' && (
                            <Button size="small" color="success" startIcon={<UserCheck size={14} />} onClick={() => handleChangeStatus(user.id, 'approved')}>Activate</Button>
                          )}
                          {user.role !== 'super_admin' && user.id !== currentUser?.id && (
                            <Button size="small" color="error" variant="contained" startIcon={<Trash2 size={14} />} onClick={() => { setDeleteTarget(user); setDeleteConfirmName(''); setError(''); }}>Hapus</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <div key={user.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.role === 'super_admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                  <button onClick={() => handleOpenEdit(user)} disabled={user.id === currentUser?.id}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-40 transition-colors">
                    <Edit size={12} />Edit
                  </button>
                  <button onClick={() => handleOpenPermissions(user)} disabled={user.role === 'super_admin'}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg disabled:opacity-40 transition-colors">
                    <Key size={12} />Permissions
                  </button>
                  {user.status === 'approved' ? (
                    <button onClick={() => handleChangeStatus(user.id, 'suspended')} disabled={user.id === currentUser?.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg disabled:opacity-40 transition-colors">
                      <UserX size={12} />Suspend
                    </button>
                  ) : user.status === 'suspended' && (
                    <button onClick={() => handleChangeStatus(user.id, 'approved')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
                      <UserCheck size={12} />Aktifkan
                    </button>
                  )}
                  {user.role !== 'super_admin' && user.id !== currentUser?.id && (
                    <button onClick={() => { setDeleteTarget(user); setDeleteConfirmName(''); setError(''); }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                      <Trash2 size={12} />Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <TextField
              fullWidth
              label="Nama"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Role"
              select
              SelectProps={{ native: true }}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            >
              <option key="admin" value="admin">Admin</option>
              <option key="super_admin" value="super_admin">Super Admin</option>
            </TextField>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Batal</Button>
          <Button onClick={handleUpdateUser} variant="contained">
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              {/* Warning icon */}
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Hapus Admin Secara Permanen</h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                Tindakan ini <strong className="text-red-600">tidak dapat dibatalkan</strong>. Akun admin akan dihapus dan email{' '}
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{deleteTarget.email}</span>{' '}
                tidak bisa digunakan untuk mendaftar kembali.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 space-y-1 text-sm text-red-700">
                <p>• Akun dihapus dari sistem autentikasi</p>
                <p>• Email di-blacklist, tidak bisa daftar ulang</p>
                <p>• Untuk kembali akses, harus pakai email berbeda dan disetujui Super Admin</p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ketik nama admin untuk konfirmasi:{' '}
                  <span className="font-bold text-gray-900">"{deleteTarget.name}"</span>
                </label>
                <input
                  value={deleteConfirmName}
                  onChange={e => { setDeleteConfirmName(e.target.value); setError(''); }}
                  placeholder={deleteTarget.name}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 mb-4">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); setError(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleting || deleteConfirmName.trim().toLowerCase() !== deleteTarget.name.toLowerCase()}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menghapus...</>
                  ) : (
                    <><Trash2 size={15} /> Hapus Permanen</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {openPermissionsDialog && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Atur Permission</h3>
                <p className="text-sm text-gray-500 mt-0.5">{editingUser.name}</p>
              </div>
              <button onClick={() => setOpenPermissionsDialog(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ── Komisi Leader (top) ── */}
              <div className="rounded-xl border border-violet-200 p-4 bg-violet-50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="font-semibold text-sm text-violet-800">Leader Komisi</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isKomisiLeader}
                    onClick={() => { setIsKomisiLeader(v => !v); if (isKomisiLeader) setKomisiLeaderOf([]); }}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isKomisiLeader ? 'bg-violet-600' : 'bg-gray-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isKomisiLeader ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                <p className="text-xs text-violet-500 mb-3">{isKomisiLeader ? 'Aktif — pilih komisi yang dipimpin.' : 'Non-aktif — user bukan leader komisi.'}</p>
                {isKomisiLeader && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {KOMISI_LIST.map(k => {
                      const active = komisiLeaderOf.includes(k.id);
                      return (
                        <label key={k.id} className="flex items-center gap-3 bg-white/70 rounded-lg px-3 py-2.5 cursor-pointer select-none hover:bg-white transition-colors">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={active}
                            onClick={() => setKomisiLeaderOf(prev => active ? prev.filter(id => id !== k.id) : [...prev, k.id])}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${active ? 'bg-violet-600' : 'bg-gray-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${active ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          <span className="text-sm text-gray-800">{k.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* helper toggle component rendered inline */}
              {([
                {
                  group: 'Dashboard',
                  color: 'bg-blue-50 text-blue-700 border-blue-100',
                  dot: 'bg-blue-500',
                  items: [
                    { key: 'viewDashboard', label: 'Lihat Dashboard' },
                  ],
                },
                {
                  group: 'Data Jemaat',
                  color: 'bg-violet-50 text-violet-700 border-violet-100',
                  dot: 'bg-violet-500',
                  items: [
                    { key: 'viewJemaat', label: 'Lihat Data Jemaat' },
                    { key: 'editJemaat', label: 'Edit Data Jemaat' },
                    { key: 'deleteJemaat', label: 'Hapus Data Jemaat' },
                  ],
                },
                {
                  group: 'Absensi',
                  color: 'bg-sky-50 text-sky-700 border-sky-100',
                  dot: 'bg-sky-500',
                  items: [
                    { key: 'viewAbsensi', label: 'Lihat Absensi' },
                    { key: 'manageAbsensi', label: 'Kelola Absensi' },
                  ],
                },
                {
                  group: 'Komsel',
                  color: 'bg-green-50 text-green-700 border-green-100',
                  dot: 'bg-green-500',
                  items: [
                    { key: 'viewKomsel', label: 'Lihat Komsel' },
                    { key: 'editKomsel', label: 'Edit Komsel' },
                  ],
                },
                {
                  group: 'Keuangan',
                  color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                  dot: 'bg-emerald-500',
                  items: [
                    { key: 'viewKeuangan', label: 'Lihat Keuangan' },
                    { key: 'editKeuangan', label: 'Edit Keuangan' },
                  ],
                },
                {
                  group: 'Inventaris',
                  color: 'bg-orange-50 text-orange-700 border-orange-100',
                  dot: 'bg-orange-500',
                  items: [
                    { key: 'viewInventaris', label: 'Lihat Inventaris' },
                    { key: 'editInventaris', label: 'Edit Inventaris' },
                  ],
                },
                {
                  group: 'Pelayan',
                  color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                  dot: 'bg-indigo-500',
                  items: [
                    { key: 'viewPelayan', label: 'Lihat Pelayan' },
                    { key: 'editPelayan', label: 'Edit Pelayan' },
                  ],
                },
                {
                  group: 'Pengumuman',
                  color: 'bg-yellow-50 text-yellow-700 border-yellow-100',
                  dot: 'bg-yellow-500',
                  items: [
                    { key: 'viewPengumuman', label: 'Lihat Pengumuman' },
                    { key: 'editPengumuman', label: 'Buat & Edit Pengumuman' },
                  ],
                },
                {
                  group: 'Galeri Foto',
                  color: 'bg-pink-50 text-pink-700 border-pink-100',
                  dot: 'bg-pink-500',
                  items: [
                    { key: 'viewGaleri', label: 'Lihat Galeri' },
                    { key: 'editGaleri', label: 'Upload & Edit Galeri' },
                  ],
                },
                {
                  group: 'Pendaftaran',
                  color: 'bg-teal-50 text-teal-700 border-teal-100',
                  dot: 'bg-teal-500',
                  items: [
                    { key: 'viewPendaftaran', label: 'Lihat & Kelola Pendaftaran' },
                  ],
                },
                {
                  group: 'Laporan',
                  color: 'bg-gray-50 text-gray-700 border-gray-100',
                  dot: 'bg-gray-500',
                  items: [
                    { key: 'viewReports', label: 'Lihat Laporan & Statistik' },
                  ],
                },
              ] as const).map(({ group, color, dot, items }) => (
                <div key={group} className={`rounded-xl border p-4 ${color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="font-semibold text-sm">{group}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map(({ key, label }) => {
                      const val = permissions[key as keyof typeof permissions] as boolean;
                      return (
                        <label key={key} className="flex items-center gap-3 bg-white/70 rounded-lg px-3 py-2.5 cursor-pointer select-none hover:bg-white transition-colors">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={val}
                            onClick={() => setPermissions(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${val ? 'bg-blue-600' : 'bg-gray-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${val ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          <span className="text-sm text-gray-800">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setOpenPermissionsDialog(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleUpdatePermissions}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-800">
                Simpan Permission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
