import os

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

pending_approvals = """
import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { UserCheck, UserX, AlertCircle, RefreshCw } from 'lucide-react';

type PendingUser = {
  id: string;
  email: string;
  name: string;
  auth_provider: string;
  created_at: string;
};

export function PendingApprovals() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/pending');
      if (res.success) setUsers(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/api/admin/users/${id}`, { action });
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Menunggu Persetujuan</h2>
        <button onClick={fetchPending} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500 border border-gray-200">
          Tidak ada akun yang menunggu persetujuan.
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama / Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Daftar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {user.auth_provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleAction(user.id, 'approve')} className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-full mr-2">
                      <UserCheck className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleAction(user.id, 'reject')} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full">
                      <UserX className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
"""

user_mgmt = """
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [allowlist, setAllowlist] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAllowlist = async () => {
    try {
      const res = await api.get('/api/admin/allowlist');
      if (res.success) setAllowlist(res.data);
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (currentUser?.role === 'super_admin') fetchAllowlist();
  }, [currentUser]);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      await api.post('/api/admin/allowlist', { email: newEmail });
      setNewEmail('');
      fetchAllowlist();
    } catch (err) {}
  };

  const handleDelete = async (email: string) => {
    try {
      await api.del(`/api/admin/allowlist?email=${email}`);
      fetchAllowlist();
    } catch (err) {}
  };

  if (currentUser?.role !== 'super_admin') return <div>Akses ditolak</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Email yang otomatis disetujui</h3>
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

        {loading ? <RefreshCw className="animate-spin text-gray-400" /> : (
          <ul className="divide-y divide-gray-200">
            {allowlist.map((item) => (
              <li key={item.email} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.email}</p>
                  <p className="text-xs text-gray-500">Ditambahkan oleh {item.added_by_name} pada {new Date(item.added_at).toLocaleDateString('id-ID')}</p>
                </div>
                <button onClick={() => handleDelete(item.email)} className="text-red-500 hover:text-red-700 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
"""

write_file('src/app/components/dashboard/PendingApprovals.tsx', pending_approvals)
write_file('src/app/components/modules/UserManagement.tsx', user_mgmt)
