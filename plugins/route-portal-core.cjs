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
  function missionGuid(value) {
    if (typeof value !== 'string') return null;
    const raw=value.trim().toLowerCase();
    if (/^[0-9a-f]{32}\.1c$/.test(raw)) return raw;
    try {
      const url=new URL(raw);
      if(url.protocol!=='https:'||!['link.ingress.com','intel.ingress.com','intel-x.ingress.com'].includes(url.hostname))return null;
      return url.pathname.match(/^\/mission\/([0-9a-f]{32}\.1c)\/?$/)?.[1]||null;
    }catch{return null;}
  }
  function missionInfo(raw) {
    if (!raw || !missionGuid(raw.guid)) return null;
    return { guid:missionGuid(raw.guid), title:typeof raw.title==='string'?raw.title:'',
      imageUrl:typeof (raw.imageUrl||raw.image)==='string'&&(raw.imageUrl||raw.image).startsWith('https://lh3.googleusercontent.com/')?(raw.imageUrl||raw.image):null,
      portalGuids:raw.waypoints?(raw.waypoints||[]).map(w=>w.guid||w.portal?.guid).filter(Boolean):(raw.portalGuids||[]).filter(g=>typeof g==='string') };
  }
  function missionChoices(route, missions) {
    const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s,，:：·_—–-]/g,'');
    const label=normalize(route.displayName), known=new Set(route.portalGuids||[]);
    return missions.map(m=>{
      const title=normalize(m.title),nameMatch=Boolean(label&&title.includes(label));
      const overlap=(m.portalGuids||[]).filter(g=>known.has(g)).length;
      return {...m,nameMatch,overlap,score:(nameMatch?100:0)+overlap*10};
    }).filter(m=>m.nameMatch||m.overlap).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)||a.guid.localeCompare(b.guid));
  }
  return { distance, project, corridor, stops, scanPoints, portal, exportPortal, missionGuid, missionInfo, missionChoices };
}
module.exports = createRoutePortalTools;
