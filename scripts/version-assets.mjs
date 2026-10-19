// Make connected Git deployments invalidate cached frontend modules together.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const publicDir = new URL('../public/', import.meta.url);
const files = readdirSync(publicDir).filter(name => /\.(js|css)$/.test(name) && name !== 'mapkit-token.js').sort();
const normalize = text => text.replace(/\?v=[0-9a-f]{12}/g, '');
const hash = createHash('sha256');
for (const name of files) hash.update(name + '\n' + normalize(readFileSync(new URL(name, publicDir), 'utf8')));
const version = hash.digest('hex').slice(0, 12);
for (const name of files.filter(name => name.endsWith('.js'))) {
  const path = new URL(name, publicDir);
  const original = readFileSync(path, 'utf8');
  const text = normalize(original).replace(/((?:from\s*|import\s*\(\s*)['"])(\.\/[^'"?]+\.js)(['"])/g,
    (_match, prefix, target, suffix) => `${prefix}${target}?v=${version}${suffix}`);
  if (text !== original) writeFileSync(path, text);
}
const index = new URL('index.html', publicDir);
const original = readFileSync(index, 'utf8');
const html = normalize(original).replace(/((?:src|href)=["'])(\/(?:app\.js|style\.css|proxy-shim\.js|mapkit-config\.js))(["'])/g,
  (_match, prefix, target, suffix) => `${prefix}${target}?v=${version}${suffix}`);
if (html !== original) writeFileSync(index, html);
console.log(`Frontend asset version: ${version}`);
