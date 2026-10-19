import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class RouteOrderTests(unittest.TestCase):
    def test_corrected_order_preserves_every_original_portal_in_its_route(self):
        original = (ROOT / 'data/ZH-MD.js').read_text()
        old = json.loads(re.search(r'const\s+MDUMMJSON\s*=\s*(\{[\s\S]*?\});', original)[1])
        old_by_order = {m['sourceOrder']: m for m in old['missions']}
        migration = json.loads((ROOT / 'data/route-order-migration.json').read_text())['routes']
        current = json.loads((ROOT / 'public/missions.json').read_text())['missions']
        self.assertEqual([m['order'] for m in current], list(range(1, 19)))
        for mapping, mission in zip(migration, current):
            self.assertEqual(mapping['order'], mission['order'])
            self.assertEqual(mapping['sourceRouteId'], mission['sourceRouteId'])
            self.assertEqual(mapping['displayName'], mission['displayName'])
            previous = old_by_order[mapping['previousOrder']]['portals']
            self.assertEqual([p['guid'] for p in previous], [p['guid'] for p in mission['portals']])
            for before, after in zip(previous, mission['portals']):
                self.assertEqual(before['title'], after['title'])
                self.assertEqual(before['imageUrl'], after['imageUrl'])
                self.assertEqual(before['location']['latitude'], after['lat'])
                self.assertEqual(before['location']['longitude'], after['lng'])
        self.assertEqual(sum(len(m['portals']) for m in current), 152)
