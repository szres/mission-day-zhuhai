// OSM and MapKit both use WGS-84. No China offset conversion belongs here.
export function featurePolygons(feature) {
  const geometry = feature?.geometry;
  const polygons = geometry?.type === 'MultiPolygon' ? geometry.coordinates : geometry?.type === 'Polygon' ? [geometry.coordinates] : [];
  return polygons.filter(polygon => Array.isArray(polygon) && polygon.length && polygon.every(ring =>
    Array.isArray(ring) && ring.length >= 4 && ring.every(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) &&
    ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]));
}

export function buildingsInRegion(features, region, limit = 400) {
  if (!region?.center || !region?.span || region.span.latitudeDelta > 0.035 || region.span.longitudeDelta > 0.05) return [];
  const { latitude: lat, longitude: lng } = region.center;
  const dy = region.span.latitudeDelta / 2, dx = region.span.longitudeDelta / 2;
  return features.filter(f => {
    const b = f.properties?.bounds;
    return b && b[0] <= lng+dx && b[2] >= lng-dx && b[1] <= lat+dy && b[3] >= lat-dy;
  }).sort((a, b) => {
    const distance = f => { const box = f.properties.bounds; return Math.hypot((box[0]+box[2])/2-lng, (box[1]+box[3])/2-lat); };
    return distance(a)-distance(b);
  }).slice(0, limit);
}

export function localFootprint(feature) {
  const polygons = featurePolygons(feature);
  const points = polygons.flat(2);
  if (!points.length) throw new Error('Building outline is unavailable.');
  const minLng = Math.min(...points.map(p => p[0])), maxLng = Math.max(...points.map(p => p[0]));
  const minLat = Math.min(...points.map(p => p[1])), maxLat = Math.max(...points.map(p => p[1]));
  const lat = (minLat+maxLat)/2, lng = (minLng+maxLng)/2;
  return polygons.map(polygon => polygon.map(ring => ring.map(p => [
    (p[0]-lng) * Math.cos(lat*Math.PI/180) * 111320, (p[1]-lat) * 111320,
  ])));
}

// Screen-space extrusion over a flat MapKit map. Bases stay at their true
// coordinates; roofs and walls are an illustrative raised-building layer.
export function raisedBuildingSurfaces(feature, project, unproject) {
  const bounds = feature.properties.bounds;
  const center = [(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];
  const origin = project(center), north = project([center[0],center[1]+10/111320]);
  const pixelsPerMeter = Math.hypot(north.x-origin.x,north.y-origin.y)/10;
  const height = feature.properties.heightMeters > 0 ? feature.properties.heightMeters : 12;
  const pixels = Math.min(90,Math.max(4,height*pixelsPerMeter));
  const shift = {x:-pixels*.24,y:-pixels*.62};
  const surfaces = [];
  for (const polygon of featurePolygons(feature)) {
    const rings=polygon.map(ring=>ring.map(project));
    const lift = p => ({x:p.x+shift.x,y:p.y+shift.y});
    for (const [ringIndex,ring] of rings.entries()) {
      let area=0;
      for(let i=1;i<ring.length;i++)area+=ring[i-1].x*ring[i].y-ring[i].x*ring[i-1].y;
      const outward=(area>=0?1:-1)*(ringIndex? -1:1);
      // Only viewer-facing walls are needed; roof/courtyard rings stay intact.
      for (let i=1;i<ring.length;i++) {
        const a=ring[i-1],b=ring[i];
        if(Math.hypot(b.x-a.x,b.y-a.y)<.8) continue;
        if(outward*((b.y-a.y)*shift.x-(b.x-a.x)*shift.y)>=0) continue;
        const topA=lift(a),topB=lift(b);
        surfaces.push({kind:'wall',rings:[[a,b,topB,topA,a].map(unproject)],
          fillColor:b.x-a.x>=0?'#647383':'#4e5d6c',strokeColor:'#465563'});
      }
    }
    surfaces.push({kind:'roof',rings:rings.map(ring=>ring.map(p=>unproject(lift(p)))),
      fillColor:feature.properties.name?'#97a5b3':'#8393a2',strokeColor:'#aab6c2'});
  }
  return surfaces;
}
