# Montreal pothole patches: Central Montréal, 2024 and 2025

GEOG 464 Programming for Geospatial Technologies, Fall 2026. A2 MVP. Fariha Zaman.

A map of 21,205 pothole-patching stops made by Montreal's central road crews in central Montréal, with switches for 2024 and 2025. It is small on purpose: one area, two years, one map, one story.

## The five sentences

1. **Problem.** Drivers and cyclists in central Montréal cannot easily see where the city's crews have patched potholes, or how that changed between 2024 and 2025.
2. **Audience.** A Montreal driver or cyclist planning a route through central Montréal.
3. **Core action.** Switch 2024 and 2025 on and off, compare them, and click any dot to see the date it was patched.
4. **Boundary.** It does not rank streets by patch count, show live potholes, or take new pothole reports.
5. **Data.** The City of Montréal's records of mechanized pothole patching (GPS position and date), 2024 and 2025. The city's street network (Géobase) is the planned second dataset.

## Running it

1. I Opened this folder, `montreal-potholes`, in VS Code. The folder itself, not `site`.
2. Put the two city files in `data/` (see the data source below).
3. Ran `notebooks/mtl_potholes.ipynb` top to bottom. It needs pandas and geopandas. The last check cell prints `All checks passed`.
4. Right-clicked `site/index.html` and chose Open with Live Server.

## The layers

| Layer | File | What it does |
| --- | --- | --- |
| Data | `data/remplissage_niddepoule_2024.gpkg`, `data/remplissage_niddepoule_2025.gpkg` | The city's patch records, one file per year, with a date and a GPS position for each stop |
| Processing | `notebooks/mtl_potholes.ipynb` | Reads both files, counts rows with no location or no date, drops rows outside 2024 and 2025, converts metres to degrees, cuts to one area, writes GeoJSON, then checks the output |
| Structure | `site/index.html` | The story column, the map, the year switches, the detail panel |
| Presentation | `site/style.css` | Colours taken from the subject: asphalt, steel blue for 2024, amber for 2025 |
| Behaviour | `site/app.js` | Loads the GeoJSON, draws a dot per stop, builds the year switches, shows the detail panel |

## Data source 

| | |
| --- | --- |
| Title | Travaux de colmatage mécanisé de nid-de-poule des chaussées (earlier title: Réfection de chaussée par remplissage mécanisé de nid-de-poule) |
| Publisher | Ville de Montréal, Service des infrastructures du réseau routier |
| Link | https://donnees.montreal.ca/dataset/refection-de-chaussee-par-remplissage-mecanise-de-nid-de-poule |
| Licence | Attribution (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/ |
| Date accessed | 2 October 2026 |
| Files used | `remplissage_niddepoule_2024.gpkg`, `remplissage_niddepoule_2025.gpkg` (GeoPackage, one per year) |
| Coordinates | Metres in EPSG:2950 (Montreal's MTM zone 8), converted to degrees (EPSG:4326) with GeoPandas |
| Coverage | 2024 runs from 17 January to 30 May 2024, with no stops in February. 2025 runs from 18 January to 20 May 2025. |

### What the notebook changed

- Kept only the date, the year and the position of each stop, and dropped the vehicle column.
- Kept only the stops inside central Montréal, a box with south 45.495, north 45.535, west -73.615 and east -73.555 (degrees).
- Checked for rows with no location or no date (none were found), and removed rows dated outside 2024 and 2025, counting each removal.
- Combined 2024 and 2025 into one GeoJSON file with a `year` property.

### Counts

| Step | Rows |
| --- | --- |
| Read (2024 and 2025 together) | 124,570 |
| Dropped: no location or no date | 0 |
| Dropped: dated outside 2024 and 2025 | 4 |
| Dropped: outside the central Montréal box | 103,361 |
| Kept (features in the GeoJSON) | 21,205 |
| Kept in 2024 / kept in 2025 | 8,764 / 12,441 |

GeoJSON file size: 3.22 MB.

## What the data can and cannot show

From the city's own description of the data:

- It records only patches made by central road crews with mechanized equipment. Borough repairs and manual repairs are not included.
- Mechanized patching focuses on arterial (main) roads first, so a street with no dots may simply not be covered.
- One GPS position can cover several potholes patched from the same spot.
- GPS accuracy is usually a few metres, but can be tens of metres near tall obstacles.
- These are raw data without corrections.

From my own check of the files:

- The two years do not cover the same months. In the city's files, 2024 has no stops in February, and April 2024 has 2,350 stops against 28,399 in April 2025. January and March are close in size across the two years. More dots for 2025 do not mean the city patched more that year.

## Not in this iteration

- **The whole city and the other years.** The city has published patch records since December 2016. This version shows one area and two years, so the GeoJSON stays under about 5 MB and the page loads quickly.
- **Patches per street.** Ranking streets needs the city's street network (Géobase) as a second dataset and a join, which comes later in this project.
- **Live data and new reports.** The file only records patches already made. Taking reports would need a server, which the course does not require at this stage.
- **Severity, status and time of repair.** The data has only a vehicle, a date and time, and a position.
- **Routes that avoid potholes.** This would need a new algorithm and the street network.
- **Borough crews and manual repairs.** The city's file leaves them out.

## Testing evidence

The check cell reads the saved file back and prints “All checks passed”. The row counts matched at every step. I switched each year on and off, clicked dots which showed the pop-up contents with the date, and did the stranger test with the help of two friends during which we noticed dots inside buildings. I suspected my own rounding, so I measured how far saving moved the points (5.5cm). I changed nothing as the offset is likely a GPS error.

## AI disclosure

Lane: Green
Tool and model: Claude (chat window), Sonnet 5.5

- **What I asked it to do:** I asked the chat assistant for the notebook code one step at a time, and for the year switches (index.html), based on the course samples. It supplied the starting code, including the filter code for the 2024 and 2025 switches, and helped check and change my index.html, app.js and style.css files (screenshots).
- **What came back, and what I did with it:** I ran every step myself and did not accept everything. I dropped its first set of finished files and started again from my own notebook. I questioned its starter box for the area because it didn’t match my busiest-squares table, so the box was redone around those squares. I didn’t accept the “0 rows dropped” result until I ran extra checks. I tried a month filter, then removed it. I added a short comment on each major step, and a final check cell modelled on Lab 4.
- **What stayed mine:** The topic, the study area and years, the choice of what to show (selected data points), and all the written content are my own decisions and work.

## Sources

- City of Montréal, Travaux de colmatage mécanisé de nid-de-poule des chaussées: https://donnees.montreal.ca/dataset/refection-de-chaussee-par-remplissage-mecanise-de-nid-de-poule
- City of Montréal, Géobase, réseau routier (planned second dataset): https://donnees.montreal.ca/dataset/geobase
- Basemap: © OpenStreetMap contributors.

Data used under the Creative Commons Attribution 4.0 licence (CC BY 4.0), credited to Ville de Montréal. My changes are listed under "What the notebook changed".
