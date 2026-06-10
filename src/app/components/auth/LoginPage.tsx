import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Alert } from '@mui/material';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import DeploymentAlert from '../DeploymentAlert';

export default function LoginPage({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { signIn, serverStatus } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeploymentAlert, setShowDeploymentAlert] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password);

    if (!result.success) {
      const errorMsg = result.error || '';

      if (result.status === 'pending') {
        setError('Akun Anda menunggu persetujuan Super Admin');
        setShowDeploymentAlert(false);
      } else if (result.status === 'rejected') {
        setError('Akun Anda telah ditolak. Hubungi administrator.');
        setShowDeploymentAlert(false);
      } else {
        setError(errorMsg || 'Login gagal');

        // Check if error is related to deployment/configuration
        if (errorMsg.includes('deploy') || errorMsg.includes('Network error') || errorMsg.includes('configuration')) {
          setShowDeploymentAlert(true);
        }
      }
    } else {
      setShowDeploymentAlert(false);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Church Management System
          </CardTitle>
          <p className="text-center text-gray-600 mt-2">Masuk ke akun Anda</p>
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
            {error && (
              <Alert severity="error">{error}</Alert>
            )}

            <div>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Belum punya akun? Daftar di sini
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
