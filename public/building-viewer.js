import * as THREE from './vendor/three/three.module.min.js?v=8a1993eecf94';
import { localFootprint } from './building-geometry.js?v=8a1993eecf94';

export function createBuildingPreview(container, feature) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x19242f, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.replaceChildren(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D building preview. Drag to rotate; use plus and minus to zoom.');
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  const mappedHeight = feature.properties.heightMeters;
  const top = Number.isFinite(mappedHeight) && mappedHeight > 0 ? mappedHeight : 12;
  const base = Math.min(feature.properties.minHeightMeters || 0, top-0.1);
  const material = new THREE.MeshStandardMaterial({ color: 0xa6b0bc, roughness: 0.9, metalness: 0 });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xd8e1ea, transparent: true, opacity: 0.25 });
  for (const polygon of localFootprint(feature)) {
    const path = ring => ring.map(([x,y]) => new THREE.Vector2(x,y));
    const shape = new THREE.Shape(path(polygon[0]));
    for (const hole of polygon.slice(1)) shape.holes.push(new THREE.Path(path(hole)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: top-base, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI/2); geometry.translate(0, base, 0);
    const mesh = new THREE.Mesh(geometry, material); group.add(mesh);
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), edgeMaterial));
  }
  scene.add(group);
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z, 20);
  const target = box.getCenter(new THREE.Vector3());
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(extent*3,extent*3),new THREE.MeshStandardMaterial({color:0x263440,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-0.1;scene.add(ground);
  scene.add(new THREE.HemisphereLight(0xf1f7ff,0x354555,2.2));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(extent,extent*2,extent);scene.add(light);
  const camera=new THREE.PerspectiveCamera(35,1,0.1,extent*30);
  let yaw=-0.65,pitch=0.65,distance=extent*2.8,disposed=false;
  function render() {
    if(disposed)return;
    const width=container.clientWidth||360,height=container.clientHeight||280;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    camera.position.set(target.x+distance*Math.cos(pitch)*Math.sin(yaw),target.y+distance*Math.sin(pitch),target.z+distance*Math.cos(pitch)*Math.cos(yaw));
    camera.lookAt(target);renderer.render(scene,camera);
  }
  const pointers=new Map();let pinch=0;
  const down=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);pinch=0;};
  const move=e=>{
    const old=pointers.get(e.pointerId);if(!old)return;
    pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pointers.size===1){yaw-=(e.clientX-old[0])*.008;pitch=Math.max(.12,Math.min(1.45,pitch+(e.clientY-old[1])*.006));}
    else if(pointers.size===2){const [a,b]=[...pointers.values()];const next=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch&&next)distance=Math.max(extent*.7,Math.min(extent*8,distance*pinch/next));pinch=next;}
    render();
  };
  const up=e=>{pointers.delete(e.pointerId);pinch=0;};
  const wheel=e=>{e.preventDefault();distance=Math.max(extent*.7,Math.min(extent*8,distance*Math.exp(e.deltaY*.001)));render();};
  const key=e=>{
    if(e.key==='ArrowLeft')yaw-=.12;else if(e.key==='ArrowRight')yaw+=.12;
    else if(e.key==='ArrowUp')pitch=Math.min(1.45,pitch+.1);else if(e.key==='ArrowDown')pitch=Math.max(.12,pitch-.1);
    else if(e.key==='+'||e.key==='=')distance=Math.max(extent*.7,distance*.9);else if(e.key==='-')distance=Math.min(extent*8,distance*1.1);else return;
    e.preventDefault();render();
  };
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
  const observer=new ResizeObserver(render);observer.observe(container);render();
  return ()=>{
    disposed=true;observer.disconnect();
    scene.traverse(object=>{object.geometry?.dispose();});material.dispose();edgeMaterial.dispose();ground.material.dispose();
    renderer.dispose();canvas.remove();
  };
}
