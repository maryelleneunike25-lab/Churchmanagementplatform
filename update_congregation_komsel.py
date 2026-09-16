import re

with open('src/app/components/modules/CongregationManagement.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Member interface
code = re.sub(r'komselJoined\?: boolean;\s*pksName\?: string;', 'komselId?: string;', code)
code = re.sub(r'komselJoined: false, pksName: \'\',', 'komselId: \'\',', code)
code = re.sub(r'komselJoined: member\.komselJoined \|\| false,\s*pksName: member\.pksName \|\| \'\',', 'komselId: member.komselId || \'\',', code)
code = re.sub(r'komselJoined: formData\.komselJoined,\s*pksName: formData\.pksName,', 'komselId: formData.komselId || undefined,', code)

# 2. Add useKomsels hook
code = code.replace(
    "import { useAutoRefresh } from '../../hooks/useAutoRefresh';",
    "import { useAutoRefresh } from '../../hooks/useAutoRefresh';\nimport { useKomsels } from '../../../lib/komsel';"
)
code = code.replace(
    "const [pksNames, setPksNames] = useState<string[]>([]);",
    "const { komsels } = useKomsels();"
)

# Remove loadPksNames and seedPksNames
code = re.sub(r'//  Load PKS names.*?\} catch \{\}\n    \};\n', '', code, flags=re.DOTALL)
code = re.sub(r'//  Seed canonical PKS names.*?\} catch \{\}\n    \};\n', '', code, flags=re.DOTALL)
code = re.sub(r'loadPksNames\(\);\s*seedPksNames\(\);', '', code)

# 3. Update Table columns and display
code = re.sub(r'\'Komsel\': m\.komselJoined \? \'Ya\' : \'Tidak\',\s*\'PKS\': m\.pksName \|\| \'\',', 
              r"'Komsel/PKS': komsels.find(k => k.id === m.komselId)?.name || '',", code)

# In the table row UI:
ui_replace = '''
                      <div className="flex gap-2 text-[10px] mt-1 overflow-x-auto pb-1 no-scrollbar">
                        {m.phones && m.phones.slice(1).map(ph => (
                          <a key={ph} href={`https://wa.me/${ph.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" 
                            className="block text-emerald-600 font-medium truncate text-xs">{ph}</a>
                        ))}
                      </div>
                      {m.komselId && (
                        <span className="text-purple-600 font-medium truncate col-span-2">
                          PKS {komsels.find(k => k.id === m.komselId)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
'''
code = re.sub(r'<div className="flex gap-2 text-\[10px\] mt-1.*?</div\>\s*\{m\.komselJoined && <span.*?</span>\}\s*\{m\.pksName && <span.*?</span>\}\s*</div\>', ui_replace.strip() + '\n                    </div>', code, flags=re.DOTALL)

# 4. Update Form UI
form_replace = '''
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
'''
code = re.sub(r'\{\/\* Komsel \*\/}.*?\{\/\* PKS \*\/}.*?</select>\n\s*</div\>\n\s*\)}', form_replace.strip(), code, flags=re.DOTALL)


with open('src/app/components/modules/CongregationManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("done")
