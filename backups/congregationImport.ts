import * as XLSX from 'xlsx';
import { EdgeKV as supabaseAdmin } from './edgeKvClient';

const KV = 'kv_store_561004a0';

export interface ParsedMember {
  id: string;
  name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  phones?: string[];
  address?: string;
  birthDate?: string;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  spouseName?: string;
  childrenNames?: string[];
  familyId?: string;
  ibadah?: string[];
  status: 'active' | 'inactive' | 'new';
  _rowNumber: number;
}

export interface ImportPreview {
  valid: ParsedMember[];
  errors: { row: number; error: string }[];
}

function parseDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel date serial
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return '';
}

export async function parseExcelFile(file: File): Promise<ImportPreview> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as any[];

      const valid: ParsedMember[] = [];
      const errors: { row: number; error: string }[] = [];

      rows.forEach((row, idx) => {
        const rowNumber = idx + 2; // +1 for 0-index, +1 for header
        const name = String(row['Nama'] || row['Name'] || '').trim();
        if (!name) {
          errors.push({ row: rowNumber, error: 'Nama kosong' });
          return;
        }

        const rawGender = String(row['Jenis Kelamin'] || row['Gender'] || '').toLowerCase();
        const gender = rawGender.startsWith('p') || rawGender.startsWith('f') || rawGender.startsWith('w') ? 'female' : 'male';

        const rawStatus = String(row['Status Pernikahan'] || row['Marital Status'] || '').toLowerCase();
        let maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' = 'single';
        if (rawStatus.includes('menikah') || rawStatus.includes('married')) maritalStatus = 'married';
        if (rawStatus.includes('janda') || rawStatus.includes('widow')) maritalStatus = 'widowed';
        if (rawStatus.includes('duda') || rawStatus.includes('divorce')) maritalStatus = 'divorced';

        const phones = [String(row['Telepon'] || ''), String(row['Telepon 2'] || '')].map(p => p.replace(/[^0-9]/g, '')).filter(Boolean);

        const spouseName = String(row['Suami/Istri'] || row['Spouse'] || '').trim();
        const childrenNames = [String(row['Anak 1'] || ''), String(row['Anak 2'] || ''), String(row['Anak 3'] || '')].map(s => s.trim()).filter(Boolean);

        valid.push({
          id: crypto.randomUUID(),
          name,
          nickname: String(row['Panggilan'] || row['Nickname'] || '').trim(),
          email: String(row['Email'] || '').trim(),
          phone: phones[0] || '',
          phones,
          address: String(row['Alamat'] || row['Address'] || '').trim(),
          birthDate: parseDate(row['Tanggal Lahir'] || row['Birth Date']),
          gender,
          maritalStatus,
          spouseName: spouseName || undefined,
          childrenNames: childrenNames.length > 0 ? childrenNames : undefined,
          ibadah: [],
          status: 'active',
          _rowNumber: rowNumber,
        });
      });

      // Assign familyIds
      // 1. Group by exact spouse match
      const nameMap = new Map<string, ParsedMember>();
      valid.forEach(m => nameMap.set(m.name.toLowerCase(), m));

      valid.forEach(m => {
        if (!m.familyId && (m.spouseName || m.childrenNames?.length)) {
          m.familyId = crypto.randomUUID(); // Assign new family
          
          if (m.spouseName) {
            const spouse = nameMap.get(m.spouseName.toLowerCase());
            if (spouse && !spouse.familyId) spouse.familyId = m.familyId;
          }

          if (m.childrenNames) {
            m.childrenNames.forEach(c => {
              const child = nameMap.get(c.toLowerCase());
              if (child && !child.familyId) child.familyId = m.familyId;
            });
          }
        }
      });

      resolve({ valid, errors });
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function executeImport(members: ParsedMember[], onProgress: (done: number, total: number) => void) {
  let done = 0;
  for (const m of members) {
    const record = {
      id: m.id,
      name: m.name,
      nickname: m.nickname,
      email: m.email,
      phone: m.phone,
      phones: m.phones,
      address: m.address,
      birthDate: m.birthDate,
      gender: m.gender,
      maritalStatus: m.maritalStatus,
      spouseName: m.spouseName,
      familyId: m.familyId,
      status: m.status,
      pelayan: [],
      ibadah: [],
    };
    
    const key = `congregation:member:${m.id}`;
    await supabaseAdmin.from(KV).insert({ key, value: record });
    done++;
    onProgress(done, members.length);
  }
}
