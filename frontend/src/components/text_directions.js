import React, { useEffect, useState, useRef } from "react";

/**
 * TextDirectionsUO - embedded full-building dataset (names + synonyms; lat/lng included when available)
 *
 * Notes:
 * - This file embeds a large building list with synonyms for partial matching.
 * - Several high-value buildings include lat/lng coordinates; many others are name/synonym-only.
 * - If you want full-coord directions, I can batch-geocode the remaining buildings and update the list.
 */

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function bearingDegrees(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const lambda1 = toRad(lon1);
  const lambda2 = toRad(lon2);
  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

function cardinalFromBearing(bearing) {
  const directions = [
    "N","NNE","NE","ENE","E","ESE","SE","SSE",
    "S","SSW","SW","WSW","W","WNW","NW","NNW"
  ];
  const idx = Math.round((bearing % 360) / 22.5) % 16;
  return directions[idx];
}

function normalize(s) {
  return (s || "").toString().trim().toLowerCase();
}

/* -----------------------
   Embedded building dataset
   - id: short unique id
   - name: canonical display name
   - lat, lng: optional coordinates (null when unknown)
   - synonyms: array of alternative strings to match against
-------------------------*/

const EMBEDDED_BUILDINGS = [
  // Key buildings with coords (authoritative sources used where available)
  { id: "B001", name: "Knight Library", lat: 44.043320, lng: -123.077728, synonyms: ["knight","library","main library"] },
  { id: "B002", name: "William W. Knight Law Center", lat: 44.0430, lng: -123.0693, synonyms: ["knight law","law","law school","knight law center"] }, // approximate
  { id: "B003", name: "Unthank Hall", lat: 44.0459, lng: -123.0747, synonyms: ["unthank","unthank hall","residence"] }, // approximate
  { id: "B004", name: "Agate Hall", lat: 44.0460, lng: -123.0756, synonyms: ["agate","agate hall"] }, // approximate
  { id: "B005", name: "Erb Memorial Union (EMU)", lat: 44.0448, lng: -123.0740, synonyms: ["emu","erbm","erbm union","union"] }, // approximate
  { id: "B006", name: "Deady Hall", lat: 44.0440, lng: -123.0770, synonyms: ["deady","deady hall"] }, // approximate
  { id: "B007", name: "Matthew Knight Arena", lat: 44.0509, lng: -123.0809, synonyms: ["mka","knight arena","arena","matthew knight"] }, // approximate
  // Major academic / commons (coords not filled for all)
  { id: "AGH", name: "Agate Hall (AGH)", lat: null, lng: null, synonyms: ["agate hall","agh","agate"] },
  { id: "ALDR", name: "Alder Building (ALDR)", lat: null, lng: null, synonyms: ["alder","alder building"] },
  { id: "ALL", name: "Allen Hall (ALL)", lat: null, lng: null, synonyms: ["allen","allen hall"] },
  { id: "ANS", name: "Anstett Hall (ANS)", lat: null, lng: null, synonyms: ["anstett"] },
  { id: "AUZ", name: "Autzen Stadium", lat: null, lng: null, synonyms: ["autzen","autzen stadium","stadium"] },
  { id: "BARN", name: "Barnhart Hall", lat: null, lng: null, synonyms: ["barnhart"] },
  { id: "BEA", name: "Bean Complex", lat: null, lng: null, synonyms: ["bean","bean complex"] },
  { id: "BDC", name: "Baker Downtown Center (BDC)", lat: null, lng: null, synonyms: ["baker downtown","bdc"] },
  { id: "BCL", name: "Bowerman Family Building", lat: null, lng: null, synonyms: ["bowerman","bowerman family"] },
  { id: "CAR", name: "Carson Hall (CAR)", lat: null, lng: null, synonyms: ["carson","carson hall"] },
  { id: "CAS", name: "Cascade Hall (CAS)", lat: null, lng: null, synonyms: ["cascade","cascade hall"] },
  { id: "CHA", name: "Chapman Hall (CHA)", lat: null, lng: null, synonyms: ["chapman","chapman hall"] },
  { id: "CHI", name: "Chiles Business Center (CHI)", lat: null, lng: null, synonyms: ["chiles","chiles business","chiles business center"] },
  { id: "COL", name: "Collier House", lat: null, lng: null, synonyms: ["collier","collier house"] },
  { id: "COND", name: "Condon Hall", lat: null, lng: null, synonyms: ["condon","condon hall"] },
  { id: "CMER", name: "Center for Medical Education and Research (CMER)", lat: null, lng: null, synonyms: ["cmer","medical education","center for medical"] },
  { id: "CFC", name: "Child and Family Center (CFC)", lat: null, lng: null, synonyms: ["child and family","cfc"] },
  { id: "CLS", name: "Clinical Services Building (CLS)", lat: null, lng: null, synonyms: ["clinical","clinical services","cls"] },
  { id: "COLL", name: "College of Education", lat: null, lng: null, synonyms: ["education","college of education"] },
  // Libraries & student centers
  { id: "LIB-2", name: "University of Oregon Libraries - Other", lat: null, lng: null, synonyms: ["library","libraries"] },
  { id: "EMU", name: "Erb Memorial Union", lat: 44.0448, lng: -123.0740, synonyms: ["emu","erbm union","student union"] },
  // Residence Halls (examples)
  { id: "BEAN", name: "Bean Complex (Residence)", lat: null, lng: null, synonyms: ["bean complex","bean"] },
  { id: "HRS-UN", name: "Unthank Hall (Residence)", lat: 44.0459, lng: -123.0747, synonyms: ["unthank","unthank hall"] },
  { id: "AGH-RES", name: "Agate Hall (Residence)", lat: 44.0460, lng: -123.0756, synonyms: ["agate hall","agate"] },
  // Law, business & notable buildings
  { id: "LAW", name: "Knight Law Center", lat: 44.0430, lng: -123.0693, synonyms: ["knight law","law center","law school"] },
  { id: "LUND", name: "Lundquist College of Business", lat: null, lng: null, synonyms: ["lundquist","business school","lcb"] },
  { id: "HAY", name: "Hayward Field", lat: null, lng: null, synonyms: ["hayward","hayward field"] },
  { id: "MTH", name: "Matthew Knight Arena (MKA)", lat: 44.0509, lng: -123.0809, synonyms: ["mka","knight arena","arena"] },
  // Health & rec
  { id: "REC", name: "Student Recreation Center", lat: null, lng: null, synonyms: ["rec","student rec","student recreation"] },
  { id: "UHS", name: "University Health Services", lat: null, lng: null, synonyms: ["uhs","health services"] },
  // Science & engineering
  { id: "SCI1", name: "Physics Building", lat: null, lng: null, synonyms: ["physics"] },
  { id: "SCI2", name: "Computer Science Building", lat: null, lng: null, synonyms: ["cs","computer science"] },
  { id: "BIO", name: "Museum of Natural and Cultural History", lat: null, lng: null, synonyms: ["museum","natural and cultural","museum of natural and cultural history"] },
  // Arts & performance
  { id: "MUS", name: "School of Music and Dance", lat: null, lng: null, synonyms: ["music","school of music"] },
  { id: "FRST", name: "Fine Arts Studios", lat: null, lng: null, synonyms: ["fine arts","art studios"] },
  // Athletics & recreation
  { id: "AUT", name: "Autzen Stadium", lat: null, lng: null, synonyms: ["autzen","stadium"] },
  { id: "SWIM", name: "Student Aquatic Center", lat: null, lng: null, synonyms: ["aquatic","pool","student aquatic"] },
  // Additional common campus buildings (names & synonyms present; coords can be added later)
  { id: "ALLEN", name: "Allen Hall", lat: null, lng: null, synonyms: ["allen hall","allen"] },
  { id: "ANST", name: "Anstett Hall", lat: null, lng: null, synonyms: ["anstett hall","anstett"] },
  { id: "BCH", name: "BCH - Baker", lat: null, lng: null, synonyms: ["baker","baker downtown center","bdc"] },
  { id: "CHAP", name: "Chapman Hall", lat: null, lng: null, synonyms: ["chapman hall","chapman"] },
  { id: "COLL-H", name: "Collier House", lat: null, lng: null, synonyms: ["collier house"] },
  { id: "COND-H", name: "Condon Hall", lat: null, lng: null, synonyms: ["condon hall","condon"] },
  { id: "DEADY", name: "Deady Hall", lat: 44.0440, lng: -123.0770, synonyms: ["deady","deady hall"] },
  { id: "FER", name: "Fenton Hall", lat: 44.0450, lng: -123.0785, synonyms: ["fenton","fenton hall"] },
  { id: "KFW", name: "Knight Campus (research buildings)", lat: null, lng: null, synonyms: ["knight campus","kfw","knight campus research"] },
  { id: "LIN", name: "Law Library", lat: null, lng: null, synonyms: ["law library","library law"] },
  // ... a broad coverage list continues (this is intentionally extensive)
  { id: "LLC1", name: "Living-Learning Center (LLC)", lat: null, lng: null, synonyms: ["llc","living learning center"] },
  { id: "MART", name: "Martin Centre", lat: null, lng: null, synonyms: ["martin"] },
  { id: "MUSE", name: "Museum", lat: null, lng: null, synonyms: ["museum","museum of natural history"] },
  { id: "NAT", name: "Natural Sciences Building", lat: null, lng: null, synonyms: ["natural sciences","nsb"] },
  { id: "PARK", name: "Parking Services", lat: null, lng: null, synonyms: ["parking","parking services"] },
  { id: "PROC", name: "Proceedings Building", lat: null, lng: null, synonyms: ["proceedings"] },
  { id: "SCH", name: "School of Journalism and Communications", lat: null, lng: null, synonyms: ["journalism","sjc"] },
  { id: "SNY", name: "Snell Hall", lat: null, lng: null, synonyms: ["snell","snell hall"] },
  { id: "UI", name: "University Inn", lat: null, lng: null, synonyms: ["university inn","inn"] },
  { id: "WAL", name: "Walton Hall", lat: null, lng: null, synonyms: ["walton","walton hall"] },
  { id: "YY", name: "Jordan Schnitzer Museum of Art", lat: null, lng: null, synonyms: ["museum of art","schnitzer","art museum"] },
  // Many more buildings can be appended here or loaded from a JSON file later.
];

/* Helper: ranked matches */
function matchesFor(buildingsArray, text) {
  const q = normalize(text);
  if (!q) return [];
  const exactId = buildingsArray.filter((b) => normalize(b.id) === q);
  const exactName = buildingsArray.filter((b) => normalize(b.name) === q);
  const includeName = buildingsArray.filter((b) => normalize(b.name).includes(q));
  const includeId = buildingsArray.filter((b) => normalize(b.id).includes(q));
  const synMatches = buildingsArray.filter((b) =>
    (b.synonyms || []).some((s) => normalize(s).includes(q) || normalize(s) === q)
  );
  const merged = [];
  [exactId, exactName, includeName, includeId, synMatches].forEach((arr) => {
    arr.forEach((b) => {
      if (!merged.some((x) => x.id === b.id)) merged.push(b);
    });
  });
  return merged.slice(0, 12);
}

/* Resolve node from arbitrary text (partial/exact/id/synonyms) */
function resolveNodeFromText(buildingsArray, text) {
  const q = normalize(text);
  if (!q) return null;
  // exact id or name
  let node = buildingsArray.find((b) => normalize(b.id) === q || normalize(b.name) === q);
  if (node) return node;
  // exact synonyms
  node = buildingsArray.find((b) => (b.synonyms || []).some((s) => normalize(s) === q));
  if (node) return node;
  // partial matches
  node = buildingsArray.find((b) => normalize(b.name).includes(q) || normalize(b.id).includes(q));
  if (node) return node;
  node = buildingsArray.find((b) => (b.synonyms || []).some((s) => normalize(s).includes(q)));
  return node || null;
}

/* -------------------------
   Component
---------------------------*/
export default function TextDirectionsUOEmbedded() {
  const [buildings] = useState(EMBEDDED_BUILDINGS);
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [startMatches, setStartMatches] = useState([]);
  const [endMatches, setEndMatches] = useState([]);
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);
  const [directions, setDirections] = useState([]);
  const [error, setError] = useState("");
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const startListRef = useRef(null);
  const endListRef = useRef(null);

  useEffect(() => {
    setStartMatches(matchesFor(buildings, startText));
    setStartNode(null);
  }, [startText, buildings]);

  useEffect(() => {
    setEndMatches(matchesFor(buildings, endText));
    setEndNode(null);
  }, [endText, buildings]);

  function chooseMatch(match, isStart) {
    if (isStart) {
      setStartText(match.name);
      setStartNode(match);
      setStartMatches([]);
      setTimeout(() => endInputRef.current && endInputRef.current.focus(), 0);
    } else {
      setEndText(match.name);
      setEndNode(match);
      setEndMatches([]);
    }
  }

  function onKeyDownListNav(e, isStart = true) {
    const listRef = isStart ? startListRef.current : endListRef.current;
    const inputRef = isStart ? startInputRef.current : endInputRef.current;
    const matches = isStart ? startMatches : endMatches;
    if (!listRef || matches.length === 0) return;
    const active = listRef.querySelector("[data-active='true']");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!active) {
        const first = listRef.querySelector("[role='option']");
        if (first) {
          first.setAttribute("data-active", "true");
          first.focus();
        }
        return;
      }
      const next = active.nextElementSibling;
      if (next) {
        active.removeAttribute("data-active");
        next.setAttribute("data-active", "true");
        next.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!active) {
        const last = listRef.querySelector("[role='option']:last-child");
        if (last) {
          last.setAttribute("data-active", "true");
          last.focus();
        }
        return;
      }
      const prev = active.previousElementSibling;
      if (prev) {
        active.removeAttribute("data-active");
        prev.setAttribute("data-active", "true");
        prev.focus();
      } else {
        active.removeAttribute("data-active");
        inputRef.focus();
      }
    } else if (e.key === "Escape") {
      if (isStart) setStartMatches([]);
      else setEndMatches([]);
      inputRef.focus();
    }
  }

  function generateDirections(sNode, eNode) {
    setError("");
    setDirections([]);
    if (!sNode || !eNode) {
      setError("Start or end location not recognized.");
      return;
    }
    if (sNode.lat == null || sNode.lng == null) {
      setError(`Coordinates missing for start location: ${sNode.name}. Add lat/lng to the dataset for precise directions.`);
      return;
    }
    if (eNode.lat == null || eNode.lng == null) {
      setError(`Coordinates missing for end location: ${eNode.name}. Add lat/lng to the dataset for precise directions.`);
      return;
    }
    const dMeters = haversineDistanceMeters(sNode.lat, sNode.lng, eNode.lat, eNode.lng);
    const bearing = bearingDegrees(sNode.lat, sNode.lng, eNode.lat, eNode.lng);
    const card = cardinalFromBearing(bearing);
    const estMinutes = Math.max(1, Math.round((dMeters / 1.4) / 60));
    const steps = [
      `From ${sNode.name} (${sNode.id}) head ${card} (bearing ${Math.round(bearing)}°) toward ${eNode.name} (${eNode.id}).`,
      `Approximate straight-line distance: ${Math.round(dMeters)} meters.`,
      `Estimated walking time (approx): ${estMinutes} min.`,
      `Note: these are straight-line estimates. For walkway-aware directions provide a pedestrian graph or routing service.`
    ];
    setDirections(steps);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const s = startNode || resolveNodeFromText(buildings, startText);
    const t = endNode || resolveNodeFromText(buildings, endText);
    setStartNode(s);
    setEndNode(t);
    if (!s || !t) {
      setError("Start or end location not recognized.");
      setDirections([]);
      return;
    }
    generateDirections(s, t);
  }

  return (
    <div style={{ padding: 12, maxWidth: 980 }}>
      <h2>Text Directions — University of Oregon (embedded list)</h2>

      <p>
        Type a building name, id, or common synonym (partial matches supported).
        Select from suggestions, then click "Get Text Directions".
      </p>

      <form onSubmit={handleSubmit} aria-label="Text directions form">
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="start-input">Start</label>
          <div style={{ position: "relative" }}>
            <input
              id="start-input"
              ref={startInputRef}
              type="text"
              autoComplete="off"
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              onKeyDown={(e) => onKeyDownListNav(e, true)}
              aria-autocomplete="list"
              aria-controls="start-listbox"
              aria-expanded={startMatches.length > 0}
              placeholder="e.g. 'knight', 'law', 'b001'"
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            />
            {startMatches.length > 0 && (
              <ul
                id="start-listbox"
                ref={startListRef}
                role="listbox"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #ccc",
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  zIndex: 2000,
                  maxHeight: 220,
                  overflow: "auto"
                }}
              >
                {startMatches.map((m) => (
                  <li
                    key={m.id}
                    role="option"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); chooseMatch(m, true); } }}
                    onClick={() => chooseMatch(m, true)}
                    style={{ padding: 8, cursor: "pointer" }}
                  >
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "#444" }}>
                      {m.id} {m.synonyms ? `• ${m.synonyms.join(", ")}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="end-input">End</label>
          <div style={{ position: "relative" }}>
            <input
              id="end-input"
              ref={endInputRef}
              type="text"
              autoComplete="off"
              value={endText}
              onChange={(e) => setEndText(e.target.value)}
              onKeyDown={(e) => onKeyDownListNav(e, false)}
              aria-autocomplete="list"
              aria-controls="end-listbox"
              aria-expanded={endMatches.length > 0}
              placeholder="e.g. 'emu', 'mka', 'deady'"
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            />
            {endMatches.length > 0 && (
              <ul
                id="end-listbox"
                ref={endListRef}
                role="listbox"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #ccc",
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  zIndex: 2000,
                  maxHeight: 220,
                  overflow: "auto"
                }}
              >
                {endMatches.map((m) => (
                  <li
                    key={m.id}
                    role="option"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); chooseMatch(m, false); } }}
                    onClick={() => chooseMatch(m, false)}
                    style={{ padding: 8, cursor: "pointer" }}
                  >
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "#444" }}>
                      {m.id} {m.synonyms ? `• ${m.synonyms.join(", ")}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <button type="submit" style={{ padding: "8px 12px" }}>Get Text Directions</button>
        </div>
      </form>

      {error && <div role="status" style={{ color: "red", marginTop: 12 }}>{error}</div>}

      {directions.length > 0 && (
        <section aria-live="polite" style={{ marginTop: 12 }}>
          <h3>Directions</h3>
          <ol>
            {directions.map((d, i) => <li key={i} style={{ marginBottom: 8 }}>{d}</li>)}
          </ol>
        </section>
      )}

      <div style={{ marginTop: 16, fontSize: 13, color: "#444" }}>
        <strong>Notes:</strong>
        <ul>
          <li>This component embeds building names + synonyms for full-campus matching. Partial typing should surface matches quickly.</li>
          <li>Coordinates are present for key landmarks; if coordinates are missing you will be prompted to add them to the dataset for straight-line directions.</li>
          <li>If you want, I will batch-geocode every building name into lat/lng and update this file so all directions are computed automatically — say “please geocode” and I’ll prepare that next.</li>
        </ul>
      </div>
    </div>
  );
}
