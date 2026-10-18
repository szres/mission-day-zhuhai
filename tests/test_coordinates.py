import json
import math
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from coordinates import gcj02_to_wgs84, wgs84_to_gcj02


class CoordinateTests(unittest.TestCase):
    def test_fisher_girl_landmark_alignment(self):
        # OSM node 776049315: independent WGS-84 reference for the landmark.
        lat, lng = gcj02_to_wgs84(22.262358, 113.588245)
        meters = math.hypot((lat - 22.2650277) * 111320,
                            (lng - 113.5830398) * 103000)
        self.assertLess(meters, 50)

    def test_global_coordinates_are_unchanged(self):
        self.assertEqual(gcj02_to_wgs84(37.7749, -122.4194), (37.7749, -122.4194))

    def test_all_imported_stops_match_source_without_double_conversion(self):
        ns = {'k': 'http://www.opengis.net/kml/2.2'}
        kml = ET.parse(ROOT / 'data/zhuhai-md.kml')
        source = {}
        for pm in kml.findall('.//k:Placemark', ns):
            line = pm.findtext('k:LineString/k:coordinates', namespaces=ns)
            if line:
                order = int(pm.findtext('k:name', namespaces=ns).split('-')[-1])
                source[order] = [(float(v.split(',')[1]), float(v.split(',')[0])) for v in line.split()]
        data = json.loads((ROOT / 'public/missions.json').read_text())
        self.assertEqual(data['coordinateSystem'], 'WGS-84')
        self.assertEqual(data['sourceCoordinateSystem'], 'GCJ-02')
        self.assertEqual(len(data['missions']), len(source))
        geometry = json.loads((ROOT / 'data/routes-wgs84.json').read_text())
        for mission in data['missions']:
            route_points = geometry[str(mission['order'])]
            self.assertEqual(len(route_points), len(source[mission['order']]))
            for stop, raw in zip(route_points, source[mission['order']]):
                lat, lng = wgs84_to_gcj02(stop['lat'], stop['lng'])
                self.assertAlmostEqual(lat, raw[0], places=7)
                self.assertAlmostEqual(lng, raw[1], places=7)
                self.assertGreater(abs(stop['lng'] - raw[1]), 0.004)
        stops = [p for m in data['missions'] for p in m['portals']]
        self.assertEqual(data['bounds']['minLat'], min(p['lat'] for p in stops))
        self.assertEqual(data['bounds']['maxLng'], max(p['lng'] for p in stops))


if __name__ == '__main__':
    unittest.main()
