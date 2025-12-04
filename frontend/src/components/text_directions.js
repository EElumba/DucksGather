import React, { useEffect, useRef, useState } from "react";

/**
 * TextDirectionsModal.jsx (updated final)
 *
 * Preserves all of your accessibility structure and modal/autocomplete logic.
 * Changes:
 *  - Adds FALLBACK_MAP and FALLBACK_FROM_EMU
 *  - Adds getFallbackDirections()
 *  - Adds streetFallbackDirections() (generic non-visual fallback)
 *  - Replaces submitForm routing catch with prioritized fallbacks:
 *      1) Geoapify route (preferred)
 *      2) handcraftedDirections (existing)
 *      3) FALLBACK_MAP / FALLBACK_FROM_EMU
 *      4) streetFallbackDirections (last resort)
 *
 * NOTE: Keep your REACT_APP_GEOAPIFY_KEY in env for Geoapify to run.
 */

const GEOAPIFY_KEY = process.env.REACT_APP_GEOAPIFY_KEY || "";
const ELEVENLABS_API_KEY = process.env.REACT_APP_ELEVENLABS_API_KEY || "";

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
    return steps.map((s) => {
      const instr = s.instruction || s.action || "";
      const distMeters = s.distance || (s.properties && s.properties.distance) || 0;
      const distText = distMeters ? Math.round(distMeters) + " m" : "";
      const name = s.name || (s.properties && s.properties.name) || "";

      if (instr && instr.length > 0) {
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
    throw new Error("Unexpected routing response format.");
  }
}

// Handcrafted detailed directions for a few high-value pairs (non-visual, tactile/structural)
function handcraftedDirections(startName, endName) {
  const key = startName + "__" + endName;
  const map = {
    "Knight Library__Erb Memorial Union (EMU)":
      "Exit the Knight Library via the main south entrance onto the Memorial Quad. Walk northeast across the quad on the paved path for about 60 meters (approximately 200 feet). Continue onto the brick plaza and follow it for another 45 meters until you reach the EMU north-side doors. This route is on paved campus pathways with no street crossings.",
    "Erb Memorial Union (EMU)__Knight Library":
      "From the EMU north-side exit on 13th Avenue, face west and walk along the pedestrian plaza for about 45 meters until the main concrete path begins. Follow the path as it bends slightly southwest for about 60 meters. You will reach the approach to the Knight Library entrance area: a broad ramp/stair run that leads to the library's north-facing entry.",
    // add other precise handcrafted pairs here when you author them
  };
  return map[key] || null;
}

/* ------------------------------
   Fallback directions data + helpers
   ------------------------------ */

/**
 * FALLBACK_MAP:
 * Keys are exactly "<START>__<END>" (match startInput and endInput strings users will choose).
 * Values are arrays of strings (each string becomes a list item).
 *
 * Keep language non-visual (tactile/structural/audio).
 */
const FALLBACK_MAP = {
  // Example pair (you can add more entries keyed exactly as users select them)
  "EMU__Knight Library": [
    "From the EMU north side on East 13th Avenue, face west along the sidewalk.",
    "Walk west along 13th for about 250 feet (approx. 75 meters) until you reach the Kincaid intersection, identified by a curb cut and audible traffic.",
    "Cross at Kincaid using the marked crossing and tactile indicators.",
    "Turn left (south) and walk along the sidewalk for about 150 feet until you reach the pedestrian plaza.",
    "Turn right onto the wide pedestrian walkway and continue for about 120 feet until you reach the library entrance ramp/stairs."
  ]
  // Add more keys here
};

/**
 * FALLBACK_FROM_EMU:
 * Simpler hub-style map keyed by destination building name (used when start is EMU).
 * Values are arrays of strings.
 */
const FALLBACK_FROM_EMU = {
  "Knight Library": [
    "From the EMU north side on East 13th Avenue, face west along the sidewalk.",
    "Walk west on 13th for about 250 feet (approx. 75 meters) until you reach Kincaid — indicated by heavier traffic noise and a curb cut.",
    "Cross Kincaid and turn left (south); walk 150 feet on Kincaid until a wide pedestrian walkway entrance.",
    "Follow that walkway west for about 120 feet to the library entrance ramp/stairs."
  ],
  // Add more EMU -> building entries here (one per destination name)
};

/**
 * getFallbackDirections(startName, endName)
 * - Returns an array of strings (or null if none)
 */
function getFallbackDirections(startName, endName) {
  if (!startName || !endName) return null;
  const exactKey = `${startName}__${endName}`;
  if (FALLBACK_MAP[exactKey]) return FALLBACK_MAP[exactKey];

  // Normalize common EMU variants so you can use "EMU" as start
  const emuKeys = new Set(["EMU", "Erb Memorial Union (EMU)", "Erb Memorial Union", "Erb Memorial Union EMU"]);
  if (emuKeys.has(startName) && FALLBACK_FROM_EMU[endName]) {
    return FALLBACK_FROM_EMU[endName];
  }

  // Reverse lookup optional: if user has reverse pair in FALLBACK_MAP, return note
  const reverseKey = `${endName}__${startName}`;
  if (FALLBACK_MAP[reverseKey]) {
    return [...FALLBACK_MAP[reverseKey], "(Note: this route was authored in reverse; follow it in reverse.)"];
  }

  return null;
}

/* ------------------------------
   Generic street-based fallback (non-visual)
   ------------------------------ */

/**
 * A pragmatic, last-resort fallback that:
 * - computes rough cardinal direction
 * - estimates walking distance in feet
 * - provides stepwise text (non-visual cues)
 *
 * Inputs:
 *  - startName: string label (e.g., "EMU")
 *  - start: { lat, lon }
 *  - endName: string label (e.g., "Knight Library")
 *  - end: { lat, lon }
 *
 * Returns: array of strings
 */
function streetFallbackDirections(startName, start, endName, end) {
  // Haversine-ish small-distance approximation
  const R = 6371000; // meters
  const toRad = (d) => (d * Math.PI) / 180;
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const dLat = toRad(end.lat - start.lat);
  const dLon = toRad(end.lon - start.lon);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  const feet = Math.round(meters * 3.28084);

  // bearing: 0 = north
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  const directions8 = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  const dir = directions8[Math.round(bearing / 45) % 8];

  // Build text steps (non-visual cues only)
  const steps = [];
  steps.push(`Begin at ${startName}.`);
  steps.push(`Head generally ${dir} toward the destination.`);
  steps.push(`Continue along sidewalks and pedestrian paths for approximately ${feet} feet.`);
  steps.push(`When you reach a major crossing or street, use marked crosswalks and tactile indicators to continue toward ${endName}.`);
  steps.push(`This is an approximate route generated as a fallback; verify surroundings and listen for traffic cues as you walk.`);

  return steps;
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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);

  const geocodeCache = useRef({});
  const openButtonRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const modalRef = useRef(null);
  const liveRef = useRef(null);
  const audioRef = useRef(null);

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
    setIsPlayingAudio(false);
    setAudioError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setTimeout(() => {
      if (startInputRef.current) startInputRef.current.focus();
    }, 0);
  }

  // Close modal: restore focus to button
  function closeModal() {
    setOpen(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
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
        // NEW: prioritized fallbacks
        const handcrafted = handcraftedDirections(startInput, endInput);
        const manualFallback = getFallbackDirections(startInput, endInput);

        if (handcrafted) {
          steps = [handcrafted];
        } else if (manualFallback) {
          steps = manualFallback;
        } else {
          // last resort: generic street-based approximator
          steps = streetFallbackDirections(startInput, startGeo, endInput, endGeo);
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

  // Text-to-speech function using ElevenLabs API
  async function playDirectionsAudio() {
    if (!ELEVENLABS_API_KEY) {
      setAudioError("ElevenLabs API key not configured. Please add REACT_APP_ELEVENLABS_API_KEY to your .env file.");
      return;
    }

    if (!directions || directions.length === 0) {
      setAudioError("No directions available to play.");
      return;
    }

    setIsPlayingAudio(true);
    setAudioError(null);

    try {
      // Combine all direction steps into one text
      const fullText = directions.join(" ");

      // ElevenLabs API endpoint for text-to-speech
      // Using voice ID for "Rachel" - you can change this to any voice ID
      const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: fullText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      // Convert response to blob and create audio URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setAudioError("Error playing audio.");
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      setIsPlayingAudio(false);
      setAudioError(err.message || "Failed to generate audio. Please check your API key and try again.");
    }
  }

  // Stop audio playback
  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  }

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
                  
                  {/* Audio controls */}
                  <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                    {!isPlayingAudio ? (
                      <button
                        onClick={playDirectionsAudio}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                        aria-label="Play audio directions"
                      >
                        🔊 Play Audio Directions
                      </button>
                    ) : (
                      <button
                        onClick={stopAudio}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                        aria-label="Stop audio playback"
                      >
                        ⏸️ Stop Audio
                      </button>
                    )}
                    {isPlayingAudio && (
                      <span style={{ fontSize: 14, color: "#28a745" }}>Playing...</span>
                    )}
                  </div>

                  {audioError && (
                    <div role="alert" style={{ color: "#dc3545", marginBottom: 12, padding: 8, backgroundColor: "#f8d7da", borderRadius: 4 }}>
                      {audioError}
                    </div>
                  )}

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
