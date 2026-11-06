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


    const tools = createRoutePortalTools();
    const routes = [{"order":1,"sourceRouteId":"16cdbb21-7be2-4ca9-a4b4-42d57e743838","title":"MD 2026: Zhuhai, 海滨泳场","displayName":"海滨泳场","description":"海滨泳场是珠海最具代表性的城市沙滩之一，也是情侣路上的浪漫地标。这里拥有细腻柔软的沙滩、开阔的海景与悠闲的滨海氛围，标志性的“爱情邮局”与海边灯塔相映成景，成为众多游客拍照打卡的热门地点。无论是清晨漫步海岸迎接晨曦，还是夜晚在海畔咖啡厅感受海风与灯火，这里都展现着珠海作为海滨旅游城市最惬意而迷人的一面。","portalGuids":["ca602c39654f4278b336d7a5335e0a5b.16","cdabd65a5a033ec4a29bf1729790a818.16","98644fbc329845cb9d627413426569ab.16","a78e60b2b0a4462993a5f9d66f9add5d.16","a0ba9858db9b38bba833e3129f4f929d.16","8cb4ddea0a9f4090ad47322a1dcd2e11.16","bb81acec2c673740924ba36daad18039.16"],"points":[{"lat":22.25840313016329,"lng":113.5847553641296},{"lat":22.258177169377298,"lng":113.58493655996129},{"lat":22.25801101874782,"lng":113.58476039406675},{"lat":22.257709045990197,"lng":113.58495961264096},{"lat":22.25745509444123,"lng":113.58517484209274},{"lat":22.256744204099146,"lng":113.58575044701779}]},{"order":2,"sourceRouteId":"97b56aea-d28f-4bf1-a903-b5a399135e93","title":"MD 2026: Zhuhai, 爱情邮局","displayName":"爱情邮局","description":"爱情邮局坐落于情侣路海滨泳场旁，是珠海极具浪漫氛围的地标之一。纯白色建筑与蔚蓝海岸相映成景，旁边矗立的灯塔也为这里增添了独特的海滨浪漫气息。这里不仅是游客拍照打卡的热门地点，更承载着许多人关于爱情与远方的美好寄托。你可以挑选一张明信片，盖上专属邮戳，让这一份来自珠海海岸的浪漫心意，随着海风寄向远方。","portalGuids":["70a0768a282937c1aab2a35f1a25976a.16","a4532631142f3a3bad4aada4792b540f.16","4a4e1b971b6a44b2b5c34b55d41c2366.16","3779d210bc2a4f8d85670bf24ab30e80.16","764411979ef14e8cbff58a10b4e39fee.16","7b730b4eb5aa4f9fb5d45888208cbdc5.16"],"points":[{"lat":22.25937777190252,"lng":113.58538392527},{"lat":22.25975802586806,"lng":113.58564515457837},{"lat":22.260075197318304,"lng":113.58579227577121},{"lat":22.26017480052843,"lng":113.58691431367066},{"lat":22.260635239400344,"lng":113.58557102733404},{"lat":22.260982369722573,"lng":113.58562605848094}]},{"order":3,"sourceRouteId":"5611eab5-68e3-418f-88e1-c7b690efd9a2","title":"MD 2026: Zhuhai, 珠海渔女","displayName":"珠海渔女","description":"珠海渔女矗立在香炉湾畔，是珠海城市精神的永恒象征。这座高 8.7 米的花岗岩雕像，刻画了一位双手高举璀璨明珠的龙女，象征着向世界奉献光明与财富。作为珠海最古老的地标之一，她不仅见证了这座城市从渔村到现代化特区的华丽蜕变，也守护着南海边无数关于爱与勇气的传说。","portalGuids":["16dbc29a5c5e40b3a3a03f34d31b0819.16","c9d0da1cdc9440e9a0da7afcbc38e51e.16","b3db8ed858a546e789c1679c3f5a3b57.16","6b2e11bdfb1649ababeffccb22e21275.16","1f92972e9f124321bc2a9c6a4e817dfd.12","deb68fafca3f4a409850b150400af264.16","8f6902847d224c9ab3cae63aaee19519.16","9f23a74a13e649e3abe11e3de4a2f474.16"],"points":[{"lat":22.263958736076003,"lng":113.58882571598552},{"lat":22.26435585216274,"lng":113.58883269647615},{"lat":22.264577014784738,"lng":113.58330546430439},{"lat":22.265392188539337,"lng":113.58321631660752},{"lat":22.2644828510665,"lng":113.58309624449248},{"lat":22.263917656163176,"lng":113.583045224994}]},{"order":4,"sourceRouteId":"94e60ac4-65e5-42ed-93c0-9507a9cf05cc","title":"MD 2026: Zhuhai, 海滨公园","displayName":"海滨公园","description":"海滨公园坐落于情侣路与石景山之间，是城市中心的一片天然绿肺。这里林木葱郁，开阔的草坪正对着碧波万顷的香炉湾。无论是放飞风筝、在树荫下野餐，还是漫步至湖边观赏黑天鹅，海滨公园以其静谧的自然景观，完美连接了繁华市区与浪漫海岸，是珠海慢生活的最佳注脚。","portalGuids":["250c8b50e3634195990431e56b007d90.16","6626d59475b74bfa93df016425bdae8b.16","67fe004ed51d3e3a94a140c686e2adf3.16","a31ca3cdbf644dd5920a19f523deed57.16","ba89f87231f64830a27c5042abfe02cc.16","ecf355fd859e3e129d655e7bb92380d2.16","cc1ddd32afcd4b29919724a0aa067464.16","6909946713aa43349749852c89423c7f.16","31622817c9844deb87e822a92139a7f2.11","5fc60129f9b64c9fb82e7892220bbffa.16","4b2350e5e48046c294d933c663f2fa3a.16","9362d7562d544389a06cc279beacb22d.16","d1b6ce0ea18c3139b0cf3256edd783fb.16","66c188123f43492a8f30ccee25fd4b9e.16"],"points":[{"lat":22.262124388569386,"lng":113.57707201094834},{"lat":22.262077113633115,"lng":113.57788210570749},{"lat":22.261662582981558,"lng":113.57855201171172},{"lat":22.261719261782947,"lng":113.5793350096933},{"lat":22.26179682178381,"lng":113.57999582771542},{"lat":22.26305045415855,"lng":113.58034016883354}]},{"order":5,"sourceRouteId":"b965e996-2a32-4b39-b467-e56e74c8bff5","title":"MD 2026: Zhuhai, 城市阳台","displayName":"城市阳台","description":"城市阳台是情侣路上的时尚新地标，通过巧妙的空中连廊将翠绿的石景山与蔚蓝的香炉湾沙滩缝合在一起。它打破了传统建筑的边界，构建出一个错落有致的多维公共空间。站在这里，你可以凭栏远眺日月贝与港珠澳大桥，在山海之间俯瞰这座滨海城市的繁华与浪漫。","portalGuids":["dc0fd3dbdc6f482389d08a884db46c94.16","851c64976bba332e8344e99e5c876373.16","c64c2e0ffcd5381599a48346951afcda.16","11dba040f1a73d4495ce6a743529aced.16","5c86593f9818310bb786137fac8572fe.16","3ffb48957255378e8b8d52b3e2ede435.16","3f879fa513a04578b4884e511e9c7465.16","55d143e322ed3364b6f86ade57697423.16","2ed7cc1fad4e390790895d2ceb7855bc.16"],"points":[{"lat":22.265432154747195,"lng":113.57688053832696},{"lat":22.265590778360277,"lng":113.57750637998669},{"lat":22.266147540885928,"lng":113.57707676189774},{"lat":22.266970819158594,"lng":113.57712577651736},{"lat":22.26656317730478,"lng":113.57764250105718},{"lat":22.266837171203306,"lng":113.57755035998473}]},{"order":6,"sourceRouteId":"55b4eccb-5d3e-4dfb-bbdd-21ef54f4ea35","title":"MD 2026: Zhuhai, 九洲城","displayName":"九洲城","description":"九洲城是一座极具特色的仿古建筑群，坐落于珠海市中心繁华地带。建筑以传统宫殿式风格为基调，红墙绿瓦、飞檐翘角，与周围现代都市景观形成鲜明对比，展现出独特的城市文化气质。这里曾是珠海博物馆旧址，承载着珠海早期城市文化记忆，也见证了这座海滨城市的发展变迁。在车水马龙之间，九洲城依然保留着一份古朴与庄重。","portalGuids":["057492f27c7745308bb47c0e54e6ebf8.16","dbf43a2b71e3485598a11048d8030e1a.16","2c277da38cc14388aea94a847ea5da39.16","6313d45589404866bd712ec884de160e.16","28393a4f04db44238205655f6ffeccb9.16","6480622ee6144dbb9e6f6b7028ad020b.16","1f13d7278640486aad4ff1f139513711.16","52fda5d12aa4451aa624ad3528e53007.16"],"points":[{"lat":22.259494906191712,"lng":113.57339283604031},{"lat":22.259677217379696,"lng":113.57363018795682},{"lat":22.259786676207533,"lng":113.57402778410179},{"lat":22.259755820445374,"lng":113.57417200302177},{"lat":22.260185255789676,"lng":113.57446741715627},{"lat":22.26032324119582,"lng":113.57441533085301}]},{"order":7,"sourceRouteId":"1fe9a709-56a1-49d1-a155-eda3be519208","title":"MD 2026: Zhuhai, 情侣路","displayName":"情侣路","description":"情侣路是珠海最具代表性的海滨大道，全长28公里，沿着南海海岸线延伸，拥有迷人的海景、成排的棕榈树步道，以及轻松惬意的滨海氛围。这里因浪漫的景色与珠海渔女等地标而闻名，是珠海最受欢迎的城市名片之一。","portalGuids":["f32bb03030db33ec89739d1ce5813cf5.16","cdae046cbab04657ac77aea1440589ac.16","8cf6f3c6e94e308a810032391a3a4433.16","9a507ebab9504b2d9da9daeb8c7102ba.11","a1a0883d90b84617b29e47c155e44e90.16","09a6d700eef74338b4a07ad9d58654cc.16","be649ed4145f3281b7726ab63ab23122.16"],"points":[{"lat":22.272879182315336,"lng":113.57681998181657},{"lat":22.273936539188554,"lng":113.57689001104457},{"lat":22.275525933890417,"lng":113.57684685064947},{"lat":22.276024093220705,"lng":113.57687185341118},{"lat":22.276443262677976,"lng":113.5769309079526},{"lat":22.276739369371988,"lng":113.57695892759561}]},{"order":8,"sourceRouteId":"1f43fa1f-eb78-4e15-992a-17b9098313f0","title":"MD 2026: Zhuhai, 野狸岛","displayName":"野狸岛","description":"野狸岛是距离珠海市区最近的海岛，通过新海燕桥与情侣路相连。作为珠海大剧院的所在地，它完美融合了自然景观与现代艺术。漫步在环岛路，你可以一边领略壮阔的南中国海景，一边近距离感受“日月贝”的建筑之美，它是这座花园城市忙碌生活中的一片静谧绿洲。","portalGuids":["a2bec2e31e104254aa4f4cca23d087f4.11","e9011f74261b3332bbb12d5708dc4569.16","a1682079543d4ba58b40db880d1098b2.16","4d28cddbfa914415b570b1237a34471c.16","337f85313f1e4f74942858524fefb313.16","305717d446aa4532b2e549b85095fa5b.16","0b0328a4fa1b45a28f4a0d1f683ad03e.16","435c75523b95418ba9ce23ade5944f0a.16","23046df26e5b3a14b2ae3808c4fdafed.16","7b23b9ae591c4a6584ca70b1704b6ae3.11","08065f524abe4441b01ba6a723eb630c.16","a2be1bcd5deb3b9f8aaa41b1b7da5450.16","5ce81d803c1445bca6231094556075c5.16","688d878bc2f140a0a05d4e83157dd700.16"],"points":[{"lat":22.278011796247075,"lng":113.57704696733984},{"lat":22.27823688098996,"lng":113.57817746962625},{"lat":22.27869087531506,"lng":113.58043328837476},{"lat":22.27895100762081,"lng":113.58051336855247},{"lat":22.27975866585129,"lng":113.58109200704743},{"lat":22.280041116164032,"lng":113.58159958123805}]},{"order":9,"sourceRouteId":"3f26bb6a-dadc-49ea-afe5-d07346ccdc27","title":"MD 2026: Zhuhai, Zhuhai 珠海大剧院","displayName":"珠海大剧院","description":"珠海大剧院是中国唯一建设在海岛上的大剧院，其独特的“日月贝”造型灵感源自名画《维纳斯的诞生》。一大一小两组建筑宛如从蓝色大海中升起的贝壳，不仅象征着珠海作为浪漫之城的艺术底蕴，也记录了这座特区向海而生的历史篇章。","portalGuids":["64984580c96946a0b73e93990bd61ab4.16","5300783814ec4543a4c44047f9e1c2a9.16","2aae4273680f401ca13bbeea16c754c0.16","c277dcc19f5743f08c64665e19c348ee.16","1dbfde5567cd4a75964fcac733a0bce8.16","b349b60cc5653e8f93599057416c2611.16","e84fb1f89448341aa2c5c724240a89f2.16","e23f5f61d87c339f9a3177fb897f8345.16"],"points":[{"lat":22.284948184546575,"lng":113.58601290700754},{"lat":22.286420688435594,"lng":113.58444627232427},{"lat":22.286681515199586,"lng":113.58404884639732},{"lat":22.28601254649282,"lng":113.58438723791176},{"lat":22.28497337534931,"lng":113.58455647644448},{"lat":22.28409603467103,"lng":113.58437234438914}]},{"order":10,"sourceRouteId":"e4ab30b6-727c-4c00-b6b1-ab06b279627f","title":"D 2026: Zhuhai,珠海博物馆与城市规划展览馆","displayName":"珠海博物馆与城市规划展览馆","description":"珠海博物馆与城市规划展览馆展示了珠海丰富的历史文化与城市发展蓝图。场馆位于情侣路附近，以现代化建筑和多媒体展览闻名，涵盖海洋文化、本地民俗以及城市建设等内容，让游客深入了解珠海的过去、现在与未来。","portalGuids":["9145ba65e6f241f4aae16809ab7f3edc.16","2f81fb8e85d133c68f97c5ac81232b9c.16","10a1447794df361696319d55f446e58c.16","9d9a51e408193919ae60e68a0459a95f.16","edb9909673fe3fc297b15bbf5f76d8a8.16","4f199e76b308321987567ff8b8c56347.16","cc9e521bd79b386697c85843ae41f83d.16"],"points":[{"lat":22.295588838937586,"lng":113.57264037122712},{"lat":22.2960873109892,"lng":113.57206743139703},{"lat":22.29652421674114,"lng":113.57276851274781},{"lat":22.29748257505849,"lng":113.57287561922541},{"lat":22.2972851304249,"lng":113.57165469165794},{"lat":22.29662453541498,"lng":113.57128913956629}]},{"order":11,"sourceRouteId":"8b88989b-a1cc-4070-b5fc-a151e32bfb38","title":"MD 2026: Zhuhai, 海天公园","displayName":"海天公园","description":"海天公园坐落于情侣北路与梅华东路的交汇处，是珠海拥抱山海的又一张绿色名片。公园内最引人瞩目的是那片广阔的中央大草坪与倾泻而下的华南最大人造瀑布。温室植物馆、古树园散落其间，与不远处的海天驿站、日月贝隔海相望。在这里，城市繁华与山海景观达成了完美的和解，是市民周末露营、亲近自然的绝佳去处。","portalGuids":["9cb260df7ca84a9a828b5cc09f59106d.16","d3b8959100693a48b6c9faffbc23435d.16","f58982fd933e47b88e8a6a2fac79a887.16","69fd66da50313c42b00252cdf494dbe4.16","edb70a471622478a89ba9fc926a96527.16","f65d2db9fdbc43db83f3600826920193.16","9afc7c04329842eb93853031b48492c4.16","35809ada7f0b356c920ec3d0bb5a87b2.16","c74f77edf25c4597a4c4924117e8dc43.16","90b8df1e117f40b698b620247d3fa77b.16"],"points":[{"lat":22.30070787607313,"lng":113.57333312337155},{"lat":22.30132036597272,"lng":113.57364556333573},{"lat":22.30161792194809,"lng":113.57317281797445},{"lat":22.30170845618483,"lng":113.57364153248692},{"lat":22.302133571475547,"lng":113.57365252219836},{"lat":22.302341934432665,"lng":113.57394295001731}]},{"order":12,"sourceRouteId":"4d3bbd7d-5d0d-42e5-aa9d-4c98952bbc22","title":"MD 2026: Zhuhai, 白莲洞公园","displayName":"白莲洞公园","description":"白莲洞又称“鲤鱼嘴”，是一处集奇石、古树与幽洞于一体的山水胜景。相传古时山泉潺潺，洞前常有白莲盛开，因此得名“白莲洞”。园内不仅保留了摩崖石刻等历史文化遗迹，也流传着“僧尼对弈”等民间传说，为景区增添了几分古朴而神秘的韵味。漫步其间，山林静谧、古意盎然，是珠海难得的城市山水文化空间。","portalGuids":["2652585838e94ddf847269c638be21c0.16","ff0e640d26834ab6b0a0989dd25e9a0d.16","47f7f1cfcae9372587eccdbcf4bb3726.16","ac6aacd616bd46f7814f361f33808ba3.16","36c66ff948d54b6fa0faf4cb829322ff.16","299ea521659545a99d6fd06a2932bc81.16","c7192533127f4e6799a2d665fb36b0a7.16","5edebae33ff048b7895e1bcc168d8173.16","d9c607f75225454e9683d56cbf1ee786.11","1a4aacb96734413cb6fc91f7a83228de.16","6aeeb5b766354ffc84fd672d5bdeede6.16","71548ec6c7a84dcf902497973093702e.16","1dd22a360c7a4a22a3c3669e972e06c0.16","578d6f491d884a8ca4123d4c7b9dfec8.16","a619bfd07b1e4c22a4aecb163067a607.16"],"points":[{"lat":22.245651243364634,"lng":113.5570777064414},{"lat":22.246057021942143,"lng":113.55688424448252},{"lat":22.246864297646603,"lng":113.55690123139917},{"lat":22.247739993293138,"lng":113.55714271957129},{"lat":22.247774240595852,"lng":113.55784428419219},{"lat":22.247687969863957,"lng":113.55827824873779}]},{"order":13,"sourceRouteId":"646e7b22-a2d6-488a-9fb5-52cedcdda933","title":"MD 2026: Zhuhai, 圆明新园","displayName":"圆明新园","description":"圆明新园以北京圆明园被焚毁前的建筑为蓝本，按 1:1 比例精选复建了四十景中的十八景。它将古典皇家建筑群、江南园林景观与西洋建筑风格完美融合。在这里，你可以漫步于红墙金瓦间，沉浸式感受清朝鼎盛时期的辉煌气象与历史余晖。","portalGuids":["78ff458094864a66af256647c5417a6b.11","aca3a449290f46c0881757967bc9b59e.11","469659dfcf694516b61b708c20426570.11","7675bbc9d4fa38b1a3cbcdf10787bce7.16","5f1d3b47ff9b4ac6b546e4c64ecb1117.16","fd8d4d74197d42b7916e03e991c14f09.16","cb755f230c5f436ea07514cca25c5009.11","0314e6ca0c93388fbdd4075c0fe8f334.16"],"points":[{"lat":22.242600046369063,"lng":113.53255374491987},{"lat":22.242560882312077,"lng":113.5328817577727},{"lat":22.242409808517156,"lng":113.53248454361228},{"lat":22.242297441069105,"lng":113.5327423455998},{"lat":22.24229017925941,"lng":113.53302922845302},{"lat":22.24200537310896,"lng":113.53313858249747}]},{"order":14,"sourceRouteId":"a828a235-a313-4a63-bdfc-35d00039121c","title":"MD 2026: Zhuhai, 拱北口岸","displayName":"拱北口岸","description":"拱北口岸位于珠海的最南端，是连接珠海与澳门最重要的陆路通道，也是中国出入境客流量最大的口岸之一。巨大的岭南风格建筑群与繁华的口岸广场交织，见证了每天数以万计的人流在双城之间往来穿梭。这里不仅是地理上的分界线，更是粤澳深度融合、文化交流与商贸往来的繁荣见证。","portalGuids":["822b19c01cf74bc8873c919c8b2e94e5.16","fa8520063f17416089eea91f3ed814b2.16","8ed2f12b28cd4573a49022c8d9454512.16","9436994453324ea18205a0e0da55e141.16","5aef6870d59b4a239207dac57a377426.11","d0d244b8d6ac353da5ed75b1710ae4d8.16","ba7490536a934a868fb2b874c772492b.16"],"points":[{"lat":22.221469093873733,"lng":113.54811048848042},{"lat":22.22058597263187,"lng":113.54819075307726},{"lat":22.220631726371852,"lng":113.54854165787445},{"lat":22.21963285040512,"lng":113.54875827969937},{"lat":22.21948214683804,"lng":113.54844648545708},{"lat":22.21920298886168,"lng":113.54889265245363}]},{"order":15,"sourceRouteId":"e4bfb6e3-7875-423b-941b-b26437828e46","title":"MD 2026: Zhuhai, 湾仔旅游码头","displayName":"湾仔旅游码头","description":"湾仔旅游码头是珠海最具特色的海上旅游门户，与澳门隔海相望，近在咫尺。作为“澳门环岛游”的起航点，这里见证了双城融合的独特视角。从这里登船出发，你可以近距离观赏澳门塔、大三巴及葡京酒店等标志性建筑，在海浪的起伏中，领略珠澳两地交相辉映的繁华胜景与别样风情。","portalGuids":["17bbd746c3e148dc84e47293a4bfbff0.16","41e1d9bb2e7d4e5c8803f29aa58657d8.16","cf31198b578f469abf83eb6bcabf4c86.16","36d2a976d1e64f81aac0312b11f96b5b.16","1bbbb8d2e3c04f52a88f1acb35f9ae2a.16","6fdb857339d74acbbea91225bb3118a2.11"],"points":[{"lat":22.194618548480687,"lng":113.5277958682961},{"lat":22.194533042294694,"lng":113.5272511280022},{"lat":22.193127909087394,"lng":113.52701746729963},{"lat":22.192559401335178,"lng":113.52690514240598},{"lat":22.19323915097268,"lng":113.52820024840874},{"lat":22.193714587067515,"lng":113.52829953449293}]},{"order":16,"sourceRouteId":"eac3896e-7ba7-4503-bc93-f0148413be80","title":"MD 2026: Zhuhai, 励骏庞都广场","displayName":"励骏庞都广场","description":"励骏庞都广场坐落于横琴口岸正对面，是一座充满异国情调的葡式风格建筑群。它由大师手笔设计，完美复刻了17世纪葡萄牙曼努埃尔风格的细腻与宏大。米黄色的外墙、精致的雕刻与雄伟的拱门，在夜幕低垂、华灯初上时，仿佛让人一瞬间穿越到了欧洲古堡。作为横琴的潮流地标，它不仅是极具张力的“出片圣地”，更是中西文化在粤澳深度合作区交融共生的华丽缩影。","portalGuids":["e67a68f298453fd4a75b0fd6800fb016.16","202fa2f61f9c4d8296e7d8b426001446.16","e30daa53fb1144ef8796a29e2af3b5a4.16","dcfa49afc22239559e0ab4204b4f3a5d.16","d27180aafd3033658eac3d33db49cf15.16","56f563b365f0459792b0824edd7e1ba1.16"],"points":[{"lat":22.14044501820454,"lng":113.53864154067078},{"lat":22.140499819614888,"lng":113.53813907084664},{"lat":22.14073073518645,"lng":113.53765764409162},{"lat":22.1415524016957,"lng":113.53738880015212},{"lat":22.140753754221763,"lng":113.53684925619632},{"lat":22.13986373453955,"lng":113.53658051541913}]},{"order":17,"sourceRouteId":"a1b08744-a446-4c4d-94e2-992f8d038727","title":"MD 2026: Zhuhai, 横琴芒洲湿地公园","displayName":"横琴芒洲湿地公园","description":"芒洲湿地公园坐落于横琴岛西北角，是喧嚣都市边缘的一片纯净原野。这里通过红树林修复与生态栖息地的营造，筑起了一座候鸟迁徙的“中转站”。漫步于蜿蜒的水上栈道，穿行在随风摇曳的芦苇荡间，你能近距离观察湿地生态的勃勃生机，在落日余晖中感受横琴岛人与自然和谐共生的宁静之美。","portalGuids":["a5ce2e9fd36e4943897c6509199bde96.16","e8b3d8bbf9a04da38d50a3429e426ffb.16","7b7b473cf301443cb275a503f8c41f67.16","27488130a97a4d3f83e9864958276a43.16","c8970f5475ba4af79dec0311ac8951c4.16","4445a8db04b54b2d8bc6fbe7b1dafd95.16"],"points":[{"lat":22.160387404036868,"lng":113.43707426064732},{"lat":22.160670094736076,"lng":113.43680275017365},{"lat":22.16089226096641,"lng":113.43750200911227},{"lat":22.161623849176944,"lng":113.43769932433116},{"lat":22.16181926107777,"lng":113.43916105920003},{"lat":22.160629536648507,"lng":113.43837364535001}]},{"order":18,"sourceRouteId":"7bd6e8ce-60ec-4381-88ea-6f8b25542ef1","title":"MD 2026: Zhuhai, 淇澳岛","displayName":"淇澳岛","description":"淇澳岛位于珠海市东北部，通过淇澳大桥与市区相连，是一座兼具深厚历史底蕴与迷人海岛风光的生态之岛。岛上拥有大片茂密的红树林湿地保护区，白鹭飞掠，生机盎然。漫步在古朴的白石街上，两旁的青砖老屋诉说着当年岛上居民奋勇抵抗外敌的英雄历史。这里远离城市喧嚣，将自然生态与人文历史完美交融，是探寻珠海古村落文化与享受慢活时光的绝佳去处。","portalGuids":["27bd348cc5b14ed7a29a80083962ca29.16","91785eefa8b0428fb63b252e2b10645d.16","1c23192aa8434e5ea9c2dea6f693e380.16","bffbcdbefbf74feab2ea4386ff97fda1.16","281a1501e4aa425697ecf5d84844e63d.16","6f2ace7485414292869ed2e153f243b4.16"],"points":[{"lat":22.398823615985616,"lng":113.64443859683858},{"lat":22.39969404196404,"lng":113.64424079304555},{"lat":22.40082406674731,"lng":113.64615025488717},{"lat":22.401307658116263,"lng":113.64643285264101},{"lat":22.400983483395322,"lng":113.64651476546138},{"lat":22.400708050727605,"lng":113.64675546518997}]}];
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
