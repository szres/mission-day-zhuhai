import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { featurePolygons, buildingsInRegion, localFootprint, raisedBuildingSurfaces } from '../public/building-geometry.js';
import * as THREE from '../public/vendor/three/three.module.min.js';
const data=JSON.parse(readFileSync(new URL('../public/buildings.geojson',import.meta.url)));

test('imported OSM footprints retain valid WGS-84 rings, courtyards, and unique source IDs',()=>{
  assert.ok(data.features.length>500);assert.equal(data.coordinateSystem,'WGS-84');
  assert.equal(new Set(data.features.map(f=>f.id)).size,data.features.length);
  for(const f of data.features){
    const polygons=featurePolygons(f);assert.ok(polygons.length>0,f.id);
    for(const polygon of polygons)for(const ring of polygon)for(const [lng,lat]of ring){assert.ok(lng>113&&lng<114);assert.ok(lat>22&&lat<23);}
  }
});
test('Opera House retains OSM heights without coordinate conversion',()=>{
  const sun=data.features.find(f=>f.id==='way/512688585');const moon=data.features.find(f=>f.id==='way/512688586');
  assert.equal(sun.properties.heightMeters,91);assert.equal(moon.properties.heightMeters,57.1);
  assert.equal(sun.properties.heightSource,'height');assert.ok(sun.properties.bounds[0]>113.583&&sun.properties.bounds[2]<113.585);
});
test('building selection is viewport-limited and hidden at city scale',()=>{
  const close={center:{latitude:22.287,longitude:113.584},span:{latitudeDelta:.01,longitudeDelta:.01}};
  assert.ok(buildingsInRegion(data.features,close).some(f=>f.id==='way/512688585'));
  assert.equal(buildingsInRegion(data.features,{...close,span:{latitudeDelta:1,longitudeDelta:1}}).length,0);
  assert.ok(buildingsInRegion(data.features,close,3).length<=3);
});
test('all imported buildings produce finite triangulated 3D geometry, including holes',()=>{
  for(const feature of data.features){
    for(const polygon of localFootprint(feature)){
      const vertices=ring=>ring.map(([x,y])=>new THREE.Vector2(x,y));
      const shape=new THREE.Shape(vertices(polygon[0]));
      for(const hole of polygon.slice(1))shape.holes.push(new THREE.Path(vertices(hole)));
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:feature.properties.heightMeters||12,bevelEnabled:false,steps:1,curveSegments:1});
      assert.ok(geometry.attributes.position.count>0,feature.id);
      assert.ok([...geometry.attributes.position.array].every(Number.isFinite),feature.id);
      geometry.dispose();
    }
  }
});

test('on-map raised buildings have grounded walls and elevated roofs at the current map scale',()=>{
  const feature={properties:{bounds:[0,0,.001,.001],heightMeters:30,name:'Building'},geometry:{type:'Polygon',coordinates:[[[0,0],[.001,0],[.001,.001],[0,.001],[0,0]]]}};
  const project=([lng,lat])=>({x:lng*111320,y:-lat*111320});
  const unproject=p=>({longitude:p.x/111320,latitude:-p.y/111320});
  const surfaces=raisedBuildingSurfaces(feature,project,unproject);
  assert.ok(surfaces.some(s=>s.kind==='wall'));const roof=surfaces.find(s=>s.kind==='roof');assert.ok(roof);
  assert.equal(roof.rings[0].length,5);assert.ok(roof.rings[0][0].latitude>0);assert.ok(roof.rings[0][0].longitude<0);
  const wall=surfaces.find(s=>s.kind==='wall');assert.equal(wall.rings[0].length,5);
  assert.ok(wall.rings[0].slice(0,2).every(p=>[0,.001].some(v=>Math.abs(v-p.latitude)<1e-10)));
});
test('on-map roofs preserve courtyard holes and cap exaggerated screen height',()=>{
  const feature={properties:{bounds:[0,0,.001,.001],heightMeters:1000},geometry:{type:'Polygon',coordinates:[[[0,0],[.001,0],[.001,.001],[0,.001],[0,0]],[[.0002,.0002],[.0008,.0002],[.0008,.0008],[.0002,.0008],[.0002,.0002]]]}};
  const project=([x,y])=>({x:x*1000000,y:-y*1000000});const unproject=p=>p;
  const roof=raisedBuildingSurfaces(feature,project,unproject).find(s=>s.kind==='roof');
  assert.equal(roof.rings.length,2);assert.ok(Math.abs(roof.rings[0][0].y)<=90);
});
