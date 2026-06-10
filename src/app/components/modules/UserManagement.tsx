import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip } from '@mui/material';
import { Edit, UserX, UserCheck, Shield, Key, Trash2, AlertTriangle } from 'lucide-react';
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
    viewReports: boolean;
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
    viewReports: false
  });

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

      const result = await response.json();

      if (result.success) {
        setUsers(result.users || []);
      } else {
        setError(result.error);
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
    setPermissions(user.permissions || permissions);
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

      const result = await response.json();

      if (result.success) {
        await loadUsers();
        setOpenEditDialog(false);
        setEditingUser(null);
      } else {
        setError(result.error);
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
        body: JSON.stringify({ permissions }),
      });

      const result = await response.json();

      if (result.success) {
        await loadUsers();
        setOpenPermissionsDialog(false);
        setEditingUser(null);
      } else {
        setError(result.error);
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
      const result = await res.json();
      if (result.success) {
        setDeleteTarget(null);
        setDeleteConfirmName('');
        await loadUsers();
      } else {
        setError(result.error);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield size={24} />
          User Management & Permissions
        </h2>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      <Alert severity="info">
        <strong>Info:</strong> Kelola akses dan permissions admin. Super Admin memiliki full access ke semua menu.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nama</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Church Branch</strong></TableCell>
              <TableCell align="right"><strong>Aksi</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Belum ada user
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      color={user.role === 'super_admin' ? 'error' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={
                        user.status === 'approved' ? 'success' :
                        user.status === 'suspended' ? 'error' :
                        user.status === 'pending' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.churchBranchId}</TableCell>
                  <TableCell align="right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="small"
                        startIcon={<Edit size={14} />}
                        onClick={() => handleOpenEdit(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Key size={14} />}
                        onClick={() => handleOpenPermissions(user)}
                        disabled={user.role === 'super_admin'}
                      >
                        Permissions
                      </Button>
                      {user.status === 'approved' ? (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<UserX size={14} />}
                          onClick={() => handleChangeStatus(user.id, 'suspended')}
                          disabled={user.id === currentUser?.id}
                        >
                          Suspend
                        </Button>
                      ) : user.status === 'suspended' && (
                        <Button
                          size="small"
                          color="success"
                          startIcon={<UserCheck size={14} />}
                          onClick={() => handleChangeStatus(user.id, 'approved')}
                        >
                          Activate
                        </Button>
                      )}
                      {user.role !== 'super_admin' && user.id !== currentUser?.id && (
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          startIcon={<Trash2 size={14} />}
                          onClick={() => { setDeleteTarget(user); setDeleteConfirmName(''); setError(''); }}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
            <TextField
              fullWidth
              label="Church Branch ID"
              value={formData.churchBranchId}
              onChange={(e) => setFormData({ ...formData, churchBranchId: e.target.value })}
            />
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

      {/* Permissions Dialog */}
      <Dialog open={openPermissionsDialog} onClose={() => setOpenPermissionsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Permissions: {editingUser?.name}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" className="mb-4">
            Centang untuk memberikan akses, kosongkan untuk mencabut akses menu tertentu.
          </Alert>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.viewDashboard}
                  onChange={(e) => setPermissions({ ...permissions, viewDashboard: e.target.checked })}
                />
              }
              label="View Dashboard"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.viewJemaat}
                  onChange={(e) => setPermissions({ ...permissions, viewJemaat: e.target.checked })}
                />
              }
              label="View Data Jemaat"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.editJemaat}
                  onChange={(e) => setPermissions({ ...permissions, editJemaat: e.target.checked })}
                />
              }
              label="Edit Data Jemaat"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.deleteJemaat}
                  onChange={(e) => setPermissions({ ...permissions, deleteJemaat: e.target.checked })}
                />
              }
              label="Delete Data Jemaat"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.viewAbsensi}
                  onChange={(e) => setPermissions({ ...permissions, viewAbsensi: e.target.checked })}
                />
              }
              label="View Absensi"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.manageAbsensi}
                  onChange={(e) => setPermissions({ ...permissions, manageAbsensi: e.target.checked })}
                />
              }
              label="Manage Absensi"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.viewKomsel}
                  onChange={(e) => setPermissions({ ...permissions, viewKomsel: e.target.checked })}
                />
              }
              label="View Komsel"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.editKomsel}
                  onChange={(e) => setPermissions({ ...permissions, editKomsel: e.target.checked })}
                />
              }
              label="Edit Komsel"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.viewKeuangan}
                  onChange={(e) => setPermissions({ ...permissions, viewKeuangan: e.target.checked })}
                />
              }
              label="View Keuangan"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.editKeuangan}
                  onChange={(e) => setPermissions({ ...permissions, editKeuangan: e.target.checked })}
                />
              }
              label="Edit Keuangan"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.viewInventaris}
                  onChange={(e) => setPermissions({ ...permissions, viewInventaris: e.target.checked })}
                />
              }
              label="View Inventaris"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.editInventaris}
                  onChange={(e) => setPermissions({ ...permissions, editInventaris: e.target.checked })}
                />
              }
              label="Edit Inventaris"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={permissions.viewReports}
                  onChange={(e) => setPermissions({ ...permissions, viewReports: e.target.checked })}
                />
              }
              label="View Reports"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPermissionsDialog(false)}>Batal</Button>
          <Button onClick={handleUpdatePermissions} variant="contained">
            Simpan Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
