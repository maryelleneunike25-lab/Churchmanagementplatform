import re

with open('src/app/components/modules/CongregationManagement.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Member interface to include familyId and children
code = code.replace(
    "pelayan?: string[];",
    "pelayan?: string[];\n    familyId?: string;\n    spouseName?: string;\n    children?: {name: string, birthDate?: string}[];\n    parentId?: string;\n    parentName?: string;"
)

# 2. Import parser
code = code.replace(
    "import { importCongregationData } from '../../../lib/congregationSeeder';",
    "import { parseExcelFile, executeImport, ParsedMember, ImportPreview } from '../../../lib/congregationImport';"
)

# 3. Add states for File parsing
code = code.replace(
    "const [importing, setImporting] = useState(false);",
    "const [importing, setImporting] = useState(false);\n  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);"
)

# 4. Modify handleImport to handle File Upload
handle_import_replace = '''
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
'''
code = re.sub(r'const handleImport = async \(\) => \{.*?\n\s*};\n', handle_import_replace.strip() + '\n', code, flags=re.DOTALL)
# Import React to fix React.useRef if needed
if "import React" not in code and "import * as React" not in code:
    code = code.replace("import { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';")

# 5. Modify Import Data button
import_btn_replace = '''
              <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
              <button onClick={() => fileInputRef.current?.click()} disabled={importing || syncing}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors">
                  {importing ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={14} />}
                  Import Data
              </button>
'''
code = re.sub(r'<button onClick=\{handleImport\}.*?</button>', import_btn_replace.strip(), code, flags=re.DOTALL)

# 6. Add Preview Dialog UI
preview_ui = '''
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
'''
code = code.replace("{importProgress && (", preview_ui + "\n      {importProgress && (")


with open('src/app/components/modules/CongregationManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("done")
