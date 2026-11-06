import hashlib
import importlib.util
import json
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('cache_images', ROOT / 'scripts/cache-mission-images.py')
images = importlib.util.module_from_spec(spec)
spec.loader.exec_module(images)

class MissionImageTests(unittest.TestCase):
    def test_all_18_mission_images_are_valid_local_files(self):
        assets = json.loads((ROOT / 'data/mission-assets.json').read_text())['images']
        missions = json.loads((ROOT / 'public/missions.json').read_text())['missions']
        pictures = json.loads((ROOT / 'public/mission-pictures.json').read_text())
        self.assertEqual(len(assets), 18)
        for m in missions:
            asset = assets[m['sourceRouteId']]
            self.assertEqual(pictures[str(m['order'])], asset['path'])
            data = (ROOT / 'public' / asset['path'].lstrip('/')).read_bytes()
            self.assertEqual(images.image_type(data)[1], asset['contentType'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), asset['sha256'])

    def test_error_pages_cannot_be_saved_as_images(self):
        with self.assertRaises(ValueError):
            images.image_type(b'<!doctype html><h1>403 Forbidden</h1>')
