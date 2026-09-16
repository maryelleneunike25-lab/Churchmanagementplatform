import re

with open('src/app/components/modules/KomselManagement.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
code = code.replace(
    "import { EdgeKV as supabaseAdmin } from '../../../lib/edgeKvClient';",
    "import { useKomsels } from '../../../lib/komsel';"
)
code = re.sub(r'const KV =.*?;\n', '', code)

# 2. State & Hooks
new_state = '''
  const canEdit = isSuperAdmin || (user?.permissions as any)?.editKomsel || false;

  const { komsels, loading, refetch: loadKomsels } = useKomsels();
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKomsel, setEditingKomsel] = useState<Komsel | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedPks, setExpandedPks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ ...BLANK_FORM });

  const expandAll = () => setExpandedPks(new Set(komsels.map(k => k.id)));
  const collapseAll = () => setExpandedPks(new Set());
'''

code = re.sub(r'const canEdit =.*?(?=const handleOpenDialog)', new_state.strip() + '\n\n  ', code, flags=re.DOTALL)

# 3. Summary
new_summary = '''
      {/*  Summary  */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{komsels.length}</p>
          <p className="text-xs text-purple-600 mt-0.5">Komsel/PKS</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{komsels.reduce((sum, k) => sum + (k.memberCount || 0), 0)}</p>
          <p className="text-xs text-blue-600 mt-0.5">Total Anggota</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{komsels.filter(k => k.status === 'active').length}</p>
          <p className="text-xs text-green-600 mt-0.5">Komsel Aktif</p>
        </div>
      </div>
'''

code = re.sub(r'\{\/\*  Summary  \*\/}.*?(?=\{\/\*  PKS Cards  \*\/})', new_summary.strip() + '\n\n      ', code, flags=re.DOTALL)

# 4. PKS Cards Mapping
# Replace `allPksNames.map(pksName => {` with `komsels.map(komsel => {`
# And fix `const expanded = expandedPks.has(pksName);`
new_cards = '''
        {komsels.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
            Belum ada data Komsel/PKS
          </div>
        ) : (
          komsels.map(komsel => {
            const members = komsel.memberDetails || [];
            const expanded = expandedPks.has(komsel.id);
            const pksName = komsel.pksName || komsel.name;

            return (
              <div key={komsel.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                <div onClick={() => setExpandedPks(prev => {
                  const n = new Set(prev);
                  if (n.has(komsel.id)) n.delete(komsel.id);
                  else n.add(komsel.id);
                  return n;
                })}
'''
code = re.sub(r'\{allPksNames\.length === 0 \? \((.*?)\) : \(\s*allPksNames\.map\(pksName => \{\s*const komsel(.*?)\n\s*return \(\s*<div key=\{pksName\}(.*?)\n\s*<div onClick=\{.*?\n.*?\n.*?\n.*?\n\s*\}\)', new_cards.strip(), code, flags=re.DOTALL)

with open('src/app/components/modules/KomselManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated KomselManagement.tsx")
