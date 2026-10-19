import { buildingsInRegion, featurePolygons, raisedBuildingSurfaces } from './building-geometry.js';

export async function createBuildingLayer(map, routeOverlays) {
  const toggle=document.getElementById('show-buildings');
  const hint=document.getElementById('building-layer-hint');
  const dialog=document.getElementById('building-dialog');
  const viewport=document.getElementById('building-preview');
  let overlays=[],features=[],disposePreview,requestId=0;
  const labels={
    en:{name:'Building',unknown:'Height not mapped · illustrative 12 m preview',drag:'Drag to rotate · scroll to zoom',approx:'Estimated height',height:'Mapped height',zoom:'Zoom in for buildings',empty:'No OSM building outlines in this area',unavailable:'Building layer unavailable',preview:'3D preview unavailable on this device.',model:'Simplified shape from OSM footprint and height; architectural roof details are not modeled.'},
    zh:{name:'建筑',unknown:'未标注高度 · 预览采用示意高度 12 米',drag:'拖动旋转 · 滚动缩放',approx:'估算高度',height:'地图标注高度',zoom:'放大查看建筑',empty:'此区域暂无 OSM 建筑轮廓',unavailable:'建筑图层暂不可用',preview:'当前设备无法显示 3D 预览。',model:'依据 OSM 轮廓与高度生成的简化模型，不含建筑屋顶细节。'},
    ja:{name:'建物',unknown:'高さ未登録 · 仮の高さ12 mで表示',drag:'ドラッグで回転 · スクロールでズーム',approx:'推定高さ',height:'登録された高さ',zoom:'拡大すると建物を表示',empty:'この範囲の建物データは未登録です',unavailable:'建物レイヤーを読み込めません',preview:'この端末では3Dプレビューを表示できません。',model:'OSMの輪郭と高さによる簡易モデルです。屋根の細部は含みません。'},
  };
  const text=()=>labels[document.documentElement.lang.startsWith('zh')?'zh':document.documentElement.lang.startsWith('ja')?'ja':'en'];
  function clear(){if(overlays.length)map.removeOverlays(overlays);overlays=[];}
  function refresh(){
    clear();if(!toggle.checked){hint.textContent='';return;}
    const region=map.region;
    const wide=!region?.span||region.span.latitudeDelta>.035||region.span.longitudeDelta>.05;
    const visible=buildingsInRegion(features,region,180);
    hint.textContent=visible.length?'':wide?text().zoom:text().empty;
    // Paint distant buildings before nearer ones; annotations and route lines
    // remain above all roof/wall overlays inside MapKit's own overlay stack.
    const project=([lng,lat])=>map.convertCoordinateToPointOnPage(new mapkit.Coordinate(lat,lng));
    const unproject=point=>map.convertPointOnPageToCoordinate(new DOMPoint(point.x,point.y));
    visible.sort((a,b)=>{
      const center=f=>project([(f.properties.bounds[0]+f.properties.bounds[2])/2,(f.properties.bounds[1]+f.properties.bounds[3])/2]).y;
      return center(a)-center(b);
    });
    for(const feature of visible){
      for(const polygon of featurePolygons(feature)){
        overlays.push(new mapkit.PolygonOverlay(polygon.map(ring=>ring.map(([lng,lat])=>new mapkit.Coordinate(lat,lng))),{
          enabled:true,data:{kind:'osm-building',feature},style:new mapkit.Style({
            fillColor:'#495765',fillOpacity:.9,strokeColor:'#8795a4',strokeOpacity:.7,lineWidth:.8,fillRule:'evenodd',
          }),
        }));
      }
      if(map.convertCoordinateToPointOnPage&&map.convertPointOnPageToCoordinate){
        for(const surface of raisedBuildingSurfaces(feature,project,unproject)){
          overlays.push(new mapkit.PolygonOverlay(surface.rings,{
            enabled:true,data:{kind:'osm-building',feature,surface:surface.kind},style:new mapkit.Style({
              fillColor:surface.fillColor,fillOpacity:.98,strokeColor:surface.strokeColor,
              strokeOpacity:surface.kind==='roof'?.8:.35,lineWidth:surface.kind==='roof'?.7:.35,fillRule:'evenodd',
            }),
          }));
        }
      }
    }
    map.addOverlays(overlays);
    // Keep mission lines above the building fills after every viewport update.
    const routes=routeOverlays();if(routes.length){map.removeOverlays(routes);map.addOverlays(routes);}
  }
  async function show(feature){
    const id=++requestId,t=text(),p=feature.properties;
    disposePreview?.();disposePreview=null;viewport.replaceChildren();
    document.getElementById('building-title').textContent=p.name||t.name;
    document.getElementById('building-height').textContent=p.heightMeters===null?t.unknown:`${p.heightSource==='height'?t.height:t.approx} · ${p.heightMeters.toLocaleString()} m`;
    document.getElementById('building-model-note').textContent=t.model;
    document.getElementById('building-gesture-hint').textContent=t.drag;
    const source=document.getElementById('building-source');source.href=`https://www.openstreetmap.org/${p.osmId}`;
    if(!dialog.open)dialog.showModal();
    try{
      const {createBuildingPreview}=await import('./building-viewer.js');
      if(id!==requestId||!dialog.open)return;
      disposePreview=createBuildingPreview(viewport,feature);
    }catch{if(id===requestId&&dialog.open)viewport.textContent=t.preview;}
  }
  const select=event=>{const overlay=event.overlay;if(overlay?.data?.kind==='osm-building'){overlay.selected=false;show(overlay.data.feature);}};
  const close=()=>{requestId++;disposePreview?.();disposePreview=null;viewport.replaceChildren();};
  document.getElementById('building-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  toggle.addEventListener('change',()=>{try{localStorage.setItem('showOsmBuildings',String(toggle.checked));}catch{}refresh();});
  try{toggle.checked=localStorage.getItem('showOsmBuildings')!=='false';}catch{}
  map.addEventListener('region-change-start',clear);
  map.addEventListener('region-change-end',refresh);map.addEventListener('select',select);
  try{
    const response=await fetch('/buildings.geojson');if(!response.ok)throw new Error('Buildings unavailable');
    const data=await response.json();features=(data.features||[]).filter(f=>featurePolygons(f).length);refresh();
  }catch{toggle.checked=false;toggle.disabled=true;hint.textContent=text().unavailable;}
  return {refresh,get overlays(){return overlays;},get features(){return features;}};
}
