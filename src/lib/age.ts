export type AgeGroup = 'Children' | 'Teens' | 'Youth' | 'Adults' | 'Seniors' | 'unknown';

/**
 * Parses a date string safely in local time (ignoring UTC midnight shifts)
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Calculates current age dynamically based on current date.
 * (e.g. Born in 2005 reaches 21 in 2026, and in 2027 becomes 22 once birthday arrives).
 */
export function getAge(birthDate: string): number {
  if (!birthDate) return -1;
  const birth = parseLocalDate(birthDate);
  if (!birth) return -1;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Calculates current completed wedding anniversary years.
 */
export function getAnniversaryYears(marriageDate: string): number {
  if (!marriageDate) return -1;
  const marriage = parseLocalDate(marriageDate);
  if (!marriage) return -1;
  const today = new Date();
  let years = today.getFullYear() - marriage.getFullYear();
  const m = today.getMonth() - marriage.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < marriage.getDate())) years--;
  return Math.max(0, years);
}

/**
 * Calculates countdown and turning milestone for wedding anniversary.
 */
export function anniversaryInfo(marriageDate: string): { daysUntil: number; years: number; isToday: boolean } | null {
  if (!marriageDate) return null;
  const mDate = parseLocalDate(marriageDate);
  if (!mDate) return null;
  const today = new Date();
  const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let next = new Date(today.getFullYear(), mDate.getMonth(), mDate.getDate());
  if (next < todayReset) {
    next = new Date(today.getFullYear() + 1, mDate.getMonth(), mDate.getDate());
  }

  const diffTime = next.getTime() - todayReset.getTime();
  const daysUntil = Math.round(diffTime / 86400000);
  const isToday = daysUntil === 0;

  // Milestone reached on this anniversary (either today or upcoming)
  const years = next.getFullYear() - mDate.getFullYear();
  return { daysUntil, years, isToday };
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
