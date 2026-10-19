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
