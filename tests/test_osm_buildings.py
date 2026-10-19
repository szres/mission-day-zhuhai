import importlib.util
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
spec = importlib.util.spec_from_file_location('osm_buildings', Path(__file__).resolve().parent.parent / 'scripts/import-osm-buildings.py')
osm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(osm)

class OsmBuildingTests(unittest.TestCase):
    def test_height_estimates_are_labeled_and_missing_height_stays_unknown(self):
        self.assertEqual(osm.height_properties({'height': '91 m'})['heightMeters'], 91)
        estimated = osm.height_properties({'building:levels': '4'})
        self.assertEqual(estimated['heightMeters'], 12)
        self.assertIn('estimated', estimated['heightSource'])
        self.assertIsNone(osm.height_properties({})['heightMeters'])
        self.assertIsNone(osm.metres('NaN'))

    def test_reversed_way_segments_close_without_losing_vertices(self):
        self.assertEqual(osm.stitch([[1,2],[3,2],[3,4],[4,1]]), [[1,2,3,4,1]])
        with self.assertRaises(ValueError): osm.stitch([[1,2],[3,4]])

    def test_building_multipolygon_retains_its_courtyard_and_omits_duplicate_member_ways(self):
        nodes = ''.join(f'<node id="{i}" lon="{x}" lat="{y}"/>' for i,x,y in [(1,0,0),(2,4,0),(3,4,4),(4,0,4),(5,1,1),(6,2,1),(7,2,2),(8,1,2)])
        xml = ET.fromstring('<osm>'+nodes+'''
          <way id="10"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="building" v="yes"/></way>
          <way id="11"><nd ref="5"/><nd ref="6"/><nd ref="7"/><nd ref="8"/><nd ref="5"/></way>
          <relation id="20"><member type="way" ref="10" role="outer"/><member type="way" ref="11" role="inner"/><tag k="type" v="multipolygon"/><tag k="building" v="yes"/></relation></osm>''')
        features, skipped = osm.convert({(e.tag,int(e.get('id'))):e for e in xml})
        self.assertEqual(skipped, [])
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['id'], 'relation/20')
        self.assertEqual(len(features[0]['geometry']['coordinates'][0]), 2)
