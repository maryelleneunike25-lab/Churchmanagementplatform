import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Alert, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import DeploymentAlert from '../DeploymentAlert';

export default function SignupPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signUp, serverStatus } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'admin',
    churchBranchId: 'main'
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
      churchBranchId: formData.churchBranchId
    });

    if (result.success) {
      setSuccess(result.message || 'Pendaftaran berhasil!');
      setShowDeploymentAlert(false);
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } else {
      // Handle error message - provide fallback if empty
      const errorMsg = result.error || '';
      const displayError = errorMsg.trim() || 'Pendaftaran gagal. Pastikan Supabase Edge Function sudah di-deploy!';

      setError(displayError);

      // Check if error is related to deployment/configuration
      const needsDeployment =
        errorMsg.includes('deploy') ||
        errorMsg.includes('Network error') ||
        errorMsg.includes('configuration') ||
        errorMsg.includes('Missing authorization header') ||
        errorMsg.includes('SERVICE_ROLE_KEY') ||
        !errorMsg.trim();

      if (needsDeployment) {
        setShowDeploymentAlert(true);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Daftar Akun Baru
          </CardTitle>
          <p className="text-center text-gray-600 mt-2">Church Management System</p>
          {serverStatus !== 'unknown' && (
            <div className={`text-center text-xs mt-2 px-3 py-1 rounded-full inline-block ${
              serverStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              Server: {serverStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(showDeploymentAlert || serverStatus === 'offline') && <DeploymentAlert />}
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <TextField
              fullWidth
              label="Nama Lengkap"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Konfirmasi Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem key="admin" value="admin">Admin</MenuItem>
                <MenuItem key="super_admin" value="super_admin">Super Admin</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Church Branch ID"
              value={formData.churchBranchId}
              onChange={(e) => setFormData({ ...formData, churchBranchId: e.target.value })}
              helperText="Default: main"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Daftar'}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Sudah punya akun? Masuk di sini
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
