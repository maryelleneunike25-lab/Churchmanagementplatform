import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { EdgeKV as supabaseAdmin } from '../../../lib/edgeKvClient';
import { Plus, Edit, Trash2, Users, Search, SortAsc, SortDesc, Download, ChevronDown, ChevronRight, X, Check, AlertTriangle, Upload } from 'lucide-react';
import { parseExcelFile, executeImport, ParsedMember, ImportPreview } from '../../../lib/congregationImport';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useKomsels } from '../../../lib/komsel';
import { getAge, getAgeGroup, AGE_GROUPS, AGE_GROUP_LABELS, AGE_GROUP_STYLES } from '../../../lib/age';
import { projectId } from '/utils/supabase/info';
import { IBADAH_OPTIONS, IBADAH_LABEL } from '../../../lib/ibadahOptions';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;
const KV = 'kv_store_561004a0';

// ibadah code → komisi ID(s) for auto-sync
const IBADAH_TO_KOMISI: Record<string, string[]> = {
  WBI:    ['wbi'],
  ABI:    ['sekolah-minggu'],
  RBI:    ['teens'],
  PBI:    ['vessel'],
  KOMPAS: ['kompas'],
  KOWARI: ['kowari', 'koemas'],
};

const DEFAULT_PKS_NAMES = ['Sisca', 'Sandy', 'Damli', 'Risan', 'Gina Jaya', 'Willis', 'Merry', 'Ping & Hadi', 'Christopher'];

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


function getAgeGroup(birthDate: string): AgeGroup {
  const age = getAge(birthDate);
  if (age < 0) return '-';
  if (age <= 12) return 'Children';
  if (age <= 17) return 'Teens';
  if (age <= 30) return 'Youth';
  if (age <= 59) return 'Adults';
  return 'Seniors';
}

function formatDate(iso: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}


const AGE_GROUPS: AgeGroup[] = ['Children', 'Teens', 'Youth', 'Adults', 'Seniors'];

// Divisions that link directly to Jadwal Pelayanan (matching ScheduleManagement)
// These get a dot indicator in the form — only these keys sync to the schedule dropdowns
const SCHEDULE_DIVISIONS = [
  { key: 'Pemuji',                label: 'PEMUJI',                  color: 'bg-blue-600',    light: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'Pemusik',               label: 'PEMUSIK',                  color: 'bg-purple-600',  light: 'bg-purple-50 border-purple-200 text-purple-800' },
  { key: 'Multimedia Produksi',   label: 'MULTIMEDIA PRODUKSI',      color: 'bg-indigo-600',  light: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { key: 'Multimedia Propresenter', label: 'PRO PRESENTER',          color: 'bg-cyan-600',    light: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
  { key: 'Sound Audio',           label: 'SOUND SYSTEM + RUNNER',   color: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { key: 'Lighting',              label: 'LIGHTING',                 color: 'bg-amber-600',   light: 'bg-amber-50 border-amber-200 text-amber-800' },
  { key: 'Tamborin',              label: 'TAMBORIN',                 color: 'bg-rose-600',    light: 'bg-rose-50 border-rose-200 text-rose-800' },
];

const SCHEDULE_KEYS = new Set(SCHEDULE_DIVISIONS.map(d => d.key));

// Other pelayan roles — saved in member profile but do NOT sync to Jadwal Pelayanan
const PELAYAN_LAINNYA = [
  'Pastoral', 'Sekretariat', 'Perjamuan Kudus', 'Usher',
  'Multimedia Weekly News',
  'Fotografi', 'Tim Doa', 'Pengurus ABI', 'Pengurus Teens',
  'Pengurus Vessel', 'Pengurus WBI', 'Pengurus Kompas',
  'Pengurus Kowari', 'Pengurus Koemas', 'PKS', 'Paduan Suara',
  'Welcoming Team', 'Tim Kunjungan',
];

// All pelayan options (for Excel export + storage compatibility)
const PELAYAN_OPTIONS = [
  ...SCHEDULE_DIVISIONS.map(d => d.key),
  ...PELAYAN_LAINNYA,
];

interface Member {
  id: string;
  _storeKey?: string; // actual kv_store key, used for delete/update
  name: string;
  nickname?: string;
  email: string;
  phone: string;
  phones?: string[];
  address: string;
  birthDate: string;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  baptismDate?: string;
  status: 'active' | 'inactive' | 'new';
  pelayan?: string[];
    familyId?: string;
    spouseName?: string;
    children?: {name: string, birthDate?: string}[];
    parentId?: string;
    parentName?: string;
  komselId?: string;
  ibadah?: string[];
  baptismStatus?: 'sudah' | 'belum';
  birthPlace?: string;
  spouseName?: string;
  children?: { name: string; birthDate?: string }[];
  parentName?: string;
  parentId?: string;
  joinDate: string;
  createdAt: string;
  updatedAt: string;
}

const BLANK_FORM = {
  name: '', nickname: '', email: '', phone: '', address: '', birthDate: '',
  birthPlace: '',
  gender: 'male' as 'male' | 'female',
  maritalStatus: 'single' as 'single' | 'married' | 'divorced' | 'widowed',
  baptismDate: '',
  baptismStatus: 'belum' as 'sudah' | 'belum',
  status: 'new' as 'active' | 'inactive' | 'new',
  pelayan: [] as string[], komselId: '',
  additionalPhones: [] as string[],
  ibadah: [] as string[],
  spouseName: '',
  children: [] as { name: string; birthDate: string }[],
};

// ── Family view helpers ───────────────────────────────────────────────────────
interface FamilyGroup {
  key: string;
  parent: Member;
  coParent?: Member;
  dbChildren: Member[];
  nameOnlyChildren: { name: string; birthDate?: string }[];
}

function buildFamilyGroups(members: Member[]): FamilyGroup[] {
  const groups = new Map<string, FamilyGroup>();
  const byName = new Map<string, Member>();
  for (const m of members) byName.set(m.name.toLowerCase().trim(), m);

  // Group by familyId first
  for (const m of members) {
    if (m.familyId) {
      if (!groups.has(m.familyId)) {
        groups.set(m.familyId, { key: m.familyId, parent: m, dbChildren: [], nameOnlyChildren: [] });
      } else {
        const g = groups.get(m.familyId)!;
        // Assign roles (spouse, child) based on age or marital status if known, otherwise just collect them
        // For simplicity, if they are married/widowed they are parents, else children
        if (m.maritalStatus !== 'single' && !g.coParent) {
          g.coParent = m;
        } else {
          g.dbChildren.push(m);
        }
      }
    }
  }

  // Fallback for members without familyId but with children defined
  const processedCoParents = new Set<string>();
  for (const parent of members) {
    if (parent.familyId) continue;
    if ((parent.children || []).length === 0) continue; 
    if (processedCoParents.has(parent.id)) continue;    

    let coParent: Member | undefined;
    if (parent.spouseName) {
      coParent = byName.get(parent.spouseName.toLowerCase().trim());
      if (coParent) processedCoParents.add(coParent.id);
    }

    const dbChildren: Member[] = [];
    const nameOnlyChildren: { name: string; birthDate?: string }[] = [];

    for (const c of parent.children || []) {
      const dbMatch = byName.get(c.name.toLowerCase().trim());
      if (dbMatch) dbChildren.push(dbMatch);
      else nameOnlyChildren.push(c);
    }

    groups.set(parent.id, {
      key: parent.id,
      parent,
      coParent,
      dbChildren,
      nameOnlyChildren
    });
  }

  return Array.from(groups.values());
}

function FamilyView({ members, expandedFamilies, onToggle, onEdit, onDelete, onCreateChild }: FamilyViewProps) {
  const groups = useMemo(() => buildFamilyGroups(members), [members]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
        Tidak ada data keluarga dengan anak dalam hasil filter ini
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(({ key, parent, coParent, dbChildren, nameOnlyChildren }) => {
        const isExpanded = expandedFamilies.has(key);
        const totalChildren = dbChildren.length + nameOnlyChildren.length;

        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div onClick={() => onToggle(key)}
              className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50/80 select-none transition-colors">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Keluarga {parent.name}</p>
                <p className="text-xs text-gray-400">
                  {totalChildren} anak{coParent && ` · bersama ${coParent.name}`}
                  {parent.pksName && ` · PKS ${parent.pksName}`}
                </p>
              </div>
              {isExpanded ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
            </div>

            {/* Expanded */}
            {isExpanded && (
              <div className="border-t border-gray-100">
                {/* Orang Tua */}
                <div className="px-5 py-3.5 bg-blue-50/40 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-3">Orang Tua</p>
                  <div className="space-y-3">
                    <MemberCard m={parent} onEdit={onEdit} onDelete={onDelete} />
                    {coParent && <MemberCard m={coParent} onEdit={onEdit} onDelete={onDelete} />}
                  </div>
                </div>

                {/* Anak-anak */}
                {totalChildren > 0 && (
                  <div className="px-5 py-3.5">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3">Anak-anak ({totalChildren})</p>
                    <div className="space-y-3">
                      {dbChildren.map(m => (
                        <MemberCard key={m.id} m={m} onEdit={onEdit} onDelete={onDelete} />
                      ))}
                      {nameOnlyChildren.map((c, i) => {
                        const birthYear = c.birthDate ? new Date(c.birthDate).getFullYear() : null;
                        const childAge = birthYear ? new Date().getFullYear() - birthYear : null;
                        return (
                          <div key={i} className="flex items-center gap-2.5 py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                              {c.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700">{c.name}</p>
                              {childAge !== null && <p className="text-xs text-gray-400">{childAge} thn · {birthYear}</p>}
                            </div>
                            {onCreateChild && (
                              <button onClick={() => onCreateChild(c.name, c.birthDate)}
                                className="flex-shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors">
                                <Plus size={10} />Buat Data
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CongregationManagement() {
  const { accessToken, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const { komsels } = useKomsels();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState<'list' | 'family'>('list');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  const [openDialog, setOpenDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cleaningOld, setCleaningOld] = useState(false);

  // Old-format records (member: prefix) that have not been migrated
  const oldFormatMembers = useMemo(
    () => members.filter(m => m._storeKey?.startsWith('member:')),
    [members]
  );

  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sortKey, setSortKey] = useState<'name' | 'age'>('name');
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | 'All'>('All');
  const [ibadahFilter, setIbadahFilter] = useState<string>('All');
  const [exportDropdown, setExportDropdown] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ komisi: number; skipped: number } | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isSuperAdmin || user?.permissions?.editJemaat || false;
  const canDelete = isSuperAdmin || user?.permissions?.deleteJemaat || false;

  // ── Load members from both key formats, union by id ──────────────────────
  const loadMembers = async () => {
    try {
      const toMember = (r: any): Member | null => {
        const m = r.value as any;
        if (!m?.name) return null;
        return { ...m, id: m.id || r.key, _storeKey: r.key };
      };

      const [{ data: d1 }, { data: d2 }] = await Promise.all([
        supabaseAdmin.from(KV).select('key, value').like('key', 'congregation:member:%'),
        supabaseAdmin.from(KV).select('key, value').like('key', 'member:%'),
      ]);

      const seen = new Set<string>();
      const list: Member[] = [];
      for (const r of [...(d1 || []), ...(d2 || [])]) {
        const m = toMember(r);
        if (m && !seen.has(m.id)) { seen.add(m.id); list.push(m); }
      }

      list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setMembers(list);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Load PKS names from kv_store ─────────────────────────────────────────
  const loadPksNames = async () => {
    try {
      const { data } = await supabaseAdmin.from(KV).select('value').eq('key', 'config:pks-names').maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        setPksNames(data.value as string[]);
      } else {
        setPksNames(DEFAULT_PKS_NAMES);
      }
    } catch {
      setPksNames(DEFAULT_PKS_NAMES);
    }
  };

  // ── Seed canonical PKS names on mount ────────────────────────────────────
  const seedPksNames = async () => {
    try {
      const { data } = await supabaseAdmin.from(KV).select('key').eq('key', 'config:pks-names').maybeSingle();
      if (data) {
        await supabaseAdmin.from(KV).update({ value: DEFAULT_PKS_NAMES }).eq('key', 'config:pks-names');
      } else {
        await supabaseAdmin.from(KV).insert({ key: 'config:pks-names', value: DEFAULT_PKS_NAMES });
      }
    } catch {}
  };

  useEffect(() => {
    loadMembers();
    seedPksNames().then(() => loadPksNames());
  }, []);

  useAutoRefresh(() => { loadMembers(); }, 30_000);

  // ── Bulk sync all members ibadah → komisi ────────────────────────────────
  const handleBulkSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    let komisiCreated = 0;
    let skipped = 0;
    try {
      // Load ALL komisi member records once
      const { data: allKomisiRows } = await supabaseAdmin.from(KV).select('key,value').like('key', 'komisi:%:member:%');
      // Build map: jemaatId → Set of komisiIds already in DB
      const existingMap = new Map<string, Set<string>>();
      for (const row of allKomisiRows || []) {
        const v = row.value as any;
        if (!v?.jemaatId || !v?.komisiId) continue;
        if (!existingMap.has(v.jemaatId)) existingMap.set(v.jemaatId, new Set());
        existingMap.get(v.jemaatId)!.add(v.komisiId);
      }

      const now = new Date().toISOString();
      for (const member of members) {
        const ibadahCodes = member.ibadah || [];
        const targetIds = ibadahCodes.flatMap(code => IBADAH_TO_KOMISI[code] || []);
        const existing = existingMap.get(member.id) || new Set<string>();

        // Remove komisi records no longer matching
        for (const row of allKomisiRows || []) {
          const v = row.value as any;
          if (v?.jemaatId !== member.id) continue;
          if (v?.komisiId && !targetIds.includes(v.komisiId)) {
            await supabaseAdmin.from(KV).delete().eq('key', row.key);
          }
        }

        // Add missing komisi records
        for (const komisiId of targetIds) {
          if (!existing.has(komisiId)) {
            const joinId = crypto.randomUUID();
            await supabaseAdmin.from(KV).insert({
              key: `komisi:${komisiId}:member:${joinId}`,
              value: { id: joinId, jemaatId: member.id, komisiId, name: member.name, phone: member.phone || (member.phones || [])[0] || '', address: member.address || '', birthDate: member.birthDate || '', joinedAt: now },
            });
            komisiCreated++;
          } else {
            skipped++;
          }
        }
      }
      setSyncResult({ komisi: komisiCreated, skipped });
    } catch (e: any) {
      setError(e.message);
    }
    setSyncing(false);
  };

  // ── Open dialog ───────────────────────────────────────────────────────────
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const preview = await parseExcelFile(file);
      setImportPreview(preview);
    } catch (e: any) {
      alert('Error parsing Excel: ' + e.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    setImportProgress({ done: 0, total: importPreview.valid.length, label: 'Menyimpan ke database...' });
    try {
      await executeImport(importPreview.valid, (done, total) => {
        setImportProgress({ done, total, label: `Menyimpan ${done}/${total}...` });
      });
      setImportResult({ inserted: importPreview.valid.length, skipped: 0, errors: 0 });
      setImportPreview(null);
      await loadMembers();
    } catch (e: any) {
      setImportResult({ inserted: 0, skipped: 0, errors: 1 });
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleOpenDialog = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name, nickname: member.nickname || '',
        email: member.email, phone: member.phone,
        address: member.address, birthDate: member.birthDate,
        birthPlace: member.birthPlace || '',
        gender: member.gender, maritalStatus: member.maritalStatus,
        baptismDate: member.baptismDate || '',
        baptismStatus: member.baptismStatus || 'belum',
        status: member.status,
        pelayan: member.pelayan || [], komselId: member.komselId || '',
        additionalPhones: (member.phones || []).slice(1),
        ibadah: member.ibadah || [],
        spouseName: member.spouseName || '',
        children: (member.children || []).map(c => ({ name: c.name, birthDate: c.birthDate || '' })),
      });
    } else {
      setEditingMember(null);
      setFormData({ ...BLANK_FORM });
    }
    setOpenDialog(true);
  };

  const handlePelayanChange = (ministry: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      pelayan: checked ? [...prev.pelayan, ministry] : prev.pelayan.filter(p => p !== ministry),
    }));
  };

  // ── Save via supabaseAdmin ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const id = editingMember?.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const record: Member = {
        id,
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        baptismDate: formData.baptismDate || undefined,
        status: formData.status,
        pelayan: formData.pelayan,
        komselId: formData.komselId || undefined,
        birthPlace: formData.birthPlace.trim() || undefined,
        baptismStatus: formData.baptismStatus,
        ibadah: formData.ibadah.length > 0 ? formData.ibadah : undefined,
        spouseName: formData.spouseName.trim() || undefined,
        children: formData.children.filter(c => c.name.trim()).map(c => ({ name: c.name.trim(), birthDate: c.birthDate || undefined })),
        phones: [formData.phone.trim(), ...formData.additionalPhones.filter(p => p.trim())].filter(Boolean),
        joinDate: editingMember?.joinDate || now,
        createdAt: editingMember?.createdAt || now,
        updatedAt: now,
      };
      const primaryKey = `congregation:member:${id}`;
      if (editingMember) {
        const storeKey = editingMember._storeKey || primaryKey;
        const { error } = await supabaseAdmin.from(KV).update({ value: record }).eq('key', storeKey);
        if (error) {
          await supabaseAdmin.from(KV).insert({ key: primaryKey, value: record });
        } else if (storeKey !== primaryKey) {
          // Mirror to congregation:member: key so all modules always find it in d1
          const { data: existing } = await supabaseAdmin.from(KV).select('key').eq('key', primaryKey).maybeSingle();
          if (existing) await supabaseAdmin.from(KV).update({ value: record }).eq('key', primaryKey);
          else await supabaseAdmin.from(KV).insert({ key: primaryKey, value: record });
        }

        // ── Auto-link family (bidirectional) ─────────────────────────────────────
        if (record.spouseName || (record.children || []).length > 0) {
          const byName = new Map(members.filter(m => m.id !== id).map(m => [m.name.toLowerCase().trim(), m]));
          if (record.spouseName) {
            const spouse = byName.get(record.spouseName.toLowerCase().trim());
            if (spouse) {
              const spouseKey = spouse._storeKey || `congregation:member:${spouse.id}`;
              const updatedSpouse = { ...spouse, spouseName: record.name, updatedAt: now };
              await supabaseAdmin.from(KV).update({ value: updatedSpouse }).eq('key', spouseKey);
              const primarySpouseKey = `congregation:member:${spouse.id}`;
              if (spouseKey !== primarySpouseKey) {
                const { data: ex } = await supabaseAdmin.from(KV).select('key').eq('key', primarySpouseKey).maybeSingle();
                if (ex) await supabaseAdmin.from(KV).update({ value: updatedSpouse }).eq('key', primarySpouseKey);
                else await supabaseAdmin.from(KV).insert({ key: primarySpouseKey, value: updatedSpouse });
              }
            }
          }
          for (const child of record.children || []) {
            const childMember = byName.get(child.name.toLowerCase().trim());
            if (childMember && !childMember.parentName) {
              const childKey = childMember._storeKey || `congregation:member:${childMember.id}`;
              const updatedChild = { ...childMember, parentName: record.name, parentId: id, updatedAt: now };
              await supabaseAdmin.from(KV).update({ value: updatedChild }).eq('key', childKey);
            }
          }
        }

        // ── Cascade: update name in schedule cells if name changed ──────────────────
        if (editingMember.name !== record.name) {
          const { data: weeks } = await supabaseAdmin.from(KV).select('key,value').like('key','schedule:week:%');
          for (const row of weeks || []) {
            const week = row.value as any;
            let dirty = false;
            const divs = { ...week.divisions };
            for (const divId of Object.keys(divs)) {
              for (const role of Object.keys(divs[divId] || {})) {
                if (divs[divId][role] === editingMember.name) { divs[divId][role] = record.name; dirty = true; }
              }
            }
            if (dirty) await supabaseAdmin.from(KV).update({ value: { ...week, divisions: divs } }).eq('key', row.key);
          }
        }
      } else {
        await supabaseAdmin.from(KV).insert({ key: primaryKey, value: record });
        // Auto-link family for new member
        if (record.spouseName || (record.children || []).length > 0) {
          const byName = new Map(members.map(m => [m.name.toLowerCase().trim(), m]));
          if (record.spouseName) {
            const spouse = byName.get(record.spouseName.toLowerCase().trim());
            if (spouse) {
              const spouseKey = spouse._storeKey || `congregation:member:${spouse.id}`;
              await supabaseAdmin.from(KV).update({ value: { ...spouse, spouseName: record.name, updatedAt: now } }).eq('key', spouseKey);
            }
          }
        }
      }
      // ── Sync ibadah → komisi memberships ─────────────────────────────────
      const targetKomisiIds = (record.ibadah || []).flatMap(code => IBADAH_TO_KOMISI[code] || []);
      const { data: allKomisiRows } = await supabaseAdmin.from(KV).select('key,value').like('key', 'komisi:%:member:%');
      const myKomisiRows = (allKomisiRows || []).filter(r => (r.value as any)?.jemaatId === id);
      const existingKomisiIds = myKomisiRows.map(r => (r.value as any)?.komisiId as string).filter(Boolean);

      // Remove memberships no longer in ibadah
      for (const row of myKomisiRows) {
        const komisiId = (row.value as any)?.komisiId;
        if (komisiId && !targetKomisiIds.includes(komisiId)) {
          await supabaseAdmin.from(KV).delete().eq('key', row.key);
        }
      }
      // Add new memberships
        const age = getAge(record.birthDate || '');
        for (const komisiId of targetKomisiIds) {
          if (!existingKomisiIds.includes(komisiId)) {
            // Apply hardcoded age rules for specific komisi only
            if (komisiId === 'sekolah-minggu' && age >= 0 && age > 12) continue;
            if (komisiId === 'teens' && age >= 0 && (age < 13 || age > 17)) continue;

            const joinId = crypto.randomUUID();
          await supabaseAdmin.from(KV).insert({
            key: `komisi:${komisiId}:member:${joinId}`,
            value: { id: joinId, jemaatId: id, komisiId, name: record.name, phone: record.phone || (record.phones || [])[0] || '', address: record.address || '', birthDate: record.birthDate || '', joinedAt: now },
          });
        }
      }

      await loadMembers();
      setOpenDialog(false);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // ── Delete (cascade) ────────────────────────────────────────────────────────
  const handleDelete = (id: string) => setDeletingId(id);

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const m = members.find(x => x.id === deletingId);
      const memberName = m?.name || '';

      // 1. Delete from congregation
      const key = m?._storeKey || `congregation:member:${deletingId}`;
      await supabaseAdmin.from(KV).delete().eq('key', key);

      // 2. Clear name from all jadwal pelayanan weeks
      if (memberName) {
        const { data: weeks } = await supabaseAdmin.from(KV).select('key,value').like('key','schedule:week:%');
        for (const row of weeks || []) {
          const week = row.value as any;
          let dirty = false;
          const divs = { ...week.divisions };
          for (const divId of Object.keys(divs)) {
            for (const role of Object.keys(divs[divId] || {})) {
              if (divs[divId][role] === memberName) { divs[divId][role] = ''; dirty = true; }
            }
          }
          if (dirty) await supabaseAdmin.from(KV).update({ value: { ...week, divisions: divs } }).eq('key', row.key);
        }
      }

      // 3. Find linked komisi members → delete them + clean absensi
      const { data: komisiRows } = await supabaseAdmin.from(KV).select('key,value').like('key','komisi:%:member:%');
      const removedKomisiIds: string[] = [];
      for (const row of komisiRows || []) {
        if ((row.value as any)?.jemaatId !== deletingId) continue;
        await supabaseAdmin.from(KV).delete().eq('key', row.key);
        if ((row.value as any)?.id) removedKomisiIds.push((row.value as any).id);
      }

      // 4. Remove deleted komisi IDs from komisi absensi sessions
      if (removedKomisiIds.length > 0) {
        const { data: absenRows } = await supabaseAdmin.from(KV).select('key,value').like('key','komisi:%:absen:%');
        for (const row of absenRows || []) {
          const s = row.value as any;
          const newPresent = (s.presentIds || []).filter((i: string) => !removedKomisiIds.includes(i));
          const newAbsent  = (s.absentIds  || []).filter((i: string) => !removedKomisiIds.includes(i));
          if (newPresent.length !== (s.presentIds||[]).length || newAbsent.length !== (s.absentIds||[]).length)
            await supabaseAdmin.from(KV).update({ value: { ...s, presentIds: newPresent, absentIds: newAbsent } }).eq('key', row.key);
        }
      }

      // 5. Remove from global attendance sessions (attendance_session: format)
      const { data: attRows } = await supabaseAdmin.from(KV).select('key,value').like('key','attendance_session:%');
      for (const row of attRows || []) {
        const s = row.value as any;
        let dirty = false;
        const updated: any = { ...s };
        if (Array.isArray(s.presentIds)) { updated.presentIds = s.presentIds.filter((i: string) => i !== deletingId); if (updated.presentIds.length !== s.presentIds.length) dirty = true; }
        if (Array.isArray(s.absentIds))  { updated.absentIds  = s.absentIds.filter((i: string)  => i !== deletingId); if (updated.absentIds.length  !== s.absentIds.length)  dirty = true; }
        if (Array.isArray(s.members))    { updated.members    = s.members.filter((x: any) => x?.id !== deletingId && x?.name !== memberName); if (updated.members.length !== s.members.length) dirty = true; }
        if (dirty) await supabaseAdmin.from(KV).update({ value: updated }).eq('key', row.key);
      }

      await loadMembers();
    } catch (e: any) { setError(e.message); }
    setDeletingId(null);
  };

  // ── Bulk-delete old member: format records with cascade ───────────────────
  const cleanOldRecords = async () => {
    if (oldFormatMembers.length === 0) return;
    setCleaningOld(true);
    try {
      for (const m of oldFormatMembers) {
        // 1. Delete the old-format record
        await supabaseAdmin.from(KV).delete().eq('key', m._storeKey!);
        // 2. Clear name from schedule weeks
        if (m.name) {
          const { data: weeks } = await supabaseAdmin.from(KV).select('key,value').like('key','schedule:week:%');
          for (const row of weeks || []) {
            const week = row.value as any;
            let dirty = false;
            const divs = { ...week.divisions };
            for (const divId of Object.keys(divs)) {
              for (const role of Object.keys(divs[divId] || {})) {
                if (divs[divId][role] === m.name) { divs[divId][role] = ''; dirty = true; }
              }
            }
            if (dirty) await supabaseAdmin.from(KV).update({ value: { ...week, divisions: divs } }).eq('key', row.key);
          }
        }
        // 3. Remove from global attendance sessions
        const { data: attRows } = await supabaseAdmin.from(KV).select('key,value').like('key','attendance_session:%');
        for (const row of attRows || []) {
          const s = row.value as any;
          let dirty = false;
          const updated: any = { ...s };
          if (Array.isArray(s.presentIds)) { updated.presentIds = s.presentIds.filter((i: string) => i !== m.id); if (updated.presentIds.length !== s.presentIds.length) dirty = true; }
          if (Array.isArray(s.members))    { updated.members = s.members.filter((x: any) => x?.id !== m.id && x?.name !== m.name); if (updated.members.length !== s.members.length) dirty = true; }
          if (dirty) await supabaseAdmin.from(KV).update({ value: updated }).eq('key', row.key);
        }
      }
      await loadMembers();
    } catch (e: any) { setError(e.message); }
    setCleaningOld(false);
  };

  // ── Filter & sort ─────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    return members
      .filter(m => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.nickname || '').toLowerCase().includes(search.toLowerCase()) ||
          (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
          (m.phone || '').includes(search);
        const matchGroup = ageGroupFilter === 'All' || getAgeGroup(m.birthDate) === ageGroupFilter;
        const matchIbadah = ibadahFilter === 'All' || (m.ibadah || []).includes(ibadahFilter);
        return matchSearch && matchGroup && matchIbadah;
      })
      .sort((a, b) => {
        if (sortKey === 'age') {
          const diff = getAge(a.birthDate) - getAge(b.birthDate);
          return sortDir === 'asc' ? diff : -diff;
        }
        return sortDir === 'asc' ? a.name.localeCompare(b.name, 'id') : b.name.localeCompare(a.name, 'id');
      });
  }, [members, search, ageGroupFilter, ibadahFilter, sortKey, sortDir]);

  const groupCounts = useMemo(() => AGE_GROUPS.reduce((acc, g) => {
    acc[g] = members.filter(m => getAgeGroup(m.birthDate) === g).length;
    return acc;
  }, {} as Record<string, number>), [members]);


  // ── Excel export ──────────────────────────────────────────────────────────
  const exportExcel = (list: Member[], filename: string) => {
    const rows = list.map(m => ({
      'Nama': m.name,
      'Nama Panggilan': m.nickname || '',
      'Email': m.email || '',
      'No. Telepon': (m.phones || (m.phone ? [m.phone] : [])).join(' / '),
      'Tanggal Lahir': m.birthDate || '',
      'Usia': getAge(m.birthDate) >= 0 ? getAge(m.birthDate) : '',
      'Kelompok Usia': getAgeGroup(m.birthDate),
      'Jenis Kelamin': m.gender === 'male' ? 'Laki-laki' : 'Perempuan',
      'Status Pernikahan': m.maritalStatus || '',
      'Alamat Domisili': m.address || '',
      'Status': m.status === 'active' ? 'Aktif' : m.status === 'new' ? 'Jemaat Baru' : 'Tidak Aktif',
      'Pelayan': (m.pelayan || []).join(', '),
      'Komsel/PKS': komsels.find(k => k.id === m.komselId)?.name || '',
      'Ibadah': (m.ibadah || []).join(', '),
      'Pasangan': m.spouseName || '',
      'Anak': (m.children || []).map(c => c.name).join(', '),
      'Tanggal Bergabung': m.joinDate ? formatDate(m.joinDate) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Jemaat');
    XLSX.writeFile(wb, filename);
    setExportDropdown(false);
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Memuat data jemaat...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={22} />Manajemen Data Jemaat
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setExportDropdown(d => !d)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <Download size={14} />Export<ChevronDown size={13} className={`transition-transform ${exportDropdown ? 'rotate-180' : ''}`} />
            </button>
            {exportDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[220px] overflow-hidden">
                <button onClick={() => exportExcel(members, `Jemaat_Semua_${new Date().toISOString().slice(0,10)}.xlsx`)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 text-gray-700 border-b border-gray-50">
                  Semua Jemaat ({members.length})
                </button>
                <button onClick={() => exportExcel(filteredMembers, `Jemaat_Filter_${new Date().toISOString().slice(0,10)}.xlsx`)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 text-gray-700 border-b border-gray-50">
                  Hasil Filter ({filteredMembers.length})
                </button>
                {AGE_GROUPS.map(g => (
                  <button key={g} onClick={() => exportExcel(members.filter(m => getAgeGroup(m.birthDate) === g), `Jemaat_${g}_${new Date().toISOString().slice(0,10)}.xlsx`)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 text-gray-700">
                    {AGE_GROUP_LABELS[g]} ({groupCounts[g] ?? 0})
                  </button>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <>
              <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
              <button onClick={() => fileInputRef.current?.click()} disabled={importing || syncing}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors">
                  {importing ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={14} />}
                  Import Data
              </button>
              <button onClick={handleBulkSync} disabled={syncing || importing || members.length === 0}
                title="Sync semua data ibadah → Komisi (jalankan sekali setelah import)"
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors">
                {syncing
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Check size={14} />}
                Sync Komisi
              </button>
              <button onClick={() => handleOpenDialog()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors">
                <Plus size={15} />Tambah Jemaat
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={15} />{error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm mt-4">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk akses edit.
        </div>
      )}

      
      {/* Import Preview Dialog */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">Preview Import Data</h2>
            <div className="flex-1 overflow-auto border border-gray-200 rounded-xl mb-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Baris</th>
                    <th className="px-4 py-2 font-semibold">Nama</th>
                    <th className="px-4 py-2 font-semibold">Keluarga</th>
                    <th className="px-4 py-2 font-semibold">Telepon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importPreview.errors.map((err, i) => (
                    <tr key={`err-${i}`} className="bg-red-50">
                      <td className="px-4 py-2 text-red-600 font-medium">{err.row}</td>
                      <td className="px-4 py-2 text-red-600" colSpan={3}>Error: {err.error}</td>
                    </tr>
                  ))}
                  {importPreview.valid.map((v, i) => (
                    <tr key={`v-${i}`}>
                      <td className="px-4 py-2 text-gray-500">{v._rowNumber}</td>
                      <td className="px-4 py-2 font-medium">{v.name} {v.nickname && <span className="text-gray-400">({v.nickname})</span>}</td>
                      <td className="px-4 py-2">
                        {v.familyId ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Family Linked</span> : '-'}
                      </td>
                      <td className="px-4 py-2">{v.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-auto">
              <button onClick={() => setImportPreview(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl font-medium border border-gray-200">Batal</button>
              <button onClick={handleConfirmImport} disabled={importing} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 disabled:bg-gray-300">
                {importing ? 'Menyimpan...' : `Konfirmasi Import (${importPreview.valid.length} data)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {importProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-medium text-blue-700">Mengimpor data jemaat…</span>
            <span className="text-blue-600 text-xs">{importProgress.done}/{importProgress.total}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mb-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
              style={{ width: importProgress.total > 0 ? `${Math.round(importProgress.done / importProgress.total * 100)}%` : '0%' }} />
          </div>
          <p className="text-blue-600 text-xs truncate">{importProgress.label}</p>
        </div>
      )}

      {importResult && !importProgress && (
        <div className={`border rounded-xl px-4 py-3 text-sm flex items-center gap-3 ${importResult.errors > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <Check size={15} className="flex-shrink-0" />
          <span>
            Import selesai — <strong>{importResult.inserted} ditambahkan</strong>, {importResult.skipped} sudah ada{importResult.errors > 0 ? `, ${importResult.errors} error` : ''}.
          </span>
          <button onClick={() => setImportResult(null)} className="ml-auto flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {syncing && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-violet-700 font-medium">Menyinkronkan data ibadah → komisi untuk semua jemaat...</span>
        </div>
      )}

      {syncResult && !syncing && (
        <div className="border border-violet-200 bg-violet-50 rounded-xl px-4 py-3 text-sm flex items-center gap-3 text-violet-700">
          <Check size={15} className="flex-shrink-0" />
          <span>Sync selesai — <strong>{syncResult.komisi} komisi baru</strong> ditambahkan, {syncResult.skipped} sudah ada.</span>
          <button onClick={() => setSyncResult(null)} className="ml-auto flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
          Anda hanya memiliki akses <strong>view-only</strong>. Hubungi Super Admin untuk akses edit.
        </div>
      )}

      {/* Old-format records warning */}
      {oldFormatMembers.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Data Lama Terdeteksi ({oldFormatMembers.length} record)</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {oldFormatMembers.map(m => m.name).join(', ')} — data format lama, menyebabkan nama ganda di Absensi dan Jadwal. Bersihkan sekarang.
            </p>
          </div>
          {canDelete && (
            <button onClick={cleanOldRecords} disabled={cleaningOld}
              className="flex-shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
              {cleaningOld
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Trash2 size={12} />}
              {cleaningOld ? 'Membersihkan...' : 'Bersihkan Sekarang'}
            </button>
          )}
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, nama panggilan, telepon..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={sortKey} onChange={e => setSortKey(e.target.value as 'name' | 'age')}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
          <option value="name">Sort: Nama</option>
          <option value="age">Sort: Usia</option>
        </select>
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          {sortDir === 'asc' ? <SortAsc size={15} /> : <SortDesc size={15} />}
          {sortDir === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {/* Age group filter chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setAgeGroupFilter('All')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${ageGroupFilter === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Semua ({members.length})
        </button>
        {AGE_GROUPS.map(g => (
          <button key={g} onClick={() => setAgeGroupFilter(g)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${ageGroupFilter === g ? 'bg-gray-900 text-white border-gray-900' : `${AGE_GROUP_STYLES[g]} border-transparent`}`}>
            {AGE_GROUP_LABELS[g]} ({groupCounts[g] ?? 0})
          </button>
        ))}
      </div>

      {/* Ibadah filter chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setIbadahFilter('All')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${ibadahFilter === 'All' ? 'bg-indigo-700 text-white border-indigo-700' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
          Semua Ibadah
        </button>
        {IBADAH_OPTIONS.map(opt => {
          const count = members.filter(m => (m.ibadah || []).includes(opt.code)).length;
          return (
            <button key={opt.code} onClick={() => setIbadahFilter(opt.code)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${ibadahFilter === opt.code ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-100 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'}`}>
              {opt.code} ({count})
            </button>
          );
        })}
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${viewMode === 'list' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Daftar Semua
        </button>
        <button onClick={() => setViewMode('family')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${viewMode === 'family' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Users size={12} />Per Keluarga
        </button>
      </div>

      {viewMode === 'family' ? (
        <FamilyView
          members={filteredMembers}
          expandedFamilies={expandedFamilies}
          onToggle={id => setExpandedFamilies(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onEdit={canEdit ? handleOpenDialog : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onCreateChild={canEdit ? (name, birthDate) => {
            setEditingMember(null);
            setFormData({ ...BLANK_FORM, name, birthDate: birthDate || '' });
            setOpenDialog(true);
          } : undefined}
        />
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          {members.length === 0 ? 'Belum ada data jemaat' : 'Tidak ada hasil yang cocok'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full bg-white text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Usia</th>
                  <th className="px-4 py-3 text-left">Telepon</th>
                  <th className="px-4 py-3 text-left">Pelayanan</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Bergabung</th>
                  {(canEdit || canDelete) && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => {
                  const ageGroup = getAgeGroup(m.birthDate);
                  const age = getAge(m.birthDate);
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{m.name}</p>
                          {m._storeKey?.startsWith('member:') && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Data Lama</span>
                          )}
                        </div>
                        {m.nickname && <p className="text-xs text-gray-400">({m.nickname})</p>}
                        {m.spouseName && <p className="text-xs text-gray-400">♥ {m.spouseName}</p>}
                        {m.children && m.children.length > 0 && (
                          <p className="text-xs text-gray-400">{m.children.length} anak</p>
                        )}
                        {m.pksName && <p className="text-xs text-purple-600 font-medium">PKS {m.pksName}</p>}
                        {m.ibadah && m.ibadah.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.ibadah.map(code => (
                              <span key={code} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {IBADAH_LABEL[code] || code}
                              </span>
                            ))}
                          </div>
                        )}
                        {m.email && <p className="text-xs text-gray-400">{m.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${AGE_GROUP_STYLES[ageGroup]}`}>{ageGroup}</span>
                        {age >= 0 && <p className="text-xs text-gray-400 mt-0.5">{age} thn</p>}
                      </td>
                      <td className="px-4 py-3">
                        {(m.phones && m.phones.length > 0 ? m.phones : m.phone ? [m.phone] : []).map((ph, i) => (
                          <a key={i} href={`https://wa.me/${ph.replace(/\D/g,'').replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer"
                            className={`block text-emerald-600 hover:underline font-medium text-sm ${i > 0 ? 'text-xs text-gray-500 mt-0.5' : ''}`}>{ph}</a>
                        ))}
                        {!m.phone && !(m.phones?.length) && <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(m.pelayan || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(m.pelayan || []).slice(0, 3).map((p, i) => {
                              const div = SCHEDULE_DIVISIONS.find(d => d.key === p);
                              return div
                                ? <span key={i} className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${div.light}`}>{div.label}</span>
                                : <span key={i} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{p}</span>;
                            })}
                            {(m.pelayan || []).length > 3 && (
                              <span className="text-xs text-gray-400">+{(m.pelayan || []).length - 3}</span>
                            )}
                          </div>
                        ) : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : m.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {m.status === 'active' ? 'Aktif' : m.status === 'new' ? 'Baru' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{m.joinDate ? formatDate(m.joinDate) : '-'}</td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            {canEdit && (
                              <button onClick={() => handleOpenDialog(m)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
                                <Edit size={12} />Edit
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(m.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg">
                                <Trash2 size={12} />Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredMembers.map(m => {
              const ageGroup = getAgeGroup(m.birthDate);
              const age = getAge(m.birthDate);
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-gray-900">{m.name}</p>
                        {m._storeKey?.startsWith('member:') && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Data Lama</span>
                        )}
                      </div>
                      {m.nickname && <p className="text-xs text-gray-400">({m.nickname})</p>}
                      {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : m.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {m.status === 'active' ? 'Aktif' : m.status === 'new' ? 'Baru' : 'Non-aktif'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${AGE_GROUP_STYLES[ageGroup]}`}>{ageGroup}</span>
                      {age >= 0 && <span className="text-gray-400">{age} thn</span>}
                    </div>
                    <div className="col-span-1 space-y-0.5">
                      {(m.phones && m.phones.length > 0 ? m.phones : m.phone ? [m.phone] : []).map((ph, i) => (
                        <a key={i} href={`https://wa.me/${ph.replace(/\D/g,'').replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer"
                          className="block text-emerald-600 font-medium truncate text-xs">{ph}</a>
                      ))}
                    </div>
                    {m.komselJoined && <span className="text-green-600">✓ Komsel</span>}
                    {m.pksName && <span className="text-purple-600 font-medium truncate col-span-2">PKS {m.pksName}</span>}
                  </div>
                  {m.ibadah && m.ibadah.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {m.ibadah.map(code => (
                        <span key={code} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {IBADAH_LABEL[code] || code}
                        </span>
                      ))}
                    </div>
                  )}
                  {(m.pelayan || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(m.pelayan || []).map((p, i) => {
                        const div = SCHEDULE_DIVISIONS.find(d => d.key === p);
                        return div
                          ? <span key={i} className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${div.light}`}>{div.label}</span>
                          : <span key={i} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{p}</span>;
                      })}
                    </div>
                  )}
                  {(m.spouseName || (m.children && m.children.length > 0)) && (
                    <div className="text-xs text-gray-500 space-y-0.5 mb-2">
                      {m.spouseName && <div>Pasangan: <span className="font-medium text-gray-700">{m.spouseName}</span></div>}
                      {m.children && m.children.length > 0 && (
                        <div>Anak: <span className="font-medium text-gray-700">{m.children.map(c => c.name).join(', ')}</span></div>
                      )}
                    </div>
                  )}
                  {(canEdit || canDelete) && (
                    <div className="flex gap-2 pt-2 border-t border-gray-50">
                      {canEdit && (
                        <button onClick={() => handleOpenDialog(m)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
                          <Edit size={12} />Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(m.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg">
                          <Trash2 size={12} />Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Add/Edit Modal ── */}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">{editingMember ? 'Edit Data Jemaat' : 'Tambah Jemaat Baru'}</h2>
              <button onClick={() => setOpenDialog(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {/* Nama Panggilan */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Panggilan</label>
                  <input type="text" placeholder="Misal: Budi, Sari..." value={formData.nickname} onChange={e => setFormData(p => ({ ...p, nickname: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {/* Email */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {/* Telepon */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">No. Telepon / WA</label>
                    <button type="button"
                      onClick={() => setFormData(p => ({ ...p, additionalPhones: [...p.additionalPhones, ''] }))}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                      <Plus size={12} /> Tambah Nomor
                    </button>
                  </div>
                  <input type="tel" placeholder="Nomor utama" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2" />
                  {formData.additionalPhones.map((ph, idx) => (
                    <div key={idx} className="flex gap-2 mb-1.5">
                      <input type="tel" placeholder={`Nomor ${idx + 2}`} value={ph}
                        onChange={e => setFormData(p => ({ ...p, additionalPhones: p.additionalPhones.map((x, i) => i === idx ? e.target.value : x) }))}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <button type="button"
                        onClick={() => setFormData(p => ({ ...p, additionalPhones: p.additionalPhones.filter((_, i) => i !== idx) }))}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
                  <input type="date" value={formData.birthDate} onChange={e => setFormData(p => ({ ...p, birthDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Kelamin</label>
                  <select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                {/* Status Pernikahan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status Pernikahan</label>
                  <select value={formData.maritalStatus} onChange={e => setFormData(p => ({ ...p, maritalStatus: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="single">Single</option>
                    <option value="married">Menikah</option>
                    <option value="divorced">Cerai</option>
                    <option value="widowed">Duda/Janda</option>
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status Jemaat</label>
                  <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="new">Jemaat Baru</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
                {/* Alamat Domisili */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat Domisili</label>
                  <textarea rows={2} value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>
                {/* Tempat Lahir */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempat Lahir</label>
                  <input type="text" placeholder="Kota tempat lahir" value={formData.birthPlace}
                    onChange={e => setFormData(p => ({ ...p, birthPlace: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {/* Tanggal Baptis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Baptis</label>
                  <input type="date" value={formData.baptismDate} onChange={e => setFormData(p => ({ ...p, baptismDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {/* Status Baptis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status Baptis</label>
                  <select value={formData.baptismStatus} onChange={e => setFormData(p => ({ ...p, baptismStatus: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="belum">Belum Baptis</option>
                    <option value="sudah">Sudah Baptis</option>
                  </select>
                </div>
                {/* Ibadah */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ibadah yang Diikuti</label>
                  <div className="flex flex-wrap gap-2">
                    {IBADAH_OPTIONS.map(opt => {
                      const active = (formData.ibadah || []).includes(opt.code);
                      return (
                        <button key={opt.code} type="button"
                          onClick={() => setFormData(p => ({
                            ...p,
                            ibadah: active ? (p.ibadah || []).filter(x => x !== opt.code) : [...(p.ibadah || []), opt.code],
                          }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Keluarga Section */}
                <div className="col-span-2 border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Users size={14} className="text-blue-500" />
                    Data Keluarga
                  </h4>
                  {/* Pasangan */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Pasangan</label>
                    <input type="text" placeholder="Nama suami / istri" value={formData.spouseName || ''}
                      onChange={e => setFormData(p => ({ ...p, spouseName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                  {/* Anak-anak */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-600">Anak-anak</label>
                      <button type="button"
                        onClick={() => setFormData(p => ({ ...p, children: [...(p.children || []), { name: '', birthDate: '' }] }))}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                        <Plus size={12} /> Tambah Anak
                      </button>
                    </div>
                    {(formData.children || []).length === 0 && (
                      <p className="text-xs text-gray-400 italic py-1">Belum ada data anak</p>
                    )}
                    <div className="space-y-2">
                      {(formData.children || []).map((child, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <input type="text" placeholder={`Nama anak ${idx + 1}`} value={child.name}
                            onChange={e => setFormData(p => ({
                              ...p,
                              children: (p.children || []).map((c, i) => i === idx ? { ...c, name: e.target.value } : c)
                            }))}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                          <input type="date" value={child.birthDate || ''}
                            onChange={e => setFormData(p => ({
                              ...p,
                              children: (p.children || []).map((c, i) => i === idx ? { ...c, birthDate: e.target.value } : c)
                            }))}
                            className="w-36 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                          <button type="button"
                            onClick={() => setFormData(p => ({ ...p, children: (p.children || []).filter((_, i) => i !== idx) }))}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Komsel */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Komsel/PKS</label>
                    <select 
                      value={formData.komselId || ''} 
                      onChange={e => setFormData(p => ({ ...p, komselId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    >
                      <option value="">-- Pilih Komsel --</option>
                      {komsels.map(k => (
                        <option key={k.id} value={k.id}>{k.pksName || k.name}</option>
                      ))}
                    </select>
                  </div>

                {/* Pelayan Section */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pelayanan</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 border border-gray-100 rounded-xl p-3 bg-gray-50 max-h-56 overflow-y-auto">
                    {PELAYAN_OPTIONS.map(ministry => {
                      const div = SCHEDULE_DIVISIONS.find(d => d.key === ministry);
                      const active = formData.pelayan.includes(ministry);
                      return (
                        <label key={ministry} onClick={() => handlePelayanChange(ministry, !active)}
                          className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors select-none">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            active
                              ? div ? `${div.color} border-transparent` : 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 bg-white'
                          }`}>
                            {active && <Check size={9} className="text-white" />}
                          </div>
                          <span className="text-xs text-gray-700 leading-tight flex-1">{ministry}</span>
                          {div && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${div.color}`} title="Terhubung ke Jadwal Pelayanan" />}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block flex-shrink-0" />
                    Dot berwarna = terhubung ke Jadwal Pelayanan
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setOpenDialog(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} disabled={!formData.name.trim() || saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                {editingMember ? 'Simpan Perubahan' : 'Tambah Jemaat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-base text-center">Hapus Data Jemaat?</h3>
              <p className="text-sm text-gray-500 text-center">
                <strong>{members.find(m => m.id === deletingId)?.name}</strong> akan dihapus dari semua sistem — jadwal pelayanan, data komisi, dan absensi.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
