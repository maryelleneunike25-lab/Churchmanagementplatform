import { supabase } from './supabase';

const KV = 'kv_store_561004a0';

// ── Date parser ───────────────────────────────────────────────────────────────
const MONTHS: Record<string, string> = {
  januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',
  juli:'07',agustus:'08',september:'09',oktober:'10',november:'11',desember:'12',
  jan:'01',feb:'02',mar:'03',apr:'04',jun:'06',jul:'07',aug:'08',sep:'09',okt:'10',nov:'11',des:'12',
};

function parseDate(raw: string): { birthPlace?: string; birthDate?: string } {
  if (!raw?.trim()) return {};
  const s = raw.trim();
  // "City, DD Month YYYY"
  const m1 = s.match(/^([^,]+),\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/i);
  if (m1) {
    const mo = MONTHS[m1[3].toLowerCase()];
    if (mo) return { birthPlace: m1[1].trim(), birthDate: `${m1[4]}-${mo}-${m1[2].padStart(2,'0')}` };
  }
  // "DD Month YYYY"
  const m2 = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/i);
  if (m2) {
    const mo = MONTHS[m2[2].toLowerCase()];
    if (mo) return { birthDate: `${m2[3]}-${mo}-${m2[1].padStart(2,'0')}` };
  }
  // "DD-MM-YYYY" or "D/M/YYYY" or "M/D/YYYY" (ambiguous — use as-is if year is first)
  const m3 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m3) return { birthDate: `${m3[3]}-${m3[2].padStart(2,'0')}-${m3[1].padStart(2,'0')}` };
  // "YYYY-MM-DD"
  const m4 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m4) return { birthDate: s };
  // Just a year or partial — skip
  const m5 = s.match(/^(\d{1,2})\s+([a-zA-Z]+)$/i);
  if (m5) {
    const mo = MONTHS[m5[2].toLowerCase()];
    if (mo) return { birthDate: `---${mo}-${m5[1].padStart(2,'0')}` }; // unknown year
  }
  return {};
}

type MS = 'single' | 'married' | 'divorced' | 'widowed';
function ms(s?: string): MS {
  if (!s) return 'single';
  const l = s.toLowerCase();
  if (l === 'menikah') return 'married';
  if (l === 'janda') return 'widowed';
  if (l === 'duda') return 'divorced';
  return 'single';
}

type Gender = 'male' | 'female';

interface SeedMember {
  name: string;
  nickname?: string;
  gender?: Gender;
  rawDate?: string;
  phone?: string;
  address?: string;
  maritalStatus?: string;
  ibadah?: string[];
  pelayan?: string[];
  baptismStatus?: 'sudah' | 'belum';
  spouseName?: string;
  children?: { name: string; birthDate?: string }[];
  status?: 'active' | 'inactive' | 'new';
}

// ── Seed data ─────────────────────────────────────────────────────────────────
// ibadah codes: IR=Ibadah Raya, WBI, ABI, KOMPAS, RBI, PBI, KOWARI
const SEED: SeedMember[] = [
  // ── A ──────────────────────────────────────────────────────────────────────
  { name:'Adhi Pratama', nickname:'Diday', gender:'male', rawDate:'Jakarta, 16 Agustus 1990',
    phone:'087889558599', address:'Teluk gong Jln D no 48 rt.010/017',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active' },

  { name:'Agnes Vindyani', nickname:'Agnes', gender:'female', rawDate:'Jakarta, 10 Agustus 1982',
    phone:'08161106774', address:'Jl. I Jelambar Aladin No.29A Rt008/Rw006 Jak-Ut 14450',
    maritalStatus:'Menikah', ibadah:['IR','WBI','KOMPAS'], baptismStatus:'sudah', status:'active' },

  { name:'Andrean Siswanto', nickname:'Bean', gender:'male', rawDate:'Jakarta, 14 November 1993',
    phone:'081283224822', address:'Jelambar fajar',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Andres', nickname:'Andres', gender:'male', rawDate:'Jakarta, 1 Mei 1983',
    phone:'081310004283', address:'villikanto@gmail.com',
    maritalStatus:'Menikah', ibadah:['IR','ABI','KOMPAS'], baptismStatus:'sudah', status:'active' },

  { name:'Andrian', nickname:'Noek/yan/Dri', gender:'male', rawDate:'Jakarta, 26 September 2001',
    phone:'087789914638', address:'Jln. Jelambar Aladin Gang K/41',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'belum', status:'active' },

  { name:'Audrey Stevie Likanto', nickname:'Audrey', gender:'female', rawDate:'Jakarta, 4 September 2008',
    phone:'089652489428', address:'Jln Jelambar aladin no 29A Rt 008 Rw:006 jak-ut 14450',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Aurelia Priskila Setiady', nickname:'Ayen', gender:'female', rawDate:'Jakarta, 9 Maret 2004',
    phone:'089529123065', address:'Jl. Jelambar Fajar no. 44 Gang Litanza RT.001/RW.006 Jakarta',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'belum', status:'active' },

  // ── B ──────────────────────────────────────────────────────────────────────
  { name:'Bace Ledy Maitimu', nickname:'Bace', gender:'female', rawDate:'Desa Leahari, 30 Desember 1979',
    phone:'082399121145', address:'Serpong, topas raya',
    maritalStatus:'Janda', ibadah:['IR'], pelayan:['Usher'], baptismStatus:'sudah', status:'active' },

  { name:'Beny', nickname:'Abok', gender:'male', rawDate:'Bagansiapiapi, 28 September 1973',
    phone:'08161147833', address:'Villa Tangerang Blok JI Pinus 8 Blok E10 No 2',
    maritalStatus:'Menikah', ibadah:['IR','ABI'], baptismStatus:'sudah', status:'active' },

  { name:'Budi Harmanto', nickname:'Budi/Lele', gender:'male', rawDate:'Jakarta, 15 Januari 1971',
    phone:'08111315699', address:'Jelambar Barat II G No. 457 A',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher','Pengurus Kowari'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Sumianti',
    children:[
      { name:'Nicholas Harmanto', birthDate:'2004-11-03' },
      { name:'Keisha Harmanto', birthDate:'2006-07-07' },
      { name:'Caitlin NH', birthDate:'2015-01-09' },
    ] },

  { name:'Sumianti', nickname:'Sumy', gender:'female', rawDate:'BAA, 8 November 1976',
    phone:'08161314526', address:'Jelambar Barat II G No. 457 A',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher','Pengurus Kowari'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Budi Harmanto',
    children:[
      { name:'Nicholas Harmanto', birthDate:'2004-11-03' },
      { name:'Keisha Harmanto', birthDate:'2006-07-07' },
      { name:'Caitlin NH', birthDate:'2015-01-09' },
    ] },

  // ── C ──────────────────────────────────────────────────────────────────────
  { name:'Charles Pramudana', nickname:'Charles', gender:'male', rawDate:'Jakarta, 26 April 1990',
    phone:'081286865818', address:'Duri utara 1 no.8 rt.008/03',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Usher'], baptismStatus:'sudah', status:'active',
    spouseName:'Christiany',
    children:[ { name:'Quianna Callista Pramudana', birthDate:'2023-03-23' } ] },

  { name:'Christiany', nickname:'Christin', gender:'female', rawDate:'Jakarta, 11 Januari 1993',
    phone:'085691948846', address:'Jl. Jelambar Fajar Jalan B No. 29 Rt. 002/017',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'], baptismStatus:'sudah', status:'active',
    spouseName:'Charles Pramudana',
    children:[ { name:'Quianna Callista Pramudana', birthDate:'2023-03-23' } ] },

  { name:'Christine Vebrian', nickname:'Siu Mei', gender:'female', rawDate:'Jakarta, 9 November 2004',
    phone:'082151409695', address:'Jln. Jelambar Barat III Gg. Warga Jaya No. 31',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'belum', status:'active' },

  { name:'Christopher Alexander', nickname:'Christ', gender:'male', rawDate:'Jakarta, 2 November 1998',
    phone:'08953360000000', address:'Jl. Goa Raya No. 7, Perumnas 3 Karawaci, Tangerang',
    maritalStatus:'Single', ibadah:['IR','PBI','RBI'], baptismStatus:'sudah', status:'active' },

  // ── D ──────────────────────────────────────────────────────────────────────
  { name:'Daud Handrian', nickname:'Daud', gender:'male', rawDate:'Jakarta, 23 November 1999',
    phone:'089657979876', address:'Jl. Aladin, Gang Timbul No. 10',
    maritalStatus:'Single', ibadah:['IR','ABI','RBI','PBI'], pelayan:['Pemuji','Pemusik'],
    baptismStatus:'sudah', status:'active' },

  { name:'Debora Riani Oktavia', nickname:'Debora', gender:'female', rawDate:'Jakarta, 09 Oktober 2003',
    phone:'081290101810', address:'Jl. Jelambar Aladin No.17A gang O RT.005/RW.06',
    maritalStatus:'Single', ibadah:['IR','ABI','RBI','PBI'], baptismStatus:'belum', status:'active' },

  { name:'Djong-shi ing', nickname:'Shi Jing', gender:'female', rawDate:'Jakarta, 10 Oktober 1981',
    phone:'08787799856', address:'Kelapa sawit 19 bh 9 no 16',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Damli Husni', nickname:'Damli', gender:'male', rawDate:'BAA, 10 Maret 1979',
    phone:'087782790903', address:'Jelambar Aladin, JII No. 1A, RT008 RW006',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Perjamuan Kudus'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Retna Angriany' },

  { name:'Retna Angriany', nickname:'Retna', gender:'female', rawDate:'Jakarta, 9 Juni 1980',
    phone:'081703760400', address:'Jelambar Aladin, JII No. 1A, RT008 RW006',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Damli Husni',
    children:[ { name:'Michelle Allegra', birthDate:'2013-07-23' } ] },

  { name:'Djoni', nickname:'Joni', gender:'male', rawDate:'BAA, 21 Mei 1971',
    phone:'08161808074', address:'Jelambar Aladin JL. I/29B, Rt 008 Rw 006, Jakut 14450',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  // ── E ──────────────────────────────────────────────────────────────────────
  { name:'Eklesia Anastasya', nickname:'Ekle/Key', gender:'female', rawDate:'Jakarta, 13 Agustus 2007',
    phone:'0895402527050', address:'Jalan I Gang E No.34',
    maritalStatus:'Single', ibadah:['ABI','RBI','IR'], pelayan:['Pengurus ABI'],
    baptismStatus:'sudah', status:'active' },

  { name:'Elizabeth Wati', nickname:'Wati', gender:'female', rawDate:'Jakarta, 21 Juni 1979',
    phone:'(+1) 6477797509', address:'Canada',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Elizabeth Frisca Widyanti', nickname:'Frisca', gender:'female', rawDate:'Jakarta, 29 Maret 1990',
    phone:'082299962903', address:'Jelambar Fajar No. 38 RT004/RW006',
    maritalStatus:'Janda', ibadah:['IR'], pelayan:['Usher'], baptismStatus:'belum', status:'active' },

  { name:'Vincentius', nickname:'Vincent', gender:'male', rawDate:'Singkawang, 8 Desember 1989',
    phone:'081223111336', address:'Gang. Balok IV No.37, Duri Utara, Tambora',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Elsye Alianita', nickname:'Elsye', gender:'female', rawDate:'Jakarta, 5 September 1976',
    phone:'081288520344', address:'Kampung Bojong Renged no. 6 RT009/RW04, Kontrakan Haji S',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  { name:'Elvina', nickname:'Vina', gender:'female', rawDate:'Jakarta, 14 Oktober 1992',
    phone:'087884895201', address:'Komp garuda blok E8 no.19',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Tamborin'],
    baptismStatus:'sudah', status:'active' },

  { name:'Erfina', nickname:'Fina', gender:'female', rawDate:'Jakarta, 29 Oktober 1991',
    phone:'087780366076', address:'Perumahan palmaserano A8, Jl.jati Cengkareng',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Erni', nickname:'Lina', gender:'female', rawDate:'Jakarta, 1 Agustus 1978',
    phone:'085780025775', address:'Jl. Jelambar Fajar No. 46 RT 006/No. 47',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Emawati Sunarto', nickname:'Erce', gender:'female', rawDate:'Jakarta, 26 November 1950',
    address:'Jelambar Aladin no.31 Rt.006/006',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], baptismStatus:'sudah', status:'active' },

  { name:'Enty Effendi', nickname:'Enty', gender:'female', rawDate:'Jakarta, 5 April 1978',
    phone:'088989034113', address:'Jl. D no.75 Rt.009/006',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Erti Surianti', nickname:'Narti', gender:'female', rawDate:'Jakarta, 12 Juli 1947',
    phone:'081311454215', address:'Jelambar aladin no.48 Rt.6/06',
    maritalStatus:'Janda', ibadah:['IR','WBI'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  { name:'Eva Ratnasari', nickname:'Eva', gender:'female', rawDate:'Jakarta, 22 Mei 1983',
    phone:'081286050077', address:'Jl. Bukit Golf X blok QG5 /9. Cluster Garcia, Modernland Tangerang',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Tamborin'],
    baptismStatus:'sudah', status:'active' },

  { name:'Eva Yani Rogawanti Siwahessy', nickname:'Eva', gender:'female', rawDate:'Jakarta, 20 Januari 1976',
    phone:'081399960333', address:'Jl. Kamp. Gusti Pintu Air Rt.002/015 No 15',
    maritalStatus:'Janda', ibadah:['IR','RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Evi', nickname:'Evi', gender:'female', rawDate:'Jakarta, 17 Maret 1990',
    phone:'081285186004', address:'Jelambar aladin no.57 Rt.007/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Edyna', nickname:'Lina', gender:'female', rawDate:'Pontianak, 10 Maret 1969',
    phone:'081806708046', address:'Jelambar fajar, Jl. D Gg. R no.72 Rt.011/017',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Eddy Susanto', nickname:'Ko Alim', gender:'male', rawDate:'Jakarta, 3 Agustus 1949',
    address:'Jelambar aladin no.30 Rt.06/06',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Efendi', nickname:'Fendi', gender:'male', rawDate:'Jakarta, 17 April 1967',
    phone:'0895355642748', address:'Jembatan Gambang II Gg. B 3/62 Rt.015/001 Jakarta 14450',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Egan Shan Jeremiah', nickname:'Egan/Egen', gender:'male', rawDate:'Jakarta, 22 November 2008',
    phone:'082114291883', address:'Jl. D no.75 Rt.009/006',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Eman', nickname:'Eman', gender:'male', rawDate:'Jakarta, 26 September 1974',
    phone:'085811093622', address:'Kapuk, Jl. H Jajri Rt.15/12',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  // ── F ──────────────────────────────────────────────────────────────────────
  { name:'Fabianto Edysa', nickname:'Aan', gender:'male', rawDate:'Medan, 13 Maret 1966',
    phone:'083870666679', address:'Jl. Jelambar fajar RT.04/RW.06 no. 47',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Ester Rita', nickname:'Rita', gender:'female', rawDate:'Medan, 13 Maret 1966',
    phone:'083893131117', address:'Jl. Jembatan besi',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Fany Lontoh', nickname:'Fany', gender:'female', rawDate:'Jakarta, 8 Agustus 1979',
    phone:'08161816428', address:'Komplek Mulia Dharma, Jalan D Blok A No. 33, Jakarta Utara 14',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    children:[ { name:'Celine Angelina', birthDate:'2015-08-21' } ] },

  { name:'Febby Wairissal', nickname:'Febby', gender:'female', rawDate:'Ambon, 06 Februari 1966',
    phone:'081617178098', address:'Jl. Goa Raya no.7 Perum 3 Karawaci Tangerang',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Febiyana Fransisca', nickname:'Febi', gender:'female', rawDate:'Jakarta, 1 Februari 1981',
    phone:'082114071715', address:'Kampung gusti Rt,002/015',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Fellyani', nickname:'Felly', gender:'female', rawDate:'Jakarta, 8 Juli 1995',
    phone:'08788282837', address:'Jl. Jelambar Ilir No. 15A RT.012 RW.010 Kelurahan Jelambar',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Fitri Elizabeth', nickname:'Fitri', gender:'female', rawDate:'Bandung, 23 Februari 1994',
    phone:'081299239962', address:'Jl. Jelambar Aladin, Jln. 1 No. 67A',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Ferry Fernando', nickname:'Ferry', gender:'male', rawDate:'Jakarta, 3 Mei 2001',
    phone:'082124118582', address:'Taman Palem Lestari, blok Cs no.2A',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Multimedia Produksi','Multimedia Weekly News'],
    baptismStatus:'sudah', status:'active' },

  // ── G ──────────────────────────────────────────────────────────────────────
  { name:'Gabriella Mattilda', nickname:'Bella', gender:'female', rawDate:'Jakarta, 1 Juli 1999',
    phone:'087877443733', address:'Jl. Kampung Gusti RT/RW: 002/015 No.15',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Gabriella Kristasya', nickname:'Gaby', gender:'female', rawDate:'Jakarta, 20 Maret 1997',
    phone:'083873371997', address:'Jelambar aladin no.14A Gg. o Rt.005/06',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Tamborin'],
    baptismStatus:'sudah', status:'active' },

  { name:'Grace Finny', nickname:'Finny', gender:'female', rawDate:'Jakarta, 18 Januari 1985',
    phone:'089684239532', address:'Jelambar JLD GG.R No.61 RT.011/017',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Gerry Dermawan', nickname:'Gerry', gender:'male', rawDate:'Jakarta, 4 Februari 2002',
    phone:'081284849822', address:'Jl. Jelambar Aladin no.29',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Multimedia Produksi','Multimedia Weekly News'],
    baptismStatus:'sudah', status:'active' },

  { name:'Gouw Tjit Nio', nickname:'Cicit', gender:'female', rawDate:'Jakarta, 30 Juli 1961',
    phone:'087781890588', address:'Taman Semanan indah C 4/5 rt.06/012',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Gouw Ester Yulia', nickname:'Ester', gender:'female', rawDate:'Jakarta, 17 September 1974',
    phone:'085697209138', address:'Gg. U no.38 Rt.09/017',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], baptismStatus:'sudah', status:'active' },

  { name:'Gouw Tjui Lian', nickname:'Iyan', gender:'male', rawDate:'Palembang, 11 Februari 1960',
    phone:'081932555636', address:'Jelambar Aladin No. 75',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Sukandi Aminah',
    children:[
      { name:'Yudi Sukandi' }, { name:'Yusman Sukandi' }, { name:'Julliyanah' }, { name:'Yosef' }, { name:'Yuheni' }
    ] },

  { name:'Gouw Tjullies', nickname:'Elly', gender:'female', rawDate:'Jakarta, 9 Maret 1973',
    phone:'089653535542', address:'Serpong, villa tekno',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], pelayan:['Tim Kunjungan','Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  // ── H ──────────────────────────────────────────────────────────────────────
  { name:'Hadi Susanto', nickname:'Hadi', gender:'male', rawDate:'Sungailiat, 28 Oktober 1967',
    phone:'08111137289', address:'Duta Garden square Blok G Nomor 19, Tangerang',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher','Perjamuan Kudus'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Elizabeth Damaira',
    children:[
      { name:'Matthew Marvel Liputra', birthDate:'2003-03-15' },
      { name:'Maryellen Eunike', birthDate:'2005-06-25' },
    ] },

  { name:'Elizabeth Damaira', nickname:'Ping-ping/Eli', gender:'female', rawDate:'Jakarta, 27 Januari 1972',
    phone:'081807754691', address:'Duta Garden square Blok G Nomor 19, Tangerang',
    maritalStatus:'Menikah', ibadah:['IR','ABI','KOMPAS'], pelayan:['Usher','Pengurus ABI','Perjamuan Kudus'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Hadi Susanto',
    children:[
      { name:'Matthew Marvel Liputra', birthDate:'2003-03-15' },
      { name:'Maryellen Eunike', birthDate:'2005-06-25' },
    ] },

  { name:'Matthew Marvel Liputra', nickname:'Matthew', gender:'male', rawDate:'Jakarta, 15 Maret 2003',
    phone:'08197871819', address:'Duta Garden square Blok G Nomor 19, Tangerang',
    maritalStatus:'Single', ibadah:['RBI','IR'], pelayan:['Pemuji','Pemusik','Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Maryellen Eunike', nickname:'Elin', gender:'female', rawDate:'Jakarta, 25 Juni 2005',
    phone:'087877661161', address:'Duta Garden square Blok G Nomor 19, Tangerang',
    maritalStatus:'Single', ibadah:['ABI','RBI','IR'], pelayan:['Tamborin','Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Handy Susanto', nickname:'Santo/Anto', gender:'male', rawDate:'Jakarta, 10 Agustus 1993',
    phone:'081314416252', address:'Jl. Jelambar Ilir No. 15A RT.012 RW.010 Kelurahan Jelambar B',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Haryanti', nickname:'Yanti', gender:'female', rawDate:'Jakarta, 2 Juni 1971',
    phone:'08994683178', address:'Jembatan Gambang II Gg. B 3/62 Rt.015/001 Jakarta 14450',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Haryani', nickname:'Ani', gender:'female', rawDate:'Jakarta, 25 November 1973',
    phone:'085216153675', address:'komplek billymoon jl. Kelapa sawit x blok k3/14',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Helmi Bonefesius Ditiolebit', nickname:'Helmi', gender:'male', rawDate:'Ambon, 18 Juni 1988',
    phone:'081806042004', address:'Komp garuda blok F8 no.19',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Heli Tjenurdin', nickname:'Heli', gender:'female', rawDate:'Sungailiat, 8 Februari 1951',
    phone:'087749840087', address:'Jelambar selatan 2 no.b3',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Toni Wongso' },

  { name:'Hendrik Faisal', nickname:'Hendrik', gender:'male', rawDate:'Sambas, 24 Juli 1972',
    phone:'081514468719', address:'Jl. H. Jairi No.13b Rt.015/012 Kapuk',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    children:[
      { name:'Sheren Danella Jieandy', birthDate:'1998-01-02' },
      { name:'Jesslyn Danella Jieandy', birthDate:'2002-08-02' },
      { name:'Fallyn Danella Jieandy', birthDate:'2004-12-27' },
    ] },

  { name:'Lise Suwati', nickname:'Lise', gender:'female', rawDate:'Belawan, 3 Oktober 1974',
    phone:'085779323280', address:'Jl. H. Jairi No.13b Rt.013/012 Kapuk',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Hendrik Faisal',
    children:[
      { name:'Sheren Danella Jieandy', birthDate:'1998-01-02' },
      { name:'Jesslyn Danella Jieandy', birthDate:'2002-08-02' },
      { name:'Fallyn Danella Jieandy', birthDate:'2004-12-27' },
    ] },

  { name:'Hendha Agusthyna', nickname:'Chu-chu/Agustina', gender:'female', rawDate:'Jakarta, 17 Agustus 1971',
    phone:'089526458798', address:'Poris gaga indah, cluster permata blok G1 no.7E',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Hendri', nickname:'Hendri', gender:'male', rawDate:'Jakarta, 7 September 1978',
    phone:'0818197356', address:'Jelambar aladin no.80A Rt.004/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Tri Wahyuni', birthDate:'1983-07-06' },
      { name:'Eva Yuliana', birthDate:'1985-07-28' },
    ] },

  { name:'Hendrawan', nickname:'Hendrawan', gender:'male', rawDate:'Jakarta, 6 November 1968',
    phone:'081285226322', address:'Jl. Kapuk poglar no.31 rt.4/4',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Lie Djun',
    children:[
      { name:'Widya Laurenz', birthDate:'1999-07-16' },
      { name:'Samuel Winata', birthDate:'2002-11-20' },
    ] },

  { name:'Lie Djun', nickname:'Lie Djun', gender:'female', rawDate:'Jakarta, 1 September 1972',
    phone:'085888895822', address:'Jl. Kapuk poglar no.31 rt.4/4',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Hendrawan',
    children:[
      { name:'Widya Laurenz', birthDate:'1999-07-16' },
      { name:'Samuel Winata', birthDate:'2002-11-20' },
    ] },

  { name:'Widya Laurenz', nickname:'Widya/Wiwid', gender:'female', rawDate:'Jakarta, 16 Juli 1999',
    phone:'087888280860', address:'Jl. Kapuk poglar no.31 rt.4/4',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Samuel Winata', nickname:'Samuel', gender:'male', rawDate:'Jakarta, 20 November 2002',
    phone:'085781391026', address:'Jl. Kapuk poglar no.31 rt.4/4',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Harsih', nickname:'Harsi', gender:'male', rawDate:'Semarang, 12 Agustus 1976',
    phone:'087888902957', address:'Pedongkelan belakang no.22 Rt.12/13',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Herlandi Setiawan', nickname:'Andi', gender:'male', rawDate:'Jakarta, 3 Oktober 1995',
    phone:'081290779458', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Hervy Setiawan', nickname:'Hervy/Vivy', gender:'male', rawDate:'Jakarta, 8 April 1987',
    phone:'083890146381', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active' },

  { name:'Herlia Setiawan', nickname:'Lia', gender:'female', rawDate:'Jakarta, 13 Maret 1992',
    phone:'085810820899', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  // ── I ──────────────────────────────────────────────────────────────────────
  { name:'Ida Widianingsih', nickname:'Ida', gender:'female', rawDate:'Jakarta, 1 September 1974',
    phone:'0895629851100', address:'Jelambar fajar no.46 RT.001/006',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], baptismStatus:'sudah', status:'active' },

  { name:'Indra', nickname:'Indra', gender:'male', rawDate:'Jakarta, 6 Maret 1981',
    phone:'08176768192', address:'Teluk Gong No.44 BT 003/017',
    maritalStatus:'Menikah', ibadah:['IR','ABI'], baptismStatus:'sudah', status:'active' },

  { name:'Irma Oktavia', nickname:'Anna', gender:'female', rawDate:'Jakarta, 12 November 1990',
    phone:'081314211273', address:'Jl. Jelambar Ilir No. 15A RT.012 RW.010 Kelurahan Jelambar B',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Ismariya Ticoalu', nickname:'Iis/Ismaria', gender:'female', rawDate:'Jakarta, 5 Mei 1961',
    phone:'085782158020', address:'Jl. Aladin, Gang Timbul No. 10 rt.009/06',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Tim Doa','Tim Kunjungan'],
    baptismStatus:'sudah', status:'active',
    children:[
      { name:'Sarah', birthDate:'1980-05-19' },
      { name:'MAngku' }, { name:'Naomi Natalia', birthDate:'1988-12-14' }, { name:'Daud', birthDate:'1999-11-23' }
    ] },

  // ── J ──────────────────────────────────────────────────────────────────────
  { name:'Janti', nickname:'Noni', gender:'female', rawDate:'Bangka, 7 Mei 1959',
    address:'Gg. Timbul no.13 rt.9/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Jafar Arifin Barus', nickname:'Apin', gender:'male', rawDate:'Kaban Jahe sumut, 30 Agustus 1964',
    phone:'081321085508', address:'Tangerang',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Kries Aryanto', birthDate:'1995-08-01' },
      { name:'Daniel Januarta', birthDate:'2003-01-09' },
      { name:'Albert Willyanto', birthDate:'2004-04-02' },
      { name:'Gracia', birthDate:'2015-02-14' },
    ] },

  { name:'Jeremy Susanto', nickname:'Jeremy', gender:'male', rawDate:'Jakarta, 7 April 1992',
    phone:'085175078892', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[ { name:'Marson Jlo Voresta', birthDate:'2017-08-07' } ] },

  { name:'Jesslyn Danella Jieandy', nickname:'Jesslyn', gender:'female', rawDate:'Jakarta, 2 Agustus 2002',
    phone:'085885599468', address:'Jl. H. Jairi No.13b Rt.015/012 Kapuk',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Multimedia Weekly News'],
    baptismStatus:'sudah', status:'active' },

  { name:'Jerry Andrian Gerrard', nickname:'Jerry', gender:'male', rawDate:'Jakarta, 10 Juni 2006',
    phone:'081717141766', address:'Jl. Jelambar Aladin',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'belum', status:'active' },

  { name:'Jericho Benedict Ng.', nickname:'Jeri', gender:'male', rawDate:'Jakarta, 30 Januari 2011',
    phone:'088225897281', address:'JL. I No.56 Komp Fajar permai',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Jesica Siwabessy', nickname:'Ica', gender:'female', rawDate:'Jakarta, 5 Juni 1997',
    phone:'081385295544', address:'Kampung Gusti No. 15, RT002/RW015',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Edrick Siwabessy', nickname:'Edrick', gender:'male', rawDate:'Jakarta, 22 Juni 2004',
    phone:'087868524179', address:'Kampung Gusti No. 15, RT002/RW015',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Selly Siwabessy', nickname:'Selly', gender:'female', rawDate:'Ambon, 21 September 1965',
    address:'Kampung Gusti No. 15, RT002/RW015',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Jofanny', nickname:'Jojo', gender:'female', rawDate:'Jakarta, 22 Juni 1998',
    phone:'085810204690', address:'Melati mas GG 13',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Johan Halim', nickname:'Johan', gender:'male', rawDate:'',
    address:'Kapuk, Gg tembok',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Yunia Sari' },

  { name:'Yunia Sari', nickname:'Yuni', gender:'female', rawDate:'Jakarta, 6 Juni 1996',
    phone:'089620331995', address:'Kapuk, Gg tembok',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Johan Halim' },

  { name:'Johanes Hary Teja', nickname:'Heri', gender:'male', rawDate:'Jakarta, 16 September 1975',
    phone:'087782965272', address:'Komplek fajar permai, jl.i no.56 CN',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Veny Parisah',
    children:[
      { name:'Nathanael Teja', birthDate:'2004-04-21' },
      { name:'Nelson Teja', birthDate:'2007-01-15' },
    ] },

  { name:'Veny Parisah', nickname:'Veny', gender:'female', rawDate:'Jakarta, 3 Desember 1979',
    phone:'081932613779', address:'Komplek fajar permai, jl.i no.56 CN',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Johanes Hary Teja',
    children:[
      { name:'Nathanael Teja', birthDate:'2004-04-21' },
      { name:'Nelson Teja', birthDate:'2007-01-15' },
    ] },

  { name:'Nathanael Teja', nickname:'Nael', gender:'male', rawDate:'Jakarta, 21 April 2004',
    phone:'0812111300579', address:'Komplek fajar permai, jl.i no.56 CN',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Nelson Teja', nickname:'Nelson', gender:'male', rawDate:'Jakarta, 15 Januari 2007',
    phone:'081908818206', address:'Komplek fajar permai, jl.i no.56 CN',
    maritalStatus:'Single', ibadah:['IR','PBI'], pelayan:['Paduan Suara','Pemuji','Pemusik','Sound Audio'],
    baptismStatus:'sudah', status:'active' },

  { name:'Jonathan', nickname:'Jonathan', gender:'male', rawDate:'Jakarta, 30 Mei 1989',
    phone:'081291029924', address:'Perum alam indah blok L3 no.11 cipondoh',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Jonathan Arya S.', nickname:'Jojo', gender:'male', rawDate:'Jakarta, 18 September 2009',
    phone:'087888902957', address:'Pedongkelan belakang no.22 Rt.12/13',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Jong Foe Joen', nickname:'Puyun', gender:'male', rawDate:'Jakarta, 9 Januari 1947',
    address:'Fajar Gg. J Rt.001/017',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Josua Triputra', nickname:'Josua', gender:'male', rawDate:'Jakarta, 8 Maret 1993',
    phone:'082226029035', address:'Jl. Sukarela no.1F rt.005/009',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Merlin Kusuma',
    children:[ { name:'Moses Linardi', birthDate:'2021-01-28' } ] },

  { name:'Merlin Kusuma', nickname:'Merlin', gender:'female', rawDate:'Jakarta, 3 Maret 1993',
    phone:'081806722110', address:'Jl. Sukarela no.1F rt.005/009',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Josua Triputra',
    children:[ { name:'Moses Linardi', birthDate:'2021-01-28' } ] },

  { name:'Josiane', nickname:'Josi', gender:'female', rawDate:'Jakarta, 23 Desember 1991',
    phone:'085846441377', address:'Melati mas blok G',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Seno Susilo',
    children:[
      { name:'Josse Manuel Linardi', birthDate:'2016-07-22' },
      { name:'Richie Manuel Linardi', birthDate:'2018-10-18' },
    ] },

  { name:'Juan Rizki Hasiholan Perdomuan Sitorus', nickname:'Juan', gender:'male', rawDate:'Sikakap, 4 Juni 1998',
    phone:'081510081903', address:'Porsea',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'belum', status:'active' },

  { name:'Julliyanah', nickname:'Yana', gender:'female', rawDate:'Jakarta, 6 Juni 1986',
    phone:'081908058866', address:'Jelambar aladin no.75',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Violet Octavia', birthDate:'2010-01-18' },
      { name:'Felix Dominick', birthDate:'2015-01-29' },
    ] },

  { name:'Benny Gunawan', nickname:'Akiun', gender:'male', rawDate:'Jakarta, 18 Mei 1986',
    phone:'081908000559', address:'Jelambar Aladin No. 75',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Julliyanah',
    children:[
      { name:'Violet Octavia', birthDate:'2010-01-18' },
      { name:'Felix Dominick', birthDate:'2015-01-29' },
    ] },

  // ── K ──────────────────────────────────────────────────────────────────────
  { name:'Kan Maikel', nickname:'Maikel', gender:'male', rawDate:'Jakarta, 8 Maret 1981',
    phone:'085107040800', address:'grand poris AB3 no.30 cipondoh',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Christine Chateline' },

  { name:'Christine Chateline', nickname:'Christine', gender:'female', rawDate:'Purwokerto, 3 Oktober 1988',
    phone:'082299436640', address:'grand poris AB3 no.30 cipondoh',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Kan Maikel' },

  { name:'Karlin Apliani Suharly', nickname:'Karlin', gender:'female', rawDate:'Jakarta, 10 April 2005',
    phone:'087880917452', address:'Serpong, villa tekno',
    maritalStatus:'Single', ibadah:['IR','RBI'], pelayan:['Tamborin'],
    baptismStatus:'sudah', status:'active' },

  { name:'Kasmiyati', nickname:'Arni', gender:'female', rawDate:'Kebumen, 25 April 1970',
    phone:'087878927056', address:'Kampung Gusti No. 15, RT002/RW015',
    maritalStatus:'Janda', ibadah:['IR','KOWARI'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Keisha Harmanto', nickname:'Keisha', gender:'female', rawDate:'Jakarta, 7 Juli 2006',
    phone:'08161314526', address:'Jelambar Barat II G No. 457 A',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Kho Lan Sen', nickname:'Iyong', gender:'male', rawDate:'Jakarta, 25 Juli 1958',
    phone:'085932973621', address:'Gg. Lili no.9 4/7',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Kim Ian Listijani', nickname:'Hana', gender:'female', rawDate:'Pekalongan, 9 Desember 1967',
    phone:'081284298636', address:'Jelambar Aladin Gang O, RT05/RW06 No 17A, Kecamatan Penjaringan Kelurahan pejagalan Jak utara 14450',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Kiki Kurniawan', nickname:'Kiki', gender:'male', rawDate:'Jakarta, 1 Maret 2006',
    phone:'081368776292', address:'Jl. aladin baru no.5 Rt.9/06',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Kok Sie On', nickname:'Si On', gender:'male', rawDate:'Pontianak, 9 November 1949',
    phone:'0216670812', address:'Jl. ino.10 rt.008/06',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Koo Jin Lan', nickname:'Ibu Imawan', gender:'female', rawDate:'14 September 1947',
    phone:'0818815081', address:'Jelambar Barat 3, Gg Setia Warga 8 No. 38',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Kurniawan', nickname:'Iwan', gender:'male', rawDate:'Jakarta, 10 Mei 1976',
    phone:'08128439079', address:'Jl. Jelambar Aladin Rt.006/006 Jakarta Utara 14450',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Kurniawan S.', nickname:'Kurniawan/Keng Xiang', gender:'male', rawDate:'Jakarta, 2 Mei 1963',
    phone:'087780167989', address:'Melati mas blok G',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Rebeka Hendrawati',
    children:[
      { name:'Jonathan', birthDate:'1989-05-30' },
      { name:'Josiane', birthDate:'1991-12-23' },
      { name:'Josua Triputra', birthDate:'1993-03-08' },
      { name:'Jofanny', birthDate:'1998-06-22' },
    ] },

  { name:'Rebeka Hendrawati', nickname:'Rebeka', gender:'female', rawDate:'Jakarta, 28 September 1966',
    phone:'08176009288', address:'Melati mas blok G',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Kurniawan S.',
    children:[
      { name:'Jonathan', birthDate:'1989-05-30' },
      { name:'Josiane', birthDate:'1991-12-23' },
      { name:'Josua Triputra', birthDate:'1993-03-08' },
      { name:'Jofanny', birthDate:'1998-06-22' },
    ] },

  // ── L ──────────────────────────────────────────────────────────────────────
  { name:'Larry Prasetyo', nickname:'Larry', gender:'male', rawDate:'Brebes, 25 Maret 2006',
    phone:'081319868036', address:'Jelambar aladin No. 75 rt.7/06',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'belum', status:'active' },

  { name:'Laura Fischa', nickname:'Laura', gender:'female', rawDate:'Jakarta, 17 April 2005',
    phone:'087727381814', address:'Jln. Jelambar Aladin',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Lena Christian', nickname:'Lena', gender:'female', rawDate:'Jakarta, 29 Desember 1971',
    phone:'087784234549', address:'Jl. Kp gusti gg kantong Rt 005/015 No. 23',
    maritalStatus:'Janda', ibadah:['IR','KOWARI'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Lenasari', nickname:'Lena', gender:'female', rawDate:'BAA, 10 Juli 1978',
    phone:'087882745278', address:'Jelambar aladin no.80A Rt.004/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Leoni Muliawati', nickname:'Yoni', gender:'female', rawDate:'Jakarta, 18 Agustus 1970',
    phone:'085172476598', address:'Vila Taman Bandara Blok C 7 No. 15',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Liana', nickname:'Liana', gender:'female', rawDate:'Jakarta, 2 September 1983',
    phone:'087885051229', address:'Jl. I GG.Fajar RT.002/017 no.25 A',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara','Tamborin'],
    baptismStatus:'sudah', status:'active' },

  { name:'Lianna', nickname:'Lianna', gender:'female', rawDate:'Jakarta, 10 Oktober 1991',
    phone:'081993667689', address:'Jl.I gg. E',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Lidia Araiyani', nickname:'Arai', gender:'female', rawDate:'Jakarta, 2 Mei 1994',
    phone:'081296385590', address:'Villa Taman Bandara Blok C 7 No. 15',
    maritalStatus:'Single', ibadah:['IR','ABI'], pelayan:['Pengurus ABI'],
    baptismStatus:'sudah', status:'active' },

  { name:'Lidia Fransina Latumahina', nickname:'Lidia', gender:'female', rawDate:'Kupang, 01 Februari 1970',
    phone:'081384982679', address:'Jl. Petamburan VII KP17 No.11, Jakarta Pusat.',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Lie Bon Nio', nickname:'Lina', gender:'female', rawDate:'Tangerang, 15 Mei 1948',
    address:'jelambar aladin no 32 rt.06/06',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], baptismStatus:'sudah', status:'active' },

  { name:'Lie Bon Nie', nickname:'Boni', gender:'female', rawDate:'Tangerang, 10 Mei 1951',
    address:'Perumahan citra garden 2 blok G8 no.11',
    maritalStatus:'Janda', ibadah:['IR','WBI'], baptismStatus:'sudah', status:'active' },

  { name:'Lie Djun', nickname:'Lie Djun', gender:'female', rawDate:'Jakarta, 1 September 1972',
    phone:'085888895822', address:'Jl. Kapuk poglar no.31 rt.4/4',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lie Jimmy Kusuma', nickname:'Jimmy', gender:'male', rawDate:'Jakarta, 1 Oktober 1983',
    phone:'081288127799', address:'RSB Blok Cempaka Lt 4 No. 6, RT 014/06, Tanah pasir',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Elsa Kusuma', birthDate:'2005-10-15' },
      { name:'Emmanuel Felix Kusuma', birthDate:'2013-08-01' },
      { name:'Ellen Manuela Kusuma', birthDate:'2017-02-14' },
    ] },

  { name:'Liem Lie Jin', nickname:'Yeyen', gender:'female', rawDate:'Jakarta, 10 Juli 1961',
    phone:'087881863888', address:'Fajar Gg. damai no.22 Rt.03/07',
    maritalStatus:'Janda', ibadah:['IR','WBI'], baptismStatus:'sudah', status:'active' },

  { name:'Like', nickname:'Like', gender:'female', rawDate:'Jakarta, 27 September 1980',
    phone:'085885200001', address:'Green Court, Jl. Caliandra I No. 50',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Tamborin'],
    baptismStatus:'sudah', status:'active',
    children:[
      { name:'Leonard Christopher Lie', birthDate:'2015-10-29' },
      { name:'Nadia Victoria Lie', birthDate:'2020-01-03' },
    ] },

  { name:'Lim Giok Hwa', nickname:'Giokhwa', gender:'female', rawDate:'Palembang, 20 Agustus 1951',
    phone:'081280856304', address:'Gg. Timbul no.37 Rt.009/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lim Goat Ho', nickname:'Guat', gender:'female', rawDate:'BAA, 19 Mei 1940',
    address:'Komplek fajar permai, jl.i no.56 CN',
    maritalStatus:'Janda', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Lim Hendra', nickname:'Herman', gender:'male', rawDate:'Jakarta, 27 April 1983',
    phone:'081382913448', address:'Jl. Kiara payung barat 3 no.25, Ciledug',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Sanny Theresia',
    children:[
      { name:'Audrey Lim', birthDate:'2016-05-30' },
      { name:'Anata Lim', birthDate:'2023-01-14' },
    ] },

  { name:'Sanny Theresia', nickname:'Sanny', gender:'female', rawDate:'Medan, 2 September 1987',
    phone:'087782429796', address:'Jl. Kiara payung barat 3 no.25, Ciledug',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Lim Hendra',
    children:[
      { name:'Audrey Lim', birthDate:'2016-05-30' },
      { name:'Anata Lim', birthDate:'2023-01-14' },
    ] },

  { name:'Lim Kim Lan', nickname:'Kim Lan', gender:'female', rawDate:'Jakarta, 24 November 1955',
    phone:'081384078874', address:'Mutiara taman palem lestari d3/27 cengkareng',
    maritalStatus:'Janda', ibadah:['IR','KOWARI'], baptismStatus:'sudah', status:'active' },

  { name:'Limaryati Darsono', nickname:'Maryati', gender:'female', rawDate:'BAA, 6 Februari 1943',
    address:'Komplek fajar permai JL. I no.56CN',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Limei', nickname:'Limei', gender:'female', rawDate:'Jakarta, 31 Mei 1982',
    phone:'083873657828', address:'Jelambar kebun pala no.16 Rt.02/07',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Tjin Tjeng',
    children:[ { name:'Junihardi', birthDate:'2003-06-16' } ] },

  { name:'Tjin Tjeng', nickname:'Aceng', gender:'male', rawDate:'Jakarta, 15 Mei 1969',
    phone:'083870831278', address:'Jelambar kebun pala no.16 Rt.02/07',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Limei',
    children:[ { name:'Junihardi', birthDate:'2003-06-16' } ] },

  { name:'Junihardi', nickname:'Hardi', gender:'male', rawDate:'Jakarta, 16 Juni 2003',
    phone:'085693601950', address:'Jelambar kebun pala no.16 Rt.02/07',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lin Khie', nickname:'Lin Khie', gender:'female', rawDate:'Jakarta, 8 Juli 1976',
    phone:'081316109678', address:'Jl. mushola dalam blok b8 no.16 Rt.02/07',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Linda', nickname:'Linda', gender:'female', rawDate:'Jakarta, 15 Mei 1990',
    phone:'081286097686', address:'Fleekhouz H20-15',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lingsi', nickname:'Lingsi', gender:'female', rawDate:'Panipahan, 10 Maret 1979',
    phone:'081787784228', address:'Gg Timbul No.8 Rt.09/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lina Gunawan', nickname:'Lina', gender:'female', rawDate:'Jakarta, 28 Februari 1974',
    phone:'089509572758', address:'Kampung Gusti Kb Sayur 08/014',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lie Tjin', nickname:'Liang Cin', gender:'male', rawDate:'Jakarta, 2 Oktober 1961',
    phone:'081318591593', address:'Gg Timbul No.59A rt.010/06',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Lisna Sutijono', nickname:'Lisna', gender:'female', rawDate:'Jakarta, 3 April 1961',
    phone:'0895327420354', address:'Jelambar Fajar No. 38, RT004/RW006',
    maritalStatus:'Single', ibadah:['IR','WBI'], baptismStatus:'sudah', status:'active' },

  { name:'Lisni Sutijono', nickname:'Yeyen', gender:'female', rawDate:'Jakarta, 11 Januari 1966',
    phone:'089693616605', address:'Jelambar Fajar No. 38, RT004/RW006',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], pelayan:['Tim Kunjungan','Tim Doa','Pengurus Kowari'],
    baptismStatus:'sudah', status:'active' },

  { name:'Lucky Andreas Wairissal', nickname:'Andre', gender:'male', rawDate:'Jakarta, 20 Oktober 1990',
    phone:'085692165007', address:'Jl. Bukit Golf X blok QG5 /9. Cluster Garcia, Modernland Tangerang',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    children:[ { name:'Malachi Evandre Wairissal', birthDate:'2018-09-20' } ] },

  // ── M ──────────────────────────────────────────────────────────────────────
  { name:'Mangku Ioven', nickname:'Mangku', gender:'male', rawDate:'Jakarta, 16 Februari 1983',
    phone:'082124103658', address:'Jelambar Aladin no.10',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Pemuji','Pemusik'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Amiz',
    children:[
      { name:'Ceria Angelia Loven', birthDate:'2006-02-15' },
      { name:'Chrisyilla Ecclesia Loven', birthDate:'2013-07-29' },
      { name:'Christybelle Miracle Loven', birthDate:'2021-05-30' },
    ] },

  { name:'Amiz', nickname:'Amiz', gender:'female', rawDate:'Jakarta, 04 Februari 1984',
    phone:'085811401030', address:'Jelambar Aladin no.10',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Mangku Ioven',
    children:[
      { name:'Ceria Angelia Loven', birthDate:'2006-02-15' },
      { name:'Chrisyilla Ecclesia Loven', birthDate:'2013-07-29' },
      { name:'Christybelle Miracle Loven', birthDate:'2021-05-30' },
    ] },

  { name:'Marcello Wong', nickname:'Ello', gender:'male', rawDate:'Jakarta, 23 Mei 2007',
    phone:'082298694909', address:'Teluk Gong Selatan 6 Jalan B Gang R No. 69',
    maritalStatus:'Single', ibadah:['RBI','PBI','IR'], pelayan:['Pemuji','Pemusik','Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Mariani', nickname:'Maria', gender:'female', rawDate:'Jakarta, 24 Oktober 1968',
    phone:'081314150696', address:'Jl. Jelambar Fajar Aladin RT 02 RW 07 No. 21 H, Jakarta Utara 1',
    maritalStatus:'Janda', ibadah:['IR','ABI','KOWARI'], pelayan:['Pengurus ABI'],
    baptismStatus:'sudah', status:'active' },

  { name:'Mariam', nickname:'Memey', gender:'female', rawDate:'Bekasi, 9 Juni 1954',
    phone:'087887760789', address:'Jl. D. Teluk Gong Selatan Gg. Timbul No. 72A Rt.9/06',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], baptismStatus:'sudah', status:'active' },

  { name:'Marsilane De Fretes', nickname:'Itha', gender:'female', rawDate:'Hukurila, 8 Maret 1983',
    phone:'082213735992', address:'Cengkareng',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Marni', nickname:'Sin Nio', gender:'female', rawDate:'5 Juli 1955',
    phone:'082110653010', address:'Fajar Gg. J Rt.001/017',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  { name:'Megawati', nickname:'Mega', gender:'female', rawDate:'Jakarta, 16 Mei 1981',
    phone:'087783222488', address:'Jembatan 3 no.23',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Meicy Feibe Lolowang', nickname:'Meicy', gender:'female', rawDate:'Tegal, 19 Mei 1991',
    phone:'081212902785', address:'Meruya utara',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Meiliani', nickname:'Mei', gender:'female', rawDate:'Jakarta, 19 Mei 1992',
    phone:'082311233366', address:'Jl. I no.48 Samping gereja',
    maritalStatus:'Janda', ibadah:['IR','WBI'], baptismStatus:'belum', status:'active' },

  { name:'Meliawati', nickname:'Aling', gender:'female', rawDate:'Jakarta, 30 Desember 1984',
    phone:'081318272299', address:'RSB Blok Cempaka Lt 4 No. 6, RT 014/06, Tanah pasir',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Elsa Kusuma', birthDate:'2005-10-15' },
      { name:'Emmanuel Felix Kusuma', birthDate:'2013-08-01' },
      { name:'Ellen Manuela Kusuma', birthDate:'2017-02-14' },
    ] },

  { name:'Meliana', nickname:'Meli', gender:'female', rawDate:'Jakarta, 24 Februari 1996',
    phone:'087877543771', address:'Jelambar Ilir No. 15A, RT12/RW10',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Mery', nickname:'Mery', gender:'female', rawDate:'BAA, 28 Juli 1980',
    phone:'081807806741', address:'Jelambar Fajar jln i no. 23 rt/rw : 002/017',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Michael', nickname:'Michael', gender:'male', rawDate:'Jakarta, 10 Maret 1991',
    phone:'083893222278', address:'Gg. timbul no.59 Rt.010/Rw.006',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Lighting'],
    baptismStatus:'sudah', status:'active' },

  { name:'Mimi', nickname:'Mimi', gender:'female', rawDate:'Jakarta, 17 Mei 1979',
    phone:'087747401386', address:'Jl. mushollah blok b8 no.16 rt.02/07 kamal raya',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Minah', nickname:'Minah', gender:'female', rawDate:'Jakarta, 13 Desember 1951',
    phone:'085780025775', address:'Jl. Jelambar fajar RT.04/RW. 06 no. 47',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], baptismStatus:'sudah', status:'active' },

  { name:'Misail Sunardi The', nickname:'Nardi', gender:'male', rawDate:'Pekalongan, 29 November 1943',
    phone:'085647309.0026', address:'Jalan Aladin Gang N no. 42 Rt.07/Rw.06',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Tim Kunjungan'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Yani Setiawati' },

  { name:'Yani Setiawati', nickname:'Yani', gender:'female', rawDate:'29 Januari 1949',
    address:'Jalan Aladin Gang no. 42 Rt.07/Rw.06',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Misail Sunardi The' },

  { name:'Moses Dolvin Maelissa', nickname:'Moses', gender:'male', rawDate:'Jakarta, 10 April 2007',
    phone:'081511998349', address:'Jl. D JLD GG.R No.61 RT.011/017',
    maritalStatus:'Single', ibadah:['RBI','IR'], baptismStatus:'belum', status:'active' },

  // ── N ──────────────────────────────────────────────────────────────────────
  { name:'Naomi Ikarani S.', nickname:'Naomi', gender:'female', rawDate:'Bekasi, 17 September 1995',
    phone:'089517472022', address:'Gang Timbul',
    maritalStatus:'Single', ibadah:['PBI'], baptismStatus:'sudah', status:'active' },

  { name:'Naomi Natalia', nickname:'Naomi', gender:'female', rawDate:'Jakarta, 14 Desember 1988',
    phone:'081807480352', address:'Jl Surya Mutiara 1 Blok 3T No 9 Dedoya - Jakarta Barat Sunrise G',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Natasha Fildy Maelissa', nickname:'Caca/Tasha', gender:'female', rawDate:'Jakarta, 17 September 2003',
    phone:'089602769875', address:'Jl. D JLD GG.R No.61 RT.011/017',
    maritalStatus:'Single', ibadah:['ABI','RBI','IR'], pelayan:['Pengurus ABI','Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Nicholas Andre', nickname:'Nicho', gender:'male', rawDate:'Jakarta, 8 April 2002',
    phone:'089674647704', address:'Jelambar Aladin, JII No. 1A, RT008 RW006',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'belum', status:'active' },

  { name:'Nicholas Alexander Tjhai', nickname:'Nicholas', gender:'male', rawDate:'Jakarta, 6 Juli 2010',
    phone:'085890131290', address:'Jl. C no.18A RT007/RW008 Teluk Gong',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Nico Crisnanda', nickname:'Nico', gender:'male', rawDate:'Jakarta, 19 Oktober 1982',
    phone:'087786977833', address:'Jelambar Fajar No. 80 rt.4/6',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Tri Wahyuni',
    children:[
      { name:'Jonathan Aviel Crisnanda', birthDate:'2010-03-27' },
      { name:'Michael Orlando Crisnanda', birthDate:'2015-12-26' },
      { name:'Gabriel Alvaro Crisnanda', birthDate:'2017-11-17' },
    ] },

  { name:'Tri Wahyuni', nickname:'Tri', gender:'female', rawDate:'Jakarta, 6 Juli 1983',
    phone:'087722359535', address:'Jelambar Fajar No. 80 rt.4/6',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Nico Crisnanda',
    children:[
      { name:'Jonathan Aviel Crisnanda', birthDate:'2010-03-27' },
      { name:'Michael Orlando Crisnanda', birthDate:'2015-12-26' },
      { name:'Gabriel Alvaro Crisnanda', birthDate:'2017-11-17' },
    ] },

  { name:'Nicolas Lontoh', nickname:'Nico', gender:'male', rawDate:'Manado, 12 Maret 1943',
    address:'Gg. Timbul No.55',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Yuyu Maryana' },

  { name:'Ngui Siu Kiun', nickname:'Akhiun', gender:'male', rawDate:'Manggar, 25 Agustus 1950',
    phone:'082123265168', address:'Jelambar Aladin No.37 Rt.06/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Nini', nickname:'Nini', gender:'female', rawDate:'Bagan Siapi-api, 11 Februari 1971',
    phone:'081314670235', address:'Jelambar aladin , jalan i no 67 Rt.06/06',
    maritalStatus:'Menikah', ibadah:['IR','WBI','KOMPAS'], pelayan:['Perjamuan Kudus','Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Novi', nickname:'Wewe', gender:'female', rawDate:'23 November',
    phone:'082246532875', address:'Jelambar Aladin',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  // ── O ──────────────────────────────────────────────────────────────────────
  { name:'Obed Raai Kharles', nickname:'Obed', gender:'male', rawDate:'Jakarta, 10 Maret 1995',
    phone:'081908946653', address:'komplek mulia dharma no 77',
    maritalStatus:'Single', ibadah:['IR','RBI'], pelayan:['Pemuji','Pemusik','Sound Audio'],
    baptismStatus:'sudah', status:'active' },

  { name:'Oey Cu Kay', nickname:'Cu Kai', gender:'male', rawDate:'Jakarta, 10 November 1960',
    phone:'083808833831', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Yan Ing',
    children:[
      { name:'Yudi Setiawan', birthDate:'1985-03-16' },
      { name:'Hervy Setiawan', birthDate:'1987-04-08' },
      { name:'Herlia Setiawan', birthDate:'1992-03-13' },
      { name:'Heriandi Setiawan', birthDate:'1996-10-03' },
      { name:'Adellia Setiawan', birthDate:'2005-11-08' },
    ] },

  { name:'Yan Ing', nickname:'Aing', gender:'female', rawDate:'Jakarta, 3 Agustus 1963',
    phone:'081290779458', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Oey Cu Kay',
    children:[
      { name:'Yudi Setiawan', birthDate:'1985-03-16' },
      { name:'Hervy Setiawan', birthDate:'1987-04-08' },
      { name:'Herlia Setiawan', birthDate:'1992-03-13' },
      { name:'Heriandi Setiawan', birthDate:'1996-10-03' },
      { name:'Adellia Setiawan', birthDate:'2005-11-08' },
    ] },

  { name:'Oey Hok Wa', nickname:'Hok Wa/mama Eva R', gender:'female', rawDate:'Mauk Tangerang, 2 Maret 1958',
    address:'Jelambar no.51 Rt.003/017',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Oey Joni', nickname:'Yoni/Oma Oyon', gender:'female', rawDate:'Jakarta, 15 Desember 1961',
    address:'Jelambar, JL. D Gg. No.61 RT011/RW017',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Oey Merry', nickname:'Merry', gender:'female', rawDate:'Teluk Gong, 2 Maret 1966',
    phone:'089509181821', address:'Teluk Gong, Mazda 2 Rt04/09, No. 50B',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Oey Pyng-Pyng', nickname:'Ping-Ping', gender:'female', rawDate:'Jakarta, 25 September 2005',
    phone:'085730342582', address:'Jl. Terate Raya No. 46C RT01/03',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Oey Sian Nie', nickname:'Ani', gender:'female', rawDate:'Jakarta, 2 November 1961',
    phone:'081912454117', address:'Jelambar Gg. R No.61',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Ong Kwie Siong', nickname:'Abi', gender:'male', rawDate:'Jakarta, 30 Agustus 1965',
    phone:'085810297908', address:'Jl. Kapuk Gg. bensin las no.23 Rt.05/05',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Ellisah' },

  { name:'Ellisah', nickname:'Eli', gender:'female', rawDate:'Jakarta, 18 Maret 1976',
    phone:'085693098058', address:'Jl. Kapuk Gg. bensin las no.23 Rt.05/05',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Ong Kwie Siong' },

  { name:'Ong Sumi', nickname:'Uming', gender:'female', rawDate:'Jakarta, 20 Juli 1954',
    phone:'087883890399', address:'Tpi',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Ong Yang Nio', nickname:'Etni', gender:'female', rawDate:'Jakarta, 6 November 1962',
    address:'Jl. Jelambar Fajar RT 04/06 No. 28 C',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  // ── P ──────────────────────────────────────────────────────────────────────
  { name:'Paulus Widyanto', nickname:'Paulus', gender:'male', rawDate:'Jakarta, 10 Desember 1994',
    phone:'08990092036', address:'Jelambar Fajar No. 38, RT004/RW006',
    maritalStatus:'Single', ibadah:['IR','PBI'], pelayan:['Pemuji','Pemusik','Sound Audio'],
    baptismStatus:'sudah', status:'active' },

  { name:'Perih', nickname:'Feri', gender:'male', rawDate:'Jakarta, 2 April 1996',
    phone:'085893476212', address:'Gg. Timbul no.13 rt.9/06',
    maritalStatus:'Single', ibadah:['IR','PBI'], pelayan:['Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Pieter Asarya', nickname:'Yoseph', gender:'male', rawDate:'Jakarta, 22 September 1977',
    phone:'085782166555', address:'Jl. Kp gusti gg kantong Rt 005/015 No. 23',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  // ── R ──────────────────────────────────────────────────────────────────────
  { name:'Rafael Geraldine', nickname:'Rafael', gender:'male', rawDate:'Jakarta, 16 September 2002',
    phone:'081296867507', address:'Jelambar Aladin no.29 Rt.06/06',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Rahel Kristin', nickname:'Rahel', gender:'female', rawDate:'Bandung, 30 November 1999',
    phone:'0128325632', address:'Jll No.67A Jelambar Aladin, RT/RW.006/006, Penjaringan, Penjaringan',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Randy', nickname:'Randy', gender:'male', rawDate:'Jakarta, 9 Juli 1993',
    phone:'08170981511', address:'Jl. V no.41 rt.3/10',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Marlianty Laiman' },

  { name:'Marlianty Laiman', nickname:'Tity', gender:'female', rawDate:'Jakarta, 1 Maret 1993',
    phone:'081289811845', address:'Jl. V no.41 rt.3/10',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Randy' },

  { name:'Ratna', nickname:'Ratna', gender:'female', rawDate:'Jakarta, 26 Desember 1984',
    phone:'087764051622', address:'Jelambar Fajar No.35A RT.004/006',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Ricki Mechel', nickname:'Michael', gender:'male', rawDate:'Jakarta, 11 Maret 1987',
    phone:'081210019688', address:'Jelambar aladin no.57 Rt.007/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Evi' },

  { name:'Rika', nickname:'Rika', gender:'female', rawDate:'Jakarta, 29 Oktober 1969',
    phone:'085770192119', address:'Jln Jelambar Fajar Gang U No. 27 Rt 01/Rw 17',
    maritalStatus:'Janda', ibadah:['IR','WBI'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Rika Surya', nickname:'Rika', gender:'female', rawDate:'Jakarta, 8 Oktober 1980',
    phone:'081806549964', address:'Jelambar Fajar No 55 Rt 03 Rw 017',
    maritalStatus:'Single', ibadah:['IR','ABI'], pelayan:['Pengurus ABI'],
    baptismStatus:'sudah', status:'active' },

  { name:'Risan Sutanto', nickname:'Risan', gender:'male', rawDate:'Jakarta, 8 September 1978',
    phone:'087808780025', address:'Jelambar Fajar jln i no. 23 rt/rw : 002/017',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Pemuji','Pemusik'],
    baptismStatus:'sudah', status:'active' },

  { name:'Risda Sayuti', nickname:'Risda', gender:'female', rawDate:'Jakarta, 20 Oktober 1967',
    phone:'082112187877', address:'Jelambar Baru VI no 23 Rt 012 Rw 007',
    maritalStatus:'Janda', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Ritah', nickname:'Rita', gender:'female', rawDate:'Jakarta, 2 Oktober 1970',
    phone:'085776563720', address:'Jl. V no.46 Rt.010/017',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Romie', nickname:'Romie', gender:'male', rawDate:'Jakarta, 04 November 1978',
    phone:'081346695878', address:'Jl. I GG.Fajar RT.002/017 no.25 A',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara','Multimedia Produksi'],
    baptismStatus:'sudah', status:'active',
    children:[
      { name:'Ignatius Tobias Livero', birthDate:'2009-07-09' },
      { name:'Ignatius Torres Livero', birthDate:'2011-06-09' },
      { name:'Tristan Joash Livero', birthDate:'2012-05-31' },
    ] },

  { name:'Ronny Stanly', nickname:'Ronny', gender:'male', rawDate:'Jakarta, 7 Juli 1986',
    phone:'0818898318', address:'Fleekhouz H20-15',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Pemuji','Pemusik'],
    baptismStatus:'sudah', status:'active',
    children:[ { name:'Regina Stanly', birthDate:'2022-10-11' } ] },

  { name:'Rosnawi', nickname:'Ros', gender:'female', rawDate:'Belinyu Bangka, 15 April 1963',
    phone:'08815370520', address:'Pesing Koneng No. 16I, RT14/RW08, Kedoya Utara, Kebon Jeruk',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Pemuji'],
    baptismStatus:'sudah', status:'active' },

  { name:'Ruben Sujatmiko', nickname:'Ruben', gender:'male', rawDate:'Jakarta, 5 Agustus 1996',
    phone:'081219616105', address:'Jelambar Aladin Rt005/006 No. 17A',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Rudi Aprianto', nickname:'Asan', gender:'male', rawDate:'',
    phone:'0895364520385', address:'Jl. D rt.3/6',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Rudy Apriyanto', nickname:'Rudy', gender:'male', rawDate:'08 April 1984',
    phone:'082213851519', address:'Jelambar Aladin',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Rudy Dermawan Saputra', nickname:'Rudy', gender:'male', rawDate:'Jakarta, 31 Desember 1970',
    address:'Jelambar Aladin no.29 Rt.06/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Widyawati',
    children:[
      { name:'Rafael Geraldine', birthDate:'2002-09-16' },
      { name:'Timothy Gavra Danendra', birthDate:'2007-10-31' },
    ] },

  { name:'Widyawati', nickname:'Fanny', gender:'female', rawDate:'Jakarta, 6 Juli 1974',
    phone:'087888590911', address:'Jelambar Aladin no.29 Rt.06/06',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Tim Kunjungan','Tim Doa'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Rudy Dermawan Saputra',
    children:[
      { name:'Rafael Geraldine', birthDate:'2002-09-16' },
      { name:'Timothy Gavra Danendra', birthDate:'2007-10-31' },
    ] },

  { name:'Rudy Sunjaya', nickname:'Rudy', gender:'male', rawDate:'Jakarta, 9 Mei 1988',
    phone:'081908006881', address:'Jelambar aladin no.14A Gg. o Rt.005/06',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pemuji','Pemusik'],
    baptismStatus:'sudah', status:'active' },

  { name:'Ryan Adiputra', nickname:'Ryan', gender:'male', rawDate:'Jakarta, 9 Januari 1993',
    phone:'082111575958', address:'Jalan Jembatan Dua No. 11',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  // ── S ──────────────────────────────────────────────────────────────────────
  { name:'Samuel Melki', nickname:'Melki', gender:'male', rawDate:'Jakarta, 25 Mei 1990',
    phone:'089999210981', address:'Jelambar aladin no.20 Rt.10/06',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Sandra Sutini', nickname:'Sandra', gender:'female', rawDate:'Jakarta, 19 Juli 2002',
    phone:'087781020877', address:'Jelambar aladin , jalan i no 67a',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Sanna', nickname:'Lina', gender:'female', rawDate:'Pontianak, 7 Desember 1972',
    phone:'081283189615', address:'Jl. Fajar no.33b Rt.04/06',
    maritalStatus:'Menikah', ibadah:['IR','WBI','KOMPAS'], baptismStatus:'sudah', status:'active' },

  { name:'Santi Dewi', nickname:'Santi', gender:'female', rawDate:'Jakarta, 15 Februari 1975',
    phone:'087775662077', address:'Jl. Jelambar Aladin Rt.006/006 Jakarta Utara 14450',
    maritalStatus:'Menikah', ibadah:['IR','WBI','KOWARI'], baptismStatus:'sudah', status:'active' },

  { name:'Santoso Tatang', nickname:'Tatang', gender:'male', rawDate:'Jakarta, 01 Februari 1956',
    phone:'081291661639', address:'Gang Timbul no.72B',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Sariwati', nickname:'Sari', gender:'female', rawDate:'Jakarta, 9 Juni 1980',
    phone:'08980050510', address:'Mulia darma no.8',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  { name:'Senhu', nickname:'Ahu', gender:'male', rawDate:'Pulau Halang, 31 Mei 1976',
    phone:'081386209575', address:'Komplek Mulia Dharma, Jalan D Blok A No. 33, Jakarta Utara 14',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Seno Susilo', nickname:'Seno', gender:'male', rawDate:'Pontianak, 27 Desember 1980',
    phone:'081293503455', address:'Melati mas blok G',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Josiane',
    children:[
      { name:'Josse Manuel Linardi', birthDate:'2016-07-22' },
      { name:'Richie Manuel Linardi', birthDate:'2018-10-18' },
    ] },

  { name:'Seplin', nickname:'Lin/Veli', gender:'female', rawDate:'Luwuk, 27 September 1986',
    phone:'081389428928', address:'Jl. Karya Utama no.89',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active' },

  { name:'Alphin', nickname:'Alphin', gender:'male', rawDate:'Pemangkat, 19 Juni 1983',
    phone:'085241222996', address:'Jl. Karya Utama no.89',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Seplin' },

  { name:'Shania Givira', nickname:'Shania', gender:'female', rawDate:'Jakarta, 28 November 2002',
    phone:'081284835359', address:'Sawah lio no.32B',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Multimedia Weekly News'],
    baptismStatus:'belum', status:'active' },

  { name:'Silviany Tansika', nickname:'Silvi', gender:'female', rawDate:'Jakarta, 9 September 1985',
    phone:'085216226989', address:'Villa taman bandara blok M1 no.16',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Sisca', nickname:'Sisca', gender:'female', rawDate:'Jakarta, 24 Agustus 1979',
    phone:'081315867494', address:'Topaz Raya no. 18, Pondok Hijau Golf, Gading Serpong, Tangerang',
    maritalStatus:'Menikah', ibadah:['IR','RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Siu Ing', nickname:'Iing', gender:'female', rawDate:'Jakarta, 7 Oktober 1966',
    phone:'085964178127', address:'Jelambar aladin no 32 rt.06/06',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Tim Kunjungan','Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  { name:'Souw Giok Lin', nickname:'Ci Aaw', gender:'female', rawDate:'Jakarta, 21 Maret 1961',
    phone:'087778439743', address:'Jelambar fajar no.52B Rt.004/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Sudarma Wijaya', nickname:'Sudarma', gender:'male', rawDate:'Jakarta, 13 Maret 1959',
    address:'Komplek fajar permai, jl.i no.56 AF',
    maritalStatus:'Menikah', ibadah:['IR','WBI','KOMPAS'], baptismStatus:'belum', status:'active' },

  { name:'Sugandi', nickname:'Aguan', gender:'male', rawDate:'28 November 1981',
    phone:'0818716439', address:'Jl. D Tlk. Gong Selatan No.69-70, RT9/RW6, Pejagalan, Jkt Utara 14450',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Pengurus Kowari'],
    baptismStatus:'sudah', status:'active',
    children:[
      { name:'Evans Jericho Sugandi', birthDate:'2012-01-28' },
      { name:'Chelsea Abigail Sugandi', birthDate:'2014-02-28' },
    ] },

  { name:'Suhendra', nickname:'Hendra', gender:'male', rawDate:'Jakarta, 19 Desember 1980',
    phone:'082125976799', address:'Jelambar Aladin no.14 rt.05/06',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Sulikah', nickname:'Oma Eka', gender:'female', rawDate:'Kediri, 3 Desember 1959',
    phone:'081217267877', address:'Jelambar fajar no.10 Rt.01/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Fitri Elizabeth', birthDate:'1994-02-23' },
      { name:'Rahel Kristin', birthDate:'1999-11-30' },
      { name:'Sandra Sutini', birthDate:'2002-07-19' },
    ] },

  { name:'Sulastri', nickname:'Tri', gender:'female', rawDate:'Pacitan, 15 Januari 1953',
    phone:'085211944255', address:'Jelambar Fajar No.80',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  { name:'Sunarto Slamet', nickname:'Asen', gender:'male', rawDate:'Jakarta, 28 Juli 1968',
    phone:'089644161237', address:'Rusun Bumi cengkareng Indah Aster 6 Lt. 1 No.1',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Wati',
    children:[
      { name:'Michael Rubat', birthDate:'1998-02-24' },
      { name:'Jesen Saputra', birthDate:'2006-01-18' },
    ] },

  { name:'Wati', nickname:'Wawah', gender:'female', rawDate:'Jakarta, 11 Januari 1978',
    phone:'081291515156', address:'Rusun Bumi cengkareng Indah Aster 6 Lt. 1 No.1',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Sunarto Slamet',
    children:[
      { name:'Michael Rubat', birthDate:'1998-02-24' },
      { name:'Jesen Saputra', birthDate:'2006-01-18' },
    ] },

  { name:'Jesen Saputra', nickname:'Jesen', gender:'male', rawDate:'Jakarta, 18 Januari 2006',
    phone:'089644161237', address:'Rusun Bumi cengkareng Indah Aster 6 Lt. 1 No.1',
    maritalStatus:'Single', ibadah:['RBI','IR'], pelayan:['Lighting'],
    baptismStatus:'sudah', status:'active' },

  { name:'Sukandi Aminah', nickname:'Yuheng', gender:'female', rawDate:'Jakarta, 14 Oktober 1952',
    phone:'081905956088', address:'Jelambar Aladin No. 75',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Gouw Tjui Lian',
    children:[
      { name:'Yudi Sukandi' }, { name:'Yusman Sukandi' }, { name:'Julliyanah' }, { name:'Yosef' }, { name:'Yuheni' }
    ] },

  { name:'Susianti Chandra', nickname:'Santi/Pepey', gender:'female', rawDate:'Jakarta, 10 Juni 1968',
    address:'Jelambar fajar Gg. u no.17 Rt.001/017',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  // ── T ──────────────────────────────────────────────────────────────────────
  { name:'Tan Hap Nih', nickname:'Nani', gender:'female', rawDate:'Jakarta, 15 April 1956',
    phone:'082298986218', address:'Jelambar aladin no.14A Gg. o Rt.005/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Tan Hap Pia', nickname:'Yayah', gender:'female', rawDate:'Jakarta, 12 Desember 1960',
    phone:'085811191832', address:'Golf lake At7 / 27',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Tan Henny Kumala', nickname:'Henny', gender:'female', rawDate:'Jakarta, 18 September 1985',
    phone:'087752557757', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Yudi Setiawan',
    children:[
      { name:'Nathanael Tristan Setiawan', birthDate:'2012-07-17' },
      { name:'Nathania Audrey Setiawan', birthDate:'2017-07-27' },
    ] },

  { name:'Yudi Setiawan', nickname:'Heri', gender:'male', rawDate:'Jakarta, 16 Maret 1985',
    phone:'083808833838', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Tan Henny Kumala',
    children:[
      { name:'Nathanael Tristan Setiawan', birthDate:'2012-07-17' },
      { name:'Nathania Audrey Setiawan', birthDate:'2017-07-27' },
    ] },

  { name:'Tan Kian Nio', nickname:'Nano', gender:'male', rawDate:'Jakarta, 15 Mei 1960',
    phone:'087784634980', address:'Jelambar fajar no.2 Rt.1/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Renawati' },

  { name:'Renawati', nickname:'Yoyok', gender:'female', rawDate:'Jakarta, 19 Februari 1978',
    phone:'087784634980', address:'Jelambar fajar no.2 Rt.1/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Tan Kian Nio' },

  { name:'Tan Lan Nio', nickname:'Lan Nio', gender:'female', rawDate:'Jakarta, 17 April 1968',
    phone:'088299380280', address:'Jelambar Aladin no.36A Rt.07/06',
    maritalStatus:'Janda', ibadah:['IR','WBI'], baptismStatus:'sudah', status:'active' },

  { name:'Tan Mi Lan', nickname:'Ci Melan', gender:'female', rawDate:'Jakarta, 18 Juni 1953',
    address:'Jelambar Aladin no.37 Rt. 06/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Tan On Nio', nickname:'Oni', gender:'female', rawDate:'Jakarta, 22 Desember 1969',
    phone:'087880138687', address:'Komplek fajar permai, jl.i no.56 AF',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active' },

  { name:'Tanto', nickname:'Tanto', gender:'male', rawDate:'Jakarta, 28 September 1979',
    phone:'081311578270', address:'Fajar Gg. J Rt.001/017',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Taswar', nickname:'Taswar', gender:'male', rawDate:'Selat Panjang, 13 Agustus',
    phone:'081213872958', address:'Mulia darma no.8',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Teing', nickname:'Ing', gender:'female', rawDate:'Jakarta, 18 Agustus 2000',
    phone:'0895397891003', address:'Jl. Jelambar Fajar RT.04/06 No. 28 C',
    maritalStatus:'Single', ibadah:['RBI'], baptismStatus:'sudah', status:'active' },

  { name:'Thio Lani Maryana', nickname:'Nini', gender:'female', rawDate:'Jakarta, 14 Desember 1971',
    phone:'087886674629', address:'Jelambar fajar rt.04/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Timothy Gavra Danendra', nickname:'Timothy', gender:'male', rawDate:'Jakarta, 31 Oktober 2007',
    phone:'081510114759', address:'Jelambar Aladin no.29 Rt.06/06',
    maritalStatus:'Single', ibadah:['RBI','PBI','IR'], pelayan:['Pemuji','Pemusik','Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Tinah Sinih', nickname:'Win Ing', gender:'female', rawDate:'Jakarta, 1 Mei 1968',
    phone:'0895364520385', address:'Komp garuda blok E8 no.19',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Titin', nickname:'Titin', gender:'female', rawDate:'Karawang, 9 September 1959',
    phone:'083806575345', address:'Jelambar fajar Jl. b Gg. R no.5',
    maritalStatus:'Janda', ibadah:['IR','WBI'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active' },

  { name:'Tjan Sioe Hoa', nickname:'Wawa/Shuwa', gender:'female', rawDate:'Jakarta, 28 Februari 1950',
    address:'Jelambar fajar no.39 Rt.04/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Tjhung Giok Soei', nickname:'Aswi', gender:'male', rawDate:'Jakarta, 15 Oktober 1953',
    phone:'085947598065', address:'Jelambar aladin no.30 Rt.06/06',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Tjong Bui Kwet', nickname:'Akwet', gender:'male', rawDate:'Pangkal Pinang, 16 Oktober 1968',
    phone:'0818702753', address:'Green Court, Jl. Caliandra I No. 50',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Usher','Perjamuan Kudus'],
    baptismStatus:'sudah', status:'active',
    children:[
      { name:'Leonard Christopher Lie', birthDate:'2015-10-29' },
      { name:'Nadia Victoria Lie', birthDate:'2020-01-03' },
    ] },

  { name:'Toni Alexander', nickname:'Toni/Aman', gender:'male', rawDate:'Batu Ampar, 31 Mei 1985',
    phone:'085693222777', address:'Jl. C no.18A RT007/RW008 Teluk Gong',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Erwiping',
    children:[
      { name:'Nicholas Alexander Tjhai', birthDate:'2010-07-06' },
      { name:'Nicole Nathania Tjhai', birthDate:'2016-06-01' },
    ] },

  { name:'Erwiping', nickname:'Ping-ping', gender:'female', rawDate:'Kubu, 7 April 1981',
    phone:'085697174043', address:'Jl. C no.18A RT007/RW008 Teluk Gong',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Toni Alexander',
    children:[
      { name:'Nicholas Alexander Tjhai', birthDate:'2010-07-06' },
      { name:'Nicole Nathania Tjhai', birthDate:'2016-06-01' },
    ] },

  { name:'Toni Wongso', nickname:'Toni', gender:'male', rawDate:'Bangka, 9 Januari 1949',
    phone:'081808472060', address:'Jelambar selatan 2 no.b3',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Heli Tjenurdin' },

  { name:'Tuti Winarsih', nickname:'Tutut', gender:'female', rawDate:'Jakarta, 6 Mei 1970',
    phone:'081298473395', address:'Fajar no. 39A rt.04/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  // ── V ──────────────────────────────────────────────────────────────────────
  { name:'Valencia Tantiono', nickname:'Valen', gender:'female', rawDate:'Jakarta, 15 November 2002',
    phone:'081931521162', address:'Aladin baru no.17A rt.17/14',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Victoria', nickname:'Ria', gender:'female', rawDate:'Jakarta, 26 Juli 2004',
    phone:'085771466485', address:'Jelambar Aladin No. 56B',
    maritalStatus:'Single', ibadah:['IR','RBI'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Vina Soewandy', nickname:'Vina', gender:'female', rawDate:'Jakarta, 30 Juni 1990',
    phone:'087776177787', address:'Aladin Gg. K no.41 Rt.06/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Vineta Claurina', nickname:'Ayen', gender:'female', rawDate:'Tj. Pandan, 2 November 1977',
    phone:'081390844395', address:'Jl. Jelambar Aladin no.29 A rt.006/06',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Budi Dermawan' },

  { name:'Budi Dermawan', nickname:'Budi', gender:'male', rawDate:'Jakarta, 15 September 1972',
    phone:'08161850457', address:'Jl. Jelambar Aladin no.29 A rt.006/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Vineta Claurina',
    children:[ { name:'Felycia Claurina Dermawan', birthDate:'2007-09-29' } ] },

  { name:'Vincentius', nickname:'Vincent', gender:'male', rawDate:'Singkawang, 8 Desember 1989',
    phone:'081223111336', address:'Gang. Balok IV No.37, Duri Utara, Tambora',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  // ── W ──────────────────────────────────────────────────────────────────────
  { name:'William', nickname:'William', gender:'male', rawDate:'Jakarta, 14 September 1990',
    phone:'081219659155', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    children:[ { name:'Alvaro Gavriel Yonathan', birthDate:'2018-08-10' } ] },

  { name:'Willis Wihartati The', nickname:'Willis', gender:'female', rawDate:'Pekalongan, 6 September 1976',
    phone:'081519113144', address:'Jelambar Aladin Jl. I/29B, Rt 008 Rw 006, Jakut 14450',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Audrey Stevie Likanto', birthDate:'2008-09-04' },
      { name:'Sergio Alden Likanto', birthDate:'2010-11-16' },
      { name:'Seldon Aldric Likanto', birthDate:'2015-06-04' },
    ] },

  { name:'Wiwih Prayoga', nickname:'Wiwih', gender:'male', rawDate:'Kuningan, 10 September 1975',
    phone:'081285149520', address:'Teluk gong, Jl. V no.17A rt.07/017',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  // ── Y ──────────────────────────────────────────────────────────────────────
  { name:'Yakup Saputra', nickname:'Akok', gender:'male', rawDate:'Pontianak, 21 Juli 1970',
    phone:'081316265555', address:'Jl. Hemat 3 No. 14A',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Lies Candra Sari Kasno',
    children:[
      { name:'Felicia Y.S.', birthDate:'2000-02-23' },
      { name:'Olivia Y.S.', birthDate:'2003-02-10' },
      { name:'Dave Martin S.', birthDate:'2005-03-19' },
    ] },

  { name:'Lies Candra Sari Kasno', nickname:'Lies', gender:'female', rawDate:'Cirebon, 7 September 1976',
    phone:'0811136597', address:'Jl. Hemat 3 No. 14A',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Yakup Saputra',
    children:[
      { name:'Felicia Y.S.', birthDate:'2000-02-23' },
      { name:'Olivia Y.S.', birthDate:'2003-02-10' },
      { name:'Dave Martin S.', birthDate:'2005-03-19' },
    ] },

  { name:'Yanto Wijaya', nickname:'Tek Cin', gender:'male', rawDate:'Jakarta, 26 Juni 1962',
    phone:'08990696572', address:'Jl. Jelambar Ilir No. 15A RT.012 RW.010 Kelurahan Jelambar Baru, Kecamatan Grogol Petamburan, Jakarta Barat',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Dian Oktavia', birthDate:'1987-10-02' },
      { name:'Ima Oktavia', birthDate:'1990-10-12' },
      { name:'Handy Susanto', birthDate:'1993-08-10' },
      { name:'Meliana', birthDate:'1996-02-24' },
    ] },

  { name:'Yasto S. Jaer', nickname:'Yasto', gender:'male', rawDate:'Kalteng, 5 Mei 1958',
    phone:'081311022231', address:'Jl. Aladin, Gang Timbul No. 10 rt.009/06',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Tim Doa','Tim Kunjungan'],
    baptismStatus:'sudah', status:'active' },

  { name:'Yayah Bin Slamet', nickname:'Yayah', gender:'female', rawDate:'Jakarta, 25 Desember 1956',
    address:'kampung gusti gg kantong no.40 Rt.04/15',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Yeni', nickname:'Yeni (Mami)', gender:'female', rawDate:'Jakarta, 26 Januari 1972',
    phone:'087883658205', address:'Gg. Timbul blok D',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Yenni Susana Wati', nickname:'Yenni', gender:'female', rawDate:'Jakarta, 2 April 1983',
    phone:'0818716429', address:'Jl. D Tlk. Gong Selatan No.69-70, RT9/RW6, Pejagalan, Jkt Utara 14450',
    maritalStatus:'Menikah', ibadah:['IR','ABI'], pelayan:['Pengurus ABI','Pengurus Kowari'],
    baptismStatus:'sudah', status:'active' },

  { name:'Yeremia Budi Soesanto', nickname:'Yeremia', gender:'male', rawDate:'Tegal, 9 Januari 1985',
    phone:'081317056705', address:'Perumahan Legok Permai Blok F1/F18',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Yeti', nickname:'Yeti', gender:'female', rawDate:'Jakarta, 28 Mei 1967',
    phone:'089603682595', address:'Jl. Jelambar Ilir No. 15A RT.012 RW.010 Kelurahan Jelambar B',
    maritalStatus:'Menikah', ibadah:['IR','WBI','KOMPAS'], pelayan:['Tim Kunjungan','Tim Doa'],
    baptismStatus:'sudah', status:'active',
    children:[
      { name:'Dian Oktavia', birthDate:'1987-10-02' },
      { name:'Ima Oktavia', birthDate:'1990-10-12' },
      { name:'Handy Susanto', birthDate:'1993-08-10' },
      { name:'Meliana', birthDate:'1996-02-24' },
    ] },

  { name:'Yohanes Efendi', nickname:'Kuple', gender:'male', rawDate:'Jakarta, 8 Oktober 1987',
    phone:'087775181530', address:'Jl. Jelambar Aladin No. 31, RT005/RW06',
    maritalStatus:'Single', ibadah:['IR','PBI'], baptismStatus:'belum', status:'active' },

  { name:'Yonatan Lesmanta', nickname:'Lesmanta', gender:'male', rawDate:'Jakarta, 25 Oktober 1983',
    phone:'081280285515', address:'Kebun Jamblang, Desa Pangkalan, Teluk Naga Tangerang',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Yossef', nickname:'Yossef', gender:'male', rawDate:'Jakarta, 1 Agustus 1989',
    phone:'087883986000', address:'Jelambar aladin no.75',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Yemima Dorothea',
    children:[
      { name:'Zefanya Yosthe', birthDate:'2009-05-20' },
      { name:'Zee Queen Alona Yosthe', birthDate:'2017-07-09' },
    ] },

  { name:'Yemima Dorothea', nickname:'Thea', gender:'female', rawDate:'Jakarta, 8 Januari 1993',
    phone:'087888479424', address:'Jelambar aladin no.75',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Yossef',
    children:[
      { name:'Zefanya Yosthe', birthDate:'2009-05-20' },
      { name:'Zee Queen Alona Yosthe', birthDate:'2017-07-09' },
    ] },

  { name:'Zefanya Yosthe', nickname:'Zefa', gender:'female', rawDate:'Jakarta, 20 Mei 2009',
    phone:'087830689568', address:'Jelambar aladin no.75',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Yosua Leo', nickname:'Aliong', gender:'male', rawDate:'Jakarta, 2 Juli 2003',
    phone:'0896630626968', address:'Vila Taman Bandara Blok C 7 No. 15',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Yudi Sulistyanto', nickname:'Yudi', gender:'male', rawDate:'Surakarta, 08 Juli 1969',
    phone:'08156888562', address:'Gg. timbul no.59 Rt.010/Rw.006',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Johana',
    children:[ { name:'Joel Kenneth Sulistyanto', birthDate:'2014-06-08' } ] },

  { name:'Johana', nickname:'Yana', gender:'female', rawDate:'Jakarta, 13 April 1979',
    phone:'087882915256', address:'Gg. timbul no.59 Rt.010/Rw.006',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    spouseName:'Yudi Sulistyanto',
    children:[ { name:'Joel Kenneth Sulistyanto', birthDate:'2014-06-08' } ] },

  { name:'Yuli Prayitno', nickname:'Juli', gender:'female', rawDate:'Surabaya, 9 Juli 1971',
    phone:'085717182538', address:'Jl. Goa Raya no.7 Perum 3 Karawaci Tangerang',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Yuliana', nickname:'Yuli', gender:'female', rawDate:'Bagan Siapi-api, 9 Juli 1983',
    phone:'0818809909', address:'Jelambar Aladin, Jl. I Gg.E no. 51A',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Yuliani Lena', nickname:'Yuliani', gender:'female', rawDate:'Jakarta, 20 Oktober 1952',
    phone:'085975465966', address:'Jelambar Barat Gg. Iman IV NO. 35 RT/RW: 002/010.',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Yuniati', nickname:'Yuni', gender:'female', rawDate:'Riau, 4 Juni 1984',
    phone:'081311566593', address:'Aladin jalan I, Gang E No.34',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Yuniwati', nickname:'Yuni', gender:'female', rawDate:'Probolinggo, 19 Juni 1959',
    phone:'085711513315', address:'Poris indah blok E no.129',
    maritalStatus:'Janda', ibadah:['IR','WBI','KOWARI'], pelayan:['Pengurus WBI'],
    baptismStatus:'sudah', status:'active' },

  { name:'Yuyu Maryana', nickname:'Yuyu', gender:'female', rawDate:'Jakarta, 14 September 1953',
    phone:'085697706610', address:'Gg. Timbul No.55',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Tim Kunjungan','Tim Doa'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Nicolas Lontoh' },

  { name:'Yukriatif Effendi', nickname:'Yuri', gender:'female', rawDate:'Jakarta, 24 November 1986',
    phone:'081807004487', address:'Jl. D no.75 Rt.009/006',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  // ── Alex / Anton family ────────────────────────────────────────────────────
  { name:'Alex Yulianto', nickname:'Alex', gender:'male', rawDate:'Purwokerto, 26 Juli 1978',
    phone:'082223333851', address:'Villa kapuk mas, blok J No. 20',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Suriati' },

  { name:'Suriati', nickname:'Ati', gender:'female', rawDate:'Bangka, 2 April 1988',
    phone:'085920577375', address:'Villa kapuk mas, blok J No. 20',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Alex Yulianto' },

  { name:'Anton Aprilyanto', nickname:'Anton', gender:'male', rawDate:'Jakarta, 9 April 1988',
    phone:'081517676911', address:'Jl. Jelambar Fajar Jalan B No. 29 Rt. 002/017',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Henny Anggarany',
    children:[ { name:'Bella', birthDate:'1998-08-23' } ] },

  { name:'Henny Anggarany', nickname:'Henny', gender:'female', rawDate:'Jakarta, 21 April 1987',
    phone:'0817874091', address:'Jl. Jelambar Fajar Jalan B No. 29 Rt. 002/017',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Anton Aprilyanto',
    children:[ { name:'Bella', birthDate:'1998-08-23' } ] },

  { name:'Bella', nickname:'Bella', gender:'female', rawDate:'Jakarta, 23 Agustus 1998',
    phone:'081933992500', address:'Jelambar aladin',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Ang Fonny Christina', nickname:'Fonny', gender:'female', rawDate:'Jakarta, 20 September 1972',
    phone:'081294282420', address:'Teluk gong, Jl. V no.17A rt.07/017',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Aniwaku Tuarykitoy', nickname:'Ari', gender:'male', rawDate:'17 Desember 1992',
    phone:'08989886510', address:'Kp. Kalimati No. 66, RT016/RW03',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Halim Sinco Sudi', nickname:'Sinco', gender:'male', rawDate:'Medan, 23 Mei 1970',
    phone:'08161114994', address:'citra 6 blok H1 no.3 orange heliconia',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Steffany Mei Hun' },

  { name:'Steffany Mei Hun', nickname:'Mei Hun', gender:'female', rawDate:'Pulau halang, 28 Desember 1975',
    phone:'081513005955', address:'citra 6 blok H1 no.3 orange heliconia',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Tim Doa'],
    baptismStatus:'sudah', status:'active',
    spouseName:'Halim Sinco Sudi' },

  { name:'Chrisvico', nickname:'Chrisvico', gender:'male', rawDate:'Jakarta, 20 Desember 1987',
    phone:'083892433620', address:'Jelambar fajar jl.b Gg. R no.5',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Maria' },

  { name:'Maria', nickname:'Maria', gender:'female', rawDate:'Jakarta, 2 Maret 1987',
    phone:'08989913258', address:'Jelambar fajar jl.b Gg. R no.5',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Chrisvico' },

  { name:'Darriel Stevans Wilim', nickname:'Darriel', gender:'male', rawDate:'Jakarta, 28 Agustus 2005',
    phone:'081932326267', address:'Poris gaga indah, cluster permata blok G1 no.7E',
    maritalStatus:'Single', ibadah:['PBI','IR'], pelayan:['Paduan Suara','Sound Audio'],
    baptismStatus:'belum', status:'active' },

  { name:'Adellia Setiawan', nickname:'Adel', gender:'female', rawDate:'Jakarta, 8 November 2005',
    phone:'083806007888', address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Single', ibadah:['IR','RBI'], pelayan:['Pengurus ABI','Tamborin'],
    baptismStatus:'sudah', status:'active' },

  { name:'Antiony Hansen', nickname:'Antoni', gender:'male', rawDate:'Jakarta, 31 Oktober 1974',
    phone:'08161960933', address:'komplek mulia darma blok A no.34',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Lily' },

  { name:'Lily', nickname:'Lily', gender:'female', rawDate:'Jakarta, 13 Desember 1974',
    phone:'081617889005', address:'komplek mulia darma blok A no.34',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    spouseName:'Antiony Hansen' },

  { name:'Agus Durantes', nickname:'Agus', gender:'male', rawDate:'Jakarta, 24 Agustus 1984',
    phone:'081298427200', address:'Jelambar jaya 3 Gg. 16 no.58A',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Calvina', nickname:'Calvina', gender:'female', rawDate:'Jakarta, 15 Juni 1990',
    phone:'081316281700', address:'Jl. i no.3 Rt.008/06',
    maritalStatus:'Menikah', ibadah:['IR'], pelayan:['Tim Kunjungan'],
    baptismStatus:'sudah', status:'active' },

  { name:'Djie Josya Vellina', nickname:'Ango', gender:'female', rawDate:'Sijangkung, 3 Mei 1965',
    phone:'081379797706', address:'Jl. i no.3 Rt.008/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Dewi Yanti', nickname:'Yayan', gender:'female', rawDate:'Jakarta, 25 Mei 1974',
    phone:'087883499260', address:'Aladin baru Gg. sengol no.23 rt.10/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Djuni Ali', nickname:'Sunio', gender:'male', rawDate:'Jakarta, 22 September 1955',
    phone:'087859372778', address:'Teluk gong no.45 Rt.008/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Dody Johnlenard Maelissa', nickname:'Dody', gender:'male', rawDate:'Tual, 17 Oktober 1970',
    phone:'082122499155', address:'Jl. D no.61',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Moses Dolvin Maelissa', birthDate:'2007-04-10' },
      { name:'Natasha Fildy Maelissa', birthDate:'2003-09-17' },
    ] },

  { name:'Eva Yuliana', nickname:'Eva', gender:'female', rawDate:'Jakarta, 28 Juli 1985',
    phone:'077776386727', address:'Jelambar Fajar No.80',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Cecilia Ngo', nickname:'Sesil', gender:'female', rawDate:'Jakarta, 26 Februari 2006',
    address:'Jelambar fajar no.10 Rt.01/06',
    maritalStatus:'Single', ibadah:['IR','PBI'], baptismStatus:'belum', status:'active' },

  { name:'Budi Herimanto', nickname:'Cun-cun', gender:'male', rawDate:'Jakarta, 15 Januari 1971',
    phone:'08158862827', address:'Jl. K no.20 Rt.007/06',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Usher'],
    baptismStatus:'sudah', status:'active' },

  { name:'Eunike Stevanny', nickname:'Vani', gender:'female', rawDate:'Jakarta, 26 September 1987',
    phone:'087774484774', address:'Gang Timbul no.72B',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Ismariya Ticoalu', nickname:'Iis/Ismaria', gender:'female', rawDate:'Jakarta, 5 Mei 1961',
    phone:'085782158020', address:'Jl. Aladin, Gang Timbul No. 10 rt.009/06',
    maritalStatus:'Menikah', ibadah:['IR','WBI'], pelayan:['Tim Doa','Tim Kunjungan'],
    baptismStatus:'sudah', status:'active' },

  { name:'Lim Goat Ho', nickname:'Guat', gender:'female', rawDate:'BAA, 19 Mei 1940',
    address:'Komplek fajar permai, jl.i no.56 CN',
    maritalStatus:'Janda', ibadah:['IR'], pelayan:['Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  { name:'Malvin', nickname:'Malvin', gender:'male', rawDate:'Jakarta, 15 Juni 1995',
    phone:'089693475025', address:'pakuwon .6A',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Peony Kwan', nickname:'Peony', gender:'female', rawDate:'Jakarta, 26 Juni 2009',
    phone:'087780098807', address:'DHI Blok JJ no.53',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Denny', nickname:'Denny', gender:'male', rawDate:'Jakarta, 22 September 1980',
    phone:'085775105950', address:'JL. D komplek mulia dharma blok b no.8',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Ani Selvyana', nickname:'Ani', gender:'female', rawDate:'Jakarta, 22 Agustus 1984',
    phone:'0895602744484', address:'Jelambar fajar no.44 RT.001/006',
    maritalStatus:'Janda', ibadah:['IR','WBI'], baptismStatus:'sudah', status:'active' },

  { name:'Tan Hap Nia', nickname:'Nani', gender:'female', rawDate:'Jakarta, 15 April 1956',
    phone:'082298986218', address:'Jelambar aladin no.14A Gg. o Rt.005/06',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Rudy Sunjaya', nickname:'Rudy', gender:'male', rawDate:'Jakarta, 9 Mei 1988',
    phone:'081908006881', address:'Jelambar aladin no.14A Gg. o Rt.005/06',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pemuji','Pemusik'],
    baptismStatus:'sudah', status:'active' },

  { name:'Novany Tansika', nickname:'Nova', gender:'female', rawDate:'Jakarta, 17 November 1986',
    phone:'085280079595', address:'Vila taman Bandara Blok OI no.16B',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Johan Halim', nickname:'Johan', gender:'male', rawDate:'',
    address:'Kapuk, Gg tembok',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Yunia Sari' },

  { name:'Jofanny', nickname:'Jojo', gender:'female', rawDate:'Jakarta, 22 Juni 1998',
    phone:'085810204690', address:'Melati mas GG 13',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pemuji','Pemusik','Paduan Suara'],
    baptismStatus:'sudah', status:'active' },

  // More recent entries ───────────────────────────────────────────────────────
  { name:'Suhermanto', nickname:'Abing', gender:'male', rawDate:'Jakarta, 11 Maret 1971',
    phone:'0895387188823', address:'jelambar aladin no.48 rt.6/6',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Nathaniel', nickname:'Nata', gender:'male', rawDate:'Jakarta, 6 Oktober 1993',
    phone:'089646540466', address:'Jl. b no.44',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Lukas', nickname:'Lukas', gender:'male', rawDate:'Jakarta, 21 Oktober 1953',
    phone:'083891047553', address:'Jl. Rrt.11/17 belakang vihara kuning',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lina Susanti', nickname:'Lina', gender:'female', rawDate:'Pontianak, 30 Juli 1981',
    phone:'081996026431', address:'Tpi blok pbb no.9b',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Lim Nyoek Lan', nickname:'Nyuk Lan', gender:'female', rawDate:'Bangka, 15 Desember 1954',
    address:'jelambar jaya II no.58',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Kries Aryanto', nickname:'Kris', gender:'male', rawDate:'Jakarta, 1 Agustus 1995',
    phone:'087819137239', address:'jelambar aladin no.48',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Callysta Queensly', nickname:'Queensly', gender:'female', rawDate:'Jakarta, 9 November 2009',
    phone:'088294170254', address:'jembatan 2 gg sinar budi no.30',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Fina', nickname:'Fina', gender:'female', rawDate:'Parit, 22 Maret 1984',
    phone:'085142317352', address:'Teluk gong gg. c no.60 rt.3/17',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Koce Selvana', nickname:'Selvana', gender:'female', rawDate:'Ambon, 17 Agustus 1999',
    phone:'082248228846', address:'Angke jaya no.11 rt.9/5',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Nori', nickname:'Nori', gender:'female', rawDate:'Jakarta, 4 April 1963',
    phone:'087846854628', address:'Teluk gong, gg naga rt.8/7 no.1B',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Alan', nickname:'Alan', gender:'male', rawDate:'Jakarta, 11 Juli 1964',
    phone:'082114496309', address:'Fajar Gg. J no.30',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Wijaya', nickname:'Wijaya', gender:'male', rawDate:'BAA, 20 Februari 1984',
    phone:'082321963576', address:'Teluk gong gg. c no.60 rt.3/17',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Brayen Limanto', nickname:'Brayen', gender:'male', rawDate:'Jakarta, 17 Juni 2006',
    phone:'081765988291', address:'Tpi blok pbb no.9b',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Desy', nickname:'Desy', gender:'female', rawDate:'Jakarta, 25 Januari 1990',
    phone:'081265753443', address:'Gg. kantong kampung gusti',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Yuanissa', nickname:'Yuanissa', gender:'female', rawDate:'Jakarta, 7 November 1990',
    phone:'087888331990', address:'Jelambar fajar Gg. u no.17 Rt.001/017',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Muliana', nickname:'Muliana', gender:'female', rawDate:'Jakarta, 12 Februari 1983',
    phone:'081311815409', address:'Jl. D no.35b',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Robby Erianto', nickname:'Robby', gender:'male', rawDate:'Jakarta, 16 Mei 1974',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Kian Nio', nickname:'Cikian', gender:'female', rawDate:'Jakarta, 19 Januari 1958',
    address:'Teluk gong rt.3/17',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Asmad', nickname:'Jokseng', gender:'male', rawDate:'Jakarta, 20 April 1957',
    phone:'087742136778', address:'Jelambar barat gg iman 3',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lauw A Nauw', nickname:'Anaw', gender:'male', rawDate:'Tangerang, 18 Februari 1954',
    address:'Aladin',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Daniel Januarta', nickname:'Daniel', gender:'male', rawDate:'Jakarta, 9 Januari 2003',
    phone:'081384320675', address:'kapuk raya gg. sinar no. 24A rt.005/002',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Nani', nickname:'Nani', gender:'female', rawDate:'7 Mei',
    phone:'085311221078', address:'Kampung gusti',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Johan Efendy', nickname:'Johan', gender:'male', rawDate:'Jakarta, 13 Januari 1979',
    phone:'085933443755', address:'Kapuk',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Hendra Irfan Sitorus', nickname:'Hendra', gender:'male', rawDate:'Jakarta, 16 Agustus 1988',
    phone:'085979243979', address:'kost disebelah vihara kuning',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Andy Ma', nickname:'Andy', gender:'male', rawDate:'Jakarta, 12 Januari 1988',
    phone:'082182517133', address:'Teluk gong',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Sudarti', nickname:'Sudarti', gender:'female', rawDate:'Semarang, 21 Januari 1970',
    phone:'085875788000', address:'Gg. damai',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Lun Nio', nickname:'Luni', gender:'female', rawDate:'Jakarta, 17 September 1970',
    phone:'087785191930', address:'Jelambar Aladin no.5 rt.01/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Lita', nickname:'Lita', gender:'female', rawDate:'Jakarta, 18 November 2002',
    phone:'0895611786721', address:'Jelambar utama sakti raya no.17A',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Wun Wun', nickname:'Wunwun', gender:'female', rawDate:'Jakarta, 25 Mei 2003',
    phone:'089997599735', address:'Hanura raya no.11',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Elisa Marcela', nickname:'Caca/Heriandi', gender:'female', rawDate:'Tangerang, 14 Juli 2003',
    phone:'081290688502', address:'kedaung wetan rt.04/01 neglasari, tangerang',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Nadira Aulia Putri', nickname:'Nadine', gender:'female', rawDate:'Jakarta, 26 November 2001',
    phone:'087787107335', address:'kelapa lllin timur NI 16 no.3-4',
    maritalStatus:'Single', ibadah:['IR'], pelayan:['Pengurus ABI'],
    baptismStatus:'sudah', status:'active' },

  { name:'Felicia Iren Setiawan', nickname:'Felicia', gender:'female', rawDate:'Tangerang, 21 Juli 1992',
    phone:'08128900009925', address:'ielambar aladin Gg. o ni.41',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Cerry Kwan Su Li', nickname:'Cery', gender:'female', rawDate:'Jakarta, 8 Oktober 2007',
    phone:'085718590036', address:'Teluk gong Gg Naga no.26 rt.07/06',
    maritalStatus:'Single', ibadah:['IR','PBI'], baptismStatus:'sudah', status:'active' },

  { name:'Felycia Claurina Dermawan', nickname:'Felis', gender:'female', rawDate:'Jakarta, 29 September 2007',
    phone:'081295071402', address:'Jl. Jelambar Aladin no.29 A rt.006/06',
    maritalStatus:'Single', ibadah:['IR','RBI'], pelayan:['Pemusik','Tamborin'],
    baptismStatus:'sudah', status:'active' },

  { name:'Albert Willyanto', nickname:'Albert', gender:'male', rawDate:'Bojong Renged, 2 April 2004',
    phone:'085814555958', address:'Bojong Renged no. 6 RT009/RW04 Tangerang',
    maritalStatus:'Single', ibadah:['PBI'], baptismStatus:'belum', status:'active' },

  { name:'Jonathan Aviel Crisnanda', nickname:'Jonathan', gender:'male', rawDate:'Jakarta, 27 Maret 2010',
    phone:'085810396693', address:'Jelambar Fajar No. 80 rt.4/6',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Misti', nickname:'Misti', gender:'female', rawDate:'Indramayu, 31 Desember 1971',
    address:'kapuk raya gg. sinar no. 24A rt.005/002',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Chelsie Maretha', nickname:'Chelsie', gender:'female', rawDate:'Jakarta, 16 Maret 2007',
    address:'Teluk gong',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Tanu Kusuma', nickname:'Yoyong', gender:'male', rawDate:'Jakarta, 5 Oktober 1968',
    phone:'081218667321', address:'aladin no.48 rt.01/06',
    maritalStatus:'Duda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Violet Octavia', nickname:'Violet', gender:'female', rawDate:'Jakarta, 18 Januari 2010',
    address:'Jelambar Aladin No. 75',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Ignatius Tobias Livero', nickname:'Tobias', gender:'male', rawDate:'Jakarta, 9 Juli 2009',
    address:'Jl. I GG.Fajar RT.002/017 no.25 A',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Jennifer Anabella Queenzha', nickname:'Jeni', gender:'female', rawDate:'Jakarta, 21 Januari 2011',
    phone:'087781137787', address:'Jl. Jelambar Aladin Rt.006/006 Jakarta Utara 14450',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Silviyani', nickname:'Silvi', gender:'female', rawDate:'Pandeglang, 24 Mei 2011',
    phone:'085977150391', address:'Jl. Jelambar Aladin no.32 Rt.006/006',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Jonathan Jorell Sutanto', nickname:'Jojo', gender:'male', rawDate:'Jakarta, 10 Agustus 2009',
    phone:'087789789558', address:'Jelambar Fajar jln i no. rw : 002/017',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Nathania Kirsten', nickname:'Tania', gender:'female', rawDate:'Jakarta, 19 Agustus 2006',
    phone:'081807590988', address:'Jelambar aladin no.80A Rt.004/06',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Cleodora Kirsten', nickname:'Cleo', gender:'female', rawDate:'Jakarta, 25 Februari 2011',
    phone:'087818316260', address:'Jelambar aladin no.80A Rt.004/06',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Ceria Angelia Loven', nickname:'Ceria', gender:'female', rawDate:'Jakarta, 15 Februari 2006',
    phone:'08979880334', address:'Jelambar Aladin no.10',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Hami Pattipellohy', nickname:'Harni', gender:'female', rawDate:'Ulath, 28 Agustus 1976',
    phone:'082114071715', address:'Kampung gusti Rt,002/015',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Natasia', nickname:'Sia (nicho bu Iing)', gender:'female', rawDate:'Jakarta, 23 Desember 2002',
    phone:'082114298519', address:'krendang timur no.15c rt.10/01',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Rafhael Lorensia', nickname:'Rafael', gender:'male', rawDate:'Medan, 29 Juni 2007',
    phone:'081324901093', address:'Medang raya no.76 rt.2/22, tangerang',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Tommy', nickname:'Tommy', gender:'male', rawDate:'Jakarta, 24 Mei 1996',
    phone:'087875179855', address:'Jelambar aladin Gg. N no.32 Rt.6/06',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Veronica', nickname:'Vera', gender:'female', rawDate:'Jakarta, 7 Januari 2002',
    phone:'087737657970', address:'Aladin baru Gg. sengol no.23 rt.10/06',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Velli Yanti', nickname:'Veli', gender:'female', rawDate:'Jakarta, 6 Desember 2006',
    phone:'087889571564', address:'Aladin baru Gg. sengol no.23 rt.10/06',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Yona Teresa Latupeirissa', nickname:'Yona', gender:'female', rawDate:'Haria, 22 Oktober 1997',
    phone:'082310716984', address:'Jelambar Aladin no.10',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Angel Latuperissa', nickname:'Angel', gender:'female', rawDate:'Haria, 29 April 2008',
    phone:'081389009964', address:'Jelambar Aladin no.10',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Lanny', nickname:'Lanny', gender:'female', rawDate:'Jakarta, 25 Januari 1987',
    phone:'087877357751', address:'Jelambar fajar, jl.i no.5c',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Jason', nickname:'Jason', gender:'male', rawDate:'Jakarta, 22 Agustus 2009',
    phone:'081585539896', address:'Jl. D no.16 Gg Timbul',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'William F. Kusuma', nickname:'William', gender:'male', rawDate:'Jakarta, 12 Juli 2004',
    phone:'081386280179', address:'Poris indah blok C no.837',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Nurlia P. Sihombing', nickname:'Lia', gender:'female', rawDate:'Adiamangka, 24 Juni 1996',
    phone:'082184858413', address:'Gang timbul kost',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Santi', nickname:'Santi', gender:'female', rawDate:'Jakarta, 5 Desember 1970',
    phone:'085714931885', address:'Gang Naga Rt.01/06',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Diana', nickname:'Diana', gender:'female', rawDate:'Jakarta, 1 Juni 2001',
    phone:'081908818787', address:'Jelambar fajar, Gg. damai no.22',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Benny Nauli', nickname:'Benny', gender:'male', rawDate:'23 Februari 1995',
    phone:'087823031501', address:'kapuk',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Ong Sumi', nickname:'Uming', gender:'female', rawDate:'Jakarta, 20 Juli 1954',
    phone:'087883890399', address:'Tpi',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Jafar Arifin Barus', nickname:'Apin', gender:'male', rawDate:'Kaban Jahe sumut, 30 Agustus 1964',
    phone:'081321085508', address:'Tangerang',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Agus Durantes', nickname:'Agus', gender:'male', rawDate:'Jakarta, 24 Agustus 1984',
    phone:'081298427200', address:'Jelambar jaya 3 Gg. 16 no.58A',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], pelayan:['Multimedia Produksi'],
    baptismStatus:'sudah', status:'active' },

  { name:'Bobi Leo', nickname:'Bobi', gender:'male', rawDate:'15 Agustus 1973',
    phone:'087739675218', address:'',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active',
    children:[ { name:'Shendy Saputra', birthDate:'2010-09-18' } ] },

  { name:'Ase', nickname:'Ase', gender:'female', rawDate:'4 Juni 1962',
    address:'',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Tiu Kiong Chin', nickname:'Acin', gender:'male', rawDate:'Medan, 25 Maret 1961',
    address:'',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    children:[
      { name:'Veni', birthDate:'1988-08-24' },
      { name:'Jesika', birthDate:'1992-05-02' },
      { name:'Tomi', birthDate:'1996-05-24' },
      { name:'Nicho', birthDate:'2002-08-04' },
    ] },

  { name:'Vonny Leonita', nickname:'Vonny', gender:'female', rawDate:'17 Agustus 1992',
    phone:'081294203913', address:'',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Colvin Richad', nickname:'Richad', gender:'male', rawDate:'Jakarta, 4 Februari 1996',
    phone:'085865380812', address:'Jelambar Aladin No. 56B',
    maritalStatus:'Single', ibadah:['IR','RBI'], baptismStatus:'belum', status:'active' },

  { name:'Lily Octavia Lena', nickname:'Lily', gender:'female', rawDate:'Jakarta, 29 Oktober 1974',
    phone:'081290790008', address:'Jelambar Barat Gg. Iman IV NO. 35 RT/RW: 002/010.',
    maritalStatus:'Janda', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Vina', nickname:'Vina', gender:'female', rawDate:'Jakarta, 14 November 1996',
    phone:'081389131268', address:'Jelambar Barat Gg. Iman IV NO. 35 RT/RW: 002/010.',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Vincent Leonardo', nickname:'Vincent', gender:'male', rawDate:'Jakarta, 03 September 1996',
    phone:'081284548969', address:'Jelambar Barat Gg. Iman IV NO. 35 RT/RW: 002/010.',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active',
    spouseName:'Vina' },

  { name:'Christoper Peter', nickname:'Peter', gender:'male', rawDate:'Jakarta, 21 November 1988',
    phone:'081282483545', address:'Jelambar Baru VI no 23 Rt 012 Rw 07',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Stefhani Widyanti', nickname:'Stefhani', gender:'female', rawDate:'Jakarta, 1 September 1993',
    phone:'08988755563', address:'Duri utara 1 no.8 rt.008/03',
    maritalStatus:'Menikah', ibadah:['IR','KOMPAS'], baptismStatus:'sudah', status:'active',
    children:[ { name:'Quianna Callista Pramudana', birthDate:'2023-03-23' } ] },

  { name:'Lusyana Caroline Putri', nickname:'Ucy', gender:'female', rawDate:'Jakarta, 29 April 1998',
    phone:'081908245457', address:'Jl. Kp gusti gg kantong Rt 005/015 No. 23',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Ema', nickname:'Eman', gender:'female', rawDate:'Jakarta, 26 September 1974',
    phone:'085811093622', address:'Kapuk, Jl. H Jajri Rt.15/12',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Jong Foe Joen', nickname:'Puyun', gender:'male', rawDate:'Jakarta, 9 Januari 1947',
    address:'Fajar Gg. J Rt.001/017',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },

  { name:'Sudarma Wijaya', nickname:'Sudarma', gender:'male', rawDate:'Jakarta, 13 Maret 1959',
    address:'Komplek fajar permai, jl.i no.56 AF',
    maritalStatus:'Menikah', ibadah:['IR','WBI','KOMPAS'], baptismStatus:'belum', status:'active' },

  { name:'Christiana', nickname:'Christiana', gender:'female', rawDate:'Jakarta, 29 Agustus 1988',
    phone:'087880258044', address:'',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Indra', nickname:'Indra', gender:'male', rawDate:'21 April 1987',
    phone:'08176768192', address:'',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active',
    children:[
      { name:'Davin Emmanuel Caleb', birthDate:'2012-01-03' },
      { name:'Emily Juanita Estelle', birthDate:'2015-07-29' },
    ] },

  { name:'Heriandi Setiawan', nickname:'Andi', gender:'male', rawDate:'Jakarta, 3 Oktober 1996',
    address:'Jelambar fajar no.17 Rt.004/006',
    maritalStatus:'Single', ibadah:['IR'], baptismStatus:'belum', status:'active' },

  { name:'Novany Tansika', nickname:'Nova', gender:'female', rawDate:'Jakarta, 17 November 1986',
    phone:'085280079595', address:'Vila taman Bandara Blok OI no.16B',
    maritalStatus:'Menikah', ibadah:['IR'], baptismStatus:'sudah', status:'active' },
];

// ── Import function ───────────────────────────────────────────────────────────
export async function importCongregationData(
  onProgress?: (done: number, total: number, label: string) => void
): Promise<{ inserted: number; skipped: number; errors: number }> {
  // 1. Load all existing member names
  const [{ data: d1 }, { data: d2 }] = await Promise.all([
    supabase.from(KV).select('key, value').like('key', 'congregation:member:%'),
    supabase.from(KV).select('key, value').like('key', 'member:%'),
  ]);

  const existingNames = new Set<string>();
  for (const r of [...(d1 || []), ...(d2 || [])]) {
    const name = (r.value as any)?.name;
    if (name) existingNames.add(name.trim().toLowerCase());
  }

  // 2. Deduplicate seed data by name
  const seenSeed = new Set<string>();
  const uniqueSeed: SeedMember[] = [];
  for (const s of SEED) {
    const key = s.name.trim().toLowerCase();
    if (!seenSeed.has(key)) { seenSeed.add(key); uniqueSeed.push(s); }
  }

  let inserted = 0, skipped = 0, errors = 0;
  const total = uniqueSeed.length;

  for (let i = 0; i < uniqueSeed.length; i++) {
    const s = uniqueSeed[i];
    onProgress?.(i, total, s.name);

    const nameLower = s.name.trim().toLowerCase();
    if (existingNames.has(nameLower)) { skipped++; continue; }

    try {
      const { birthPlace, birthDate } = parseDate(s.rawDate || '');
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Infer gender from marital status if not set
      let gender: 'male' | 'female' = s.gender || 'male';
      if (!s.gender) {
        const ml = (s.maritalStatus || '').toLowerCase();
        if (ml === 'janda') gender = 'female';
        if (ml === 'duda') gender = 'male';
      }

      const record: Record<string, any> = {
        id,
        name: s.name.trim(),
        nickname: s.nickname || undefined,
        email: '',
        phone: s.phone || '',
        address: s.address || '',
        birthPlace: birthPlace || undefined,
        birthDate: birthDate || '',
        gender,
        maritalStatus: ms(s.maritalStatus),
        baptismStatus: s.baptismStatus || 'belum',
        status: s.status || 'new',
        ibadah: s.ibadah || ['IR'],
        pelayan: s.pelayan || [],
        spouseName: s.spouseName || undefined,
        children: s.children || [],
        komselJoined: false,
        joinDate: now,
        createdAt: now,
        updatedAt: now,
      };

      const primaryKey = `congregation:member:${id}`;
      const { error } = await supabase.from(KV).insert({ key: primaryKey, value: record });
      if (error) { console.error('Insert error', s.name, error); errors++; }
      else { existingNames.add(nameLower); inserted++; }
    } catch (e) {
      console.error('Error inserting', s.name, e);
      errors++;
    }
  }

  onProgress?.(total, total, 'Selesai');
  return { inserted, skipped, errors };
}
