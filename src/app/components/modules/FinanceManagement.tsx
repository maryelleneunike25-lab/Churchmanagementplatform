import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert } from '@mui/material';
import { Card, CardContent } from '../ui/card';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export default function FinanceManagement() {
  const { accessToken, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Permission checks
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || user?.permissions?.editKeuangan || false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/finance/transactions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setTransactions(result.transactions || []);
        setSummary(result.summary || { income: 0, expense: 0, balance: 0 });
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Load transactions error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      type: 'income',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_URL}/finance/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadTransactions();
        setOpenDialog(false);
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Save transaction error:', error);
      setError(error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign size={24} />
          Manajemen Keuangan Gereja
        </h2>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleOpenDialog}
          disabled={!canEdit}
        >
          Tambah Transaksi
        </Button>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {!canEdit && (
        <Alert severity="info">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk mendapatkan akses edit.
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pemasukan</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.income)}</p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expense)}</p>
              </div>
              <TrendingDown className="text-red-600" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo</p>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <DollarSign className="text-blue-600" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Tanggal</strong></TableCell>
              <TableCell><strong>Tipe</strong></TableCell>
              <TableCell><strong>Kategori</strong></TableCell>
              <TableCell><strong>Deskripsi</strong></TableCell>
              <TableCell align="right"><strong>Jumlah</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Belum ada transaksi
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right" className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    <strong>{formatCurrency(transaction.amount)}</strong>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tambah Transaksi Baru</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <TextField
              fullWidth
              label="Tipe Transaksi"
              select
              SelectProps={{ native: true }}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option key="income" value="income">Pemasukan</option>
              <option key="expense" value="expense">Pengeluaran</option>
            </TextField>
            <TextField
              fullWidth
              label="Kategori"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Persembahan, Donasi, Operasional, dll"
              required
            />
            <TextField
              fullWidth
              label="Jumlah"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Deskripsi"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Tanggal"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained">
            Simpan
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
