// Holt echte Monats-Windverteilungen von WhenWhereKite (Quelltext, inline jqxChart-Array `sampleData1`)
// und schreibt sie pro Spot in spots/<id>.json als windChart. Leitet auch wind.reliability aus WWK ab.
// Spots ohne WWK-Seite behalten ihre ERA5-Daten (als windChart mit source=ERA5).
//
// WWK-Bins (Beaufort) → Knoten laut Legende:  b3-4=[12,16]  b4-5=[16,22]  b5-6=[22,28]  b6p=>28
// Quelle ist Kiter-Feedback (kein Messinstrument), bildet aber lokale Effekte ab — anders als ERA5.
//
// Lauf:  node gen-wind-wwk.mjs    (Internet nötig; danach Daten neu in index.html einbetten)

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'spots');
const BASE = 'https://whenwherekite.com/';
const WWK_BINS = ['12–16', '16–22', '22–28', '>28'];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// id -> WWK-Slug (oder [slug, proxy-Hinweis]). Spots ohne Eintrag = kein WWK -> ERA5 bleibt.
const SLUGS = {
  fuerteventura: 'Fuerteventura-Canary-Islands-Spain',
  'el-medano': ['Tenerife-Canary-Islands-Spain', 'Tenerife (WWK hat keinen eigenen El-Médano-Eintrag)'],
  tarifa: 'Tarifa-Spain',
  'gran-canaria': 'Vargas-Grande-Canarie-Canary-Islands-Spain',
  'kap-verde': 'Santa-Maria-Sal-Cabo-Verde',
  'lo-stagnone': 'Lo-stagnone-Marsala-Sicily-Italy',
  noordwijk: 'Noordwijk-aan-Zee-The-Netherlands',
  dakhla: 'Dakhla-Morocco',
  kalpitiya: 'Kalpitiya-Sri-Lanka',
  rhodos: 'Rhodes-Greece',
  zanzibar: 'Paje-Zanzibar-Tanzania',
  babaomby: 'Babaomby-North-Madagascar',
  essaouira: 'Essaouira-Morocco',
  masirah: 'Masirah-Island-Oman',
  aruba: 'Aruba-Caribbean-The-Netherlands',
  eilat: 'Eilat-Israel',
  socotra: 'Socotra-Yemen',
  leucate: 'Leucate-Aude-France',
  lanzarote: 'Lanzarote-Canary-Islands-Spain',
  paros: 'Paros-Greece',
  naxos: 'Naxos-Greece',
  lefkada: 'Levkada-Greece',
  guincho: 'Guincho-Portugal',
  calvi: 'Calvi-Corsica-France',
  urla: ['Pirlanta-Turkey', 'Pırlanta/Çeşme (WWK hat keinen eigenen Urla-Eintrag)'],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchWWK(slug) {
  const url = BASE + slug + '.html';
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const html = await r.text();
  const m = html.match(/var sampleData1\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error('kein sampleData1');
  const rows = Function('"use strict";return (' + m[1] + ')')();
  if (!Array.isArray(rows) || rows.length !== 12) throw new Error('unerwartet: ' + (rows && rows.length) + ' Zeilen');
  const pct = {};
  rows.forEach((r, i) => { pct[i + 1] = [r['b3-4'] | 0, r['b4-5'] | 0, r['b5-6'] | 0, r['b6p'] | 0]; });
  return { url, pct };
}

// reliability aus WWK: Mittel der 3 windigsten Monate (windig% = Summe aller Bins, ≥12 kn)
function reliabilityFrom(pct) {
  const windy = Object.values(pct).map(a => a.reduce((x, y) => x + y, 0)).sort((a, b) => b - a);
  return Math.round((windy[0] + windy[1] + windy[2]) / 3);
}

const ids = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
let wwk = 0, era5 = 0;
for (const id of ids) {
  const path = join(DIR, id + '.json');
  const s = JSON.parse(readFileSync(path, 'utf8'));
  const entry = SLUGS[id];

  if (entry) {
    const [slug, proxy] = Array.isArray(entry) ? entry : [entry, null];
    process.stdout.write(`${id} ← WWK ${slug} … `);
    try {
      const { url, pct } = await fetchWWK(slug);
      const rel = reliabilityFrom(pct);
      const old = s.wind.reliability;
      s.wind.reliability = rel;
      s.windChart = {
        source: 'WhenWhereKite (Kiter-Feedback)', url, bins: WWK_BINS, pct,
        ...(proxy ? { proxy } : {}),
      };
      delete s.windEra5; delete s.windMonthly; delete s.windStats;
      writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
      console.log(`ok · reliability ${old}→${rel}% · Peak ${Math.max(...Object.values(pct).map(a => a.reduce((x, y) => x + y)))}%${proxy ? ' (Proxy)' : ''}`);
      wwk++;
    } catch (e) {
      console.log('FEHLER:', e.message, '→ behalte ERA5');
      if (s.windEra5) { s.windChart = s.windEra5; delete s.windEra5; writeFileSync(path, JSON.stringify(s, null, 2) + '\n'); }
      era5++;
    }
    await sleep(500);
  } else {
    // kein WWK-Eintrag → ERA5 behalten, nur Feldname vereinheitlichen
    if (s.windEra5) { s.windChart = s.windEra5; delete s.windEra5; }
    delete s.windMonthly; delete s.windStats;
    writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
    console.log(`${id} ← ERA5 (kein WWK-Eintrag)`);
    era5++;
  }
}
console.log(`\nfertig: ${wwk} Spots aus WhenWhereKite, ${era5} aus ERA5 (Fallback).`);
