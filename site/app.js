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
    });
    buildFilters();
    fitAll();
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

// 3. The detail panel.
function showDetail(p, cat, marker) {
  clearSelected();                                                                // un-highlights the last dot
  marker.setStyle({ radius: 9, weight: 3, color: "#1A1A1A", fillOpacity: 1 });    // bigger, dark outline
  marker.bringToFront();                                                          // draws it on top of nearby dots
  selected = marker;
  const panel = document.getElementById("detail");
  panel.style.setProperty("--c", cat.colour);
  document.getElementById("d-name").textContent = "Pothole patching stop";
  document.getElementById("d-status").textContent = cat.label + ", on " + p.date;
  document.getElementById("d-summary").textContent =
    "A city crew's mechanized patcher logged a stop here. One stop can cover several potholes, and the GPS position can be off by a few metres.";
  const link = document.getElementById("d-source");
  link.href = SOURCE_URL;
  panel.hidden = false;
}
function clearSelected() {                                                       //putting highlighted dot back to its normal size and colour
  if (selected) selected.setStyle({ radius: 4, weight: 0, fillOpacity: 0.7 });
  selected = null;
}
document.getElementById("d-close").addEventListener("click", () => {
  clearSelected();
  document.getElementById("detail").hidden = true;
});