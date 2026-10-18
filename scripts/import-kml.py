#!/usr/bin/env python3
"""Rebuild the site from the checked-in, public Google My Maps export."""
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NS = {'k': 'http://www.opengis.net/kml/2.2'}
SOURCE = 'https://www.google.com/maps/d/viewer?mid=1BAjsSWdPTIntEWA9bBxv_xc7ftd2tAg'

def text(node, path):
    return node.findtext(path, default='', namespaces=NS).strip()

def coords(value):
    return [(float(v.split(',')[1]), float(v.split(',')[0])) for v in value.split()]

def distance(a, b):
    return math.hypot(a[0] - b[0], (a[1] - b[1]) * math.cos(math.radians(a[0]))) * 111320

def write(name, value):
    (ROOT / 'public' / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

root = ET.parse(ROOT / 'data/zhuhai-md.kml')
markers, routes = [], []
for pm in root.findall('.//k:Placemark', NS):
    if text(pm, 'k:Point/k:coordinates'):
        markers.append(pm)
    elif text(pm, 'k:LineString/k:coordinates'):
        routes.append(pm)
missions, pictures, used = [], {}, set()
for route in sorted(routes, key=lambda r: int(text(r, 'k:name').split('-')[-1])):
    order = int(text(route, 'k:name').split('-')[-1])
    points = coords(text(route, 'k:LineString/k:coordinates'))
    ranked = sorted((min(distance(coords(text(m, 'k:Point/k:coordinates'))[0], p) for p in points), i)
                    for i, m in enumerate(markers))
    gap, marker_index = ranked[0]
    if gap > 50 or marker_index in used or ranked[1][0] < 100:
        raise ValueError(f'Ambiguous marker for route {order}: {ranked[:2]}')
    used.add(marker_index)
    marker = markers[marker_index]
    title = text(marker, 'k:name')
    label = re.sub(r'^M?D 2026: Zhuhai,\s*(?:Zhuhai\s*)?', '', title)
    description = text(marker, 'k:ExtendedData/k:Data[@name="说明"]/k:value').split('type:')[0].strip()
    image = re.search(r'<img src="([^"]+)"', text(marker, 'k:description'))
    if image:
        pictures[str(order)] = image[1]
    missions.append(dict(order=order, title=title, displayName=label, description=description,
        sourceRoute=text(route, 'k:name'), markerDistanceMeters=round(gap, 2),
        portals=[dict(order=i+1, title=f'{label} · 路线点 {i+1}', lat=p[0], lng=p[1],
                      guid=None, imageUrl=None, isStartPoint=i==0, isOrnamented=False, objective=None)
                 for i, p in enumerate(points)]))
if len(used) != len(markers) or not missions:
    raise ValueError('Not all mission markers have routes')
points = [p for m in missions for p in m['portals']]
if not all(math.isfinite(p['lat']) and math.isfinite(p['lng']) and 22 < p['lat'] < 23 and 113 < p['lng'] < 114 for p in points):
    raise ValueError('Invalid Zhuhai coordinates')
bounds = dict(minLat=min(p['lat'] for p in points), maxLat=max(p['lat'] for p in points),
              minLng=min(p['lng'] for p in points), maxLng=max(p['lng'] for p in points))
write('missions.json', dict(setName='MD 2026: Zhuhai · 珠海', setDescription='珠海MD2026 · Google My Maps',
    bannerLength=len(missions), sourceUrl=SOURCE, coordinateSystem='WGS-84',
    dataNote='Route vertices from Google My Maps; portal names and IDs are not supplied. Source route numbers are preserved; this is not a confirmed complete banner.',
    missions=missions, bounds=bounds, center=dict(lat=(bounds['minLat']+bounds['maxLat'])/2, lng=(bounds['minLng']+bounds['maxLng'])/2)))
write('mission-pictures.json', pictures)
print(f'Imported {len(missions)} missions, {len(points)} route stops; original numbering retained.')
