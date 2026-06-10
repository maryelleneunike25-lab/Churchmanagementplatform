import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Alert, FormControlLabel, Checkbox, FormGroup, FormLabel } from '@mui/material';
import { Plus, Edit, Trash2, Users, Search, SortAsc, SortDesc } from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

// ─── Age helpers ─────────────────────────────────────────────────────────────
function getAge(birthDate: string): number {
  if (!birthDate) return -1;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

type AgeGroup = 'Children' | 'Teens' | 'Youth' | 'Adults' | 'Seniors' | '-';

function getAgeGroup(birthDate: string): AgeGroup {
  const age = getAge(birthDate);
  if (age < 0) return '-';
  if (age <= 12) return 'Children';
  if (age <= 17) return 'Teens';
  if (age <= 30) return 'Youth';
  if (age <= 59) return 'Adults';
  return 'Seniors';
}

const AGE_GROUP_STYLES: Record<string, string> = {
  Children: 'bg-pink-100 text-pink-700',
  Teens:    'bg-purple-100 text-purple-700',
  Youth:    'bg-blue-100 text-blue-700',
  Adults:   'bg-emerald-100 text-emerald-700',
  Seniors:  'bg-amber-100 text-amber-700',
  '-':      'bg-gray-100 text-gray-400',
};

const AGE_GROUPS: AgeGroup[] = ['Children', 'Teens', 'Youth', 'Adults', 'Seniors'];
const AGE_GROUP_LABELS: Record<string, string> = {
  Children: 'Children (0–12)',
  Teens:    'Teens (13–17)',
  Youth:    'Youth (18–30)',
  Adults:   'Adults (31–59)',
  Seniors:  'Seniors (60+)',
};

const PELAYAN_OPTIONS = [
  'Pastoral',
  'Sekretariat',
  'Perjamuan Kudus',
  'Usher',
  'Pemuji',
  'Pemusik',
  'Lighting',
  'Sound Audio',
  'Multimedia Propresenter',
  'Multimedia Produksi',
  'Multimedia Weekly News',
  'Fotografi',
  'Tim Doa',
  'Penari',
  'Pengurus ABI',
  'Pengurus Teens',
  'Pengurus Vessel',
  'Pengurus WBI',
  'Pengurus Kompas',
  'Pengurus Kowari',
  'Pengurus Koemas',
  'PKS',
  'Paduan Suara',
  'Welcoming Team',
  'Tim Kunjungan'
];

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  baptismDate?: string;
  familyId?: string;
  status: 'active' | 'inactive' | 'new';
  pelayan?: string[];
  komselJoined?: boolean;
  pksName?: string;
  joinDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function CongregationManagement() {
  const { accessToken, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [pksNames, setPksNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sortKey, setSortKey] = useState<'name' | 'age'>('name');
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | 'All'>('All');

  // Permission checks
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || user?.permissions?.editJemaat || false;
  const canDelete = isSuperAdmin || user?.permissions?.deleteJemaat || false;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female',
    maritalStatus: 'single' as 'single' | 'married' | 'divorced' | 'widowed',
    baptismDate: '',
    status: 'new' as 'active' | 'inactive' | 'new',
    pelayan: [] as string[],
    komselJoined: false,
    pksName: ''
  });

  useEffect(() => {
    loadMembers();
    loadPksNames();
  }, []);
  useAutoRefresh(loadMembers, 30_000);

  const loadMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/congregation/members`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setMembers(result.members || []);
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Load members error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPksNames = async () => {
    try {
      const response = await fetch(`${API_URL}/komsel/pks-names`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setPksNames(result.pksNames || []);
      }
    } catch (error: any) {
      console.error('Load PKS names error:', error);
    }
  };

  const handleOpenDialog = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone,
        address: member.address,
        birthDate: member.birthDate,
        gender: member.gender,
        maritalStatus: member.maritalStatus,
        baptismDate: member.baptismDate || '',
        status: member.status,
        pelayan: member.pelayan || [],
        komselJoined: member.komselJoined || false,
        pksName: member.pksName || ''
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        birthDate: '',
        gender: 'male',
        maritalStatus: 'single',
        baptismDate: '',
        status: 'new',
        pelayan: [],
        komselJoined: false,
        pksName: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMember(null);
  };

  const handlePelayanChange = (ministry: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, pelayan: [...formData.pelayan, ministry] });
    } else {
      setFormData({ ...formData, pelayan: formData.pelayan.filter(p => p !== ministry) });
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingMember
        ? `${API_URL}/congregation/members/${editingMember.id}`
        : `${API_URL}/congregation/members`;

      const response = await fetch(url, {
        method: editingMember ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        await loadMembers();
        handleCloseDialog();
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Save member error:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data jemaat ini?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/congregation/members/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        await loadMembers();
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Delete member error:', error);
      setError(error.message);
    }
  };

  const filteredMembers = members
    .filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.phone?.includes(search);
      const matchGroup = ageGroupFilter === 'All' || getAgeGroup(m.birthDate) === ageGroupFilter;
      return matchSearch && matchGroup;
    })
    .sort((a, b) => {
      if (sortKey === 'age') {
        const diff = getAge(a.birthDate) - getAge(b.birthDate);
        return sortDir === 'asc' ? diff : -diff;
      }
      return sortDir === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

  // Count per group for filter chips
  const groupCounts = AGE_GROUPS.reduce((acc, g) => {
    acc[g] = members.filter(m => getAgeGroup(m.birthDate) === g).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={24} />
          Manajemen Data Jemaat
        </h2>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
          disabled={!canEdit}
        >
          Tambah Jemaat
        </Button>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {!canEdit && (
        <Alert severity="info">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk mendapatkan akses edit.
        </Alert>
      )}

      {/* Search + Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, email, telepon..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={sortKey} onChange={e => setSortKey(e.target.value as 'name' | 'age')}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="name">Sort: Nama</option>
          <option value="age">Sort: Usia</option>
        </select>
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          {sortDir === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          {sortDir === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {/* Age group filter chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setAgeGroupFilter('All')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${ageGroupFilter === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Semua ({members.length})
        </button>
        {AGE_GROUPS.map(g => (
          <button key={g} onClick={() => setAgeGroupFilter(g)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${ageGroupFilter === g ? 'bg-gray-900 text-white border-gray-900' : `${AGE_GROUP_STYLES[g]} border-transparent hover:opacity-80`}`}>
            {AGE_GROUP_LABELS[g]} ({groupCounts[g] ?? 0})
          </button>
        ))}
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nama</strong></TableCell>
              <TableCell><strong>Kelompok Usia</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Telepon</strong></TableCell>
              <TableCell><strong>Pelayanan</strong></TableCell>
              <TableCell><strong>Komsel</strong></TableCell>
              <TableCell><strong>PKS</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Tgl Bergabung</strong></TableCell>
              <TableCell align="right"><strong>Aksi</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  {members.length === 0 ? 'Belum ada data jemaat' : 'Tidak ada hasil yang cocok'}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => {
                const ageGroup = getAgeGroup(member.birthDate);
                const age = getAge(member.birthDate);
                return (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${AGE_GROUP_STYLES[ageGroup]}`}>
                        {ageGroup}
                      </span>
                      {age >= 0 && <span className="text-xs text-gray-400">{age} tahun</span>}
                    </div>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {member.phone ? (
                      <a
                        href={`https://wa.me/${member.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                      >
                        {member.phone}
                      </a>
                    ) : <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>
                    {member.pelayan && member.pelayan.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {member.pelayan.map((ministry, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                            {ministry}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.komselJoined ? (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">✓ Sudah</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">Belum</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.pksName ? (
                      <span className="text-sm">{member.pksName}</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      member.status === 'active' ? 'bg-green-100 text-green-800' :
                      member.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status === 'active' ? 'Aktif' :
                       member.status === 'new' ? 'Jemaat Baru' : 'Tidak Aktif'}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(member.joinDate).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell align="right">
                    <div className="flex gap-2 justify-end">
                      {canEdit && (
                        <Button
                          size="small"
                          startIcon={<Edit size={14} />}
                          onClick={() => handleOpenDialog(member)}
                        >
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Trash2 size={14} />}
                          onClick={() => handleDelete(member.id)}
                        >
                          Hapus
                        </Button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-gray-500">View only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMember ? 'Edit Data Jemaat' : 'Tambah Jemaat Baru'}
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
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
              label="Telepon"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Tanggal Lahir"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Jenis Kelamin"
              select
              SelectProps={{ native: true }}
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
            >
              <option key="male" value="male">Laki-laki</option>
              <option key="female" value="female">Perempuan</option>
            </TextField>
            <TextField
              fullWidth
              label="Status Pernikahan"
              select
              SelectProps={{ native: true }}
              value={formData.maritalStatus}
              onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
            >
              <option key="single" value="single">Single</option>
              <option key="married" value="married">Menikah</option>
              <option key="divorced" value="divorced">Cerai</option>
              <option key="widowed" value="widowed">Duda/Janda</option>
            </TextField>
            <TextField
              fullWidth
              label="Alamat"
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="col-span-2"
            />
            <TextField
              fullWidth
              label="Tanggal Baptis"
              type="date"
              value={formData.baptismDate}
              onChange={(e) => setFormData({ ...formData, baptismDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Status"
              select
              SelectProps={{ native: true }}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option key="new" value="new">Jemaat Baru</option>
              <option key="active" value="active">Aktif</option>
              <option key="inactive" value="inactive">Tidak Aktif</option>
            </TextField>

            {/* Komsel & PKS */}
            <div className="col-span-2">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.komselJoined}
                    onChange={(e) => setFormData({ ...formData, komselJoined: e.target.checked })}
                  />
                }
                label="Sudah Join Komsel"
              />
            </div>
            <TextField
              fullWidth
              label="Nama PKS"
              select
              SelectProps={{ native: true }}
              value={formData.pksName}
              onChange={(e) => setFormData({ ...formData, pksName: e.target.value })}
              className="col-span-2"
              disabled={!formData.komselJoined}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">-- Pilih PKS --</option>
              {pksNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </TextField>
          </div>

          {/* Pelayan Section */}
          <div className="mt-6">
            <FormLabel component="legend" className="text-sm font-semibold mb-2">
              Pelayanan
            </FormLabel>
            <FormGroup>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded p-3">
                {PELAYAN_OPTIONS.map((ministry) => (
                  <FormControlLabel
                    key={ministry}
                    control={
                      <Checkbox
                        checked={formData.pelayan.includes(ministry)}
                        onChange={(e) => handlePelayanChange(ministry, e.target.checked)}
                        size="small"
                      />
                    }
                    label={<span className="text-sm">{ministry}</span>}
                  />
                ))}
              </div>
            </FormGroup>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingMember ? 'Update' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
