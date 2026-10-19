// ==UserScript==
// @id             iitc-plugin-zhuhai-route-portals@szres
// @name           IITC plugin: Zhuhai MD route portal exporter
// @namespace      https://github.com/szres/mission-day-zhuhai
// @version        0.1.1
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
  return { distance, project, corridor, stops, scanPoints, portal, exportPortal };
}


    const tools = createRoutePortalTools();
    const routes = [{"order":1,"sourceRouteId":"16cdbb21-7be2-4ca9-a4b4-42d57e743838","title":"MD 2026: Zhuhai, 海滨泳场","displayName":"海滨泳场","description":"海滨泳场是珠海最具代表性的城市沙滩之一，也是情侣路上的浪漫地标。这里拥有细腻柔软的沙滩、开阔的海景与悠闲的滨海氛围，标志性的“爱情邮局”与海边灯塔相映成景，成为众多游客拍照打卡的热门地点。无论是清晨漫步海岸迎接晨曦，还是夜晚在海畔咖啡厅感受海风与灯火，这里都展现着珠海作为海滨旅游城市最惬意而迷人的一面。","points":[{"lat":22.25840313016329,"lng":113.5847553641296},{"lat":22.258177169377298,"lng":113.58493655996129},{"lat":22.25801101874782,"lng":113.58476039406675},{"lat":22.257709045990197,"lng":113.58495961264096},{"lat":22.25745509444123,"lng":113.58517484209274},{"lat":22.256744204099146,"lng":113.58575044701779}]},{"order":2,"sourceRouteId":"97b56aea-d28f-4bf1-a903-b5a399135e93","title":"MD 2026: Zhuhai, 爱情邮局","displayName":"爱情邮局","description":"爱情邮局坐落于情侣路海滨泳场旁，是珠海极具浪漫氛围的地标之一。纯白色建筑与蔚蓝海岸相映成景，旁边矗立的灯塔也为这里增添了独特的海滨浪漫气息。这里不仅是游客拍照打卡的热门地点，更承载着许多人关于爱情与远方的美好寄托。你可以挑选一张明信片，盖上专属邮戳，让这一份来自珠海海岸的浪漫心意，随着海风寄向远方。","points":[{"lat":22.25937777190252,"lng":113.58538392527},{"lat":22.25975802586806,"lng":113.58564515457837},{"lat":22.260075197318304,"lng":113.58579227577121},{"lat":22.26017480052843,"lng":113.58691431367066},{"lat":22.260635239400344,"lng":113.58557102733404},{"lat":22.260982369722573,"lng":113.58562605848094}]},{"order":3,"sourceRouteId":"5611eab5-68e3-418f-88e1-c7b690efd9a2","title":"MD 2026: Zhuhai, 珠海渔女","displayName":"珠海渔女","description":"珠海渔女矗立在香炉湾畔，是珠海城市精神的永恒象征。这座高 8.7 米的花岗岩雕像，刻画了一位双手高举璀璨明珠的龙女，象征着向世界奉献光明与财富。作为珠海最古老的地标之一，她不仅见证了这座城市从渔村到现代化特区的华丽蜕变，也守护着南海边无数关于爱与勇气的传说。","points":[{"lat":22.263958736076003,"lng":113.58882571598552},{"lat":22.26435585216274,"lng":113.58883269647615},{"lat":22.264577014784738,"lng":113.58330546430439},{"lat":22.265392188539337,"lng":113.58321631660752},{"lat":22.2644828510665,"lng":113.58309624449248},{"lat":22.263917656163176,"lng":113.583045224994}]},{"order":4,"sourceRouteId":"94e60ac4-65e5-42ed-93c0-9507a9cf05cc","title":"MD 2026: Zhuhai, 海滨公园","displayName":"海滨公园","description":"海滨公园坐落于情侣路与石景山之间，是城市中心的一片天然绿肺。这里林木葱郁，开阔的草坪正对着碧波万顷的香炉湾。无论是放飞风筝、在树荫下野餐，还是漫步至湖边观赏黑天鹅，海滨公园以其静谧的自然景观，完美连接了繁华市区与浪漫海岸，是珠海慢生活的最佳注脚。","points":[{"lat":22.262124388569386,"lng":113.57707201094834},{"lat":22.262077113633115,"lng":113.57788210570749},{"lat":22.261662582981558,"lng":113.57855201171172},{"lat":22.261719261782947,"lng":113.5793350096933},{"lat":22.26179682178381,"lng":113.57999582771542},{"lat":22.26305045415855,"lng":113.58034016883354}]},{"order":5,"sourceRouteId":"b965e996-2a32-4b39-b467-e56e74c8bff5","title":"MD 2026: Zhuhai, 城市阳台","displayName":"城市阳台","description":"城市阳台是情侣路上的时尚新地标，通过巧妙的空中连廊将翠绿的石景山与蔚蓝的香炉湾沙滩缝合在一起。它打破了传统建筑的边界，构建出一个错落有致的多维公共空间。站在这里，你可以凭栏远眺日月贝与港珠澳大桥，在山海之间俯瞰这座滨海城市的繁华与浪漫。","points":[{"lat":22.265432154747195,"lng":113.57688053832696},{"lat":22.265590778360277,"lng":113.57750637998669},{"lat":22.266147540885928,"lng":113.57707676189774},{"lat":22.266970819158594,"lng":113.57712577651736},{"lat":22.26656317730478,"lng":113.57764250105718},{"lat":22.266837171203306,"lng":113.57755035998473}]},{"order":6,"sourceRouteId":"55b4eccb-5d3e-4dfb-bbdd-21ef54f4ea35","title":"MD 2026: Zhuhai, 九洲城","displayName":"九洲城","description":"九洲城是一座极具特色的仿古建筑群，坐落于珠海市中心繁华地带。建筑以传统宫殿式风格为基调，红墙绿瓦、飞檐翘角，与周围现代都市景观形成鲜明对比，展现出独特的城市文化气质。这里曾是珠海博物馆旧址，承载着珠海早期城市文化记忆，也见证了这座海滨城市的发展变迁。在车水马龙之间，九洲城依然保留着一份古朴与庄重。","points":[{"lat":22.259494906191712,"lng":113.57339283604031},{"lat":22.259677217379696,"lng":113.57363018795682},{"lat":22.259786676207533,"lng":113.57402778410179},{"lat":22.259755820445374,"lng":113.57417200302177},{"lat":22.260185255789676,"lng":113.57446741715627},{"lat":22.26032324119582,"lng":113.57441533085301}]},{"order":7,"sourceRouteId":"1fe9a709-56a1-49d1-a155-eda3be519208","title":"MD 2026: Zhuhai, 情侣路","displayName":"情侣路","description":"情侣路是珠海最具代表性的海滨大道，全长28公里，沿着南海海岸线延伸，拥有迷人的海景、成排的棕榈树步道，以及轻松惬意的滨海氛围。这里因浪漫的景色与珠海渔女等地标而闻名，是珠海最受欢迎的城市名片之一。","points":[{"lat":22.272879182315336,"lng":113.57681998181657},{"lat":22.273936539188554,"lng":113.57689001104457},{"lat":22.275525933890417,"lng":113.57684685064947},{"lat":22.276024093220705,"lng":113.57687185341118},{"lat":22.276443262677976,"lng":113.5769309079526},{"lat":22.276739369371988,"lng":113.57695892759561}]},{"order":8,"sourceRouteId":"1f43fa1f-eb78-4e15-992a-17b9098313f0","title":"MD 2026: Zhuhai, 野狸岛","displayName":"野狸岛","description":"野狸岛是距离珠海市区最近的海岛，通过新海燕桥与情侣路相连。作为珠海大剧院的所在地，它完美融合了自然景观与现代艺术。漫步在环岛路，你可以一边领略壮阔的南中国海景，一边近距离感受“日月贝”的建筑之美，它是这座花园城市忙碌生活中的一片静谧绿洲。","points":[{"lat":22.278011796247075,"lng":113.57704696733984},{"lat":22.27823688098996,"lng":113.57817746962625},{"lat":22.27869087531506,"lng":113.58043328837476},{"lat":22.27895100762081,"lng":113.58051336855247},{"lat":22.27975866585129,"lng":113.58109200704743},{"lat":22.280041116164032,"lng":113.58159958123805}]},{"order":9,"sourceRouteId":"3f26bb6a-dadc-49ea-afe5-d07346ccdc27","title":"MD 2026: Zhuhai, Zhuhai 珠海大剧院","displayName":"珠海大剧院","description":"珠海大剧院是中国唯一建设在海岛上的大剧院，其独特的“日月贝”造型灵感源自名画《维纳斯的诞生》。一大一小两组建筑宛如从蓝色大海中升起的贝壳，不仅象征着珠海作为浪漫之城的艺术底蕴，也记录了这座特区向海而生的历史篇章。","points":[{"lat":22.284948184546575,"lng":113.58601290700754},{"lat":22.286420688435594,"lng":113.58444627232427},{"lat":22.286681515199586,"lng":113.58404884639732},{"lat":22.28601254649282,"lng":113.58438723791176},{"lat":22.28497337534931,"lng":113.58455647644448},{"lat":22.28409603467103,"lng":113.58437234438914}]},{"order":10,"sourceRouteId":"e4ab30b6-727c-4c00-b6b1-ab06b279627f","title":"D 2026: Zhuhai,珠海博物馆与城市规划展览馆","displayName":"珠海博物馆与城市规划展览馆","description":"珠海博物馆与城市规划展览馆展示了珠海丰富的历史文化与城市发展蓝图。场馆位于情侣路附近，以现代化建筑和多媒体展览闻名，涵盖海洋文化、本地民俗以及城市建设等内容，让游客深入了解珠海的过去、现在与未来。","points":[{"lat":22.295588838937586,"lng":113.57264037122712},{"lat":22.2960873109892,"lng":113.57206743139703},{"lat":22.29652421674114,"lng":113.57276851274781},{"lat":22.29748257505849,"lng":113.57287561922541},{"lat":22.2972851304249,"lng":113.57165469165794},{"lat":22.29662453541498,"lng":113.57128913956629}]},{"order":11,"sourceRouteId":"8b88989b-a1cc-4070-b5fc-a151e32bfb38","title":"MD 2026: Zhuhai, 海天公园","displayName":"海天公园","description":"海天公园坐落于情侣北路与梅华东路的交汇处，是珠海拥抱山海的又一张绿色名片。公园内最引人瞩目的是那片广阔的中央大草坪与倾泻而下的华南最大人造瀑布。温室植物馆、古树园散落其间，与不远处的海天驿站、日月贝隔海相望。在这里，城市繁华与山海景观达成了完美的和解，是市民周末露营、亲近自然的绝佳去处。","points":[{"lat":22.30070787607313,"lng":113.57333312337155},{"lat":22.30132036597272,"lng":113.57364556333573},{"lat":22.30161792194809,"lng":113.57317281797445},{"lat":22.30170845618483,"lng":113.57364153248692},{"lat":22.302133571475547,"lng":113.57365252219836},{"lat":22.302341934432665,"lng":113.57394295001731}]},{"order":12,"sourceRouteId":"4d3bbd7d-5d0d-42e5-aa9d-4c98952bbc22","title":"MD 2026: Zhuhai, 白莲洞公园","displayName":"白莲洞公园","description":"白莲洞又称“鲤鱼嘴”，是一处集奇石、古树与幽洞于一体的山水胜景。相传古时山泉潺潺，洞前常有白莲盛开，因此得名“白莲洞”。园内不仅保留了摩崖石刻等历史文化遗迹，也流传着“僧尼对弈”等民间传说，为景区增添了几分古朴而神秘的韵味。漫步其间，山林静谧、古意盎然，是珠海难得的城市山水文化空间。","points":[{"lat":22.245651243364634,"lng":113.5570777064414},{"lat":22.246057021942143,"lng":113.55688424448252},{"lat":22.246864297646603,"lng":113.55690123139917},{"lat":22.247739993293138,"lng":113.55714271957129},{"lat":22.247774240595852,"lng":113.55784428419219},{"lat":22.247687969863957,"lng":113.55827824873779}]},{"order":13,"sourceRouteId":"646e7b22-a2d6-488a-9fb5-52cedcdda933","title":"MD 2026: Zhuhai, 圆明新园","displayName":"圆明新园","description":"圆明新园以北京圆明园被焚毁前的建筑为蓝本，按 1:1 比例精选复建了四十景中的十八景。它将古典皇家建筑群、江南园林景观与西洋建筑风格完美融合。在这里，你可以漫步于红墙金瓦间，沉浸式感受清朝鼎盛时期的辉煌气象与历史余晖。","points":[{"lat":22.242600046369063,"lng":113.53255374491987},{"lat":22.242560882312077,"lng":113.5328817577727},{"lat":22.242409808517156,"lng":113.53248454361228},{"lat":22.242297441069105,"lng":113.5327423455998},{"lat":22.24229017925941,"lng":113.53302922845302},{"lat":22.24200537310896,"lng":113.53313858249747}]},{"order":14,"sourceRouteId":"a828a235-a313-4a63-bdfc-35d00039121c","title":"MD 2026: Zhuhai, 拱北口岸","displayName":"拱北口岸","description":"拱北口岸位于珠海的最南端，是连接珠海与澳门最重要的陆路通道，也是中国出入境客流量最大的口岸之一。巨大的岭南风格建筑群与繁华的口岸广场交织，见证了每天数以万计的人流在双城之间往来穿梭。这里不仅是地理上的分界线，更是粤澳深度融合、文化交流与商贸往来的繁荣见证。","points":[{"lat":22.221469093873733,"lng":113.54811048848042},{"lat":22.22058597263187,"lng":113.54819075307726},{"lat":22.220631726371852,"lng":113.54854165787445},{"lat":22.21963285040512,"lng":113.54875827969937},{"lat":22.21948214683804,"lng":113.54844648545708},{"lat":22.21920298886168,"lng":113.54889265245363}]},{"order":15,"sourceRouteId":"e4bfb6e3-7875-423b-941b-b26437828e46","title":"MD 2026: Zhuhai, 湾仔旅游码头","displayName":"湾仔旅游码头","description":"湾仔旅游码头是珠海最具特色的海上旅游门户，与澳门隔海相望，近在咫尺。作为“澳门环岛游”的起航点，这里见证了双城融合的独特视角。从这里登船出发，你可以近距离观赏澳门塔、大三巴及葡京酒店等标志性建筑，在海浪的起伏中，领略珠澳两地交相辉映的繁华胜景与别样风情。","points":[{"lat":22.194618548480687,"lng":113.5277958682961},{"lat":22.194533042294694,"lng":113.5272511280022},{"lat":22.193127909087394,"lng":113.52701746729963},{"lat":22.192559401335178,"lng":113.52690514240598},{"lat":22.19323915097268,"lng":113.52820024840874},{"lat":22.193714587067515,"lng":113.52829953449293}]},{"order":16,"sourceRouteId":"eac3896e-7ba7-4503-bc93-f0148413be80","title":"MD 2026: Zhuhai, 励骏庞都广场","displayName":"励骏庞都广场","description":"励骏庞都广场坐落于横琴口岸正对面，是一座充满异国情调的葡式风格建筑群。它由大师手笔设计，完美复刻了17世纪葡萄牙曼努埃尔风格的细腻与宏大。米黄色的外墙、精致的雕刻与雄伟的拱门，在夜幕低垂、华灯初上时，仿佛让人一瞬间穿越到了欧洲古堡。作为横琴的潮流地标，它不仅是极具张力的“出片圣地”，更是中西文化在粤澳深度合作区交融共生的华丽缩影。","points":[{"lat":22.14044501820454,"lng":113.53864154067078},{"lat":22.140499819614888,"lng":113.53813907084664},{"lat":22.14073073518645,"lng":113.53765764409162},{"lat":22.1415524016957,"lng":113.53738880015212},{"lat":22.140753754221763,"lng":113.53684925619632},{"lat":22.13986373453955,"lng":113.53658051541913}]},{"order":17,"sourceRouteId":"a1b08744-a446-4c4d-94e2-992f8d038727","title":"MD 2026: Zhuhai, 横琴芒洲湿地公园","displayName":"横琴芒洲湿地公园","description":"芒洲湿地公园坐落于横琴岛西北角，是喧嚣都市边缘的一片纯净原野。这里通过红树林修复与生态栖息地的营造，筑起了一座候鸟迁徙的“中转站”。漫步于蜿蜒的水上栈道，穿行在随风摇曳的芦苇荡间，你能近距离观察湿地生态的勃勃生机，在落日余晖中感受横琴岛人与自然和谐共生的宁静之美。","points":[{"lat":22.160387404036868,"lng":113.43707426064732},{"lat":22.160670094736076,"lng":113.43680275017365},{"lat":22.16089226096641,"lng":113.43750200911227},{"lat":22.161623849176944,"lng":113.43769932433116},{"lat":22.16181926107777,"lng":113.43916105920003},{"lat":22.160629536648507,"lng":113.43837364535001}]},{"order":18,"sourceRouteId":"7bd6e8ce-60ec-4381-88ea-6f8b25542ef1","title":"MD 2026: Zhuhai, 淇澳岛","displayName":"淇澳岛","description":"淇澳岛位于珠海市东北部，通过淇澳大桥与市区相连，是一座兼具深厚历史底蕴与迷人海岛风光的生态之岛。岛上拥有大片茂密的红树林湿地保护区，白鹭飞掠，生机盎然。漫步在古朴的白石街上，两旁的青砖老屋诉说着当年岛上居民奋勇抵抗外敌的英雄历史。这里远离城市喧嚣，将自然生态与人文历史完美交融，是探寻珠海古村落文化与享受慢活时光的绝佳去处。","points":[{"lat":22.398823615985616,"lng":113.64443859683858},{"lat":22.39969404196404,"lng":113.64424079304555},{"lat":22.40082406674731,"lng":113.64615025488717},{"lat":22.401307658116263,"lng":113.64643285264101},{"lat":22.400983483395322,"lng":113.64651476546138},{"lat":22.400708050727605,"lng":113.64675546518997}]}];
    const plugin = window.plugin.zhuhaiRoutePortals = {};
    const cache = new Map();
    const selections = new Map();
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
      draw();
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
      review = node('div', undefined, panel); review.className = 'zhmd-review';
      const checked = node('label', undefined, panel);
      const checkbox = node('input', undefined, checked); checkbox.type = 'checkbox'; checkbox.name = 'reviewed';
      checked.append(' I reviewed these candidate portals and their order.');
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
      plugin.show = show; plugin.collect = collect; plugin.routes = routes;
    }
    setup.info = { pluginId: 'zhuhai-route-portals', buildName: 'szres', dateTimeVersion: '20261018', script: { name: 'Zhuhai MD route portal exporter', version: '0.1.1', description: 'Review and export portals along Zhuhai MD routes.' } };
    (window.bootPlugins = window.bootPlugins || []).push(setup);
    if (window.iitcLoaded) setup();
  }
  const script = document.createElement('script');
  script.textContent = '(' + wrapper.toString() + ')();';
  (document.body || document.head || document.documentElement).appendChild(script);
  script.remove();
})();
