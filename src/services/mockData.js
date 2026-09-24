// mockData.js — sample content for the in-memory demo.
// Everything here is invented for the prototype: team names, players and scores
// are placeholders until real data is published through the platform.

const EAT = '+03:00';
const at = (date, time = '10:00') => `${date}T${time}:00${EAT}`;

/* ---------- Deterministic roster generator ------------------------------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FIRST = ['Brian', 'Kevin', 'Faith', 'Mercy', 'Dennis', 'Grace', 'Ian', 'Cynthia', 'Victor', 'Joy', 'Samuel', 'Naomi',
  'Kelvin', 'Beatrice', 'Elvis', 'Purity', 'Collins', 'Lilian', 'Festus', 'Winnie', 'Allan', 'Sharon', 'Martin', 'Esther'];
const LAST = ['Otieno', 'Wanjiku', 'Mutua', 'Kamau', 'Wafula', 'Achieng', 'Kiptoo', 'Musyoka', 'Njoroge', 'Omondi', 'Nyaga',
  'Barasa', 'Mwangi', 'Atieno', 'Kariuki', 'Wekesa', 'Kilonzo', 'Chebet', 'Odhiambo', 'Muthoni', 'Simiyu', 'Kimani'];
const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'P'];

function roster(teamId, seed) {
  const next = rng(seed);
  const names = new Set();
  const numbers = new Set();
  return POSITIONS.map((position, i) => {
    let name;
    do { name = `${FIRST[Math.floor(next() * FIRST.length)]} ${LAST[Math.floor(next() * LAST.length)]}`; } while (names.has(name));
    names.add(name);
    let jersey;
    do { jersey = 1 + Math.floor(next() * 45); } while (numbers.has(jersey));
    numbers.add(jersey);
    return { id: `${teamId}-p${i + 1}`, teamId, name, jersey, position, bio: '' };
  });
}

/* ---------- Organizations (federations / governing bodies) --------------- */
const organizations = [
  { id: 'o1', name: 'Kenya Baseball & Softball Federation', kind: 'National federation', leagueIds: ['l1'] },
  { id: 'o2', name: 'Kenya Schools Baseball Association', kind: 'Schools body', leagueIds: ['l2'] },
];

/* ---------- Leagues and teams -------------------------------------------- */
const leagues = [
  {
    id: 'l1', orgId: 'o1', name: 'Kenya Community Series 2026', kind: 'League', season: '2026',
    blurb: 'Regular-season round robin for community clubs and academies.',
    teamIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't7'],
  },
  {
    id: 'l2', orgId: 'o2', name: 'Koshien Kenya Qualifier 2026', kind: 'Tournament', season: '2026',
    blurb: 'Group stage for school and academy teams.',
    teamIds: ['t1', 't3', 't4', 't5'],
  },
];

const teams = [
  { id: 't1', name: 'Juja Sluggers', short: 'JUJ', county: 'Kiambu', region: 'Juja, Kiambu', homeField: 'Field of Dreams, Juja', founded: 2021, type: 'Community club', color: '#0d2240', status: 'approved', orgId: 'o1', leagueIds: ['l1', 'l2'], about: 'A university-town club that trains three evenings a week and runs a beginners session every Saturday.' },
  { id: 't2', name: 'Nairobi Thunder', short: 'NRB', county: 'Nairobi', region: 'Nairobi', homeField: 'Nairobi Community Diamond', founded: 2020, type: 'Community club', color: '#c8102e', status: 'approved', orgId: 'o1', leagueIds: ['l1'], about: 'City club with a strong pitching group and the largest supporters section in the league.' },
  { id: 't3', name: 'Makueni Rising Stars', short: 'MKN', county: 'Makueni', region: 'Wote, Makueni', homeField: 'Wote Sports Ground', founded: 2022, type: 'School academy', color: '#0a7a42', status: 'approved', orgId: 'o1', leagueIds: ['l1', 'l2'], about: 'Academy side built from local primary and secondary school players.' },
  { id: 't4', name: 'Kakamega Comets', short: 'KKG', county: 'Kakamega', region: 'Kakamega', homeField: 'Kakamega Academy Field', founded: 2022, type: 'School academy', color: '#6b2d8b', status: 'approved', orgId: 'o1', leagueIds: ['l1', 'l2'], about: 'Western Kenya academy focused on junior development and school tournaments.' },
  { id: 't5', name: 'Kisumu Lake Hawks', short: 'KSM', county: 'Kisumu', region: 'Kisumu', homeField: 'Lakeside Diamond', founded: 2021, type: 'Community club', color: '#0b6fa4', status: 'approved', orgId: 'o1', leagueIds: ['l1', 'l2'], about: 'Lakeside club known for aggressive base running.' },
  { id: 't6', name: 'Mombasa Tide', short: 'MSA', county: 'Mombasa', region: 'Mombasa', homeField: 'Coast Community Diamond', founded: 2023, type: 'Community club', color: '#a5470b', status: 'approved', orgId: 'o1', leagueIds: ['l1'], about: 'The coast’s newest club, playing its first full season.' },
  { id: 't7', name: 'Nakuru Flamingos', short: 'NKR', county: 'Nakuru', region: 'Nakuru', homeField: 'Nakuru Town Diamond', founded: 2021, type: 'Community club', color: '#c2255c', status: 'approved', orgId: 'o1', leagueIds: ['l1'], about: 'Rift Valley club with a young roster and a growing fan base.' },
  { id: 't8', name: 'Bungoma Bulls', short: 'BGM', county: 'Bungoma', region: 'Bungoma', homeField: 'Bungoma Schools Field', founded: 2025, type: 'School academy', color: '#374151', status: 'pending', orgId: 'o1', leagueIds: [], about: '', managerName: 'Mr. Wekesa', contact: 'bulls@example.org' },
];

const players = [
  ...roster('t1', 11), ...roster('t2', 22), ...roster('t3', 33), ...roster('t4', 44),
  ...roster('t5', 55), ...roster('t6', 66), ...roster('t7', 77),
];

/* ---------- Matches ------------------------------------------------------- */
// Written away-first, the way a scorebook is: final(id, league, date, awayId, awayRuns, homeId, homeRuns, recap)
let n = 0;
function final(id, leagueId, date, awayId, away, homeId, home, recap = '', status = 'final') {
  n += 1;
  const hits = { away: away.reduce((a, b) => a + b, 0) + 3 + (n % 3), home: home.reduce((a, b) => a + b, 0) + 3 + ((n + 1) % 3) };
  const errors = { away: (n + 1) % 3, home: n % 3 };
  const homeTeam = teams.find((t) => t.id === homeId);
  return {
    id, leagueId, awayId, homeId, date: at(date), venue: homeTeam.homeField, status,
    innings: { away, home }, hits, errors, recap,
    submittedBy: 'u-manager',
    verifiedBy: status === 'final' ? 'u-admin' : null,
    adminNote: '',
  };
}

function scheduled(id, leagueId, date, awayId, homeId, time = '10:00') {
  const homeTeam = teams.find((t) => t.id === homeId);
  return {
    id, leagueId, awayId, homeId, date: at(date, time), venue: homeTeam.homeField, status: 'scheduled',
    innings: null, hits: null, errors: null, recap: '', submittedBy: null, verifiedBy: null, adminNote: '',
  };
}

const matches = [
  // Community Series, verified
  final('m1', 'l1', '2026-08-09', 't2', [1, 0, 0, 2, 0, 1, 0], 't1', [0, 2, 0, 1, 3, 0, 1], 'Juja pulled away with a three-run fifth.'),
  final('m2', 'l1', '2026-08-09', 't4', [0, 1, 0, 0, 0, 0, 1], 't3', [0, 0, 1, 0, 0, 2, 0], 'Makueni scored twice in the sixth to take a tight game.'),
  final('m3', 'l1', '2026-08-16', 't6', [0, 0, 2, 0, 0, 1, 0], 't5', [3, 0, 0, 1, 0, 0, 2]),
  final('m4', 'l1', '2026-08-16', 't1', [2, 0, 1, 0, 0, 3, 0], 't7', [0, 0, 0, 1, 0, 0, 0], 'Juja’s bats woke up in the sixth.'),
  final('m5', 'l1', '2026-08-23', 't3', [0, 0, 0, 2, 0, 0, 0], 't2', [1, 1, 0, 0, 4, 0, 0]),
  final('m6', 'l1', '2026-08-23', 't5', [1, 0, 2, 0, 0, 2, 0], 't4', [0, 0, 0, 0, 0, 0, 1]),
  final('m7', 'l1', '2026-08-30', 't7', [0, 1, 0, 0, 1, 0, 0], 't6', [2, 0, 0, 3, 0, 0, 1], 'Mombasa’s first home win of the season.'),
  final('m8', 'l1', '2026-08-30', 't3', [1, 0, 0, 1, 0, 0, 0], 't1', [0, 4, 0, 0, 2, 0, 1]),
  final('m9', 'l1', '2026-09-06', 't5', [1, 0, 0, 0, 2, 0, 1], 't2', [0, 0, 2, 0, 0, 1, 0], 'Kisumu came from behind late in Nairobi.'),
  final('m10', 'l1', '2026-09-06', 't7', [0, 0, 1, 0, 0, 1, 0], 't4', [1, 0, 0, 1, 0, 0, 0], 'Called level at the time limit.'),
  final('m11', 'l1', '2026-09-13', 't1', [1, 0, 3, 0, 0, 2, 1], 't6', [0, 0, 0, 2, 0, 0, 0]),
  final('m12', 'l1', '2026-09-13', 't5', [0, 0, 2, 0, 3, 0, 0], 't3', [0, 1, 0, 0, 0, 0, 0]),
  final('m13', 'l1', '2026-09-13', 't2', [1, 1, 0, 3, 0, 0, 1], 't7', [0, 0, 0, 0, 2, 0, 0]),
  // Submitted by a team manager, waiting for the federation
  final('m14', 'l1', '2026-09-20', 't5', [0, 2, 0, 0, 1, 0, 0], 't1', [1, 0, 2, 0, 0, 4, 0], 'Juja’s sixth inning decided it.', 'pending'),
  final('m15', 'l1', '2026-09-20', 't6', [2, 0, 0, 1, 0, 1, 0], 't4', [0, 0, 1, 0, 0, 0, 2], '', 'pending'),
  // Upcoming
  scheduled('m16', 'l1', '2026-09-26', 't1', 't2'),
  scheduled('m17', 'l1', '2026-09-26', 't5', 't7', '14:00'),
  scheduled('m18', 'l1', '2026-09-27', 't6', 't3'),
  scheduled('m19', 'l1', '2026-10-03', 't4', 't2'),
  scheduled('m20', 'l1', '2026-10-03', 't7', 't3', '14:00'),
  scheduled('m21', 'l1', '2026-10-04', 't4', 't1'),
  // Koshien Kenya Qualifier
  final('m22', 'l2', '2026-09-05', 't4', [0, 0, 1, 0, 0, 0, 0], 't3', [0, 2, 0, 0, 1, 0, 0]),
  final('m23', 'l2', '2026-09-05', 't5', [0, 0, 0, 0, 1, 0, 0], 't1', [2, 0, 0, 4, 0, 0, 0]),
  final('m24', 'l2', '2026-09-12', 't3', [0, 0, 0, 2, 0, 0, 0], 't1', [1, 0, 1, 0, 0, 0, 2]),
  final('m25', 'l2', '2026-09-12', 't4', [1, 0, 0, 0, 0, 0, 2], 't5', [0, 3, 0, 0, 0, 2, 0]),
  scheduled('m26', 'l2', '2026-10-10', 't4', 't1'),
  scheduled('m27', 'l2', '2026-10-10', 't5', 't3', '14:00'),
];

const news = [
  { id: 'n1', tag: 'Results', date: '2026-09-14', title: 'Community Series: weekend results verified', summary: 'Three games from 13 September are now official and counted in the standings.' },
  { id: 'n2', tag: 'Tournaments', date: '2026-09-13', title: 'Koshien Kenya qualifier: last group games on 10 October', summary: 'Four academies are level enough that both remaining games matter for the table.' },
  { id: 'n3', tag: 'Guide', date: '2026-09-08', title: 'Share a match recap on WhatsApp in two taps', summary: 'Open any result, choose Recap image, and your phone’s share sheet does the rest.' },
];

export const seed = { organizations, leagues, teams, players, matches, news };
