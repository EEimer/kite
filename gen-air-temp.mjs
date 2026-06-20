// Holt die monatliche Lufttemperatur (Tageshöchstwert-Mittel) je Spot aus dem Open-Meteo ERA5-Archiv
// und schreibt sie als air.byMonth {1..12} in spots/<id>.json. Nur Node, Internet nötig.
//   node gen-air-temp.mjs
// "Tageshöchst-Mittel" = typische Nachmittagshitze (wenn man kitet). Quelle: temperature_2m_max, gemittelt.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = 'spots';
const START = '2022-01-01';
const END = '2024-12-31';

const COORDS = {
  fuerteventura:[28.71,-13.83], 'el-medano':[28.045,-16.535], tarifa:[36.05,-5.66],
  'punta-trettu':[39.05,8.45], 'gran-canaria':[27.81,-15.42], madeira:[33.055,-16.34],
  'kap-verde':[16.59,-22.93], 'ponta-preta':[16.60,-22.95], 'lake-como':[46.13,9.39], kos:[36.86,27.08],
  'lo-stagnone':[37.87,12.44], 'sant-pere':[42.18,3.10], roemo:[55.13,8.52],
  noordwijk:[52.24,4.43], conil:[36.27,-6.10], skane:[55.42,12.83], urla:[38.30,26.55],
  dakhla:[23.86,-15.84], kalpitiya:[8.23,79.72], limnos:[39.85,25.35], rhodos:[35.88,27.77], mazotos:[34.745,33.49],
  zanzibar:[-6.27,39.53], nyali:[-4.04,39.73], kunduchi:[-6.665,39.21], babaomby:[-11.96,49.27],
  rodrigues:[-19.755,63.41], 'le-morne':[-20.46,57.31], 'cape-town':[-33.81,18.46], essaouira:[31.49,-9.78], masirah:[20.67,58.90],
  aruba:[12.58,-70.05], eilat:[29.55,34.95], 'el-gouna':[27.40,33.68], 'soma-bay':[26.84,33.99], socotra:[12.61,53.93], leucate:[42.95,3.03],
  lanzarote:[29.05,-13.50], paros:[37.07,25.22], naxos:[37.02,25.36], lefkada:[38.72,20.65],
  kouremenos:[35.20,26.27], guincho:[38.73,-9.47], calvi:[42.57,8.76], fromentine:[46.89,-2.15],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ids = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
const failed = [];

for (const id of ids) {
  const c = COORDS[id];
  if (!c) { console.warn('!! keine Koordinaten für', id); failed.push(id); continue; }
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${c[0]}&longitude=${c[1]}`
    + `&start_date=${START}&end_date=${END}&daily=temperature_2m_max&timezone=auto`;
  let j;
  try { j = await (await fetch(url)).json(); }
  catch (e) { console.warn('!! Fetch-Fehler', id, e.message); failed.push(id); await sleep(400); continue; }

  const times = j && j.daily && j.daily.time;
  const vals = j && j.daily && j.daily.temperature_2m_max;
  if (!times || !vals) { console.warn('!! keine Luftdaten:', id); failed.push(id); await sleep(400); continue; }

  const sum = Array(13).fill(0), cnt = Array(13).fill(0);
  for (let i = 0; i < times.length; i++) {
    const v = vals[i]; if (v == null) continue;
    const m = +times[i].slice(5, 7); sum[m] += v; cnt[m]++;
  }
  let ok = true; const byMonth = {};
  for (let m = 1; m <= 12; m++) { if (cnt[m] === 0) { ok = false; break; } byMonth[m] = Math.round(sum[m] / cnt[m]); }
  if (!ok) { console.warn('!! Monat(e) ohne Daten:', id); failed.push(id); await sleep(400); continue; }

  const path = join(DIR, id + '.json');
  const s = JSON.parse(readFileSync(path, 'utf8'));
  s.air = { byMonth, source: 'Open-Meteo Archiv (Tageshöchst-Mittel 2022–2024)' };
  writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
  console.log(id.padEnd(15), Object.values(byMonth).join(' '));
  await sleep(350);
}
console.log('\nFertig.', failed.length ? 'Ohne Luftdaten: ' + failed.join(', ') : 'Alle Spots mit Monats-Lufttemperatur.');
