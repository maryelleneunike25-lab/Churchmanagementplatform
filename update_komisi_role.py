import re

with open('src/app/components/modules/KomisiManagement.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update KomisiMember interface
code = code.replace(
    "birthDate?: string;",
    "birthDate?: string;\n  role?: 'anggota' | 'pengurus' | 'guru';"
)

# 2. Update memberForm state
code = code.replace(
    "const [memberForm, setMemberForm] = useState({ name: '', phone: '', address: '', birthDate: '' });",
    "const [memberForm, setMemberForm] = useState({ name: '', phone: '', address: '', birthDate: '', role: 'anggota' as 'anggota' | 'pengurus' | 'guru' });"
)
code = code.replace(
    "setMemberForm({ name: '', phone: '', address: '', birthDate: '' });",
    "setMemberForm({ name: '', phone: '', address: '', birthDate: '', role: 'anggota' });"
)
code = code.replace(
    "setMemberForm({ name: m.name, phone: m.phone, address: m.address || '', birthDate: m.birthDate || '' });",
    "setMemberForm({ name: m.name, phone: m.phone, address: m.address || '', birthDate: m.birthDate || '', role: m.role || 'anggota' });"
)

# 3. Add role to payload
payload_replace = '''
          phone: memberForm.phone.trim(),
          address: memberForm.address.trim(),
          birthDate: memberForm.birthDate,
          role: memberForm.role,
'''
code = re.sub(r'phone: memberForm\.phone\.trim\(\),\s*address: memberForm\.address\.trim\(\),\s*birthDate: memberForm\.birthDate,', payload_replace.strip(), code, flags=re.DOTALL)

# 4. Add role to table and cards
code = code.replace(
    "'Tanggal Lahir': m.birthDate || '',",
    "'Tanggal Lahir': m.birthDate || '',\n      'Peran': m.role === 'pengurus' ? 'Pengurus' : m.role === 'guru' ? 'Guru' : 'Anggota',"
)

card_ui_replace = '''
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900 truncate pr-2">{m.name}</h4>
                          {m.role === 'pengurus' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Pengurus</span>}
                          {m.role === 'guru' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Guru</span>}
                        </div>
'''
code = re.sub(r'<div className="flex items-center justify-between">\s*<h4 className="font-semibold text-gray-900 truncate pr-2">\{m\.name\}</h4>\s*</div\>', card_ui_replace.strip(), code, flags=re.DOTALL)

# 5. Add Role selector to form
form_ui_replace = '''
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
                  <input type="date" value={memberForm.birthDate} onChange={e => setMemberForm(p => ({ ...p, birthDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">Isi untuk membantu pencocokan otomatis</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Peran</label>
                  <select value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="anggota">Anggota</option>
                    <option value="pengurus">Pengurus / PIC</option>
                    <option value="guru">Guru (Khusus Sekolah Minggu)</option>
                  </select>
                </div>
'''
code = re.sub(r'<div\>\s*<label className="block text-sm font-medium text-gray-700 mb-1\.5">Tanggal Lahir</label>\s*<input type="date" value=\{memberForm\.birthDate\} onChange=\{e => setMemberForm\(p => \(\{ \.\.\.p, birthDate: e\.target\.value \}\)\)\}\s*className="w-full px-3\.5 py-2\.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />\s*<p className="text-xs text-gray-400 mt-1">Isi untuk membantu pencocokan otomatis</p>\s*</div\>', form_ui_replace.strip(), code, flags=re.DOTALL)


with open('src/app/components/modules/KomisiManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("done")
