function createRoutePortalTools() {
  const R = 6371008.8;
  const rad = value => value * Math.PI / 180;
  function distance(a, b) {
    const lat = rad((a.lat + b.lat) / 2);
    return R * Math.hypot(rad(a.lat - b.lat), rad(a.lng - b.lng) * Math.cos(lat));
  }
  function project(point, a, b) {
    const scale = Math.cos(rad((a.lat + b.lat + point.lat) / 3));
    const x = rad(b.lng - a.lng) * scale * R, y = rad(b.lat - a.lat) * R;
    const px = rad(point.lng - a.lng) * scale * R, py = rad(point.lat - a.lat) * R;
    const t = x*x + y*y ? Math.max(0, Math.min(1, (px*x + py*y) / (x*x + y*y))) : 0;
    return { distance: Math.hypot(px - t*x, py - t*y), along: t * Math.hypot(x, y) };
  }
  function corridor(points, portals, radius) {
    const matches = [];
    for (const p of portals) {
      let best = { distance: Infinity, along: 0 }, offset = 0;
      for (let i = 1; i < points.length; i++) {
        const hit = project(p, points[i-1], points[i]);
        if (hit.distance < best.distance) best = { distance: hit.distance, along: offset + hit.along };
        offset += distance(points[i-1], points[i]);
      }
      if (best.distance <= radius) matches.push({ ...p, distance: best.distance, along: best.along });
    }
    return matches.sort((a, b) => a.along - b.along || a.guid.localeCompare(b.guid));
  }
  function stops(points, portals, radius) {
    return points.map(point => portals.map(p => ({ ...p, distance: distance(point, p) }))
      .filter(p => p.distance <= radius).sort((a, b) => a.distance - b.distance || a.guid.localeCompare(b.guid)));
  }
  function scanPoints(routes, spacing = 200) {
    const result = [];
    for (const route of routes) {
      for (let i = 0; i < route.points.length; i++) {
        const b = route.points[i], a = route.points[Math.max(0, i-1)];
        const count = Math.max(1, Math.ceil(distance(a, b) / spacing));
        for (let j = i ? 1 : 0; j <= count; j++) {
          const p = { lat: a.lat + (b.lat-a.lat)*j/count, lng: a.lng + (b.lng-a.lng)*j/count };
          if (!result.some(q => distance(p, q) < spacing * 0.4)) result.push(p);
        }
      }
    }
    return result;
  }
  function portal(guid, data, latlng) {
    const lat = Number.isFinite(data.latE6) ? data.latE6 / 1e6 : latlng?.lat;
    const lng = Number.isFinite(data.lngE6) ? data.lngE6 / 1e6 : latlng?.lng;
    if (!guid || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { guid, title: typeof data.title === 'string' ? data.title : '', lat, lng,
      imageUrl: typeof data.image === 'string' ? data.image : null };
  }
  function exportPortal(p, i) {
    return { order: i+1, guid: p.guid, title: p.title, lat: p.lat, lng: p.lng,
      imageUrl: p.imageUrl || null, isStartPoint: i === 0, isOrnamented: false, objective: null };
  }
  return { distance, project, corridor, stops, scanPoints, portal, exportPortal };
}
module.exports = createRoutePortalTools;
