import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function UserManagement() {
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
