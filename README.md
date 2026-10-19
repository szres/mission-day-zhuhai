# Zhuhai Mission Day 2026 map

A local fork of [Shenzhen RES's Foshan map](https://github.com/szres/mission-day-foshan), adapted for [珠海MD2026 on Google My Maps](https://www.google.com/maps/d/viewer?mid=1BAjsSWdPTIntEWA9bBxv_xc7ftd2tAg).

## Run

Requires Node.js, Python 3, Wrangler 4, and an Apple MapKit JS token valid for your serving domain.

```sh
npm run build
npm run dev
```

`public/mapkit-config.js` contains the existing public FSMD frontend token, restricted to `*.szres.org`, which includes `zhmd.szres.org`. It is served by Zhuhai itself so visitors never need to load the token from the FSMD domain. The public token is intentionally versioned; it contains no signing key. Rotate this configuration when the FSMD token expires or is revoked. Private signing keys and local token overrides remain excluded from Git.

The site uses Apple MapKit JS for the basemap, route overlays, and numbered annotations. The original `public/proxy-shim.js` and `functions/api/mk-proxy/[[path]].js` proxy are retained. `npm run dev` serves the site and Pages Functions locally. MapKit also requires an origin allowed by your token; the existing `*.szres.org` token requires a matching domain. Internet access is required for MapKit and mission images.

## Source data

`data/zhuhai-md.kml` is the public Google My Maps KML export downloaded on October 18, 2026. It contains 18 mission markers and 18 routes, with six vertices each. The importer matches each route to its nearby landmark marker (within 50 meters, with a unique match), keeps the original route numbers (01–36, with gaps), preserves route vertex order, and imports descriptions and images.

These are the missions supplied in the map, not a confirmed complete banner. The KML does not provide portal names, portal GUIDs, objectives, or mission Ingress links. The reviewed IITC export in `data/portal-overrides.json` supplies 152 portal entries across 18 routes, with names, images, GUIDs and Ingress links. The corresponding FSMD-style source is retained as `data/ZH-MD.js`. These are reviewed nearby portal candidates, not a confirmed mission objective list. Routes without overrides fall back to numbered source vertices. Although serialized as KML, this source contains GCJ-02 coordinate values. The importer converts every route point to WGS-84 before generating the MapKit data, bounds, and center. The original KML remains unchanged. This was checked against the Fisher Girl landmark in OpenStreetMap (node 776049315); the source location is approximately 600 m from its WGS-84 position before conversion and approximately 40 m after conversion. Source markers may describe nearby route stops rather than the exact landmark. Apple Maps navigation offers WGS-84 or GCJ-02 for the destination environment. Routes are source polylines, not computed walking itineraries.

To refresh, replace `data/zhuhai-md.kml` with the Google My Maps KML export and run `npm run build`. The build is deterministic and offline. It generates `public/missions.json`, `public/mission-pictures.json`, and the local checklist files. `guides.json`, `blogs.json`, and `ingress-missions.json` are optional and keyed by the original route numbers.

## Publishing

`public/` contains the frontend. Deploy it with `functions/` to Cloudflare Pages to enable the MapKit proxy. The deployment target is the separate Cloudflare Pages project `zhmd`, with production branch `zhuhai-md`. Run `npm run deploy` after signing into Wrangler. The MapKit token requires a matching `*.szres.org` custom domain; the default `pages.dev` address is outside its allowed origin. Add canonical and social-preview URLs once the custom domain is active. This fork retains the original repository history on branch `zhuhai-md`; `upstream` points to the Foshan source repository. `origin` points to [szres/mission-day-zhuhai](https://github.com/szres/mission-day-zhuhai).

## Attribution

MIT-licensed application code adapted from the Shenzhen RES Foshan project; see `LICENSE`. Apple Maps basemap and MapKit JS are provided by Apple. Mission locations, route data, descriptions and imagery come from the linked public Zhuhai MD map and remain their respective owners' material. This is an unofficial companion, unaffiliated with Niantic or the event organisers.

## Intel portal exporter

The [IITC userscript](https://zhmd.szres.org/plugins/zhuhai-portal-exporter.user.js) collects and reviews portal candidates along these routes. See [installation and export instructions](plugins/README.md). Copy its reviewed website export to `data/portal-overrides.json` and rebuild to replace route-stop placeholders with real portal data.

## OSM building layer and 3D previews

`public/buildings.geojson` is a locally hosted snapshot of building footprints and parts from OpenStreetMap around the mission route areas, in WGS-84. The default-on Buildings switch adds quiet slate fills and fine outlines to the dark Apple map at neighborhood zoom. Tap a building for its name, height, source link, and a rotatable 3D preview. Mission lines remain above the building layer. The map loads only visible footprints (up to 400 features); the Three.js preview module loads only when a building is selected.

The previews are simplified footprint extrusions, not architectural models or Apple-rendered 3D buildings. Explicit OSM heights are retained; floor-count estimates use 3 metres per level and are labeled as estimates. Missing heights remain unknown in the data and use a clearly labeled illustrative 12 m preview. Courtyard holes and multipolygon buildings are preserved. Roof forms are not reconstructed. OSM coverage varies, and an invalid open outline is skipped rather than fabricated.

Refresh the snapshot explicitly with `npm run osm -- --refresh` (network required). Normal site builds are offline and retain the committed snapshot. Raw extracts are cached under `.cache/osm/` and excluded from Git. The import reads small route bounding boxes from OSM's API; visitors make no OSM API requests. Building data is licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) and attributed on the map and building previews as [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright). The downloadable GeoJSON is the published OSM-derived dataset. Application code remains MIT. Locally vendored Three.js 0.180.0 is MIT-licensed; its license is in `public/vendor/three/LICENSE`.
