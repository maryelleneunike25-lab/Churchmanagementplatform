export const IBADAH_OPTIONS = [
  { code: 'IR',     label: 'Ibadah Umum' },
  { code: 'WBI',    label: 'Wanita Bethel Indonesia' },
  { code: 'ABI',    label: 'Sekolah Minggu' },
  { code: 'RBI',    label: 'Remaja Bethel Indonesia' },
  { code: 'PBI',    label: 'Vessel Youth Community' },
  { code: 'KOMPAS', label: 'Komunitas Pasutri' },
  { code: 'KOWARI', label: 'Komunitas Wanita Mandiri & Koemas' },
];

export const IBADAH_LABEL: Record<string, string> = Object.fromEntries(
  IBADAH_OPTIONS.map(o => [o.code, o.label])
);
