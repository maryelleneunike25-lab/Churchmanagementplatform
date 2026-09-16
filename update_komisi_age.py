import re

with open('src/app/components/modules/CongregationManagement.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add age restrictions for Sekolah Minggu and Remaja when auto-syncing
sync_replace = '''
        // Add new memberships
        const age = getAge(record.birthDate || '');
        for (const komisiId of targetKomisiIds) {
          if (!existingKomisiIds.includes(komisiId)) {
            // Apply hardcoded age rules for specific komisi only
            if (komisiId === 'sekolah-minggu' && age >= 0 && age > 12) continue;
            if (komisiId === 'teens' && age >= 0 && (age < 13 || age > 17)) continue;

            const joinId = crypto.randomUUID();
'''

code = re.sub(r'// Add new memberships\n\s*for \(const komisiId of targetKomisiIds\) \{\n\s*if \(\!existingKomisiIds\.includes\(komisiId\)\) \{\n\s*const joinId = crypto\.randomUUID\(\);', sync_replace.strip(), code, flags=re.DOTALL)

with open('src/app/components/modules/CongregationManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("done")
