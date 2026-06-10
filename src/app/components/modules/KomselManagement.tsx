import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Alert } from '@mui/material';
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

interface Komsel {
  id: string;
  pksName: string;
  name: string;
  day: string;
  time: string;
  location: string;
  memberCount: number;
  members?: string[];
  memberDetails?: Array<{ id: string; name: string; email: string; phone: string }>;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function KomselManagement() {
  const { accessToken, user } = useAuth();
  const [komsels, setKomsels] = useState<Komsel[]>([]);

  // Permission checks
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || user?.permissions?.editKomsel || false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKomsel, setEditingKomsel] = useState<Komsel | null>(null);
  const [formData, setFormData] = useState({
    pksName: '',
    name: '',
    day: '',
    time: '',
    location: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    loadKomsels();
  }, []);

  const loadKomsels = async () => {
    try {
      const response = await fetch(`${API_URL}/komsel/list`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setKomsels(result.komsels || []);
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Load komsels error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (komsel?: Komsel) => {
    if (komsel) {
      setEditingKomsel(komsel);
      setFormData({
        pksName: komsel.pksName || '',
        name: komsel.name,
        day: komsel.day,
        time: komsel.time,
        location: komsel.location,
        status: komsel.status
      });
    } else {
      setEditingKomsel(null);
      setFormData({
        pksName: '',
        name: '',
        day: '',
        time: '',
        location: '',
        status: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingKomsel(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editingKomsel
        ? `${API_URL}/komsel/${editingKomsel.id}`
        : `${API_URL}/komsel/create`;

      const response = await fetch(url, {
        method: editingKomsel ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        await loadKomsels();
        handleCloseDialog();
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Save komsel error:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus komsel ini?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/komsel/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        await loadKomsels();
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Delete komsel error:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Manajemen Komsel & Pelayan</h2>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
          disabled={!canEdit}
        >
          Tambah Komsel
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
              <TableCell><strong>Nama PKS</strong></TableCell>
              <TableCell><strong>Nama Komsel</strong></TableCell>
              <TableCell><strong>Hari/Waktu</strong></TableCell>
              <TableCell><strong>Lokasi</strong></TableCell>
              <TableCell><strong>Anggota</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Aksi</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {komsels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Belum ada data komsel
                </TableCell>
              </TableRow>
            ) : (
              komsels.map((komsel) => (
                <TableRow key={komsel.id}>
                  <TableCell>
                    <span className="font-semibold text-purple-700">{komsel.pksName || '-'}</span>
                  </TableCell>
                  <TableCell>{komsel.name}</TableCell>
                  <TableCell>{komsel.day} {komsel.time}</TableCell>
                  <TableCell>{komsel.location}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">{komsel.memberCount || 0} orang</div>
                      {komsel.memberDetails && komsel.memberDetails.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {komsel.memberDetails.map((member, idx) => (
                            <div key={idx}>• {member.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      komsel.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {komsel.status}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex gap-2 justify-end">
                      {canEdit ? (
                        <>
                          <Button
                            size="small"
                            startIcon={<Edit size={14} />}
                            onClick={() => handleOpenDialog(komsel)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<Trash2 size={14} />}
                            onClick={() => handleDelete(komsel.id)}
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
          {editingKomsel ? 'Edit Komsel' : 'Tambah Komsel Baru'}
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <TextField
              fullWidth
              label="Nama PKS"
              value={formData.pksName}
              onChange={(e) => setFormData({ ...formData, pksName: e.target.value })}
              placeholder="PKS Budi, PKS Sari, dll"
              required
              className="col-span-2"
            />
            <TextField
              fullWidth
              label="Nama Komsel"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Komsel Rabu Malam, dll"
              required
              className="col-span-2"
            />
            <TextField
              fullWidth
              label="Hari"
              value={formData.day}
              onChange={(e) => setFormData({ ...formData, day: e.target.value })}
              placeholder="Rabu"
              required
            />
            <TextField
              fullWidth
              label="Waktu"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              placeholder="19:00"
              required
            />
            <TextField
              fullWidth
              label="Lokasi"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Alamat lengkap"
              required
              className="col-span-2"
            />
            <TextField
              fullWidth
              label="Status"
              select
              SelectProps={{ native: true }}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option key="active" value="active">Aktif</option>
              <option key="inactive" value="inactive">Tidak Aktif</option>
            </TextField>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingKomsel ? 'Update' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
