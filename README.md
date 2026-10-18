# Zhuhai Mission Day 2026 map

A local fork of [Shenzhen RES's Foshan map](https://github.com/szres/mission-day-foshan), adapted for [珠海MD2026 on Google My Maps](https://www.google.com/maps/d/viewer?mid=1BAjsSWdPTIntEWA9bBxv_xc7ftd2tAg).

## Run

Requires Node.js, Python 3, Wrangler 4, and an Apple MapKit JS token valid for your serving domain.

```sh
npm run build
npm run dev
```

Before opening the site, copy `public/mapkit-token.example.js` to `public/mapkit-token.js` and set `window.MAPKIT_TOKEN` to your token. That file is gitignored. Generate the token in your Apple Developer Maps account with an origin matching the serving domain. The local token is intentionally excluded from Git; configure it separately on any new checkout.

The site uses Apple MapKit JS for the basemap, route overlays, and numbered annotations. The original `public/proxy-shim.js` and `functions/api/mk-proxy/[[path]].js` proxy are retained. `npm run dev` serves the site and Pages Functions locally. MapKit also requires an origin allowed by your token; the existing `*.szres.org` token requires a matching domain. Internet access is required for MapKit and mission images.

## Source data

`data/zhuhai-md.kml` is the public Google My Maps KML export downloaded on October 18, 2026. It contains 18 mission markers and 18 routes, with six vertices each. The importer matches each route to its nearby landmark marker (within 50 meters, with a unique match), keeps the original route numbers (01–36, with gaps), preserves route vertex order, and imports descriptions and images.

These are the missions supplied in the map, not a confirmed complete banner. The KML does not provide portal names, portal GUIDs, objectives, or mission Ingress links. Route vertices are shown as numbered route stops; Ingress links are hidden when IDs are unavailable. Coordinates are treated as WGS-84, as exported by KML, without additional conversion on the web map. Apple Maps navigation offers WGS-84 or GCJ-02 for the destination environment. Routes are source polylines, not computed walking itineraries.

To refresh, replace `data/zhuhai-md.kml` with the Google My Maps KML export and run `npm run build`. The build is deterministic and offline. It generates `public/missions.json`, `public/mission-pictures.json`, and the local checklist files. `guides.json`, `blogs.json`, and `ingress-missions.json` are optional and keyed by the original route numbers.

## Publishing

`public/` contains the frontend. Deploy it with `functions/` to Cloudflare Pages to enable the MapKit proxy. The deployment target is the separate Cloudflare Pages project `zhmd`, with production branch `zhuhai-md`. Run `npm run deploy` after signing into Wrangler. The MapKit token requires a matching `*.szres.org` custom domain; the default `pages.dev` address is outside its allowed origin. Add canonical and social-preview URLs once the custom domain is active. This fork retains the original repository history on branch `zhuhai-md`; `upstream` points to the Foshan source repository. `origin` points to [szres/mission-day-zhuhai](https://github.com/szres/mission-day-zhuhai).

## Attribution

MIT-licensed application code adapted from the Shenzhen RES Foshan project; see `LICENSE`. Apple Maps basemap and MapKit JS are provided by Apple. Mission locations, route data, descriptions and imagery come from the linked public Zhuhai MD map and remain their respective owners' material. This is an unofficial companion, unaffiliated with Niantic or the event organisers.
