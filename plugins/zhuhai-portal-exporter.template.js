// ==UserScript==
// @id             iitc-plugin-zhuhai-route-portals@szres
// @name           IITC plugin: Zhuhai MD route portal exporter
// @namespace      https://github.com/szres/mission-day-zhuhai
// @version        0.2.0
// @description    Collect and review portals along Zhuhai MD routes; export website and FSMD-style data.
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// @run-at         document-end
// @downloadURL    https://zhmd.szres.org/plugins/zhuhai-portal-exporter.user.js
// @updateURL      https://zhmd.szres.org/plugins/zhuhai-portal-exporter.user.js
// ==/UserScript==
(function () {
  function wrapper() {
    if (typeof window.plugin !== 'function') window.plugin = function () {};
    if (window.plugin.zhuhaiRoutePortals) return;
    /* CORE */
    const tools = createRoutePortalTools();
    const routes = /* ROUTES */[];
    const plugin = window.plugin.zhuhaiRoutePortals = {};
    const cache = new Map();
    const selections = new Map();
    const missionCache=new Map(),missionSelections=new Map();let missionReview;
    try{const saved=JSON.parse(localStorage.getItem('zhmd-mission-links-v1')||'{}');for(const m of saved.missions||[])rememberMission(m);for(const [id,guid] of saved.selections||[])if(typeof id==='string'&&tools.missionGuid(guid))missionSelections.set(id,guid);}catch{}
    let panel, status, review, layer, running = false, cancelled = false, scan = null;
    const hooks = { add: (name, fn) => window.addHook(name, fn), remove: (name, fn) => window.removeHook(name, fn) };
    const map = () => window.map || window.IITC?.map?.instance;
    const details = () => window.IITC?.portal?.details || window.portalDetail;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    function message(text) { if (status) status.textContent = text; }
    function selectedRoutes() {
      const value = panel.querySelector('[name=route]').value;
      return value === 'all' ? routes : routes.filter(r => String(r.order) === value);
    }
    function collect() {
      for (const [guid, marker] of Object.entries(window.portals || {})) {
        const data = marker.options?.data || {};
        const p = tools.portal(guid, data, marker.getLatLng?.());
        if (p) cache.set(guid, { ...cache.get(guid), ...p, title: p.title || cache.get(guid)?.title || '', imageUrl: p.imageUrl || cache.get(guid)?.imageUrl || null });
      }
    }
    function node(tag, text, parent) {
      const el = document.createElement(tag); if (text !== undefined) el.textContent = text;
      if (parent) parent.appendChild(el); return el;
    }
    function button(text, action, parent) {
      const b = node('button', text, parent); b.type = 'button';
      b.addEventListener('click', () => Promise.resolve().then(action).catch(e => message(e.message))); return b;
    }
    function options() {
      const radius = Number(panel.querySelector('[name=radius]').value);
      if (!Number.isFinite(radius) || radius < 1 || radius > 250) throw new Error('Use a distance from 1 to 250 metres.');
      return { radius, mode: panel.querySelector('[name=mode]').value };
    }
    function candidates(route) {
      const { radius, mode } = options(), portals = [...cache.values()];
      return mode === 'corridor' ? tools.corridor(route.points, portals, radius) : tools.stops(route.points, portals, radius);
    }
    function currentSelection(route) {
      const rows = candidates(route), { mode } = options();
      if (mode === 'corridor') return rows.filter(p => selections.get(`${route.order}:${p.guid}`) !== false);
      return rows.map((choices, i) => {
        const choice = selections.get(`${route.order}:stop:${i}`);
        return choice === '' ? null : choices.find(p => p.guid === choice) || (choice === undefined ? choices[0] : null);
      }).filter(Boolean);
    }
    function draw() {
      if (!window.L || !map()) return;
      if (!layer) layer = window.L.layerGroup().addTo(map());
      layer.clearLayers();
      for (const route of selectedRoutes()) {
        window.L.polyline(route.points.map(p => [p.lat, p.lng]), { color: '#00c2ff', weight: 3, interactive: false }).addTo(layer);
        for (const p of currentSelection(route)) window.L.circleMarker([p.lat, p.lng], { radius: 6, color: '#f0a000' }).bindTooltip(node('span', p.title || p.guid)).addTo(layer);
      }
    }
    function render() {
      if (!panel) return;
      collect(); review.replaceChildren();
      let total = 0, missing = 0;
      for (const route of selectedRoutes()) {
        node('h3', `#${route.order} · ${route.displayName}`, review);
        const rows = candidates(route), { mode } = options();
        if (mode === 'corridor') {
          if (!rows.length) { node('p', 'No loaded portals within this corridor.', review); missing++; }
          for (const p of rows) {
            const label = node('label', undefined, review); label.className = 'zhmd-row';
            const checkbox = node('input', undefined, label); checkbox.type = 'checkbox';
            checkbox.checked = selections.get(`${route.order}:${p.guid}`) !== false;
            checkbox.onchange = () => { selections.set(`${route.order}:${p.guid}`, checkbox.checked); resetReviewed(); draw(); };
            node('span', `${p.title || '[details not loaded]'} · ${p.distance.toFixed(1)} m`, label);
            button('View', () => { map().setView([p.lat, p.lng], 18); }, label);
          }
        } else {
          rows.forEach((choices, i) => {
            const row = node('label', undefined, review); row.className = 'zhmd-row';
            node('span', `Stop ${i+1}`, row); const select = node('select', undefined, row);
            node('option', 'Unmatched / skip', select).value = '';
            for (const p of choices) node('option', `${p.title || p.guid} · ${p.distance.toFixed(1)} m`, select).value = p.guid;
            const key = `${route.order}:stop:${i}`;
            select.value = selections.has(key) ? selections.get(key) : choices[0]?.guid || '';
            select.onchange = () => { selections.set(key, select.value); resetReviewed(); draw(); };
            if (!choices.length) missing++;
          });
        }
        total += currentSelection(route).length;
      }
      message(`${cache.size} portals collected · ${total} selected · ${missing} empty corridors/stops. ${scan ? `Scan: ${scan.completed}/${scan.total}, ${scan.timeouts} timed out.` : 'Scan or pan at zoom 17+ to load portals.'}`);
      draw();renderMissions();
    }
    function resetReviewed() { panel.querySelector('[name=reviewed]').checked = false; }
    async function refreshAt(point) {
      const m = map();
      return new Promise(resolve => {
        let timer;
        const finish = ok => { hooks.remove('mapDataRefreshEnd', onRefresh); clearTimeout(timer); resolve(ok); };
        const onRefresh = () => {
          if (tools.distance({ lat: m.getCenter().lat, lng: m.getCenter().lng }, point) > 20 || m.getZoom() < 17) return;
          collect(); finish(true);
        };
        hooks.add('mapDataRefreshEnd', onRefresh);
        timer = setTimeout(() => finish(false), 25000);
        m.setView([point.lat, point.lng], 17, { animate: false });
        // Cached / unchanged views may not schedule a new refresh themselves.
        const request = window.IITC?.map?.request || window.mapDataRequest;
        if (request?.refresh) request.refresh();
      });
    }
    async function scanRoutes() {
      if (running) return;
      options(); resetReviewed();
      const points = tools.scanPoints(selectedRoutes());
      if (!points.length) return;
      // Use a conservative viewport footprint; tiny embedded maps cannot cover a route reliably.
      const size = map().getSize();
      if (size.x < 300 || size.y < 300) throw new Error('Enlarge the Intel map to at least 300 × 300 pixels before scanning.');
      running = true; cancelled = false; scan = { total: points.length, completed: 0, timeouts: 0, routeOrders: selectedRoutes().map(r => r.order), zoom: 17 };
      try {
        for (const point of points) {
          if (cancelled) break;
          message(`Loading map area ${scan.completed+1}/${scan.total}… Stop to cancel; leave the map still during scanning.`);
          const ok = await refreshAt(point); scan.completed++; if (!ok) scan.timeouts++;
          render(); await sleep(1500);
        }
      } finally { running = false; render(); }
    }
    async function loadDetails() {
      if (running) return;
      if (!details()?.request) throw new Error('IITC portal detail API is unavailable.');
      const portals = [...new Map(selectedRoutes().flatMap(currentSelection).map(p => [p.guid, p])).values()];
      running = true; cancelled = false; resetReviewed(); let failed = 0;
      try {
        for (let i = 0; i < portals.length && !cancelled; i++) {
          const p = portals[i]; message(`Loading details ${i+1}/${portals.length}…`);
          try {
            let timer;
            const data = await Promise.race([Promise.resolve(details().request(p.guid)), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 15000); })]).finally(() => clearTimeout(timer));
            const normalized = tools.portal(p.guid, data, p);
            if (normalized) cache.set(p.guid, normalized); else failed++;
          } catch { failed++; }
          await sleep(1000);
        }
      } finally { running = false; render(); message(`${status.textContent} Detail request failures: ${failed}.`); }
    }
    function download(name, value, type = 'application/json') {
      const url = URL.createObjectURL(new Blob([value], { type }));
      const a = node('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    function exportData(format) {
      if (running) throw new Error('Stop or finish collection before exporting.');
      if (!panel.querySelector('[name=reviewed]').checked) throw new Error('Review the matches and tick the review checkbox before exporting.');
      const selected = selectedRoutes(), missions = [];
      for (const route of selected) {
        const portals = currentSelection(route);
        if (!portals.length) throw new Error(`Route #${route.order} has no selected portals. Collect portals or select another route.`);
        if (new Set(portals.map(p => p.guid)).size !== portals.length) throw new Error(`Route #${route.order} uses a portal more than once. Review the stop choices.`);
        if (portals.some(p => !p.title)) throw new Error(`Route #${route.order} has unnamed portals. Click Load selected details first.`);
        missions.push({ order: route.order, sourceRouteId: route.sourceRouteId, title: route.title, displayName: route.displayName, description: route.description, portals: portals.map(tools.exportPortal) });
      }
      const report = { exportedAt: new Date().toISOString(), coordinateSystem: 'WGS-84', reviewed: true,
        matchMode: options().mode, radiusMeters: options().radius, scan,
        note: 'Reviewed proximity candidates from loaded Intel data. Not a verified mission objective list; scan completion does not prove all portals were delivered by Intel.' };
      if (format === 'fsmd') {
        const data = { missionSetName: 'MD 2026: Zhuhai', missionSetDescription: report.note,
          plannedBannerLength: missions.length, fileFormatVersion: 2, exportReport: report,
          missions: missions.map(m => ({ sourceOrder: m.order, sourceRouteId: m.sourceRouteId, missionTitle: m.title, missionDescription: m.description,
            portals: m.portals.map(p => ({ guid: p.guid, title: p.title, imageUrl: p.imageUrl,
              location: { latitude: p.lat, longitude: p.lng }, type: 'PORTAL', isStartPoint: p.isStartPoint,
              isOrnamented: false, objective: null })) })) };
        download('ZH-MD.js', `(() => {\n  const MDUMMJSON = ${JSON.stringify(data, null, 2)};\n})();\n`, 'text/javascript');
      } else download('portal-overrides.json', JSON.stringify({ ...report, missions }, null, 2));
    }
    function rememberMission(raw) {
      const mission=tools.missionInfo(raw);if(!mission)return;
      const previous=missionCache.get(mission.guid);
      missionCache.set(mission.guid,{...previous,...mission,
        imageUrl:mission.imageUrl||previous?.imageUrl||null,
        portalGuids:mission.portalGuids.length?mission.portalGuids:previous?.portalGuids||[]});
    }
    function persistMissions(){
      try{localStorage.setItem('zhmd-mission-links-v1',JSON.stringify({missions:[...missionCache.values()],selections:[...missionSelections]}));}catch{}
    }
    function missionApi(method,args){
      return new Promise((resolve,reject)=>{
        let timer=setTimeout(()=>reject(new Error('Mission request timed out')),20000);
        const done=value=>{clearTimeout(timer);resolve(value);};
        const fail=()=>{clearTimeout(timer);reject(new Error('Intel could not load mission data. Check your login and retry.'));};
        const api=window.plugin.missions;
        if(api&&typeof api[method]==='function'){
          try{api[method](...args,done,fail);}catch(e){clearTimeout(timer);reject(e);}return;
        }
        if(typeof window.postAjax!=='function'){clearTimeout(timer);reject(new Error('IITC mission API unavailable.'));return;}
        let endpoint,payload;
        if(method==='loadMission'){endpoint='getMissionDetails';payload={guid:args[0]};}
        else if(method==='loadPortalMissions'){endpoint='getTopMissionsForPortal';payload={guid:args[0]};}
        else {endpoint='getTopMissionsInBounds';const b=args[0];payload={northE6:Math.round(b.getNorth()*1e6),southE6:Math.round(b.getSouth()*1e6),westE6:Math.round(b.getWest()*1e6),eastE6:Math.round(b.getEast()*1e6)};}
        try{window.postAjax(endpoint,payload,response=>{
          if(!Array.isArray(response?.result)){fail();return;}
          const data=response.result;
          if(method==='loadMission')done({guid:data[0],title:data[1],image:data[10],waypoints:(data[9]||[]).map(w=>({guid:w[1]}))});
          else done(data.map(m=>({guid:m[0],title:m[1],image:m[2]})));
        },fail);}catch(e){clearTimeout(timer);reject(e);}
      });
    }
    function chooseMission(route){
      const selected=missionSelections.get(route.sourceRouteId);
      return selected?missionCache.get(selected):null;
    }
    function suggestMission(route){
      if(missionSelections.has(route.sourceRouteId))return;
      const choices=tools.missionChoices(route,[...missionCache.values()]);
      // Only unambiguous title matches are preselected; the user still reviews.
      const named=choices.filter(m=>m.nameMatch);
      if(named.length===1)missionSelections.set(route.sourceRouteId,named[0].guid);
    }
    function renderMissions(){
      if(!missionReview)return;missionReview.replaceChildren();
      for(const route of selectedRoutes()){
        suggestMission(route);
        const box=node('div',undefined,missionReview);node('strong',`#${route.order} · ${route.displayName}`,box);
        const select=node('select',undefined,box);select.style.width='100%';select.dataset.routeId=route.sourceRouteId;
        node('option','未匹配 / Unmatched',select).value='';
        const choices=tools.missionChoices(route,[...missionCache.values()]);
        const selected=chooseMission(route);
        if(selected&&!choices.some(m=>m.guid===selected.guid))choices.unshift(selected);
        for(const m of choices)node('option',`${m.title||m.guid}${m.overlap?` · ${m.overlap} shared portals`:''}`,select).value=m.guid;
        select.value=selected?.guid||'';
        select.onchange=()=>{missionSelections.set(route.sourceRouteId,select.value);resetReviewed();persistMissions();renderMissions();};
        if(selected){const link=node('a',selected.title||selected.guid,box);link.href='https://link.ingress.com/mission/'+selected.guid;link.target='_blank';link.rel='noopener noreferrer';}
      }
    }
    async function findMissions(){
      if(running)return;running=true;cancelled=false;resetReviewed();let failed=0;
      try{
        for(const route of selectedRoutes()){
          if(cancelled)break;
          message(`查找 Mission #${route.order} · ${route.displayName}…`);
          try{
            const lat=route.points.map(p=>p.lat),lng=route.points.map(p=>p.lng);
            const bounds={getNorth:()=>Math.max(...lat)+.001,getSouth:()=>Math.min(...lat)-.001,getWest:()=>Math.min(...lng)-.001,getEast:()=>Math.max(...lng)+.001};
            // IITC's plugin expects a Leaflet bounds object when available.
            const area=window.L?.latLngBounds?window.L.latLngBounds([bounds.getSouth(),bounds.getWest()],[bounds.getNorth(),bounds.getEast()]):bounds;
            for(const m of await missionApi('loadMissionsInBounds',[area]))rememberMission(m);
          }catch{failed++;}
          suggestMission(route);
          for(const guid of route.portalGuids||[]){
            if(cancelled||chooseMission(route))break;
            try{for(const m of await missionApi('loadPortalMissions',[guid]))rememberMission(m);}catch{failed++;}
            suggestMission(route);await sleep(800);
          }
          const chosen=chooseMission(route);
          if(chosen){try{rememberMission(await missionApi('loadMission',[chosen.guid]));}catch{failed++;}}
          renderMissions();persistMissions();await sleep(1000);
        }
      }finally{running=false;renderMissions();message(`Mission 查找完成：${selectedRoutes().filter(chooseMission).length}/${selectedRoutes().length} 已匹配，${failed} 次请求失败。请核对任务标题后导出。`);}
    }
    async function attachMission(){
      if(running)return;
      const chosen=selectedRoutes();if(chosen.length!==1)throw new Error('请先在顶部选择一条路线，再粘贴任务链接。');
      const guid=tools.missionGuid(panel.querySelector('[name=mission-link]').value);
      if(!guid)throw new Error('请输入 https://link.ingress.com/mission/<GUID>.1c 格式的任务链接。');
      running=true;resetReviewed();
      try{rememberMission(await missionApi('loadMission',[guid]));if(!missionCache.has(guid))throw new Error('Invalid mission response');missionSelections.set(chosen[0].sourceRouteId,guid);persistMissions();renderMissions();message('任务链接已读取，请核对标题与路线。');}
      finally{running=false;}
    }
    function exportMissionLinks(){
      if(running)throw new Error('请等待采集完成或先停止。');
      if(!panel.querySelector('[name=reviewed]').checked)throw new Error('请核对 Mission 匹配并勾选审核确认。');
      const used=new Set();
      const missions=selectedRoutes().map(route=>{
        const m=chooseMission(route);if(!m)throw new Error(`路线 #${route.order} 尚未匹配 Mission。可以先选择单条路线导出。`);
        if(used.has(m.guid))throw new Error('同一 Mission 被分配到多条路线，请重新核对。');used.add(m.guid);
        return {order:route.order,sourceRouteId:route.sourceRouteId,displayName:route.displayName,
          missionGuid:m.guid,missionUrl:'https://link.ingress.com/mission/'+m.guid,title:m.title,imageUrl:m.imageUrl};
      });
      download('mission-links.json',JSON.stringify({kind:'mission-links',reviewed:true,exportedAt:new Date().toISOString(),missions},null,2));
    }

    function show() {
      if (panel) { panel.hidden = !panel.hidden; return; }
      panel = node('section', undefined, document.body); panel.id = 'zhmd-exporter';
      node('h2', 'Zhuhai MD portal exporter', panel);
      node('p', 'Collect portals near the corrected WGS-84 routes. Review candidates before export. Intel only supplies portals loaded in map views; completeness is not guaranteed.', panel);
      const controls = node('div', undefined, panel);
      const route = node('select', undefined, controls); route.name = 'route';
      node('option', 'All 18 routes', route).value = 'all';
      for (const r of routes) node('option', `#${r.order} · ${r.displayName}`, route).value = r.order;
      const mode = node('select', undefined, controls); mode.name = 'mode';
      node('option', 'All portals near route lines', mode).value = 'corridor';
      node('option', 'Match original route stops', mode).value = 'stops';
      const label = node('label', ' Distance (m) ', controls);
      const radius = node('input', undefined, label); Object.assign(radius, { name: 'radius', type: 'number', min: '1', max: '250', value: '40' });
      for (const input of [route, mode, radius]) input.addEventListener('change', () => { resetReviewed(); render(); });
      const actions = node('div', undefined, panel);
      button('Collect loaded', () => { resetReviewed(); render(); }, actions);
      button('Scan selected routes', scanRoutes, actions);
      button('Stop', () => { cancelled = true; message('Stopping after the current map/detail request…'); }, actions);
      button('Load selected details', loadDetails, actions);
      button('Hide', () => { panel.hidden = true; }, actions);
      status = node('p', '', panel); status.setAttribute('role', 'status');
      const missionSection=node('details',undefined,panel);missionSection.open=true;
      node('summary','Mission deeplink / 任务链接',missionSection);
      node('p','读取真实 Mission GUID；自动建议需核对。无需重新扫描 Portal。',missionSection);
      button('查找 Mission / Find missions',findMissions,missionSection);
      const missionInput=node('input',undefined,missionSection);missionInput.name='mission-link';missionInput.type='url';missionInput.placeholder='https://link.ingress.com/mission/… .1c';missionInput.style.width='95%';
      button('读取链接到当前路线',attachMission,missionSection);
      missionReview=node('div',undefined,missionSection);missionReview.className='zhmd-review';
      button('导出 Mission 链接',exportMissionLinks,missionSection);
      review = node('div', undefined, panel); review.className = 'zhmd-review';
      const checked = node('label', undefined, panel);
      const checkbox = node('input', undefined, checked); checkbox.type = 'checkbox'; checkbox.name = 'reviewed';
      checked.append(' I reviewed the portal order and/or mission-link assignments. / 已核对据点顺序或任务链接。');
      const exports = node('div', undefined, panel);
      button('Export website overrides', () => exportData('website'), exports);
      button('Export FSMD-style JS', () => exportData('fsmd'), exports);
      render();
    }
    function setup() {
      const style = node('style', '#zhmd-exporter{position:fixed;right:12px;top:60px;z-index:10020;width:min(560px,94vw);max-height:80vh;overflow:auto;background:#102536;color:#fff;border:1px solid #00c2ff;padding:12px;font:13px/1.5 sans-serif;box-shadow:0 4px 20px #0008}#zhmd-exporter[hidden]{display:none}#zhmd-exporter h2{font-size:18px}#zhmd-exporter button,#zhmd-exporter select,#zhmd-exporter input{margin:4px;padding:4px;color:#111;background:#fff}#zhmd-exporter input[type=number]{width:65px}.zhmd-review{max-height:36vh;overflow:auto}.zhmd-row{display:flex;align-items:center;gap:6px;margin:4px 0}.zhmd-row span{flex:1}.zhmd-row select{max-width:80%}', document.head);
      void style;
      if (window.IITC?.toolbox?.addButton) window.IITC.toolbox.addButton({ label: 'Zhuhai MD portals', action: show });
      else {
        const parent = document.getElementById('toolbox') || document.body;
        const link = node('a', 'Zhuhai MD portals', parent); link.href = '#'; link.onclick = e => { e.preventDefault(); show(); };
      }
      hooks.add('mapDataRefreshEnd', collect);
      hooks.add('portalDetailLoaded', event => { if (event.success && event.details) { const p = tools.portal(event.guid, event.details); if (p) cache.set(p.guid, p); } });
      hooks.add('plugin-missions-loaded-mission',event=>{rememberMission(event.mission);if(panel)resetReviewed();persistMissions();renderMissions();});
      hooks.add('plugin-missions-on-portal-loaded',event=>{for(const m of event.missions||[])rememberMission(m);if(panel)resetReviewed();renderMissions();});
      const existing=window.plugin.missions?.cacheByMissionGuid||{};for(const item of Object.values(existing))if(item?.data)rememberMission(item.data);
      plugin.show = show; plugin.collect = collect; plugin.routes = routes;
    }
    setup.info = { pluginId: 'zhuhai-route-portals', buildName: 'szres', dateTimeVersion: '20261106', script: { name: 'Zhuhai MD route portal exporter', version: '0.2.0', description: 'Review and export portals along Zhuhai MD routes.' } };
    (window.bootPlugins = window.bootPlugins || []).push(setup);
    if (window.iitcLoaded) setup();
  }
  const script = document.createElement('script');
  script.textContent = '(' + wrapper.toString() + ')();';
  (document.body || document.head || document.documentElement).appendChild(script);
  script.remove();
})();
