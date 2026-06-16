// Holt echte historische Winddaten (ERA5-Reanalyse) über die Open-Meteo Archiv-API
// und schreibt pro Spot die monatliche Verteilung über 4 kn-Bins in spots/<id>.json (Feld windEra5).
//
// WICHTIG / EHRLICH: ERA5 ist ein ~25-km-Reanalysegitter und 10-m-Wind. Es bildet die großräumige
// Strömung ab, NICHT die lokale Beschleunigung an Kite-Spots (Düsen-/Venturi- und Thermikeffekte,
// z. B. Tarifa, El Yaque, Lago di Como). Die reale Spot-Stärke liegt an solchen Spots meist höher.
//
// Lauf:  node gen-wind-era5.mjs        (danach Daten neu in index.html einbetten — siehe README)

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'spots');
const BINS = ['12–16', '16–20', '20–25', '25+'];
const START = '2019-01-01', END = '2023-12-31';
const PERIOD = '2019–2023';
const DAY_FROM = 10, DAY_TO = 18; // kiterelevante Tagstunden (lokal)

// kuratierte Koordinaten je Spot (Kite-Spot bzw. zugehöriger Strand/Lagune)
const COORDS = {
  fuerteventura:[28.71,-13.83], 'el-medano':[28.045,-16.535], tarifa:[36.05,-5.66],
  'punta-trettu':[39.05,8.45], 'gran-canaria':[27.81,-15.42], madeira:[33.055,-16.34],
  'kap-verde':[16.59,-22.93], 'lake-como':[46.13,9.39], kos:[36.86,27.08],
  'lo-stagnone':[37.87,12.44], 'sant-pere':[42.18,3.10], roemo:[55.13,8.52],
  noordwijk:[52.24,4.43], conil:[36.27,-6.10], skane:[55.42,12.83], urla:[38.30,26.55],
  dakhla:[23.86,-15.84], kalpitiya:[8.23,79.72], limnos:[39.85,25.35], rhodos:[35.88,27.77],
  zanzibar:[-6.27,39.53], babaomby:[-11.96,49.27], essaouira:[31.49,-9.78], masirah:[20.67,58.90],
  aruba:[12.58,-70.05], eilat:[29.55,34.95], socotra:[12.61,53.93], leucate:[42.95,3.03],
  lanzarote:[29.05,-13.50], paros:[37.07,25.22], naxos:[37.02,25.36], lefkada:[38.72,20.65],
  kouremenos:[35.20,26.27], guincho:[38.73,-9.47], calvi:[42.57,8.76],
};

const binOf = v => v < 12 ? -1 : v < 16 ? 0 : v < 20 ? 1 : v < 25 ? 2 : 3;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSpot(lat, lon, tries = 3) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`
    + `&start_date=${START}&end_date=${END}&hourly=wind_speed_10m&wind_speed_unit=kn&timezone=auto`;
  for (let t = 1; t <= tries; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!j.hourly?.wind_speed_10m?.length) throw new Error('keine Daten');
      return j;
    } catch (e) {
      if (t === tries) throw e;
      await sleep(1500 * t);
    }
  }
}

function distribution(j) {
  const time = j.hourly.time, w = j.hourly.wind_speed_10m;
  const cnt = Array.from({ length: 13 }, () => [0, 0, 0, 0]);
  const tot = Array(13).fill(0);
  for (let i = 0; i < time.length; i++) {
    const h = +time[i].slice(11, 13);
    if (h < DAY_FROM || h > DAY_TO) continue;
    const m = +time[i].slice(5, 7);
    tot[m]++;
    const b = binOf(w[i]);
    if (b >= 0) cnt[m][b]++;
  }
  const pct = {};
  for (let m = 1; m <= 12; m++) pct[m] = cnt[m].map(c => tot[m] ? Math.round(c / tot[m] * 100) : 0);
  return pct;
}

const ids = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
let ok = 0;
for (const id of ids) {
  const c = COORDS[id];
  if (!c) { console.warn('!! keine Koordinaten für', id); continue; }
  const path = join(DIR, id + '.json');
  const s = JSON.parse(readFileSync(path, 'utf8'));
  process.stdout.write(`${id} (${c[0]},${c[1]}) … `);
  const j = await fetchSpot(c[0], c[1]);
  const pct = distribution(j);
  delete s.windStats; delete s.windMonthly;
  s.windEra5 = {
    source: 'ERA5-Reanalyse (Open-Meteo Archiv-API)',
    period: PERIOD, hours: `${DAY_FROM}–${DAY_TO} h lokal`,
    lat: +j.latitude.toFixed(3), lon: +j.longitude.toFixed(3),
    note: 'Reanalyse ~25 km — unterschätzt lokale Düsen-/Thermikeffekte; reale Spot-Stärke meist höher',
    bins: BINS, pct,
  };
  writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
  const peak = Math.max(...Object.values(pct).map(a => a.reduce((x, y) => x + y, 0)));
  console.log(`ok · Peak kitebar ${peak}%`);
  ok++;
  await sleep(400);
}
console.log(`\nwindEra5 geschrieben für ${ok}/${ids.length} Spots`);
