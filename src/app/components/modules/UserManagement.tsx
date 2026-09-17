import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Trash2, Plus, RefreshCw, Shield, Edit2, X, Check, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: any;
};

const MODULES = [
  { key: 'Jemaat', label: 'Data Jemaat' },
  { key: 'Absensi', label: 'Absensi' },
  { key: 'Komsel', label: 'Komsel' },
  { key: 'Keuangan', label: 'Keuangan' },
  { key: 'Inventaris', label: 'Inventaris' },
  { key: 'Pelayan', label: 'Pelayan' },
  { key: 'Pengumuman', label: 'Pengumuman' },
  { key: 'Galeri', label: 'Galeri Foto' },
  { key: 'Komisi', label: 'Komisi' },
  { key: 'Jadwal', label: 'Jadwal Pelayanan' },
  { key: 'Tim', label: 'Tim Pelayanan' },
  { key: 'Pendaftaran', label: 'Pendaftaran' }
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [allowlist, setAllowlist] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAllowlist, setLoadingAllowlist] = useState(true);
  
  // Modal state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [tempPermissions, setTempPermissions] = useState<any>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  const fetchData = async () => {
    try {
      const [resAllow, resUsers] = await Promise.all([
        api.get('/api/admin/allowlist'),
        api.get('/api/admin/users')
      ]);
      if (resAllow.success) setAllowlist(resAllow.data);
      if (resUsers.success) setUsers(resUsers.data);
    } catch (err) {} finally {
      setLoadingAllowlist(false);
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'super_admin') fetchData();
  }, [currentUser]);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      await api.post('/api/admin/allowlist', { email: newEmail });
      setNewEmail('');
      fetchData();
    } catch (err) {}
  };

  const handleDeleteAllowlist = async (email: string) => {
    try {
      await api.del(`/api/admin/allowlist?email=${email}`);
      fetchData();
    } catch (err) {}
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { role: newRole });
      fetchData();
    } catch (err) {}
  };

  const openAccessModal = (user: AppUser) => {
    setEditingUser(user);
    setTempPermissions(user.permissions || {});
  };

  const handleTogglePermission = (modKey: string, type: 'view' | 'edit') => {
    const permKey = `${type}${modKey}`;
    setTempPermissions((prev: any) => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const savePermissions = async () => {
    if (!editingUser) return;
    setSavingPermissions(true);
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, { permissions: tempPermissions });
      setEditingUser(null);
      fetchData();
    } catch (err) {} finally {
      setSavingPermissions(false);
    }
  };

  if (currentUser?.role !== 'super_admin') return <div>Akses ditolak</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Manajemen Pengguna & Hak Akses
        </h3>
        
        {loadingUsers ? <RefreshCw className="animate-spin text-gray-400" /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama / Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akses (Admin)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{u.name}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.email === currentUser.email} // prevent self-demotion
                        className="text-sm rounded border-gray-300 py-1 pl-2 pr-6 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="jemaat">Jemaat</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {u.role === 'admin' ? (
                        <button
                          onClick={() => openAccessModal(u)}
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full gap-1"
                        >
                          <Edit2 className="w-4 h-4" /> Kelola Akses
                        </button>
                      ) : u.role === 'super_admin' ? (
                        <span className="text-gray-400">Akses Penuh</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Email yang otomatis disetujui (Allowlist)</h3>
        <p className="text-sm text-gray-500 mb-4">Email dalam daftar ini akan langsung disetujui (approved) saat pertama kali mendaftar.</p>
        
        <form onSubmit={handleAddEmail} className="flex gap-2 mb-6">
          <input 
            type="email" 
            value={newEmail} 
            onChange={e => setNewEmail(e.target.value)} 
            placeholder="admin@gbijeltim.com" 
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Tambah
          </button>
        </form>

        {loadingAllowlist ? <RefreshCw className="animate-spin text-gray-400" /> : (
          <ul className="divide-y divide-gray-200">
            {allowlist.map((item) => (
              <li key={item.email} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.email}</p>
                  <p className="text-xs text-gray-500">Ditambahkan oleh {item.added_by_name} pada {new Date(item.added_at).toLocaleDateString('id-ID')}</p>
                </div>
                <button onClick={() => handleDeleteAllowlist(item.email)} className="text-red-500 hover:text-red-700 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                Kelola Akses Admin: {editingUser.name}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MODULES.map(mod => {
                  const viewKey = `view${mod.key}`;
                  const editKey = `edit${mod.key}`;
                  const canView = !!tempPermissions[viewKey];
                  const canEdit = !!tempPermissions[editKey];
                  
                  return (
                    <div key={mod.key} className="border rounded-lg p-4">
                      <p className="font-semibold text-gray-900 mb-3">{mod.label}</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={canView}
                            onChange={() => handleTogglePermission(mod.key, 'view')}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 flex items-center gap-1">
                            <Eye className="w-4 h-4" /> Lihat
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={canEdit}
                            onChange={() => {
                              handleTogglePermission(mod.key, 'edit');
                              // Auto-check View if Edit is checked
                              if (!canEdit && !canView) {
                                handleTogglePermission(mod.key, 'view');
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 flex items-center gap-1">
                            <Edit2 className="w-4 h-4" /> Edit
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={savePermissions}
                disabled={savingPermissions}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPermissions ? 'Menyimpan...' : (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Simpan Hak Akses
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
