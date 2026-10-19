import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class PortalOverrideTests(unittest.TestCase):
    def run_import(self, reviewed=True, lat=22.24, use_route_id=False):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        for directory in ['scripts', 'data', 'public']:
            (root / directory).mkdir()
        for name in ['import-kml.py', 'coordinates.py']:
            shutil.copy2(ROOT / 'scripts' / name, root / 'scripts' / name)
        shutil.copy2(ROOT / 'data/zhuhai-md.kml', root / 'data/zhuhai-md.kml')
        (root / 'data/portal-overrides.json').write_text(json.dumps({
            'coordinateSystem': 'WGS-84', 'reviewed': reviewed,
            'missions': [{'order': 1, 'portals': [{'guid': 'a'*32 + '.16', 'title': 'Reviewed portal',
                                                   'lat': lat, 'lng': 113.55, 'imageUrl': None}]}]}))
        if use_route_id:
            import xml.etree.ElementTree as ET
            ns = {'k': 'http://www.opengis.net/kml/2.2'}
            route = next(p for p in ET.parse(root / 'data/zhuhai-md.kml').findall('.//k:Placemark', ns)
                         if p.findtext('k:name', namespaces=ns) == '路线--01')
            path = root / 'data/portal-overrides.json'
            data = json.loads(path.read_text())
            data['missions'][0]['order'] = 999  # stale numeric label after a renumber
            data['missions'][0]['sourceRouteId'] = route.findtext('k:ExtendedData/k:Data[@name="id"]/k:value', namespaces=ns).strip()
            path.write_text(json.dumps(data))
        result = subprocess.run(['python3', str(root / 'scripts/import-kml.py')], capture_output=True, text=True)
        return root, result

    def test_reviewed_portals_survive_build_without_changing_source_route_geometry(self):
        root, result = self.run_import()
        self.assertEqual(result.returncode, 0, result.stderr)
        missions = json.loads((root / 'public/missions.json').read_text())['missions']
        self.assertEqual(missions[0]['portals'][0]['title'], 'Reviewed portal')
        self.assertEqual(missions[0]['portals'][0]['lat'], 22.24)
        self.assertEqual(len(missions[1]['portals']), 6)
        geometry = json.loads((root / 'data/routes-wgs84.json').read_text())
        self.assertEqual(len(geometry['1']), 6)
        self.assertNotEqual(geometry['1'][0]['lat'], 22.24)

    def test_unreviewed_export_is_rejected(self):
        _, result = self.run_import(reviewed=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('must be reviewed', result.stderr)

    def test_invalid_coordinate_is_rejected(self):
        _, result = self.run_import(lat=float('nan'))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('invalid portal coordinates', result.stderr)

    def test_stable_source_route_id_survives_a_stale_number(self):
        root, result = self.run_import(use_route_id=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        mission = json.loads((root / 'public/missions.json').read_text())['missions'][0]
        self.assertEqual(mission['order'], 1)
        self.assertEqual(mission['displayName'], '海滨泳场')
        self.assertEqual(mission['portals'][0]['title'], 'Reviewed portal')
