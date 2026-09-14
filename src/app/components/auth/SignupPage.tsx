import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Card, CardContent } from '../ui/card';
import DeploymentAlert from '../DeploymentAlert';
import gbiLogo from '../../../imports/pngegg__1_-1.png';

export default function SignupPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signUp, serverStatus } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'admin',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeploymentAlert, setShowDeploymentAlert] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    const result = await signUp({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: formData.role,
      churchBranchId: 'main',
    });

    if (result.success) {
      setSuccess(result.message || 'Pendaftaran berhasil! Menunggu persetujuan admin.');
      setShowDeploymentAlert(false);
      setTimeout(() => onSwitchToLogin(), 2500);
    } else {
      const errorMsg = result.error || '';
      const displayError = errorMsg.trim() || 'Pendaftaran gagal. Pastikan Supabase Edge Function sudah di-deploy!';
      setError(displayError);
      const needsDeployment =
        errorMsg.includes('deploy') ||
        errorMsg.includes('Network error') ||
        errorMsg.includes('configuration') ||
        errorMsg.includes('Missing authorization header') ||
        errorMsg.includes('SERVICE_ROLE_KEY') ||
        !errorMsg.trim();
      if (needsDeployment) setShowDeploymentAlert(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-md mb-4 overflow-hidden">
            <img src={gbiLogo} alt="GBI Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Akun Admin</h1>
          <p className="text-gray-500 mt-1 text-sm">GBI Jelambar Timur — Church Management System</p>
          {serverStatus !== 'unknown' && (
            <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${
              serverStatus === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {serverStatus === 'online' ? '🟢 Server Online' : '🔴 Server Offline'}
            </span>
          )}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit}>
              {(showDeploymentAlert || serverStatus === 'offline') && (
                <div className="mb-6"><DeploymentAlert /></div>
              )}
              {error && <div className="mb-6"><Alert severity="error">{error}</Alert></div>}
              {success && <div className="mb-6"><Alert severity="success">{success}</Alert></div>}

              <div className="space-y-5">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contoh@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {/* Password row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 6 karakter"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Konfirmasi Password</label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Ulangi password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-7 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                {loading ? 'Memproses...' : 'Daftar Sekarang'}
              </button>

              <p className="text-center mt-5 text-sm text-gray-500">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Masuk di sini
                </button>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          Akun baru memerlukan persetujuan dari Super Admin sebelum bisa digunakan.
        </p>
      </div>
    </div>
  );
}
