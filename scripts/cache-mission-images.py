#!/usr/bin/env python3
"""Refresh mission artwork from fresh My Maps URLs or imported Intel images."""
import datetime
import hashlib
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NS = {'k': 'http://www.opengis.net/kml/2.2'}
MAP_URL = 'https://www.google.com/maps/d/kml?mid=1BAjsSWdPTIntEWA9bBxv_xc7ftd2tAg&forcekml=1'


def read_url(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'ZhuhaiMissionDayMap/1.0'})
    with urllib.request.urlopen(request, timeout=35) as response:
        data = response.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise ValueError('Image exceeds 5 MB')
    return data


def image_type(data):
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png', 'image/png'
    if data.startswith(b'\xff\xd8\xff'):
        return 'jpg', 'image/jpeg'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP':
        return 'webp', 'image/webp'
    raise ValueError('Source returned an unsupported image or error page')


def main():
    missions = json.loads((ROOT / 'public/missions.json').read_text())['missions']
    links_path = ROOT / 'data/mission-links.json'
    intel = {}
    if links_path.exists():
        intel = {m['sourceRouteId']: m for m in json.loads(links_path.read_text())['missions']}
    needs_map = any(not intel.get(m['sourceRouteId'], {}).get('imageUrl') for m in missions)
    document = ET.fromstring(read_url(MAP_URL)) if needs_map else ET.Element('kml')
    markers, routes = [], {}
    for pm in document.findall('.//k:Placemark', NS):
        value = pm.findtext('k:Point/k:coordinates', default='', namespaces=NS).strip()
        if value:
            match = re.search(r'<img src="([^"]+)"', pm.findtext('k:description', default='', namespaces=NS))
            if match:
                markers.append((tuple(map(float, value.split(',')[:2])), match[1]))
        value = pm.findtext('k:LineString/k:coordinates', default='', namespaces=NS).split()
        if value:
            ident = pm.findtext('k:ExtendedData/k:Data[@name="id"]/k:value', namespaces=NS).strip()
            routes[ident] = [tuple(map(float, point.split(',')[:2])) for point in value]
    folder = ROOT / 'public/mission-images'
    folder.mkdir(exist_ok=True)
    assets = {}
    for mission in missions:
        ident = mission['sourceRouteId']
        official = intel.get(ident, {}).get('imageUrl')
        if official:
            url, source = official, 'intel'
        else:
            points = routes[ident]
            ranked = sorted((min((a[0]-b[0])**2+(a[1]-b[1])**2 for b in points), url) for a, url in markers)
            if not ranked or ranked[0][0] > .0005**2:
                raise ValueError(f'No unique nearby image marker for route {mission["order"]}')
            url, source = ranked[0][1], 'google-mymaps'
        if not url.startswith('https://lh3.googleusercontent.com/'):
            raise ValueError('Unexpected mission image host')
        data = read_url(url)
        extension, content_type = image_type(data)
        digest = hashlib.sha256(data).hexdigest()
        filename = f'{ident}-{digest[:12]}.{extension}'
        (folder / filename).write_bytes(data)
        assets[ident] = {'path': '/mission-images/'+filename, 'sourceType': source,
                         'contentType': content_type, 'bytes': len(data), 'sha256': digest}
        print(f'#{mission["order"]} {mission["displayName"]}: {len(data)} bytes ({source})', flush=True)
    manifest = {'refreshedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'images': assets}
    (ROOT / 'data/mission-assets.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    # Keep previous content-addressed files available for pages open during deployment.
    print(f'Cached {len(assets)} mission images locally.')


if __name__ == '__main__':
    main()
