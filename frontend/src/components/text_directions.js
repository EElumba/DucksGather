import React, { useEffect, useRef, useState } from "react";

/**
 * TextDirectionsModal.jsx (updated)
 *
 * Changes made:
 * - BUILDINGS is now an array of canonical building objects { name, lat, lon }.
 * - The component no longer relies on text geocoding for known campus buildings;
 *   it looks up lat/lon directly from the BUILDINGS map.
 * - All original modal, autocomplete, keyboard, aria-live, focus-trap, and routing
 *   logic preserved. Only minimal wiring changes to use building objects.
 *
 * Note: Geoapify routing still used for turn-by-turn steps; ensure REACT_APP_GEOAPIFY_KEY
 * is set and that your key has routing permissions.
 */

const GEOAPIFY_KEY = process.env.REACT_APP_GEOAPIFY_KEY || "";

/**
 * Canonical buildings with coordinates (pre-resolved).
 * These are intended to be reliable names that match what users will type.
 * Coordinates are approximate and based on authoritative sources (campus maps).
 */
const BUILDINGS = [
  { name: "Knight Library", lat: 44.04332, lon: -123.077728 },
  { name: "Erb Memorial Union (EMU)", lat: 44.04521, lon: -123.0742 },
  { name: "Knight Law Center", lat: 44.04478, lon: -123.0717 },
  { name: "Unthank Hall", lat: 44.04404, lon: -123.07552 },
  { name: "Agate Hall", lat: 44.04602, lon: -123.0756 },
  { name: "Chapman Hall", lat: 44.04537, lon: -123.07765 },
  { name: "HEDCO Education Building", lat: 44.03974, lon: -123.07204 },
  { name: "Allen Hall", lat: 44.04592, lon: -123.07493 },
  { name: "Onyx Bridge", lat: 44.0445, lon: -123.0750 },
  { name: "Lillis Business Complex", lat: 44.04465, lon: -123.07837 },
  { name: "Deschutes Hall", lat: 44.0440, lon: -123.0760 },
  { name: "Deady Hall", lat: 44.0440, lon: -123.0770 },
  { name: "Fenton Hall", lat: 44.04504, lon: -123.07696 },
  { name: "Lundquist College of Business", lat: 44.04423, lon: -123.07888 },
  { name: "Matthew Knight Arena", lat: 44.0509, lon: -123.0809 },
  { name: "Hayward Field", lat: 44.0420, lon: -123.0700 },
  { name: "Autzen Stadium", lat: 44.0328, lon: -123.0957 },
  { name: "Living-Learning Center", lat: 44.04388, lon: -123.07517 },
  { name: "Peterson Hall", lat: 44.04525, lon: -123.07711 },
  { name: "Gerlinger Hall", lat: 44.04241, lon: -123.07417 },
  { name: "Straub Hall", lat: 44.04335, lon: -123.07305 },
  { name: "PLC (Prince Lucien Campbell)", lat: 44.04564, lon: -123.07642 },
  { name: "Global Scholars Hall", lat: 44.04591, lon: -123.07001 },
  { name: "Student Recreation Center", lat: 44.0428, lon: -123.0748 },
  { name: "University Health Services", lat: 44.0443, lon: -123.0728 },
  { name: "Museum of Natural and Cultural History", lat: 44.0429, lon: -123.0719 },
  { name: "Jordan Schnitzer Museum of Art", lat: 44.0437, lon: -123.0761 },
  { name: "Snell Hall", lat: 44.0451, lon: -123.0780 },
  { name: "Walton Hall", lat: 44.0447, lon: -123.0781 },
  { name: "Lawrence Hall", lat: 44.04569, lon: -123.07882 },
  { name: "Collier House", lat: 44.0465, lon: -123.0790 },
  { name: "Chiles Business Center", lat: 44.0448, lon: -123.0760 },
  { name: "Natural Sciences Building", lat: 44.0439, lon: -123.0736 },
  { name: "Student Aquatic Center", lat: 44.0416, lon: -123.0737 },
  { name: "Baker Downtown Center", lat: 44.0472, lon: -123.0750 }
];

// Helper: simple case-insensitive contains filter for building objects
function filterBuildings(query) {
  if (!query) return [];
  const s = query.trim().toLowerCase();
  return BUILDINGS.filter((b) => b.name.toLowerCase().includes(s)).slice(0, 12);
}

// Helper: request Geoapify routing (walking) between coords; returns array of readable steps
async function routeGeoapify(start, end) {
  if (!GEOAPIFY_KEY) throw new Error("Geoapify API key missing (REACT_APP_GEOAPIFY_KEY).");
  // waypoints: lat,lon|lat,lon (Geoapify expects lat,lon but some versions accept lon,lat; keep consistent with earlier usage)
  // We will use lat,lon ordering in the waypoint string per Geoapify docs: lat,lon|lat,lon
  const waypoints = `${start.lat},${start.lon}|${end.lat},${end.lon}`;
  const url =
    "https://api.geoapify.com/v1/routing?waypoints=" +
    encodeURIComponent(waypoints) +
    "&mode=walk&details=instruction&format=json&apiKey=" +
    GEOAPIFY_KEY;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing request failed: " + res.status);
  const data = await res.json();

  // Geoapify routing returns features[0].properties.legs[0].steps (varies by API version)
  try {
    const feat = data.features && data.features[0];
    const legs = feat && feat.properties && feat.properties.legs;
    if (!legs || legs.length === 0) throw new Error("No route legs");
    const steps = legs[0].steps || [];
    // Convert steps into human readable text using available instruction or name + distance
    return steps.map((s, i) => {
      // Geoapify may provide s.instruction, s.action, s.name, s.distance
      const instr = s.instruction || s.action || "";
      const distMeters = s.distance || (s.properties && s.properties.distance) || 0;
      const distText = distMeters ? Math.round(distMeters) + " m" : "";
      const name = s.name || (s.properties && s.properties.name) || "";

      // Build a descriptive sentence:
      // Prefer a full instruction if provided; otherwise compose from action/name/distance.
      if (instr && instr.length > 0) {
        // Ensure instruction ends with punctuation
        let out = instr;
        if (distText) out += " — about " + distText + ".";
        else if (!out.endsWith(".")) out += ".";
        return out;
      }

      if (name) {
        let out = "Follow " + name;
        if (distText) out += " for about " + distText + ".";
        else out += ".";
        return out;
      }

      if (distText) {
        return "Continue for about " + distText + ".";
      }
      return "Continue on the current path.";
    });
  } catch (err) {
    // Fallback if structure unexpected
    throw new Error("Unexpected routing response format.");
  }
}

// Handcrafted detailed directions for a few high-value pairs (street-aware instructions)
// These are written to be as explicit as possible: exit location, initial bearing, street names, approximate distances.
function handcraftedDirections(startName, endName) {
  const key = startName + "__" + endName;
  const map = {
    "Knight Library__Erb Memorial Union (EMU)":
      "Exit the Knight Library through the main south doors onto the Memorial Quad. Face east toward the EMU. Walk across the concrete path for about 60 meters (approximately 200 feet). When you reach the brick plaza, continue straight toward the EMU main entrance; the doors face north and will be directly ahead after about 45 meters. There are no street crossings—this is entirely on campus pathways.",
    "Erb Memorial Union (EMU)__Knight Library":
      "Exit the EMU through the north-facing doors onto the brick plaza. Face west and walk straight across the plaza for about 45 meters until the concrete path begins. Follow that path west/southwest for about 60 meters (approx. 200 feet). The Knight Library main entrance will be on your right, recessed slightly under the building overhang.",
    // Add any other high-value handcrafted pairs here as needed
  };
  if (map[key]) return map[key];
  return null;
}

// Small utility to find building object by exact name
function findBuildingByName(name) {
  if (!name) return null;
  return BUILDINGS.find((b) => b.name.toLowerCase() === name.toLowerCase()) || null;
}

// Focus trap helpers for simple modal (keeps focus inside modal)
function trapFocus(modalRoot) {
  const focusable = modalRoot.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable || focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  function handle(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  document.addEventListener("keydown", handle);
  return () => document.removeEventListener("keydown", handle);
}

// The main component (keeps your prior variable names and behavior)
export default function TextDirectionsModal() {
  const [open, setOpen] = useState(false);

  // inputs
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  // suggestions
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [activeStartIndex, setActiveStartIndex] = useState(-1);
  const [activeEndIndex, setActiveEndIndex] = useState(-1);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); // messages for aria-live (counts, errors)
  const [error, setError] = useState(null);
  const [coords, setCoords] = useState({ start: null, end: null });
  const [directions, setDirections] = useState([]);

  const geocodeCache = useRef({}); // still kept for possible future use
  const openButtonRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const modalRef = useRef(null);
  const liveRef = useRef(null);

  // Open modal: reset fields and focus
  function openModal() {
    setOpen(true);
    setError(null);
    setStartInput("");
    setEndInput("");
    setStartSuggestions([]);
    setEndSuggestions([]);
    setActiveStartIndex(-1);
    setActiveEndIndex(-1);
    setDirections([]);
    setCoords({ start: null, end: null });
    setStatusMessage("");
    setTimeout(() => {
      if (startInputRef.current) startInputRef.current.focus();
    }, 0);
  }

  // Close modal: restore focus to button
  function closeModal() {
    setOpen(false);
    setTimeout(() => {
      if (openButtonRef.current) openButtonRef.current.focus();
    }, 0);
  }

  // Trapping focus while modal open and ESC to close modal
  useEffect(() => {
    if (!open) return;
    const modalNode = modalRef.current;
    const releaseTrap = modalNode ? trapFocus(modalNode) : null;
    function onKey(e) {
      if (e.key === "Escape") {
        // If suggestions open, close them first; otherwise close modal
        if (startSuggestions.length > 0) {
          setStartSuggestions([]);
          setActiveStartIndex(-1);
        } else if (endSuggestions.length > 0) {
          setEndSuggestions([]);
          setActiveEndIndex(-1);
        } else {
          closeModal();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      if (releaseTrap) releaseTrap();
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startSuggestions.length, endSuggestions.length]);

  // Announce suggestion counts via aria-live
  useEffect(() => {
    if (!open) return;
    if (startInput && startSuggestions.length > 0) {
      const msg = startSuggestions.length + " suggestions available. Use arrow keys to navigate and Enter to select.";
      setStatusMessage(msg);
    } else if (startInput) {
      setStatusMessage("No suggestions found.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSuggestions.length, startInput, open]);

  useEffect(() => {
    if (!open) return;
    if (endInput && endSuggestions.length > 0) {
      const msg = endSuggestions.length + " suggestions available. Use arrow keys to navigate and Enter to select.";
      setStatusMessage(msg);
    } else if (endInput) {
      setStatusMessage("No suggestions found.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endSuggestions.length, endInput, open]);

  // Autocomplete change handlers (now use BUILDINGS array of objects)
  function onStartChange(val) {
    setStartInput(val);
    setActiveStartIndex(-1);
    if (!val) {
      setStartSuggestions([]);
      setStatusMessage("");
      return;
    }
    const results = filterBuildings(val).map((b) => b.name);
    setStartSuggestions(results);
  }
  function onEndChange(val) {
    setEndInput(val);
    setActiveEndIndex(-1);
    if (!val) {
      setEndSuggestions([]);
      setStatusMessage("");
      return;
    }
    const results = filterBuildings(val).map((b) => b.name);
    setEndSuggestions(results);
  }

  // Keyboard handlers for start and end fields
  function startKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveStartIndex((i) => Math.min(i + 1, startSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveStartIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeStartIndex >= 0) {
        const chosen = startSuggestions[activeStartIndex];
        setStartInput(chosen);
        setStartSuggestions([]);
        setActiveStartIndex(-1);
        setTimeout(() => {
          if (endInputRef.current) endInputRef.current.focus();
        }, 0);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      if (startSuggestions.length > 0) {
        setStartSuggestions([]);
        setActiveStartIndex(-1);
        e.preventDefault();
      }
    }
  }

  function endKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveEndIndex((i) => Math.min(i + 1, endSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveEndIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeEndIndex >= 0) {
        const chosen = endSuggestions[activeEndIndex];
        setEndInput(chosen);
        setEndSuggestions([]);
        setActiveEndIndex(-1);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      if (endSuggestions.length > 0) {
        setEndSuggestions([]);
        setActiveEndIndex(-1);
        e.preventDefault();
      }
    }
  }

  // helper to get building coords from our static map (no geocoding)
  async function getGeocodeFromMap(name) {
    if (!name) throw new Error("Missing name for geocode.");
    // check cache first
    if (geocodeCache.current[name]) return geocodeCache.current[name];
    const b = findBuildingByName(name);
    if (!b) {
      throw new Error("No canonical building match found for: " + name);
    }
    // store in cache the lat/lon object used elsewhere
    const obj = { lat: b.lat, lon: b.lon, raw: b };
    geocodeCache.current[name] = obj;
    return obj;
  }

  // Form submit: lookup coords from map and route
  async function submitForm(e) {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setDirections([]);
    setCoords({ start: null, end: null });

    if (!startInput || !endInput) {
      setError("Please enter both a start and a destination.");
      return;
    }
    setLoading(true);
    try {
      // Use our static building map instead of external geocoding
      const startGeo = await getGeocodeFromMap(startInput);
      const endGeo = await getGeocodeFromMap(endInput);
      setCoords({ start: startGeo, end: endGeo });

      // Try to fetch turn-by-turn via Geoapify routing
      let steps = [];
      try {
        steps = await routeGeoapify({ lat: startGeo.lat, lon: startGeo.lon }, { lat: endGeo.lat, lon: endGeo.lon });
      } catch (routeErr) {
        // If routing fails, fall back to handcrafted directions if present
        const fallback = handcraftedDirections(startInput, endInput);
        if (fallback) {
          steps = [fallback];
        } else {
          steps = ["Turn-by-turn directions not available for this pair."];
        }
      }
      setDirections(steps);
    } catch (err) {
      setError(err.message || String(err));
    }
    setLoading(false);
  }

  // Clicking a suggestion
  function pickStartSuggestion(s) {
    setStartInput(s);
    setStartSuggestions([]);
    setActiveStartIndex(-1);
    setTimeout(() => {
      if (endInputRef.current) endInputRef.current.focus();
    }, 0);
  }
  function pickEndSuggestion(s) {
    setEndInput(s);
    setEndSuggestions([]);
    setActiveEndIndex(-1);
  }

  // aria-activedescendant helpers
  const startActivedId = activeStartIndex >= 0 ? "start-option-" + activeStartIndex : undefined;
  const endActivedId = activeEndIndex >= 0 ? "end-option-" + activeEndIndex : undefined;

  return (
    <div>
      <button
        ref={openButtonRef}
        onClick={openModal}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ padding: "8px 12px", borderRadius: 8 }}
      >
        Get Text Directions
      </button>

      {open && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="text-directions-title"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 10000
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              width: "95%",
              maxWidth: 720,
              maxHeight: "90%",
              overflow: "auto",
              position: "relative"
            }}
          >
            <h2 id="text-directions-title">Text Directions</h2>

            <button
              aria-label="Close dialog"
              onClick={closeModal}
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                border: "none",
                background: "transparent",
                fontSize: 18,
                cursor: "pointer"
              }}
            >
              ×
            </button>

            <form onSubmit={submitForm} aria-label="Text directions form" style={{ marginTop: 12 }}>
              {/* Start edit-combo */}
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="start-field">Start building</label>
                <div role="combobox" aria-haspopup="listbox" aria-expanded={startSuggestions.length > 0} aria-owns="start-list">
                  <input
                    id="start-field"
                    ref={startInputRef}
                    value={startInput}
                    onChange={(e) => onStartChange(e.target.value)}
                    onKeyDown={startKeyDown}
                    aria-autocomplete="list"
                    aria-controls="start-list"
                    aria-activedescendant={startActivedId}
                    style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
                    placeholder="Type building name (e.g., Knight Library)"
                  />
                </div>

                {/* Live region: suggestion counts and guidance for screen-readers */}
                <div aria-live="polite" aria-atomic="true" ref={liveRef} style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }}>
                  {statusMessage}
                </div>

              {startSuggestions.length > 0 && (
                  <ul
                    id="start-list"
                    role="listbox"
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      border: "1px solid #ccc",
                      maxHeight: 220,
                      overflow: "auto",
                      background: "#fff",
                      position: "relative",
                      zIndex: 2000
                    }}
                  >
                    {startSuggestions.map((s, i) => (
                      <li
                        key={s + "|" + i}
                        id={"start-option-" + i}
                        role="option"
                        aria-selected={i === activeStartIndex}
                        tabIndex={0}
                        onClick={() => pickStartSuggestion(s)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            pickStartSuggestion(s);
                          }
                        }}
                        style={{
                          padding: 8,
                          cursor: "pointer",
                          background: i === activeStartIndex ? "#eef" : "transparent"
                        }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* End edit-combo */}
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="end-field">End building</label>
                <div role="combobox" aria-haspopup="listbox" aria-expanded={endSuggestions.length > 0} aria-owns="end-list">
                  <input
                    id="end-field"
                    ref={endInputRef}
                    value={endInput}
                    onChange={(e) => onEndChange(e.target.value)}
                    onKeyDown={endKeyDown}
                    aria-autocomplete="list"
                    aria-controls="end-list"
                    aria-activedescendant={endActivedId}
                    style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
                    placeholder="Type building name (e.g., EMU)"
                  />
                </div>

                {endSuggestions.length > 0 && (
                  <ul
                    id="end-list"
                    role="listbox"
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      border: "1px solid #ccc",
                      maxHeight: 220,
                      overflow: "auto",
                      background: "#fff",
                      position: "relative",
                      zIndex: 2000
                    }}
                  >
                    {endSuggestions.map((s, i) => (
                      <li
                        key={s + "|" + i}
                        id={"end-option-" + i}
                        role="option"
                        aria-selected={i === activeEndIndex}
                        tabIndex={0}
                        onClick={() => pickEndSuggestion(s)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") pickEndSuggestion(s);
                        }}
                        style={{
                          padding: 8,
                          cursor: "pointer",
                          background: i === activeEndIndex ? "#eef" : "transparent"
                        }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ padding: "8px 12px" }}>
                  Generate Directions
                </button>
                <button type="button" onClick={closeModal} style={{ padding: "8px 12px" }}>
                  Cancel
                </button>
              </div>
            </form>

            {/* Feedback */}
            <div style={{ marginTop: 18 }}>
              {loading && <div role="status">Loading directions…</div>}
              {error && (
                <div role="alert" style={{ color: "red" }}>
                  {error}
                </div>
              )}

              {/* Route results */}
              {coords.start && coords.end && directions && directions.length > 0 && (
                <section aria-live="polite" aria-atomic="true" style={{ marginTop: 12 }}>
                  <h3>Walking Directions</h3>
                  <ol>
                    {directions.map((d, i) => (
                      <li key={i} style={{ marginBottom: 8 }}>
                        {d}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* If coordinates present but no steps */}
              {coords.start && coords.end && (!directions || directions.length === 0) && (
                <section aria-live="polite" style={{ marginTop: 12 }}>
                  <p>Directions are not available for the selected pair.</p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
