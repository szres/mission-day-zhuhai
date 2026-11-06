#!/usr/bin/env python3
"""Merge reviewed IITC mission deeplinks using stable Google source route IDs."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('export', type=Path)
    args = parser.parse_args()
    incoming = json.loads(args.export.read_text())
    if incoming.get('kind') != 'mission-links' or incoming.get('reviewed') is not True:
        raise ValueError('Expected a reviewed mission-links.json export')
    routes = {m['sourceRouteId']: m for m in json.loads((ROOT / 'public/missions.json').read_text())['missions']}
    path = ROOT / 'data/mission-links.json'
    merged = {}
    if path.exists():
        merged = {m['sourceRouteId']: m for m in json.loads(path.read_text())['missions']}
    seen = set()
    for mission in incoming.get('missions', []):
        ident, guid = mission.get('sourceRouteId'), mission.get('missionGuid')
        if ident not in routes or ident in seen or not isinstance(guid, str) or not re.fullmatch(r'[0-9a-f]{32}\.1c', guid):
            raise ValueError('Unknown or duplicate source route, or invalid mission GUID')
        if not isinstance(mission.get('title'), str) or not mission['title'].strip():
            raise ValueError('Mission title missing; load mission details before exporting')
        url = 'https://link.ingress.com/mission/'+guid
        if mission.get('missionUrl') != url:
            raise ValueError('Mission link does not match its GUID')
        image = mission.get('imageUrl')
        if image is not None and (not isinstance(image, str) or not image.startswith('https://lh3.googleusercontent.com/')):
            raise ValueError('Unsupported mission image URL')
        seen.add(ident)
        merged[ident] = dict(mission, order=routes[ident]['order'])
    if not seen:
        raise ValueError('Export contains no missions')
    if len({m['missionGuid'] for m in merged.values()}) != len(merged):
        raise ValueError('One mission GUID is assigned to multiple routes')
    result = {'kind': 'mission-links', 'reviewed': True,
              'missions': sorted(merged.values(), key=lambda m: m['order'])}
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(f'Imported {len(seen)} mission links; {len(merged)} routes linked. Run npm run mission-images, then npm run build.')


if __name__ == '__main__':
    main()
