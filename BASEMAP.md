# Basemap integration

Verified 9 October 2026 against official sources.

- Provider: U.S. Geological Survey, National Geospatial Program, USGS Topo.
- Tile service: https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}
- Metadata: https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer?f=pjson
- Licensing: https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map
- Official terms state National Map map services/data are free and in the public domain, with no restrictions. No key, account, payment or new agreement is required.
- Credit: Map services and data available from U.S. Geological Survey, National Geospatial Program.
- Visible map credit links USGS and labels the background as modern; the complete credit also appears under About the estimates.

## Coordinates and loading

256px spherical Web Mercator / EPSG:3857, standard XYZ tile indexes; service URL uses z/y/x order. The app requests levels 3–16 and renders the unchanged WGS 84 GeoJSON into the same world coordinate system. SVG track coordinates and raster-image bounds share that one projection through assets/geo.js. Geometry source files are not changed, simplified or reprojected.

Visible tiles only, with 90ms pan/zoom debouncing. No prefetch, credentials, analytics, download cache or tracking code. Normal browser caching applies. The background is grayscale at 35% opacity; all historical tracks remain gold. If individual tiles fail, a compact status appears and track geometry remains usable. A page opened offline still renders the supplied track data and controls.

The official DC GIS WebMercator basemap was tested but clips at the district boundary, omitting the Maryland/Virginia parts of this dataset. USGS was chosen for full regional coverage and explicit public-domain service terms.

A DC-area USGS tile was verified as HTTP 200 image/jpeg with CORS access, including real roads, water and regional geography: https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/11/783/585

The modern background is geographic context, not a claim that present-day roads or geography existed in the selected historical year.
