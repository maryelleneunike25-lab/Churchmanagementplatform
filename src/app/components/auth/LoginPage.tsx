import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Clock } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Identity Services script
    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google && googleButtonRef.current) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id',
            callback: handleGoogleCredentialResponse
          });
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
          });
        }
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    };
    loadGoogleScript();
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setError('');
    setLoading(true);
    const result = await signInWithGoogle(response.credential);
    if (result.success) {
      navigate('/');
    } else {
      if (result.status === 'pending') {
        setPendingStatus(true);
      } else {
        setError(result.error || 'Failed to sign in with Google');
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setPendingStatus(false);

    const result = await signIn(email, password);
    if (result.success) {
      navigate('/');
    } else {
      if (result.status === 'pending') {
        setPendingStatus(true);
      } else {
        setError(result.error || 'Failed to sign in');
      }
    }
    setLoading(false);
  };

  if (pendingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <Clock className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Akun Menunggu Persetujuan</h2>
            <p className="text-gray-600 mb-6">
              Akun Anda telah berhasil dibuat namun masih menunggu persetujuan dari Super Admin.
              Silakan hubungi administrator sistem untuk mengaktifkan akun Anda.
            </p>
            <button
              onClick={() => { setPendingStatus(false); setEmail(''); setPassword(''); }}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Login ke Dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Atau{' '}
          <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            daftar akun baru
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          <div className="mb-6">
            <div ref={googleButtonRef} className="w-full flex justify-center"></div>
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Atau masuk dengan email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                  placeholder="admin@gbijeltim.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
