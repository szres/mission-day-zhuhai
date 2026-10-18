import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class PortalOverrideTests(unittest.TestCase):
    def run_import(self, reviewed=True, lat=22.24):
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
