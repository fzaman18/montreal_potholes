// Montreal pothole patches: central Montréal, 2024 and 2025
// The whole behaviour layer for this site. It does three things:
//   1. draws the map and a dot for every patching stop in the GeoJSON file
//   2. lets the reader switch each year on and off
//   3. shows the detail for a stop when its dot is clicked

// Colours and plain-English names for each year in the data.
// The keys are the year values the notebook writes into the GeoJSON.
const CATEGORIES = {
  "2024": { label: "Patched in 2024", colour: "#2F5D8A" },
  "2025": { label: "Patched in 2025", colour: "#D9820B" }
};

// Where the data comes from. The detail panel links here.
const SOURCE_URL = "https://donnees.montreal.ca/dataset/refection-de-chaussee-par-remplissage-mecanise-de-nid-de-poule";

// 1. The map. The starting view is over central Montréal (latitude first); fitAll() zooms
// to the data once it has loaded. preferCanvas draws thousands of dots on one
// canvas instead of one page element each, which keeps the page fast.
const map = L.map("map", { scrollWheelZoom: true, preferCanvas: true }).setView([45.515, -73.585], 13);
// OpenStreetMap basemap. Open the page with Live Server: OpenStreetMap refuses
// tiles to a page opened by double-click.
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const layers = {};                // one layer group per year, so each can be switched on and off
const bounds = L.latLngBounds([]); // grows as dots are added, so "Show everything" can fit the map to them
let shown = 0;
let selected = null;

// 2. Read the data file and add a dot for each feature.
fetch("../data/potholes_2024_2025.geojson")
  .then(response => {
    if (!response.ok) throw new Error("HTTP " + response.status + " loading potholes_2024_2025.geojson");
    return response.json();
  })
  .then(data => {
    data.features.forEach(feature => {
      const p = feature.properties;
      const key = String(p.year);
      const cat = CATEGORIES[key];
      if (!cat) return; // skipping anything with a year we do not know

      // GeoJSON stores [longitude, latitude]; Leaflet wants [latitude, longitude].
      const [lon, lat] = feature.geometry.coordinates;
      const marker = L.circleMarker([lat, lon], {
        radius: 4, weight: 0, fillColor: cat.colour, fillOpacity: 0.7
      });
      marker.on("click", () => showDetail(p, cat, marker));

      if (!layers[key]) layers[key] = L.layerGroup().addTo(map);
      marker.addTo(layers[key]);
      bounds.extend([lat, lon]);
      shown += 1;
            countWholeArea(p);                   // A3: tally this stop for the dashboard
    });
    buildFilters();
    fitAll();
        showWholeArea();                       // A3: fill the dashboard now the data has loaded
    document.getElementById("status").textContent =
      shown.toLocaleString("en-CA") + " patching stops shown";
  })
  .catch(err => {
    document.getElementById("status").textContent =
      "The patch data could not be loaded. Open the browser console (F12) to see why.";
    console.error(err);
  });

// The year switches: one chip per year, each switching its layer on or off.
function buildFilters() {
  const bar = document.getElementById("filters");
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    if (!layers[key]) return;
    const b = document.createElement("button");
    b.className = "chip";
    b.style.setProperty("--c", cat.colour);
    b.textContent = cat.label;
    b.setAttribute("aria-pressed", "true");
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", on ? "false" : "true");
      on ? map.removeLayer(layers[key]) : map.addLayer(layers[key]);
    });
    bar.appendChild(b);
  });
}

function fitAll() {
  if (bounds.isValid()) map.fitBounds(bounds.pad(0.05));
}
document.getElementById("showall").addEventListener("click", () => {
  document.querySelectorAll(".chip[aria-pressed]").forEach(b => b.setAttribute("aria-pressed", "true"));
  Object.values(layers).forEach(l => map.addLayer(l));
  fitAll();
});

// 3. The detail popup: opens right beside the dot the reader clicked.
function showDetail(p, cat, marker) {
  clearSelected();                                          // un-highlights the last dot

  // build the popup's contents with textContent, so nothing from the data is ever treated as HTML
  const box = document.createElement("div");
  box.className = "stop-popup";
  box.style.setProperty("--c", cat.colour);                 // the year's colour, as a stripe on the left
  const title = document.createElement("strong");
  title.textContent = "Pothole patching stop";
  const status = document.createElement("p");
  status.className = "status";
  status.textContent = cat.label + ", on " + p.date;
  const summary = document.createElement("p");
  summary.textContent = "A city crew's mechanized patcher logged a stop here. One stop can cover several potholes, and the GPS position can be off by a few metres.";
  const link = document.createElement("a");
  link.href = SOURCE_URL;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "About this data";
  box.append(title, status, summary, link);

  L.popup({ maxWidth: 240, offset: [0, -9] })               // a little above the dot, so it does not cover it
    .setLatLng(marker.getLatLng())
    .setContent(box)
    .openOn(map);                                           // opens next to the dot; any older popup closes

  marker.setStyle({ radius: 9, weight: 3, color: "#1A1A1A", fillOpacity: 1 });   // bigger, dark outline
  marker.bringToFront();                                    // draws it on top of nearby dots
  selected = marker;
}
function clearSelected() {                                  // puts the highlighted dot back to its normal size and colour
  if (selected) selected.setStyle({ radius: 4, weight: 0, fillOpacity: 0.7 });
  selected = null;
}
map.on("popupclose", clearSelected);                        // closing the popup (x, or a click elsewhere) un-highlights the dot

// ============================================================
// A3 FEATURE: click a street and see its counts (dashboard)
// ============================================================

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May"];   // the city's files only have January to May

// Counts for the whole study area. countWholeArea adds one stop at a time (it is called from the loader above).
const whole = { total: 0, y2024: 0, y2025: 0, m24: [0, 0, 0, 0, 0], m25: [0, 0, 0, 0, 0] };

function countWholeArea(p) {
  const year = Number(p.year);
  const month = Number(p.date.slice(5, 7)) - 1;      // "2025-04-04": characters 5 to 7 are the month; 0 = January
  whole.total += 1;
  if (year === 2024) whole.y2024 += 1;
  if (year === 2025) whole.y2025 += 1;
  if (month >= 0 && month < MONTHS.length) {
    if (year === 2024) whole.m24[month] += 1;
    if (year === 2025) whole.m25[month] += 1;
  }
}

// Draw the whole dashboard from one "counts" object: { total, y2024, y2025, m24: [...], m25: [...] }
function renderDashboard(title, sub, c, message) {
  document.getElementById("dash-title").textContent = title;
  document.getElementById("dash-sub").textContent = sub;
  document.getElementById("dash-total").textContent = c.total.toLocaleString("en-CA");
  document.getElementById("dash").classList.remove("empty");     // show the numbers and charts again
  const msg = document.getElementById("dash-msg");
  msg.className = "msg";                                         // the normal look (showNoStreet makes it bold)
  msg.textContent = message || "";
  msg.hidden = !message;
  drawYears(c);
  drawMonths(c);
}

// The yearly chart: one bar per year. The longest bar fills the track.
function drawYears(c) {
  const box = document.getElementById("dash-years");
  box.textContent = "";                                    // clear the old bars
  const biggest = Math.max(c.y2024, c.y2025, 1);           // at least 1, so we never divide by 0
  [["2024", c.y2024, "var(--blue)"], ["2025", c.y2025, "var(--amber)"]].forEach(([label, value, colour]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    const name = document.createElement("span");
    name.textContent = label;
    const track = document.createElement("span");
    track.className = "bar-track";
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.style.width = (100 * value / biggest) + "%";      // bar length is the value as a share of the biggest
    fill.style.setProperty("--c", colour);
    track.appendChild(fill);
    const num = document.createElement("span");
    num.className = "bar-num";
    num.textContent = value.toLocaleString("en-CA");
    row.append(name, track, num);
    box.appendChild(row);
  });
}

// The monthly chart: for each month, a blue bar (2024) and an amber bar (2025).
// A month where the city has no records at all for that year shows "no records", not a zero.
function drawMonths(c) {
  const box = document.getElementById("dash-months");
  box.textContent = "";
  const biggest = Math.max(...c.m24, ...c.m25, 1);
  MONTHS.forEach((monthName, i) => {
    const pairs = [[c.m24[i], whole.m24[i], "var(--blue)"], [c.m25[i], whole.m25[i], "var(--amber)"]];
    const col = document.createElement("div");
    col.className = "month";
    const bars = document.createElement("div");
    bars.className = "month-bars";
    const nums = document.createElement("div");
    nums.className = "nums";
    pairs.forEach(([value, areaValue, colour]) => {
      const noRecords = areaValue === 0;                   // the whole area has none: the city did not record that month
      const bar = document.createElement("span");
      bar.className = "bar";
      bar.style.setProperty("--c", colour);
      bar.style.height = (noRecords ? 0 : 100 * value / biggest) + "%";
      bars.appendChild(bar);
      const line = document.createElement("div");
      line.style.setProperty("--c", colour);
      line.textContent = noRecords ? "no records" : value.toLocaleString("en-CA");
      nums.appendChild(line);
    });
    const label = document.createElement("div");
    label.className = "month-name";
    label.textContent = monthName;
    col.append(bars, label, nums);
    box.appendChild(col);
  });
}

let selectedLine = null;           // the highlight on the map for the chosen street (used from Part D)

function clearHighlight() {
  if (selectedLine) { map.removeLayer(selectedLine); selectedLine = null; }
}

function showWholeArea() {
  renderDashboard("Whole study area", "Central Montréal, every street", whole, "");
}

function resetDashboard() {        // what the "Show whole area" button does
  clearHighlight();                // removes the dark highlight on the street
  map.closePopup();                // closes a dot's popup too; closing it also shrinks the dot back (see popupclose above)
  showWholeArea();
}
document.getElementById("dash-reset").addEventListener("click", resetDashboard);

// ---- Part D: the street click ----
const STREETS_URL = "../data/streets_central.geojson";
let streets = [];                 // every street segment: its properties and its line, filled when the file loads
const PICK_PX = 18;               // how close to a street a click must land, in screen pixels (about a fingertip)
const PICK_MIN_M = 10;            // but never less than 10 m ...
const PICK_MAX_M = 60;            // ... and never more than 60 m on the ground

// 1. Load the streets file: the same pattern as the stops above, pointed at the streets.
fetch(STREETS_URL)
  .then(response => {
    if (!response.ok) throw new Error("HTTP " + response.status + " loading streets_central.geojson");
    return response.json();
  })
  .then(data => {
    streets = data.features.map(f => ({ p: f.properties, line: f.geometry.coordinates }));   // line = [[lon, lat], ...]
  })
  .catch(err => {
    console.error(err);          // the reader is told when they click (see the click handler); the whole-area numbers still work
  });

// 2. EVENT: a click on the map. HANDLER: find the nearest street. UPDATE: highlight it and redraw the dashboard.
map.on("click", function (e) {
  if (streets.length === 0) {
    showMessageOnly("Street counts are not available right now. Reload the page to try again.");
    return;
  }
  const raw = PICK_PX * metresPerPixel(e.latlng.lat);                  // 18 screen pixels, converted to metres at this zoom
  const maxMetres = Math.min(Math.max(raw, PICK_MIN_M), PICK_MAX_M);
  const hit = nearestStreet(e.latlng, maxMetres);
  if (!hit) {
    showNoStreet("No street within reach of that click. Zoom in and click on a street.");
    return;
  }
  chooseStreet(hit);
});

// How many metres one screen pixel covers on the ground at this latitude and zoom.
function metresPerPixel(lat) {
  return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, map.getZoom());
}

// Find the street segment closest to the click, within maxMetres. Distances are measured on a flat grid centred on the click.
function nearestStreet(latlng, maxMetres) {
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(latlng.lat * Math.PI / 180);
  let best = null;
  let bestDist = maxMetres;
  streets.forEach(s => {
    // turn each [lon, lat] point into metres east and north of the click, so the click is at (0, 0)
    const pts = s.line.map(c => [(c[0] - latlng.lng) * mPerDegLon, (c[1] - latlng.lat) * mPerDegLat]);
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToPiece(pts[i], pts[i + 1]);
      if (d < bestDist) { bestDist = d; best = s; }
    }
  });
  return best;                                                          // null if nothing was within reach
}

// Distance from the point (0, 0) to the straight piece of line from a to b.
function distToPiece(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : -(a[0] * dx + a[1] * dy) / len2;             // how far along a to b the closest point lies
  t = Math.max(0, Math.min(1, t));                                      // keep it on the piece, not on the extended line
  return Math.hypot(a[0] + t * dx, a[1] + t * dy);
}

// 3. UPDATE: highlight the chosen segment, then redraw the dashboard with its numbers.
function chooseStreet(s) {
  clearHighlight();                                                     // one answer at a time: remove the last highlight
  const latlngs = s.line.map(c => [c[1], c[0]]);                        // GeoJSON is [lon, lat]; Leaflet wants [lat, lon]
  selectedLine = L.polyline(latlngs, { color: "#1C2226", weight: 8, opacity: 0.6, interactive: false }).addTo(map);
  const p = s.p;
  const counts = {
    total: p.total, y2024: p.y2024, y2025: p.y2025,
    m24: [p.m24_1, p.m24_2, p.m24_3, p.m24_4, p.m24_5],
    m25: [p.m25_1, p.m25_2, p.m25_3, p.m25_4, p.m25_5]
  };
  const message = p.total === 0
    ? "No patching stops were recorded on this street in 2024 or 2025. The city's file only covers central crews on main roads, so this does not mean the road is in good condition."
    : "";
  renderDashboard(p.name, "Street segment " + p.id + " (one block between intersections)", counts, message);
}

// A bold note in the dashboard that leaves the numbers as they were (used when the street file did not load).
function showMessageOnly(text) {
  const msg = document.getElementById("dash-msg");
  msg.className = "msg alert";
  msg.textContent = text;
  msg.hidden = false;
}

// The click landed on no street: clear the old highlight and the old numbers, and say so in bold.
function showNoStreet(text) {
  clearHighlight();
  document.getElementById("dash-title").textContent = "No street selected";
  document.getElementById("dash-sub").textContent = "";
  document.getElementById("dash").classList.add("empty");        // hides the big number and the charts (see style.css)
  showMessageOnly(text);
}