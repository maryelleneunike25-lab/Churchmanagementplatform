export interface JemaatMember {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  nickname?: string;
  komselId?: string;
  [key: string]: any;
}

export interface MatchResult {
  jemaat: JemaatMember;
  score: number;
  reasons: string[];
}

export function calcMatchScore(
  candidate: { name: string; phone?: string; address?: string; birthDate?: string },
  jemaat: JemaatMember
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  const cName = candidate.name.toLowerCase().trim();
  const jName = jemaat.name.toLowerCase().trim();
  const jNick = (jemaat.nickname || '').toLowerCase().trim();

  if (cName === jName) { score += 50; reasons.push('nama sama persis'); }
  else if (cName === jNick) { score += 45; reasons.push('nama panggilan cocok'); }
  else if (cName.includes(jName) || jName.includes(cName)) { score += 25; reasons.push('nama mirip'); }
  else {
    const cWords = cName.split(' ').filter(w => w.length > 2);
    const jWords = jName.split(' ').filter(w => w.length > 2);
    const overlap = cWords.filter(w => jWords.includes(w)).length;
    if (overlap >= 2) { score += 20; reasons.push(`${overlap} kata nama cocok`); }
    else if (overlap === 1) { score += 8; }
  }

  if (candidate.birthDate && jemaat.birthDate && candidate.birthDate === jemaat.birthDate) {
    score += 40; reasons.push('tanggal lahir sama');
  }

  if (candidate.phone && jemaat.phone) {
    const pC = candidate.phone.replace(/\D/g, '').slice(-8);
    const pJ = jemaat.phone.replace(/\D/g, '').slice(-8);
    if (pC.length >= 6 && pC === pJ) { score += 20; reasons.push('nomor HP sama'); }
  }

  if (candidate.address && jemaat.address) {
    const aC = candidate.address.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 25);
    const aJ = jemaat.address.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 25);
    if (aC.length > 8 && aJ.includes(aC.slice(0, 15))) { score += 15; reasons.push('alamat cocok'); }
  }

  return { jemaat, score, reasons };
}
