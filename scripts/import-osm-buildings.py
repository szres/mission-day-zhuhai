#!/usr/bin/env python3
"""Download small route-area OSM extracts and publish only building geometry."""
import argparse
import datetime
import json
import math
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = 'https://www.openstreetmap.org/api/0.6/'


def tags(element):
    return {t.get('k'): t.get('v') for t in element.findall('tag')}


def metres(value):
    if value is None:
        return None
    value = str(value).strip().lower()
    try:
        number = float(value.removesuffix(' m').removesuffix('m').strip())
        return number if math.isfinite(number) and 0 <= number <= 1000 else None
    except ValueError:
        return None


def height_properties(t):
    height = metres(t.get('height'))
    source = 'height' if height is not None else None
    if height is None:
        levels = metres(t.get('building:levels'))
        if levels is not None and 0 < levels <= 200:
            height, source = levels * 3, 'estimated from building:levels (3 m per level)'
    return {'heightMeters': height, 'heightSource': source,
            'minHeightMeters': metres(t.get('min_height')) or 0,
            'roofShape': t.get('roof:shape')}


def stitch(parts):
    parts = [list(p) for p in parts]
    rings = []
    while parts:
        ring = parts.pop(0)
        while ring[0] != ring[-1]:
            for i, part in enumerate(parts):
                if ring[-1] == part[0]:
                    ring.extend(part[1:])
                elif ring[-1] == part[-1]:
                    ring.extend(part[-2::-1])
                elif ring[0] == part[-1]:
                    ring = part[:-1] + ring
                elif ring[0] == part[0]:
                    ring = part[:0:-1] + ring
                else:
                    continue
                parts.pop(i)
                break
            else:
                raise ValueError('Unclosed multipolygon member ring')
        if len(ring) < 4:
            raise ValueError('Degenerate building ring')
        rings.append(ring)
    return rings


def contains(ring, p):
    inside = False
    x, y = p
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0]) * (y-a[1]) / (b[1]-a[1]) + a[0]:
            inside = not inside
    return inside


def convert(elements):
    nodes = {int(e.get('id')): [float(e.get('lon')), float(e.get('lat'))] for e in elements.values() if e.tag == 'node'}
    ways = {int(e.get('id')): e for e in elements.values() if e.tag == 'way'}
    features, skipped, consumed = [], [], set()

    def ring(ids):
        coordinates = [nodes[i] for i in ids]
        if len(coordinates) < 4 or coordinates[0] != coordinates[-1]:
            raise ValueError('Open building outline')
        return coordinates

    def feature(e, polygons):
        t = tags(e)
        props = {'osmId': f'{e.tag}/{e.get("id")}', 'name': t.get('name'),
                 'building': t.get('building') or t.get('building:part'),
                 'isPart': 'building:part' in t, **height_properties(t)}
        coords = [p for polygon in polygons for r in polygon for p in r]
        props['bounds'] = [min(p[0] for p in coords), min(p[1] for p in coords), max(p[0] for p in coords), max(p[1] for p in coords)]
        return {'type': 'Feature', 'id': props['osmId'], 'properties': props,
                'geometry': {'type': 'MultiPolygon', 'coordinates': polygons}}

    for e in elements.values():
        t = tags(e)
        if e.tag != 'relation' or t.get('type') != 'multipolygon' or not ('building' in t or 'building:part' in t):
            continue
        try:
            members = [m for m in e.findall('member') if m.get('type') == 'way']
            refs = lambda role: [[int(n.get('ref')) for n in ways[int(m.get('ref'))].findall('nd')] for m in members if (m.get('role') or 'outer') == role]
            outers = [ring(ids) for ids in stitch(refs('outer'))]
            inners = [ring(ids) for ids in stitch(refs('inner'))]
            if not outers:
                raise ValueError('No building outer ring')
            polygons = [[outer] for outer in outers]
            for inner in inners:
                for polygon in polygons:
                    if contains(polygon[0], inner[0]):
                        polygon.append(inner)
                        break
                else:
                    raise ValueError('Unassigned building courtyard')
            features.append(feature(e, polygons))
            consumed.update(int(m.get('ref')) for m in members)
        except (KeyError, ValueError) as err:
            skipped.append(f'relation/{e.get("id")}: {err}')
    for ident, e in ways.items():
        t = tags(e)
        if ident in consumed or not ('building' in t or 'building:part' in t) or t.get('building') == 'no':
            continue
        try:
            features.append(feature(e, [[ring([int(n.get('ref')) for n in e.findall('nd')])]]))
        except (KeyError, ValueError) as err:
            skipped.append(f'way/{ident}: {err}')
    return features, skipped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    cache = ROOT / '.cache/osm'
    cache.mkdir(parents=True, exist_ok=True)
    elements = {}
    def download(path, filename):
        target = cache / filename
        if args.refresh or not target.exists():
            req = urllib.request.Request(API + path, headers={'User-Agent': 'ZhuhaiMissionDayMap/1.0 (https://github.com/szres/mission-day-zhuhai)'})
            with urllib.request.urlopen(req, timeout=45) as response:
                content = response.read()
            ET.fromstring(content)
            target.write_bytes(content)
            time.sleep(1)
        for element in ET.parse(target).getroot():
            if element.tag in ('node', 'way', 'relation'):
                key = (element.tag, int(element.get('id')))
                if key not in elements or int(element.get('version', 0)) >= int(elements[key].get('version', 0)):
                    elements[key] = element
    routes = json.loads((ROOT / 'data/routes-wgs84.json').read_text())
    for order, points in routes.items():
        box = [min(p['lng'] for p in points)-.002, min(p['lat'] for p in points)-.0018,
               max(p['lng'] for p in points)+.002, max(p['lat'] for p in points)+.0018]
        bbox = ','.join(f'{n:.7f}' for n in box)
        print(f'Fetching route #{order} buildings…', flush=True)
        download('map?bbox='+bbox, f'route-{order}-{bbox}.osm')
    # Complete building multipolygons that cross extract boundaries.
    for e in list(elements.values()):
        t = tags(e)
        if e.tag == 'relation' and t.get('type') == 'multipolygon' and ('building' in t or 'building:part' in t):
            download(f'relation/{e.get("id")}/full', f'relation-{e.get("id")}.osm')
    features, skipped = convert(elements)
    features.sort(key=lambda f: f['id'])
    data = {'type': 'FeatureCollection', 'attribution': '© OpenStreetMap contributors',
            'license': 'ODbL-1.0', 'sourceUrl': 'https://www.openstreetmap.org/copyright',
            'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'coordinateSystem': 'WGS-84', 'coverage': 'Mission route bounding boxes with approximately 200 m padding; OSM coverage varies.',
            'skipped': skipped, 'features': features}
    (ROOT / 'public/buildings.geojson').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n')
    print(f'Imported {len(features)} buildings/parts; {sum(f["properties"]["heightMeters"] is not None for f in features)} have height/level data; skipped {len(skipped)} incomplete features.')


if __name__ == '__main__':
    main()
