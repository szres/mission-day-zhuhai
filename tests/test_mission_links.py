import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('mission_links', ROOT / 'scripts/import-mission-links.py')
links = importlib.util.module_from_spec(spec)
spec.loader.exec_module(links)
GUID = '233a30e104d64df4b5293bab1e801408.1c'

class MissionLinkTests(unittest.TestCase):
    def prepare(self):
        tmp = tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup);root=Path(tmp.name)
        (root/'data').mkdir();(root/'public').mkdir()
        (root/'public/missions.json').write_text(json.dumps({'missions':[{'order':6,'sourceRouteId':'stable-route'}]}))
        export={'kind':'mission-links','reviewed':True,'missions':[{'order':1,'sourceRouteId':'stable-route','missionGuid':GUID,'missionUrl':'https://link.ingress.com/mission/'+GUID,'title':'Example mission','imageUrl':None}]}
        return root,export

    def run_import(self,root,export):
        path=root/'export.json';path.write_text(json.dumps(export))
        with patch.object(links,'ROOT',root),patch.object(sys,'argv',['import-mission-links.py',str(path)]),contextlib.redirect_stdout(io.StringIO()):
            links.main()

    def test_import_uses_stable_route_id_and_exact_deeplink(self):
        root,export=self.prepare();self.run_import(root,export)
        mission=json.loads((root/'data/mission-links.json').read_text())['missions'][0]
        self.assertEqual(mission['order'],6)
        self.assertEqual(mission['missionUrl'],'https://link.ingress.com/mission/'+GUID)

    def test_mismatched_url_and_unreviewed_exports_are_rejected(self):
        root,export=self.prepare();export['missions'][0]['missionUrl']='https://example.com/'
        with self.assertRaises(ValueError):self.run_import(root,export)
        export['reviewed']=False
        with self.assertRaises(ValueError):self.run_import(root,export)
