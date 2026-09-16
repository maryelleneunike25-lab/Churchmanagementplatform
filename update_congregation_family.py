import re

with open('src/app/components/modules/CongregationManagement.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace buildFamilyGroups with familyId aware logic
new_family_logic = '''
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
'''
code = re.sub(r'function buildFamilyGroups\(members: Member\[\]\): FamilyGroup\[\] \{.*?\n\}\n\nfunction FamilyView', new_family_logic.strip() + '\n\nfunction FamilyView', code, flags=re.DOTALL)

with open('src/app/components/modules/CongregationManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("done")
