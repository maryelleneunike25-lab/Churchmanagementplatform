import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Alert } from '@mui/material';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  condition: 'good' | 'needs_repair' | 'broken';
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryManagement() {
  const { accessToken, user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Permission checks
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || user?.permissions?.editInventaris || false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    location: '',
    condition: 'good' as 'good' | 'needs_repair' | 'broken',
    purchaseDate: '',
    notes: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory/items`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setItems(result.items || []);
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Load items error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        quantity: item.quantity.toString(),
        unit: item.unit,
        location: item.location,
        condition: item.condition,
        purchaseDate: item.purchaseDate || '',
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: '',
        location: '',
        condition: 'good',
        purchaseDate: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editingItem
        ? `${API_URL}/inventory/items/${editingItem.id}`
        : `${API_URL}/inventory/items`;

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity)
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadItems();
        handleCloseDialog();
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Save item error:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/inventory/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        await loadItems();
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Delete item error:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package size={24} />
          Manajemen Inventaris Gereja
        </h2>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
          disabled={!canEdit}
        >
          Tambah Item
        </Button>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {!canEdit && (
        <Alert severity="info">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk mendapatkan akses edit.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nama Item</strong></TableCell>
              <TableCell><strong>Kategori</strong></TableCell>
              <TableCell><strong>Jumlah</strong></TableCell>
              <TableCell><strong>Lokasi</strong></TableCell>
              <TableCell><strong>Kondisi</strong></TableCell>
              <TableCell align="right"><strong>Aksi</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Belum ada data inventaris
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity} {item.unit}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.condition === 'good' ? 'bg-green-100 text-green-800' :
                      item.condition === 'needs_repair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.condition === 'good' ? 'Baik' :
                       item.condition === 'needs_repair' ? 'Perlu Perbaikan' : 'Rusak'}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex gap-2 justify-end">
                      {canEdit ? (
                        <>
                          <Button
                            size="small"
                            startIcon={<Edit size={14} />}
                            onClick={() => handleOpenDialog(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<Trash2 size={14} />}
                            onClick={() => handleDelete(item.id)}
                          >
                            Hapus
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">View only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Item Inventaris' : 'Tambah Item Inventaris'}
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <TextField
              fullWidth
              label="Nama Item"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="col-span-2"
            />
            <TextField
              fullWidth
              label="Kategori"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Sound System, Kursi, dll"
              required
            />
            <TextField
              fullWidth
              label="Lokasi"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ruang Ibadah, Gudang, dll"
              required
            />
            <TextField
              fullWidth
              label="Jumlah"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Satuan"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="Unit, Set, Pcs, dll"
              required
            />
            <TextField
              fullWidth
              label="Kondisi"
              select
              SelectProps={{ native: true }}
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
            >
              <option key="good" value="good">Baik</option>
              <option key="needs_repair" value="needs_repair">Perlu Perbaikan</option>
              <option key="broken" value="broken">Rusak</option>
            </TextField>
            <TextField
              fullWidth
              label="Tanggal Pembelian"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Catatan"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="col-span-2"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingItem ? 'Update' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
