# Kite-Archiv

Persönliches Spot-Archiv: **wann** (Monat) **wo** am besten kiten — mit Filtern nach
Kite-Qualität, Familientauglichkeit, Infrastruktur und Erreichbarkeit.

Alle Spot-Daten sind direkt in [`index.html`](index.html) eingebettet (im Block
`<script id="spots-data">`). Die Seite ist **eine einzige Datei** und braucht **keinen Server**.

## Seiten

- [`index.html`](index.html) — das vollständige Archiv mit allen Filtern.
- [`dubai-profil.html`](dubai-profil.html) — **Reise-Profil Dubai**: für jeden Monat die bis zu 20 besten Spots (nach Ranking),
  hart gefiltert auf **konstant ≥ 12 kn** (≥ 60 % der Tage, einstellbar) und **ab Dubai ≤ 10 h / max. 1 Stopp**.
  Standard-Ranking = reine Windkonstanz; per Regler gewichtbar nach **Infrastruktur / Kleinkind / Stadt-Shopping**.
  Jede Karte zeigt Windkonstanz, Distanz Flughafen→Spot, Dubai-Anreise und Links (Google Maps, YouTube-Suche, [@3asylife](https://www.youtube.com/@3asylife)).

Beide Seiten teilen sich dieselbe Datenquelle (`spots/*.json`, eingebettet).

## Starten

`index.html` (oder `dubai-profil.html`) einfach **per Doppelklick** im Browser öffnen (`file://` reicht) — kein Python,
kein Webserver, kein Build. Funktioniert auch offline und lässt sich so verschicken/kopieren.

## Neuen Spot ergänzen

Die Einzeldateien in [`spots/`](spots/) bleiben die gepflegte Quelle. Workflow:

1. Neue Datei `spots/<slug>.json` anlegen (Schema siehe unten).
2. Den `<slug>` in [`spots/index.json`](spots/index.json) an die gewünschte Position der Liste setzen.
3. Daten neu in `index.html` einbetten (ein Befehl, nur [`jq`](https://jqlang.github.io/jq/) nötig — kein Python):

```bash
cd spots
files=("${(@f)$(jq -r '.[]' index.json | sed 's/$/.json/')}")   # zsh; in bash: mapfile -t files < <(jq -r '.[]' index.json | sed 's/$/.json/')
jq -c -s '.' "${files[@]}" > /tmp/spots.json
cd ..
# /tmp/spots.json als Inhalt des <script id="spots-data">…</script>-Blocks in index.html einsetzen
```

Schneller geht's bei Kleinigkeiten direkt: das neue Objekt von Hand in den
`<script id="spots-data">`-Block in `index.html` einfügen (es ist ein normales JSON-Array).

## Schema einer Spot-Datei

```jsonc
{
  "id": "fuerteventura",            // = Dateiname-Slug, eindeutig
  "name": "Fuerteventura",
  "spot": "Corralejo · Flag Beach", // Ort/Spot-Zeile
  "region": "Kanaren",
  "country": "Spanien",
  "flag": "🇪🇸",
  "verdict": "go",                  // go | warn | no  (Ampelfarbe)
  "verdictLabel": "Familien-Sieger",
  "tagline": "Kurzer Einzeiler für die Karte.",

  "scores": {                       // 1–5, steuern die Filter-Regler
    "kite": 5,                      // Kite-/Wind-Qualität
    "family": 5,                    // Familientauglichkeit
    "infra": 4,                     // Infrastruktur (Läden, Klinik, Lifestyle)
    "access": 5,                    // Erreichbarkeit allgemein
    "toddler": 5,                   // Kleinkind-Tauglichkeit (flaches/sicheres Wasser, kurze Wege, Klinik, Hitze) — dubai-profil.html
    "city": 3                       // Stadt/Shopping/Lifestyle für die Frau — dubai-profil.html
  },

  "wind":  { "min": 20, "max": 25, "type": "side-onshore", "reliability": 85 }, // reliability = Windwahrscheinlichkeit (% kitebare Tage) → Primär-Sortierung
  "water": { "type": "flat", "tempC": 21, "wetsuit": "Shorty",                  // type: flat|wave|lagoon|choppy|mixed; tempC = Sommerwert
             "byMonth": {"1":19,"...":0,"12":21},                               // monatl. Meerestemp. (SST) — setzt gen-water-temp.mjs; dubai-profil.html nutzt das
             "tempSource": "Open-Meteo Marine (SST-Mittel 2022–2024)" },
  "air":   { "byMonth": {"1":21,"...":0,"12":24},                               // monatl. Lufttemp. (Tageshöchst-Mittel) — setzt gen-air-temp.mjs
             "source": "Open-Meteo Archiv (Tageshöchst-Mittel 2022–2024)" },    // dubai-profil.html: Anzeige + Hitze-Markierung + „Lufttemperatur höchstens“-Filter
  "level": ["beginner","intermediate","advanced"],

  "season": {                       // Eignung pro Monat 1–12:
    "1":1,"2":1,"3":2,"4":2,"5":3,"6":3,                  // 0 = außer Saison
    "7":3,"8":3,"9":3,"10":2,"11":1,"12":1                // 1 = mau · 2 = gut · 3 = prime
  },

  // Wind-Diagramm pro Monat aus ECHTEN Daten. Primär WhenWhereKite (Kiter-Feedback), wo es eine
  // Spot-Seite gibt; sonst Fallback ERA5-Reanalyse. pct[monat] = % Tage je kn-Bin, Rest auf 100 = < 12 kn.
  // Wird von den Generatoren gesetzt (siehe unten), NICHT von Hand. Quelle steht im Feld source.
  "windChart": {
    "source": "WhenWhereKite (Kiter-Feedback)",          // oder "ERA5-Reanalyse (Open-Meteo Archiv-API)"
    "url": "https://whenwherekite.com/Rhodes-Greece.html",
    "bins": ["12–16","16–22","22–28",">28"],              // WWK-Bins; ERA5-Fallback nutzt [12–16,16–20,20–25,25+]
    "pct": { "1":[..4 Werte..], "...": [], "12":[..] }
    // optional: "proxy": "Tenerife (kein eigener El-Médano-Eintrag)"
  },

  // Neutrale Reisedaten — kein persönliches Routing. hours = numerische Flugstunden (für Entfernungsfilter):
  "distanceUAE":     { "time": "~9 h",   "transfers": 1, "note": "1× Umstieg über Europa", "hours": 9 },
  "distanceGermany": { "time": "~4,5 h", "transfers": 0, "note": "Direktflug nach FUE",     "hours": 4.5 },

  // Distanz Ankunftsflughafen → Kite-Spot (Bodenstrecke) — für dubai-profil.html:
  "airportSpot": { "airport": "FUE", "airportName": "Fuerteventura (FUE)", "km": 38, "min": 35, "note": "Mietwagen über FV-1" },
  "coords": { "lat": 28.71, "lon": -13.83 },  // Spot-Koordinaten → Google-Maps-Link (deckungsgleich mit COORDS im Generator)
  "video3asylife": "https://youtu.be/…",      // optional: Direktlink zu einem @3asylife-Spotvideo, falls vorhanden

  "tags": ["Schule","Rescue","Flatwater"],
  "description": "Längerer Fließtext für das Detail-Modal.",
  "flagNote": { "type": "go", "text": "Kurzhinweis unten auf der Karte." }, // type: go|warn|no

  "subspots": [                     // optional: Spots im Umkreis
    { "name": "Flag Beach", "dist": "5 min", "level": "alle Level", "desc": "…" }
  ],
  "family": [                       // optional: Programm abseits des Wassers
    "El Cotillo Lagunen — flaches warmes Wasser …"
  ]
}
```

### Pflichtfelder
`id, name, spot, region, country, verdict, verdictLabel, tagline, scores{kite,family,infra,access,toddler,city},
wind{min,max,type,reliability}, water{type,tempC,wetsuit}, season{1..12},
distanceUAE{time,transfers,note,hours}, distanceGermany{…}, airportSpot{airport,airportName,km,min,note}, coords{lat,lon}`

`windChart`, `subspots`, `family`, `tags`, `flagNote`, `level`, `flag`, `video3asylife` sind optional.
`windChart` setzen die Generatoren (siehe unten); `hours` (Flugstunden), `airportSpot`, `coords` (= COORDS im Generator)
und `scores.toddler/city` trägst du selbst ein.

## Filter auf der Seite (Idee à la WhenWhereKite)
Du sagst **„wann“** (Monat), die Seite rankt **„wohin“** — primär nach **Windwahrscheinlichkeit**.
- **Monat** — wählst du einen Monat, erscheint ein **Leaderboard** der windstärksten Spots und out-of-season-Spots fallen raus; optional „nur Prime-Monate (⭐)“. (Die große **Windwahrscheinlichkeit** auf der Karte und das Ranking sind der recherchierte Spot-Wert, kite-genau — nicht die ERA5-Reanalyse.)
- **Einschätzung** — Empfehlung / Mit Abstrichen / Eher nein.
- **Mindest-Score** — vier Regler (Kiten, Familie, Infrastruktur, Erreichbarkeit), `egal`–`⭐⭐⭐⭐⭐`.
- **Wärme (Lufttemperatur)** — `egal / warm ≥23° / heiß ≥27° / ≥30°` (monatsgenau, sonst Jahresmittel). „warm" = Luft über 22°.
- **Max. Entfernung** — `egal / ≤5 h / ≤9 h / ≤13 h`, bezogen auf den gewählten **Distanz-Bezug (UAE / Deutschland)**.
- **Suche / Sortierung** — Freitext + Sortierung (Windwahrscheinlichkeit, Beste Übereinstimmung, Kite, Familie, Infra, Erreichbarkeit, wärmste Luft, A–Z).
- **Karte & Detail** zeigen statt der nackten Wassertemperatur einen **Wärme-Chip** (☀️ warm / 🧥 kühl, Luft) plus eine **Neo-Empfehlung** (`ohne Neo / Shorty / Langarm 3/2 / Langarm 4/3 / Trockenanzug`), automatisch aus der (monatsgenauen) Wassertemperatur abgeleitet.
- **Karten** zeigen Rang (#1, #2 …) und die Windwahrscheinlichkeit groß; Klick öffnet das Detail mit dem **Wind-Diagramm** (echte Monatsverteilung, gewählter Monat hervorgehoben), Saison-Heatmap und Distanzen.

## Woher die Daten kommen (ehrlich)

| Feld | Quelle |
|---|---|
| **`windChart`** (Monatsdiagramm) + **`reliability`** (WWK-Spots) | **WhenWhereKite** — echte Werte, aus dem Seitenquelltext (`sampleData1`) gezogen. **Kiter-Feedback**, kein Messinstrument, bildet aber lokale Effekte ab. **34 Spots.** |
| **`windChart`** (Fallback) | **ERA5-Reanalyse** (Open-Meteo), Tagstunden 10–18 h, 2019–2023 — für Spots ohne WWK-Seite (conil, kos, kouremenos, lake-como, limnos, madeira, punta-trettu, rømø, sant-pere, skåne, fromentine). ⚠ unterschätzt lokale Düsen-/Thermikeffekte; das Detail zeigt dann einen Warnhinweis. |
| **`windChart`** (kuratiert) | **Saison-Schätzung** — nur wo *weder* WWK *noch* ERA5 taugen, weil ERA5 die lokale Thermik komplett verfehlt (ada-bojana: Maestral zeigt in ERA5 ~1 %). Quelle ehrlich als „Kuratiert · Saison-Schätzung, keine Messreihe" gekennzeichnet; **nicht** in `gen-wind-era5.mjs` aufgenommen, damit ein Pipeline-Lauf sie nicht überschreibt. |
| **`season`, Scores, `wind.min/max`, Distanzen, Texte** | eigene Recherche (`0.html`) + WhenWhereKite-Liste, **ohne Gewähr**. `season` bleibt bewusst kuratiert (WWK ist oft ganzjährig windig → wind-only-Saison wäre nutzlos). |

Generatoren (laden echte Daten, schreiben `spots/*.json`, danach neu einbetten — nur Node, **kein Python**, **Internet nötig**). Reihenfolge:

```bash
node gen-wind-era5.mjs   # 1) ERA5 für alle Spots (Koordinaten = COORDS im Skript) — liefert den Fallback
node gen-wind-wwk.mjs    # 2) überschreibt mit echten WhenWhereKite-Werten, wo es eine Spot-Seite gibt
                         #    (Slug-Map = SLUGS im Skript) und leitet reliability daraus ab
node gen-water-temp.mjs  # 3) monatliche Meerestemperatur (SST) je Spot → water.byMonth (Open-Meteo Marine-API)
node gen-air-temp.mjs    # 4) monatliche Lufttemperatur (Tageshöchst-Mittel) je Spot → air.byMonth (Open-Meteo Archiv)
```

`gen-water-temp.mjs` schreibt für jeden Spot `water.byMonth{1..12}` (Tagesmittel-SST 2022–2024).
Süßwasser/land-maskierte Punkte (z. B. Lago di Como) liefern keine SST → dort bleibt der statische `tempC`.
`dubai-profil.html` filtert/zeigt damit die **monatsgenaue** Wassertemperatur (Fallback: `tempC`).
