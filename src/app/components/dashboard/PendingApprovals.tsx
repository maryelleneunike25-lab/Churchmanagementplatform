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
