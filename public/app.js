import { createBuildingLayer } from './buildings.js';

// Zhuhai Mission Day map: source KML routes rendered with Apple MapKit JS.


// ---------------------------------------------------------------------------
// i18n. Only UI chrome is translated; mission and portal names render exactly
// as they appear in missions.json regardless of language.
// ---------------------------------------------------------------------------
const I18N = {
  en: {
    htmlLang: 'en',
    pageTitleSuffix: 'Mission Day Map',
    languageAria: 'Language',
    missionsAria: 'Missions',
    viewSwitchAria: 'Mission view mode',
    viewListAria: 'List view',
    viewGridAria: 'Grid view',
    mapAria: 'Map',
    closeAria: 'Close',
    collapseAria: 'Collapse panel to see the map',
    expandAria: 'Expand panel to see the mission details',
    showAll: 'Show all routes',
    showWelcome: 'ℹ︎ About this event',
    showWelcomeAria: 'About this event',
    welcomeAria: 'Welcome',
    buildingsLabel: 'Raised buildings',
    buildingPreviewLabel: 'BUILDING PREVIEW',
    welcomeTitle: 'Welcome to Zhuhai Mission Day 2026',
    welcomeLede: 'Explore the routes with reviewed portal names, photos and Ingress links. Original route numbers are preserved. These are nearby portal candidates, not a verified mission objective list.',
    bannerCaption: 'Official banner map · Operation Zhuhai · Ingress Mission Day 2026',
    contactSection: 'Channels & contact',
    blogsSection: 'Mission stories',
    travelSection: 'Travel & accommodation',
    enterMap: 'Enter the map →',
    readBlog: '📖 Read mission blog ↗',
    openMissionIngress: '⬢ Open mission in Ingress ↗',
    detailHint: 'Tap any portal to plan walking directions in Apple Maps.',
    viewArea: 'View Area in Apple Maps ↗',
    openGuide: 'Open Mission Guide ↗',
    footerHint: 'Tap any mission to see its route and get Apple Maps directions to individual stops.',
    missionPrefix: 'Mission',
    portalCountAbbr: n => `${n}p`,
    portalCountFull: n => `${n} portal${n === 1 ? '' : 's'}`,
    portalOf: (cur, total) => `Portal ${cur} of ${total}`,
    openInIngressAria: name => `Open ${name} in Ingress`,
    walkingAria: name => `Walking directions to ${name} in Apple Maps`,
    openInIngressTitle: 'Open in Ingress',
    walkingTitle: 'Walking directions in Apple Maps',
    toastOpeningIngress: 'Opening in Ingress…',
    missionMeta: (n, p, b) => `${n} mapped missions · ${p} portals`,
    disclaimer: 'Unofficial Zhuhai Mission Day map, adapted from the Shenzhen RES Foshan project. Routes, mission descriptions and mission images come from Google My Maps; reviewed portal data comes from IITC exports. No affiliation with Niantic or event organisers.',
    disclaimerShort: 'Unofficial · adapted from Shenzhen RES · data: Zhuhai MD Google My Maps + IITC',
    coordChooserAria: 'Choose coordinate system',
    coordChooserTitle: 'Open in Apple Maps',
    coordChooserNote: "Apple Maps in mainland China renders against GCJ-02. Opening WGS-84 coordinates there shifts the pin by ~50–500 m. Choose GCJ-02 if you're in China, WGS-84 elsewhere.",
    coordChooseWgs84: 'WGS-84 (global)',
    coordChooseGcj02: 'GCJ-02 (China mainland)',
    coordRememberSession: 'Remember my choice for this session',
  },
  zh: {
    htmlLang: 'zh-Hans',
    pageTitleSuffix: '任务日地图',
    languageAria: '语言',
    missionsAria: '任务列表',
    viewSwitchAria: '任务列表显示方式',
    viewListAria: '列表视图',
    viewGridAria: '网格视图',
    mapAria: '地图',
    closeAria: '关闭',
    collapseAria: '收起面板,显示完整地图',
    expandAria: '展开面板,查看任务详情',
    showAll: '显示完整路线',
    showWelcome: 'ℹ︎ 活动信息',
    showWelcomeAria: '查看活动信息',
    welcomeAria: '欢迎页',
    buildingsLabel: '立体建筑',
    buildingPreviewLabel: '建筑预览',
    welcomeTitle: '欢迎来到珠海任务日 2026',
    welcomeLede: '已导入审核后的据点名称、图片与 Ingress 链接，保留原始路线编号。这些是路线附近的候选据点，并非已确认的任务目标列表。',
    bannerCaption: '官方拼图地图 · Operation Zhuhai · Ingress 任务日 2026',
    contactSection: '通讯与联系',
    blogsSection: '任务故事',
    travelSection: '交通与住宿',
    enterMap: '进入地图 →',
    readBlog: '📖 阅读任务介绍 ↗',
    openMissionIngress: '⬢ 在 Ingress 中打开任务 ↗',
    footerHint: '点击任务查看路线，并在 Apple 地图中导航至单个据点。',
    detailHint: '点击任一据点可在 Apple 地图中规划步行路线。',
    viewArea: '在 Apple 地图中查看任务区域 ↗',
    openGuide: '在 Apple 地图中打开路线指南 ↗',
    missionPrefix: '任务',
    portalCountAbbr: n => `${n}个`,
    portalCountFull: n => `${n} 个据点`,
    portalOf: (cur, total) => `第 ${cur} 个据点,共 ${total} 个`,
    openInIngressAria: name => `在 Ingress 中打开 ${name}`,
    walkingAria: name => `在 Apple 地图中导航到 ${name}`,
    openInIngressTitle: '在 Ingress 中打开',
    walkingTitle: '在 Apple 地图中步行导航',
    toastOpeningIngress: '正在打开 Ingress…',
    missionMeta: (n, p, b) => `${n} 项已收录任务 · ${p} 个据点`,
    disclaimer: 'Unofficial Zhuhai Mission Day map, adapted from the Shenzhen RES Foshan project. Routes, mission descriptions and mission images come from Google My Maps; reviewed portal data comes from IITC exports. No affiliation with Niantic or event organisers.',
    disclaimerShort: 'Unofficial · adapted from Shenzhen RES · data: Zhuhai MD Google My Maps + IITC',
    coordChooserAria: '选择坐标系',
    coordChooserTitle: '在 Apple 地图中打开',
    coordChooserNote: '中国大陆的 Apple 地图采用 GCJ-02 坐标系,直接打开 WGS-84 坐标会出现约 50–500 米的偏移。若在中国大陆,请选择 GCJ-02;其他地区请选择 WGS-84。',
    coordChooseWgs84: 'WGS-84(全球)',
    coordChooseGcj02: 'GCJ-02(中国大陆)',
    coordRememberSession: '本次会话记住我的选择',
  },
  ja: {
    htmlLang: 'ja',
    pageTitleSuffix: 'ミッションデイ・マップ',
    languageAria: '言語',
    missionsAria: 'ミッション一覧',
    viewSwitchAria: 'ミッション表示モード',
    viewListAria: 'リスト表示',
    viewGridAria: 'グリッド表示',
    mapAria: 'マップ',
    closeAria: '閉じる',
    collapseAria: 'パネルを折りたたんでマップを表示',
    expandAria: 'パネルを展開してミッション詳細を表示',
    showAll: 'バナー全体を表示',
    showWelcome: 'ℹ︎ イベント情報',
    showWelcomeAria: 'イベント情報を表示',
    welcomeAria: 'ようこそ',
    buildingsLabel: '立体建物',
    buildingPreviewLabel: '建物プレビュー',
    welcomeTitle: 'Zhuhai ミッションデイ 2026 へようこそ',
    welcomeLede: '確認済みのポータル名、写真、Ingress リンクを追加しました。元のルート番号を保持しています。ルート付近の候補であり、正式なミッション目標一覧ではありません。',
    bannerCaption: '公式バナーマップ · Operation Zhuhai · Ingress ミッションデイ 2026',
    contactSection: 'チャンネル・連絡先',
    blogsSection: 'ミッション解説',
    travelSection: '交通・宿泊',
    enterMap: 'マップを開く →',
    readBlog: '📖 ミッション解説を読む ↗',
    openMissionIngress: '⬢ Ingress でミッションを開く ↗',
    footerHint: 'ミッションを選択し、各地点への徒歩ルートを Apple マップで開けます。',
    detailHint: 'ポータルをタップして Apple マップで徒歩ルートを開きます。',
    viewArea: 'Apple マップでエリアを表示 ↗',
    openGuide: 'Apple マップでミッションガイドを開く ↗',
    missionPrefix: 'ミッション',
    portalCountAbbr: n => `${n}個`,
    portalCountFull: n => `${n} ポータル`,
    portalOf: (cur, total) => `ポータル ${cur} / ${total}`,
    openInIngressAria: name => `${name} を Ingress で開く`,
    walkingAria: name => `Apple マップで ${name} までの徒歩ルート`,
    openInIngressTitle: 'Ingress で開く',
    walkingTitle: 'Apple マップで徒歩ルート',
    toastOpeningIngress: 'Ingress を開いています…',
    missionMeta: (n, p, b) => `${n} ミッション · ${p} ポータル`,
    disclaimer: 'Unofficial Zhuhai Mission Day map, adapted from the Shenzhen RES Foshan project. Routes, mission descriptions and mission images come from Google My Maps; reviewed portal data comes from IITC exports. No affiliation with Niantic or event organisers.',
    disclaimerShort: 'Unofficial · adapted from Shenzhen RES · data: Zhuhai MD Google My Maps + IITC',
    coordChooserAria: '座標系を選択',
    coordChooserTitle: 'Apple マップで開く',
    coordChooserNote: '中国本土の Apple マップは GCJ-02 座標系を使用しているため、WGS-84 のまま開くとピンが約 50〜500m ずれます。中国本土なら GCJ-02、それ以外の地域なら WGS-84 を選んでください。',
    coordChooseWgs84: 'WGS-84（全世界）',
    coordChooseGcj02: 'GCJ-02（中国本土）',
    coordRememberSession: 'このセッションでは記憶する',
  },
};

function initialLang() {
  try {
    const stored = localStorage.getItem('lang');
    if (stored && I18N[stored]) return stored;
  } catch { /* localStorage may throw in private mode */ }
  const browser = (navigator.language || 'en').toLowerCase();
  if (browser.startsWith('zh')) return 'zh';
  if (browser.startsWith('ja')) return 'ja';
  return 'en';
}

function initialViewMode() {
  try {
    const stored = localStorage.getItem('missionViewMode');
    if (stored === 'list' || stored === 'grid') return stored;
  } catch { /* localStorage may throw in private mode */ }
  return 'list';
}

function t() {
  return I18N[state.lang] || I18N.en;
}

const state = {
  data: null,
  guides: {},   // mission order → maps.apple/ug/... URL
  blogs: {},    // mission order → { title_zh, title_en, url_zh, url_en }
  ingressMissions: {}, // mission order → link.ingress.com/mission/...
  missionPictures: {}, // mission order → lh3.googleusercontent.com banner URL
  viewMode: 'list',    // 'list' or 'grid' — toggled via #view-list / #view-grid
  map: null,
  lang: 'en',  // overwritten on bootstrap from localStorage / browser
  /** @type {{overlays:any[], annotations:any[]}} */
  layers: { overlays: [], annotations: [] },
  buildings: null,
  selected: null, // mission order (1-based) or 'all'
};

const els = {
  setTitle:    document.getElementById('set-title'),
  setMeta:     document.getElementById('set-meta'),
  list:        document.getElementById('mission-list'),
  grid:        document.getElementById('mission-grid'),
  viewList:    document.getElementById('view-list'),
  viewGrid:    document.getElementById('view-grid'),
  showAll:     document.getElementById('show-all'),
  detail:      document.getElementById('detail'),
  detailTitle: document.getElementById('detail-title'),
  detailList:  document.getElementById('detail-portals'),
  detailClose: document.getElementById('detail-close'),
  detailHandle:document.getElementById('detail-handle'),
  openInMaps:  document.getElementById('open-in-maps'),
  openMissionIngress: document.getElementById('open-mission-ingress'),
  openBlog:    document.getElementById('open-blog'),
  detailPicture: document.getElementById('detail-picture'),
  welcome:     document.getElementById('welcome'),
  welcomeBlogs:document.getElementById('welcome-blogs'),
  showWelcome: document.getElementById('show-welcome'),
  welcomeEnter:document.getElementById('welcome-enter'),
  welcomeClose:document.getElementById('welcome-close'),
  coordChooser:document.getElementById('coord-chooser'),
  coordTarget: document.getElementById('coord-chooser-target'),
  coordWgs84:  document.getElementById('coord-choose-wgs84'),
  coordGcj02:  document.getElementById('coord-choose-gcj02'),
  coordRemember: document.getElementById('coord-chooser-remember'),
  coordClose:  document.getElementById('coord-chooser-close'),
};

// Holds {kind, mission|portal, label} for whichever Apple Maps link the user
// most recently tapped, so the chooser knows what URL to build for each
// coordinate system. Reset every time the chooser opens.
let pendingMapsRequest = null;

// Apply i18n and wire the switcher immediately so the
// chrome is in the right language from the first paint.
state.lang = initialLang();
state.viewMode = initialViewMode();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapChrome, { once: true });
} else {
  bootstrapChrome();
}

// MapKit calls this once its script has loaded.
window.initMapKit = () => {
  if (!window.MAPKIT_TOKEN || window.MAPKIT_TOKEN.startsWith('PASTE_')) {
    showFatal('Could not load the MapKit configuration. Reload the page to retry.');
    return;
  }

  mapkit.init({
    authorizationCallback: done => done(window.MAPKIT_TOKEN),
    language: t().htmlLang,
  });

  bootstrap().catch(err => {
    console.error(err);
    showFatal(err.message);
  });
};

// Register the callback before requesting MapKit to avoid cached-script races.
const mapkitScript = document.createElement('script');
mapkitScript.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
mapkitScript.crossOrigin = 'anonymous';
mapkitScript.async = true;
mapkitScript.dataset.callback = 'initMapKit';
mapkitScript.dataset.libraries = 'map,annotations,overlays,services,geojson';
mapkitScript.onerror = () => showFatal('Could not load Apple MapKit. Check your connection and reload.');
document.head.appendChild(mapkitScript);

function bootstrapChrome() {
  applyI18n();

  // Event delegation — a single document-level click handler is robust against
  // null elements, stale cached HTML, or load-order surprises. Tap anywhere
  // and we route by id / closest selector.
  document.addEventListener('click', e => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.closest('.lang-switch button')) {
      const btn = target.closest('.lang-switch button');
      if (btn.dataset.lang) setLang(btn.dataset.lang);
      return;
    }
    if (target.closest('#show-welcome')) {
      e.preventDefault();
      openWelcome();
      return;
    }
    if (target.closest('#welcome-close, #welcome-enter')) {
      e.preventDefault();
      closeWelcome();
      return;
    }
    // Backdrop click on the modal itself (not its inner content)
    if (target.id === 'welcome') {
      closeWelcome();
      return;
    }
    // Mobile bottom-sheet collapse / expand
    if (target.closest('#detail-handle')) {
      e.preventDefault();
      toggleDetailCollapsed();
      return;
    }
    // Coordinate-system chooser
    if (target.closest('#coord-choose-wgs84')) { e.preventDefault(); pickCoordSystem('wgs84'); return; }
    if (target.closest('#coord-choose-gcj02')) { e.preventDefault(); pickCoordSystem('gcj02'); return; }
    if (target.closest('#coord-chooser-close')) { e.preventDefault(); closeCoordChooser(); return; }
    if (target.id === 'coord-chooser') { closeCoordChooser(); return; }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (els.coordChooser && !els.coordChooser.hidden) { closeCoordChooser(); return; }
    if (els.welcome && !els.welcome.hidden) closeWelcome();
  });

  // Auto-open on first visit
  let seen = false;
  try { seen = !!localStorage.getItem('welcomeSeen'); } catch {}
  if (!seen) openWelcome();
}

function openWelcome() {
  const w = els.welcome || document.getElementById('welcome');
  if (!w) return;
  renderWelcomeBlogs();
  w.hidden = false;
  document.body.classList.add('modal-open');
}

function closeWelcome() {
  const w = els.welcome || document.getElementById('welcome');
  if (!w) return;
  w.hidden = true;
  document.body.classList.remove('modal-open');
  try { localStorage.setItem('welcomeSeen', '1'); } catch {}
}

function renderWelcomeBlogs() {
  if (!els.welcomeBlogs) return;
  els.welcomeBlogs.innerHTML = '';
  const lang = state.lang === 'zh' ? 'zh' : 'en'; // JP falls back to EN
  // Group blogs by url so two-mission posts render once
  const seen = new Map();
  for (const [order, blog] of Object.entries(state.blogs)) {
    if (typeof blog !== 'object' || !blog) continue;
    const url = blog[`url_${lang}`] || blog.url_en;
    const title = blog[`title_${lang}`] || blog.title_en;
    if (!url || !title) continue;
    if (!seen.has(url)) seen.set(url, { title, orders: [], date: blog.date });
    seen.get(url).orders.push(Number(order));
  }
  // Order by date (oldest first), then by first mission number.
  const entries = [...seen.entries()].sort((a, b) => {
    const da = a[1].date || '9999-99';
    const db = b[1].date || '9999-99';
    if (da !== db) return da < db ? -1 : 1;
    return Math.min(...a[1].orders) - Math.min(...b[1].orders);
  });
  for (const [url, info] of entries) {
    const li = document.createElement('li');
    const ordersTxt = info.orders.sort((a,b)=>a-b).map(o => `#${o}`).join(' · ');
    const dateBadge = info.date
      ? `<span class="blog-date">${escapeHtml(formatBlogDate(info.date))}</span>`
      : '';
    li.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">
      <span class="blog-orders">${ordersTxt}</span>
      <span class="blog-title">${escapeHtml(info.title)} ↗</span>
      ${dateBadge}
    </a>`;
    els.welcomeBlogs.appendChild(li);
  }
  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'blog-empty';
    li.textContent = '—';
    els.welcomeBlogs.appendChild(li);
  }
}

function formatBlogDate(iso) {
  // "2026-03" or "2026-03-15" → localised "Mar 2026" / "2026 年 3 月" / "2026 年 3 月"
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
  if (!m) return iso;
  const year = m[1];
  const month = parseInt(m[2], 10);
  const day = m[3] ? parseInt(m[3], 10) : null;
  const lang = state.lang;
  if (lang === 'zh') {
    return day ? `${year} 年 ${month} 月 ${day} 日` : `${year} 年 ${month} 月`;
  }
  if (lang === 'ja') {
    return day ? `${year} 年 ${month} 月 ${day} 日` : `${year} 年 ${month} 月`;
  }
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return day ? `${monthNames[month - 1]} ${day}, ${year}` : `${monthNames[month - 1]} ${year}`;
}

function setLang(lang) {
  if (!I18N[lang]) return;
  state.lang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
  applyI18n();
  // Re-render dynamic content if data already loaded
  if (state.data) {
    buildMissionList();
    if (state.selected && state.selected !== 'all') {
      const m = state.data.missions.find(x => x.order === state.selected);
      if (m) showDetailPanel(m);
    }
  }
}

function applyI18n() {
  const tr = t();
  document.documentElement.lang = tr.htmlLang;
  document.title = `${state.data?.setName ?? 'MD 2026: Zhuhai'} — ${tr.pageTitleSuffix}`;
  // Static elements marked with data-i18n / data-i18n-aria-label
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const k = el.dataset.i18n;
    if (tr[k] != null) el.textContent = tr[k];
  }
  for (const el of document.querySelectorAll('[data-i18n-aria-label]')) {
    const k = el.dataset.i18nAriaLabel;
    if (tr[k] != null) el.setAttribute('aria-label', tr[k]);
  }
  // Language-switch active state
  for (const btn of document.querySelectorAll('.lang-switch button')) {
    btn.classList.toggle('active', btn.dataset.lang === state.lang);
  }
  // Meta line depends on loaded data
  if (state.data) {
    const totalPortals = state.data.missions.reduce((n, m) => n + m.portals.length, 0);
    document.getElementById('set-meta').textContent =
      tr.missionMeta(state.data.missions.length, totalPortals, state.data.bannerLength);
  }
}

async function bootstrap() {
  const [missionsRes, guidesRaw, blogsRaw, ingressRaw, picturesRaw] = await Promise.all([
    fetch('/missions.json', { cache: 'no-cache' }),
    fetch('/guides.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : {}).catch(() => ({})),
    fetch('/blogs.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : {}).catch(() => ({})),
    fetch('/ingress-missions.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : {}).catch(() => ({})),
    fetch('/mission-pictures.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : {}).catch(() => ({})),
  ]);
  if (!missionsRes.ok) throw new Error(`missions.json ${missionsRes.status}`);
  state.data = await missionsRes.json();
  state.guides = sanitizeGuides(guidesRaw);
  state.blogs = sanitizeBlogs(blogsRaw);
  state.ingressMissions = sanitizeIngressMissions(ingressRaw);
  state.missionPictures = sanitizeMissionPictures(picturesRaw);
  renderWelcomeBlogs();

  els.setTitle.textContent = state.data.setName;
  applyI18n();  // refresh meta + title now that data is available

  state.map = new mapkit.Map('map', {
    colorScheme: mapkit.Map.ColorSchemes.Dark,
    showsCompass: mapkit.FeatureVisibility.Hidden,
    showsMapTypeControl: false,
    showsZoomControl: true,
    showsPointsOfInterest: false,
    isRotationEnabled: false,
    center: new mapkit.Coordinate(state.data.center.lat, state.data.center.lng),
  });

  // Hidden debug handle. Lets you poke at the live state / map from the
  // browser console (e.g. `__zhmd.map.cameraDistance = 500`). Harmless in
  // production; intentionally double-underscored to discourage app code
  // from depending on it.
  if (typeof window !== 'undefined') window.__zhmd = state;

  fitToBounds(state.data.bounds);
  buildMissionList();
  buildMissionGrid();
  setViewMode(state.viewMode);
  if (els.viewList) els.viewList.addEventListener('click', () => setViewMode('list'));
  if (els.viewGrid) els.viewGrid.addEventListener('click', () => setViewMode('grid'));
  els.showAll.addEventListener('click', () => selectMission('all'));
  // Closing the detail panel returns to the full-banner overview so the
  // other missions are visible again — but keep the current camera so the
  // user doesn't lose the zoom level / position they were inspecting.
  // The "Show full banner" button still re-fits the full banner.
  els.detailClose.addEventListener('click', () => selectMission('all', { keepCamera: true }));

  if (els.openMissionIngress) {
    els.openMissionIngress.addEventListener('click', () => showToast(t().toastOpeningIngress));
  }

  selectMission('all');
  state.buildings = await createBuildingLayer(state.map, () => state.layers.overlays);
}

function buildMissionList() {
  els.list.innerHTML = '';
  const tr = t();
  for (const m of state.data.missions) {
    const li = document.createElement('li');
    li.dataset.order = String(m.order);
    li.innerHTML = `
      <span class="mission-num">${m.order}</span>
      <span class="mission-title">${escapeHtml(missionLabel(m))}</span>
      <span class="mission-count">${tr.portalCountAbbr(m.portals.length)}</span>`;
    li.addEventListener('click', () => selectMission(m.order));
    els.list.appendChild(li);
  }
}

function buildMissionGrid() {
  if (!els.grid) return;
  els.grid.innerHTML = '';
  for (const m of state.data.missions) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'mission-grid-cell';
    cell.dataset.order = String(m.order);
    const label = `#${m.order} · ${missionLabel(m)}`;
    cell.title = label;
    cell.setAttribute('aria-label', label);
    const picUrl = state.missionPictures[String(m.order)];
    const img = picUrl
      ? `<img loading="lazy" src="${escapeAttr(picUrl)}" alt="">`
      : '';
    cell.innerHTML = img + `<span class="grid-label">#${m.order} · ${escapeHtml(missionLabel(m))}</span>`;
    cell.addEventListener('click', () => selectMission(m.order));
    els.grid.appendChild(cell);
  }
}

function setViewMode(mode) {
  if (mode !== 'list' && mode !== 'grid') return;
  state.viewMode = mode;
  try { localStorage.setItem('missionViewMode', mode); } catch { /* ignore */ }
  if (els.list) els.list.hidden = (mode !== 'list');
  if (els.grid) els.grid.hidden = (mode !== 'grid');
  if (els.viewList) els.viewList.classList.toggle('active', mode === 'list');
  if (els.viewGrid) els.viewGrid.classList.toggle('active', mode === 'grid');
}

function missionLabel(m) {
  return m.displayName || m.firstPortal || m.title || `Mission ${m.order}`;
}

function missionFullName(m) {
  // For Apple Maps pin label: "<setName> · <displayName>"
  const set = (state.data?.setName || 'Mission').replace(/\s*[:：]\s*/, ' ');
  return `${set} · ${missionLabel(m)}`;
}

function selectMission(order, opts = {}) {
  // Deselect before removing annotations so MapKit releases the selected pin.
  if (state.map?.selectedAnnotation) state.map.selectedAnnotation = null;
  state.selected = order;
  for (const li of els.list.children) {
    li.classList.toggle('active', li.dataset.order === String(order));
  }
  if (els.grid) {
    for (const cell of els.grid.children) {
      cell.classList.toggle('active', cell.dataset.order === String(order));
    }
  }
  clearLayers();
  if (order === 'all') {
    renderAllMissions({ keepCamera: !!opts.keepCamera });
    els.detail.hidden = true;
    els.detail.classList.remove('collapsed');
    syncDetailHandleA11y(false);
  } else {
    const mission = state.data.missions.find(m => m.order === order);
    if (!mission) return;
    renderMission(mission);
    showDetailPanel(mission);
    // Always open expanded for a freshly-picked mission so the user sees
    // the portal list. They can collapse via the drag-handle to reclaim
    // the map area for panning.
    els.detail.classList.remove('collapsed');
    syncDetailHandleA11y(false);
  }
}

function toggleDetailCollapsed() {
  const collapsed = els.detail.classList.toggle('collapsed');
  syncDetailHandleA11y(collapsed);
}

function syncDetailHandleA11y(collapsed) {
  const handle = els.detailHandle || document.getElementById('detail-handle');
  if (!handle) return;
  handle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  const key = collapsed ? 'expandAria' : 'collapseAria';
  handle.dataset.i18nAriaLabel = key;
  const label = t()[key];
  if (label) handle.setAttribute('aria-label', label);
}

function renderAllMissions({ keepCamera = false } = {}) {
  // One muted polyline per mission, one small banner-position marker at first
  // portal of each. Goal: a single readable overview.
  const overlays = [];
  const annotations = [];
  for (const m of state.data.missions) {
    if (m.portals.length < 2) continue;
    const coords = m.portals.map(p => new mapkit.Coordinate(p.lat, p.lng));
    overlays.push(new mapkit.PolylineOverlay(coords, {
      data: { missionOrder: m.order },
      style: new mapkit.Style({
        strokeColor: 'rgba(0, 194, 255, 0.55)',
        lineWidth: 3,
        lineJoin: 'round',
      }),
    }));
    const first = m.portals[0];
    annotations.push(new mapkit.Annotation(
      new mapkit.Coordinate(first.lat, first.lng),
      () => bannerPin(m.order),
      {
        title: `${t().missionPrefix} ${m.order} · ${missionLabel(m)}`,
        subtitle: t().portalCountFull(m.portals.length),
        data: { missionOrder: m.order },
        clusteringIdentifier: null,
        anchorOffset: new DOMPoint(0, -11),
      },
    ));
  }
  for (const a of annotations) {
    a.addEventListener('select', e => selectMission(e.target.data.missionOrder));
  }

  // Blog-post pins — one per unique blog URL, placed at the centroid of all
  // portals covered by that post. Tapping opens the localised blog URL in
  // a new tab.
  for (const ann of buildBlogAnnotations()) {
    annotations.push(ann);
  }

  state.map.addOverlays(overlays);
  state.map.addAnnotations(annotations);
  state.layers.overlays.push(...overlays);
  state.layers.annotations.push(...annotations);
  if (!keepCamera) fitToBounds(state.data.bounds);
}

function buildBlogAnnotations() {
  const result = [];
  const lang = state.lang === 'zh' ? 'zh' : 'en';
  // Group by URL so a single post covering two missions yields one pin.
  const groups = new Map();
  for (const m of state.data.missions) {
    const blog = state.blogs[String(m.order)];
    if (!blog) continue;
    const url   = blog[`url_${lang}`]   || blog.url_en   || blog.url_zh;
    const title = blog[`title_${lang}`] || blog.title_en || blog.title_zh;
    if (!url) continue;
    if (!groups.has(url)) groups.set(url, { url, title, portals: [], missions: [] });
    const g = groups.get(url);
    g.missions.push(m.order);
    g.portals.push(...m.portals);
  }
  for (const g of groups.values()) {
    const lat = g.portals.reduce((s, p) => s + p.lat, 0) / g.portals.length;
    const lng = g.portals.reduce((s, p) => s + p.lng, 0) / g.portals.length;
    const sortedMissions = g.missions.sort((a, b) => a - b);
    const ann = new mapkit.Annotation(
      new mapkit.Coordinate(lat, lng),
      () => blogPin(sortedMissions),
      {
        title: g.title,
        subtitle: sortedMissions.map(o => `#${o}`).join(' · '),
        data: { url: g.url, kind: 'blog' },
        anchorOffset: new DOMPoint(0, -10),
        displayPriority: mapkit.Annotation.DisplayPriority.High,
        collisionMode: mapkit.Annotation.CollisionMode.Circle,
      },
    );
    ann.addEventListener('select', e => {
      const u = e.target.data?.url;
      // Deselect immediately so MapKit's gesture system isn't left in a
      // "callout open" state while we navigate away.
      if (state.map) state.map.selectedAnnotation = null;
      if (u) window.open(u, '_blank', 'noopener,noreferrer');
    });
    result.push(ann);
  }
  return result;
}

function renderMission(mission) {
  const coords = mission.portals.map(p => new mapkit.Coordinate(p.lat, p.lng));

  const route = new mapkit.PolylineOverlay(coords, {
    style: new mapkit.Style({
      strokeColor: '#00c2ff',
      lineWidth: 5,
      lineJoin: 'round',
      lineCap: 'round',
    }),
  });

  const tr = t();
  const annotations = mission.portals.map((p, i) => {
    const isFirst = i === 0;
    const isLast  = i === mission.portals.length - 1;
    const cls = isFirst ? 'start' : isLast ? 'end' : '';
    const ann = new mapkit.Annotation(
      new mapkit.Coordinate(p.lat, p.lng),
      () => portalPin(p.order, cls),
      {
        title: p.title,
        subtitle: tr.portalOf(p.order, mission.portals.length),
        data: p,
        anchorOffset: new DOMPoint(0, -13),
        displayPriority: mapkit.Annotation.DisplayPriority.Required,
      },
    );
    ann.addEventListener('select', () => {
      state.map.selectedAnnotation = null;
      openAppleMaps({ label: p.title, url: system => appleMapsPortalUrl(p, system) });
    });
    return ann;
  });

  state.map.addOverlay(route);
  state.map.addAnnotations(annotations);
  state.layers.overlays.push(route);
  state.layers.annotations.push(...annotations);

  state.map.showItems([route, ...annotations], {
    animate: true,
    padding: new mapkit.Padding(60, 60, 60, 60),
  });
}

function showDetailPanel(mission) {
  const tr = t();
  els.detailTitle.textContent = `${tr.missionPrefix} ${mission.order} · ${missionLabel(mission)}`;
  // Mission image supplied by the public source map.
  const picUrl = state.missionPictures[String(mission.order)];
  if (picUrl && els.detailPicture) {
    els.detailPicture.src = picUrl;
    els.detailPicture.alt = missionFullName(mission);
    els.detailPicture.hidden = false;
  } else if (els.detailPicture) {
    els.detailPicture.hidden = true;
    els.detailPicture.removeAttribute('src');
  }
  const guideUrl = state.guides[mission.order];
  if (guideUrl) {
    // Pre-curated Apple Maps Guide — coords are already baked into the guide
    // payload, so the chooser doesn't apply. Open directly.
    els.openInMaps.href = guideUrl;
    els.openInMaps.target = '_blank';
    els.openInMaps.onclick = null;
    els.openInMaps.textContent = tr.openGuide;
  } else {
    // Defer URL building to chooser-pick time so we can honour the user's
    // coordinate-system preference. We keep `href` set so right-click /
    // long-press still gives a sensible link (defaulting to WGS-84).
    const wgsHref = appleMapsAreaUrl(mission, 'wgs84');
    els.openInMaps.href = wgsHref;
    els.openInMaps.target = '_blank';
    els.openInMaps.onclick = e => {
      e.preventDefault();
      openAppleMaps({
        label: missionFullName(mission),
        url: system => appleMapsAreaUrl(mission, system),
      });
    };
    els.openInMaps.textContent = tr.viewArea;
  }
  // Per-mission Ingress deeplink — universal link that opens the mission
  // in the Ingress scanner on iOS/Android (or a fallback web page elsewhere).
  const ingressUrl = state.ingressMissions[String(mission.order)];
  if (ingressUrl && els.openMissionIngress) {
    els.openMissionIngress.href = ingressUrl;
    els.openMissionIngress.textContent = tr.openMissionIngress;
    els.openMissionIngress.hidden = false;
  } else if (els.openMissionIngress) {
    els.openMissionIngress.hidden = true;
    els.openMissionIngress.removeAttribute('href');
  }
  // Per-mission blog link
  const blog = state.blogs[String(mission.order)];
  if (blog) {
    const url = (state.lang === 'zh' ? blog.url_zh : blog.url_en) || blog.url_en || blog.url_zh;
    els.openBlog.href = url;
    els.openBlog.textContent = tr.readBlog;
    els.openBlog.hidden = false;
  } else {
    els.openBlog.hidden = true;
    els.openBlog.removeAttribute('href');
  }
  document.getElementById('detail-description').textContent = mission.description || '';
  els.detailList.innerHTML = '';
  for (const p of mission.portals) {
    const li = document.createElement('li');
    const img = p.imageUrl
      ? `<img loading="lazy" src="${escapeAttr(p.imageUrl)}" alt="">`
      : `<span></span>`;
    const mapsHref    = appleMapsPortalUrl(p);
    const ingressHref = ingressPortalUrl(p);
    const titleEsc = escapeHtml(p.title);
    li.innerHTML = `
      <span class="ix">${p.order}</span>
      ${img}
      <span class="portal-name">${titleEsc}</span>
      <a class="portal-nav portal-nav--ingress" href="${ingressHref}" target="_blank" rel="noopener noreferrer"
         aria-label="${escapeAttr(tr.openInIngressAria(p.title))}" title="${escapeAttr(tr.openInIngressTitle)}">⬢</a>
      <a class="portal-nav portal-nav--maps" href="${mapsHref}" target="_blank" rel="noopener noreferrer"
         aria-label="${escapeAttr(tr.walkingAria(p.title))}" title="${escapeAttr(tr.walkingTitle)}">↗</a>`;
    const ingressLink = li.querySelector('.portal-nav--ingress');
    if (!p.guid) ingressLink.remove();
    else ingressLink.addEventListener('click', () => showToast(t().toastOpeningIngress));
    li.querySelector('.portal-nav--maps').addEventListener('click', e => {
      e.preventDefault();
      openAppleMaps({
        label: p.title || 'Portal',
        url: system => appleMapsPortalUrl(p, system),
      });
    });
    els.detailList.appendChild(li);
  }
  els.detail.hidden = false;
}

// Apple Maps URL scheme (per Apple's URL Scheme Reference) only supports a
// single destination, so we build two narrower links:
//   appleMapsAreaUrl    — center+zoom on the mission's bounding box, no routing
//   appleMapsPortalUrl  — walking directions from current location to one portal
//
// Both accept an optional `system` (`'wgs84'` | `'gcj02'`). Portal coords are
// stored in WGS-84 (that's what Ingress exports); mainland-China Apple Maps
// renders against GCJ-02, so passing WGS-84 there shifts the pin by ~50–500m.
// The chooser lets the user pick which they want at click time.

function appleMapsAreaUrl(mission, system = 'wgs84') {
  let minLat=Infinity, maxLat=-Infinity, minLng=Infinity, maxLng=-Infinity;
  for (const p of mission.portals) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  let lat = (minLat + maxLat) / 2;
  let lng = (minLng + maxLng) / 2;
  if (system === 'gcj02') ({ lat, lng } = wgs84ToGcj02(lat, lng));
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  const z = zoomForSpan(span);
  const label = encodeURIComponent(missionFullName(mission));
  return `https://maps.apple.com/?ll=${lat},${lng}&q=${label}&z=${z}`;
}

function appleMapsPortalUrl(portal, system = 'wgs84') {
  let { lat, lng } = portal;
  if (system === 'gcj02') ({ lat, lng } = wgs84ToGcj02(lat, lng));
  const label = encodeURIComponent(portal.title || 'Portal');
  return `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}&dirflg=w`;
}

// ---------------------------------------------------------------------------
// WGS-84 → GCJ-02 conversion (the "Mars coordinates" obfuscation that
// mainland-China mapping providers — Amap, Apple Maps in China, Tencent — use
// instead of raw WGS-84). Standard reference implementation, public domain.
// Outside the rough China bounding box it's a no-op.
// ---------------------------------------------------------------------------
function wgs84ToGcj02(lat, lng) {
  if (isOutOfChina(lat, lng)) return { lat, lng };
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = _trLat(lng - 105.0, lat - 35.0);
  let dLng = _trLng(lng - 105.0, lat - 35.0);
  const radLat = lat * Math.PI / 180.0;
  const magic = Math.sin(radLat);
  const magicSq = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magicSq);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magicSq * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return { lat: lat + dLat, lng: lng + dLng };
}
function isOutOfChina(lat, lng) {
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
}
function _trLat(x, y) {
  let r = -100.0 + 2.0*x + 3.0*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
  r += (20.0*Math.sin(6.0*x*Math.PI) + 20.0*Math.sin(2.0*x*Math.PI)) * 2/3;
  r += (20.0*Math.sin(y*Math.PI) + 40.0*Math.sin(y/3*Math.PI)) * 2/3;
  r += (160.0*Math.sin(y/12*Math.PI) + 320.0*Math.sin(y*Math.PI/30)) * 2/3;
  return r;
}
function _trLng(x, y) {
  let r = 300.0 + x + 2.0*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
  r += (20.0*Math.sin(6.0*x*Math.PI) + 20.0*Math.sin(2.0*x*Math.PI)) * 2/3;
  r += (20.0*Math.sin(x*Math.PI) + 40.0*Math.sin(x/3*Math.PI)) * 2/3;
  r += (150.0*Math.sin(x/12*Math.PI) + 300.0*Math.sin(x/30*Math.PI)) * 2/3;
  return r;
}

// Ingress universal-link format. Opens the in-game scanner to the portal on
// iOS/Android with Ingress installed; falls back to a web page otherwise.
function ingressPortalUrl(portal) {
  return `https://link.ingress.com/portal/${portal.guid}`;
}

// ---------------------------------------------------------------------------
// Coordinate-system chooser. Pops a small modal asking the user whether to
// use WGS-84 or GCJ-02 before opening Apple Maps. The decision can be
// remembered for the session (sessionStorage) to avoid pestering the user
// on every portal tap.
// ---------------------------------------------------------------------------
function getRememberedCoordSystem() {
  try { return sessionStorage.getItem('coordSystem'); } catch { return null; }
}
function rememberCoordSystem(system) {
  try { sessionStorage.setItem('coordSystem', system); } catch { /* ignore */ }
}

function openAppleMaps({ label, url }) {
  // url is a function (system: 'wgs84' | 'gcj02') => string, so the URL is
  // built lazily after the chooser knows which system to use.
  const remembered = getRememberedCoordSystem();
  if (remembered === 'wgs84' || remembered === 'gcj02') {
    window.open(url(remembered), '_blank', 'noopener,noreferrer');
    return;
  }
  pendingMapsRequest = { url, label };
  if (els.coordTarget) els.coordTarget.textContent = label;
  if (els.coordRemember) els.coordRemember.checked = false;
  els.coordChooser.hidden = false;
  document.body.classList.add('modal-open');
}

function closeCoordChooser() {
  if (!els.coordChooser) return;
  els.coordChooser.hidden = true;
  document.body.classList.remove('modal-open');
  pendingMapsRequest = null;
}

function pickCoordSystem(system) {
  const req = pendingMapsRequest;
  if (!req) { closeCoordChooser(); return; }
  if (els.coordRemember && els.coordRemember.checked) rememberCoordSystem(system);
  const url = req.url(system);
  closeCoordChooser();
  window.open(url, '_blank', 'noopener,noreferrer');
}

function sanitizeBlogs(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (!v || typeof v !== 'object') continue;
    const safe = {};
    for (const f of ['title_zh','title_en','url_zh','url_en']) {
      if (typeof v[f] === 'string') safe[f] = v[f];
    }
    if (typeof v.date === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(v.date)) {
      safe.date = v.date;
    }
    if (safe.url_zh && !/^https?:\/\//i.test(safe.url_zh)) delete safe.url_zh;
    if (safe.url_en && !/^https?:\/\//i.test(safe.url_en)) delete safe.url_en;
    if (safe.url_zh || safe.url_en) out[k] = safe;
  }
  return out;
}

function sanitizeGuides(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'string') continue;
    if (!/^https:\/\/maps\.apple\/(ug|p)\//.test(v)) continue;
    out[k] = v;
  }
  return out;
}

function sanitizeIngressMissions(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'string') continue;
    if (!/^https:\/\/link\.ingress\.com\/mission\//.test(v)) continue;
    out[k] = v;
  }
  return out;
}

function sanitizeMissionPictures(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'string') continue;
    if (!/^https:\/\/lh3\.googleusercontent\.com\//.test(v)) continue;
    out[k] = v;
  }
  return out;
}

function zoomForSpan(spanDegrees) {
  if (spanDegrees > 0.05) return 13;
  if (spanDegrees > 0.02) return 14;
  if (spanDegrees > 0.01) return 15;
  if (spanDegrees > 0.005) return 16;
  return 17;
}

function fitToBounds(b) {
  const sw = new mapkit.Coordinate(b.minLat, b.minLng);
  const ne = new mapkit.Coordinate(b.maxLat, b.maxLng);
  const center = new mapkit.Coordinate((b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2);
  const span = new mapkit.CoordinateSpan(
    Math.max(0.01, (b.maxLat - b.minLat) * 1.25),
    Math.max(0.01, (b.maxLng - b.minLng) * 1.25),
  );
  state.map.region = new mapkit.CoordinateRegion(center, span);
  void sw; void ne; // BoundingRegion alternative kept for reference
}

function clearLayers() {
  if (state.layers.overlays.length) state.map.removeOverlays(state.layers.overlays);
  if (state.layers.annotations.length) state.map.removeAnnotations(state.layers.annotations);
  state.layers = { overlays: [], annotations: [] };
}

function portalPin(order, cls) {
  const el = document.createElement('div');
  el.className = `portal-pin${cls ? ' ' + cls : ''}`;
  el.textContent = String(order);
  return el;
}

function bannerPin(order) {
  const el = document.createElement('div');
  el.className = 'banner-pin';
  el.textContent = String(order);
  return el;
}

function blogPin(missionOrders) {
  const el = document.createElement('div');
  el.className = 'blog-pin';
  const orders = missionOrders.map(o => `#${o}`).join('·');
  el.innerHTML = `<span class="blog-pin-icon" aria-hidden="true">📖</span><span class="blog-pin-orders">${orders}</span>`;
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
const escapeAttr = escapeHtml;

function showFatal(msg) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;left:50%;top:24px;transform:translateX(-50%);background:#3a1010;border:1px solid #642;padding:12px 16px;border-radius:8px;font:13px/1.4 system-ui;color:#fda;z-index:9999;max-width:520px';
  el.textContent = msg;
  document.body.appendChild(el);
}

let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('show');
  // Force a reflow so the animation restarts even on rapid re-taps.
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}
