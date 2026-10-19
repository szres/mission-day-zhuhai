# Zhuhai MD route portal exporter

Install [IITC-CE](https://iitc.app/download_desktop), then install the generated userscript:

https://zhmd.szres.org/plugins/zhuhai-portal-exporter.user.js

The generated file is also at `public/plugins/zhuhai-portal-exporter.user.js`. Open it in Tampermonkey/Violentmonkey or load it as an IITC Mobile plugin. This is an IITC plugin running on `https://intel.ingress.com/`, not a standalone extension for stock Intel.

## Use

1. Sign into Intel with IITC enabled, reload, and open **Zhuhai MD portals** from the toolbox.
2. Choose all routes or a single route. The corrected WGS-84 geometry is embedded in the script; it makes no requests to FSMD or Zhuhai for route data.
3. Choose **All portals near route lines** (default) or **Match original route stops**. Distance defaults to 40 metres; increase it if the hand-drawn line misses portals. Corridor mode includes portals along segments, not just near vertices, and sorts them in route order. Stop mode lists nearby alternatives for each original vertex.
4. Click **Scan selected routes**. The plugin moves the IITC map through the route at zoom 17 and waits for normal `mapDataRefreshEnd` events. Leave the map still while scanning. **Stop** stops after the current map/detail request. You can also pan normally at zoom 17+ and click **Collect loaded**. Portal data remains in memory while the page stays open, even after IITC removes portals from the viewport. It is lost on reload.
5. Review every match. Uncheck unrelated portals in corridor mode, or choose alternatives in stop mode. **View** centers the map on a corridor candidate. Route lines are cyan; selected portals are orange. Avoid selecting the same portal twice within one route.
6. Click **Load selected details** to retrieve missing names and images, one portal at a time through IITC's detail API. Failed requests are reported and can be retried. Review the final selections and check **I reviewed these candidate portals and their order**.
7. Export **website overrides** or **FSMD-style JS**. Downloads stay on your computer; the plugin does not upload or publish portal data.

The scan reports completed areas and timeouts. Even a completed scan is not proof that Intel returned every portal. Retry timed-out areas and inspect dense areas manually. Radius matching can include nearby unrelated portals and miss portals away from the line. Neither the original polyline nor these exports establish actual mission objectives, hack order, or whether a portal remains part of a live mission. Objectives are left `null`.

## Website import

Copy the downloaded `portal-overrides.json` to `data/portal-overrides.json`, then run:

```sh
npm run build
npm test
```

Reviewed missions replace the numbered placeholder stops with real portal names, GUIDs, WGS-84 coordinates, and images. Routes omitted from an export retain their placeholders. Current Google map route numbers are preserved. Stable source route IDs keep portal data attached to the same routes after later renumbering. The importer rejects unreviewed exports, duplicate or malformed GUIDs, invalid coordinates, and unsupported image URLs. Builds retain the original route geometry in `data/routes-wgs84.json`, so future plugin builds do not accidentally use proximity candidates as source lines.

`ZH-MD.js` follows FSMD's `const MDUMMJSON = {...}` wrapper and field structure, with `sourceOrder` added to retain the current Google map route numbers. `fileFormatVersion` is 2. Compatibility with other MDUMM editors has not been tested. Keep `sourceOrder` if adapting FSMD's sequential extractor.

## Development

Edit `plugins/zhuhai-portal-exporter.template.js` and `plugins/route-portal-core.cjs`, then run `npm run build`. The generated installable userscript is committed for static hosting. `npm test` checks matching geometry and the website import. Browser interaction checks use mocked IITC APIs; an authenticated Intel session is needed for end-to-end map loading.
