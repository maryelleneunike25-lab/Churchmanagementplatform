import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@mui/material';
import { Alert } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface PendingUser {
  userId: string;
  email: string;
  name: string;
  requestedAt: string;
}

export default function PendingApprovals({ onApprovalChange }: { onApprovalChange?: () => void }) {
  const { accessToken } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadPendingApprovals(true); // First load with loading indicator

    // Auto-refresh setiap 10 detik untuk mendeteksi signup baru
    const interval = setInterval(() => {
      loadPendingApprovals(false); // Silent refresh without loading indicator
    }, 10000); // 10 detik

    return () => clearInterval(interval);
  }, []);

  const loadPendingApprovals = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const response = await fetch(`${API_URL}/admin/pending-approvals`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setPendingUsers(result.pendingApprovals || []);
        setLastRefresh(new Date());
        console.log('Pending approvals loaded:', result.pendingApprovals?.length || 0);
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Load pending approvals error:', error);
      setError(error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    try {
      const response = await fetch(`${API_URL}/admin/approve-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: userId, approved }),
      });

      const result = await response.json();

      if (result.success) {
        setPendingUsers(pendingUsers.filter(u => u.userId !== userId));
        if (onApprovalChange) {
          onApprovalChange();
        }
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Approval error:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Pending User Approvals</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Last refresh: {lastRefresh.toLocaleTimeString('id-ID')}
          </span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshCw size={16} />}
            onClick={() => loadPendingApprovals(true)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {pendingUsers.length === 0 ? (
        <Alert severity="info">Tidak ada user yang menunggu approval.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Nama</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Tanggal Request</strong></TableCell>
                <TableCell align="right"><strong>Aksi</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{new Date(user.requestedAt).toLocaleString('id-ID')}</TableCell>
                  <TableCell align="right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircle size={16} />}
                        onClick={() => handleApproval(user.userId, true)}
                      >
                        Setujui
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<XCircle size={16} />}
                        onClick={() => handleApproval(user.userId, false)}
                      >
                        Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
