export type AgeGroup = 'Children' | 'Teens' | 'Youth' | 'Adults' | 'Seniors' | 'unknown';

export function getAge(birthDate: string): number {
  if (!birthDate) return -1;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return -1;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getAgeGroup(birthDate: string): AgeGroup {
  const age = getAge(birthDate);
  if (age < 0) return 'unknown';
  if (age <= 12) return 'Children';
  if (age <= 17) return 'Teens';
  if (age <= 30) return 'Youth';
  if (age <= 59) return 'Adults';
  return 'Seniors';
}

export const AGE_GROUP_STYLES: Record<string, string> = {
  Children: 'bg-pink-100 text-pink-700',
  Teens:    'bg-purple-100 text-purple-700',
  Youth:    'bg-blue-100 text-blue-700',
  Adults:   'bg-emerald-100 text-emerald-700',
  Seniors:  'bg-amber-100 text-amber-700',
  'unknown':'bg-red-100 text-red-700 font-bold',
};

export const AGE_GROUPS: AgeGroup[] = ['Children', 'Teens', 'Youth', 'Adults', 'Seniors', 'unknown'];
export const AGE_GROUP_LABELS: Record<string, string> = {
  Children: 'Children (0–12)',
  Teens:    'Teens (13–17)',
  Youth:    'Youth (18–30)',
  Adults:   'Adults (31–59)',
  Seniors:  'Seniors (60+)',
  'unknown':'Tanggal Lahir Tidak Valid',
};
