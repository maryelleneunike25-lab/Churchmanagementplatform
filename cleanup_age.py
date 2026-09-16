import re

with open('src/app/components/modules/CongregationManagement.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove duplicate age logic
code = re.sub(r'//  Age helpers .*?\}\n\n', '', code, flags=re.DOTALL)
code = re.sub(r'type AgeGroup = \'Children\' \| \'Teens\' \| \'Youth\' \| \'Adults\' \| \'Seniors\' \| \'-\';\n', '', code)
code = re.sub(r'const AGE_GROUPS: AgeGroup\[\] = \[\'Children\', \'Teens\', \'Youth\', \'Adults\', \'Seniors\', \'-\'\];\n', '', code)
code = re.sub(r'const AGE_GROUP_LABELS: Record<string, string> = \{.*?\};\n', '', code, flags=re.DOTALL)
code = re.sub(r'const AGE_GROUP_STYLES: Record<string, string> = \{.*?\};\n', '', code, flags=re.DOTALL)

# Add age.ts import
code = code.replace(
    "import { useKomsels } from '../../../lib/komsel';",
    "import { useKomsels } from '../../../lib/komsel';\nimport { getAge, getAgeGroup, AGE_GROUPS, AGE_GROUP_LABELS, AGE_GROUP_STYLES } from '../../../lib/age';"
)

# Fix missing import and usage of '-' to 'unknown' in CongregationManagement.tsx
code = code.replace("AgeGroup = '-'", "AgeGroup = 'unknown'")
code = code.replace("getAgeGroup(m.birthDate) === '-'", "getAgeGroup(m.birthDate) === 'unknown'")
code = code.replace("'unknown' : ''", "'unknown' ? '' : 'unknown'")

with open('src/app/components/modules/CongregationManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("done")
