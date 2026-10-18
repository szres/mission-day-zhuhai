import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('public/missions.json', root)));
const routes = data.missions.map(m => ({ order: m.order, title: m.title, displayName: m.displayName, description: m.description,
  points: m.portals.map(p => ({ lat: p.lat, lng: p.lng })) }));
// Route geometry always comes from normalized source, not future portal overrides.
const geometry = JSON.parse(readFileSync(new URL('data/routes-wgs84.json', root)));
for (const r of routes) r.points = geometry[String(r.order)];
const core = readFileSync(new URL('plugins/route-portal-core.cjs', root), 'utf8').replace('module.exports = createRoutePortalTools;', '');
const template = readFileSync(new URL('plugins/zhuhai-portal-exporter.template.js', root), 'utf8');
const output = template.replace('/* CORE */', core).replace('/* ROUTES */[]', JSON.stringify(routes));
mkdirSync(new URL('public/plugins/', root), { recursive: true });
const path = new URL('public/plugins/zhuhai-portal-exporter.user.js', root);
writeFileSync(path, output);
console.log(`Built ${fileURLToPath(path)} (${routes.length} routes).`);
