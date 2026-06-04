import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const fbxLoader = new FBXLoader();
const texLoader = new THREE.TextureLoader();

// ─── 지형 높이 함수 ────────────────────────────────────────────────────
function _h(wx, wz) {
  const d = THREE.MathUtils.clamp(Math.hypot(wx, wz) / 22, 0, 1);
  return (
    Math.sin(wx * 0.04)       * Math.cos(wz * 0.05)       * 5.0 +
    Math.sin(wx * 0.09 + 1.2) * Math.cos(wz * 0.07 + 0.8) * 2.5 +
    Math.sin(wx * 0.18 + 3.0) * Math.sin(wz * 0.16 + 1.4) * 1.2 +
    Math.sin(wx * 0.31 + 0.5) * Math.cos(wz * 0.28 + 2.1) * 0.6
  ) * d;
}
export const getTerrainHeight = _h;

// ─── 텍스처 로더 ──────────────────────────────────────────────────────
function tex(path) {
  const t = texLoader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 자주 쓰는 텍스처를 미리 로드 (공유 인스턴스)
const T = {
  treeBark:    () => tex('assets/trees/Textures/Tree_Bark.jpg'),
  treeLeaves:  () => tex('assets/trees/Textures/Tree_Leaves.png'),
  birchBark:   () => tex('assets/trees/Textures/Birch_Bark.png'),
  birchGreen:  () => tex('assets/trees/Textures/Birch_Leaves_Green.png'),
  birchYellow: () => tex('assets/trees/Textures/Birch_Leaves_Yellow.png'),
  pineLeaves:  () => tex('assets/trees/Textures/Pine_Leaves.png'),
  leavesOrange:  () => tex('assets/trees/Textures/Color Variations/Leaves_Orange.png'),
  leavesRed:     () => tex('assets/trees/Textures/Color Variations/Leaves_Red.png'),
  leavesDarkRed: () => tex('assets/trees/Textures/Color Variations/Leaves_DarkRed.png'),
  leavesLight:   () => tex('assets/trees/Textures/Color Variations/Leaves_Light.png'),
  pineLight:     () => tex('assets/trees/Textures/Color Variations/Pine_Leaves_Light.png'),
};

// ─── FBX 캐시 로더 ────────────────────────────────────────────────────
const _cache = {};
function loadFBX(path, targetH) {
  const k = path + '@' + targetH;
  if (_cache[k]) return _cache[k];
  _cache[k] = new Promise((res, rej) => {
    fbxLoader.load(path, (o) => {
      if (targetH) {
        const b = new THREE.Box3().setFromObject(o);
        const s = new THREE.Vector3(); b.getSize(s);
        o.scale.setScalar(targetH / (s.y || 1));
      }
      const b2 = new THREE.Box3().setFromObject(o);
      o.position.y -= b2.min.y;
      o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      res(o);
    }, undefined, rej);
  });
  return _cache[k];
}

// 머티리얼 이름으로 텍스처 지정
function applyTex(obj, rules) {
  // rules: [ { match: ['leaf','leaves'], map: textureObj }, ... ]
  obj.traverse(c => {
    if (!c.isMesh) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    mats.forEach(mat => {
      const nm = (mat.name || '').toLowerCase();
      for (const rule of rules) {
        if (rule.match.some(w => nm.includes(w))) {
          mat.map = rule.map; mat.needsUpdate = true; break;
        }
      }
      // 매치 없어도 첫 번째 rule의 map을 폴백으로
      if (!mat.map && rules[0]) { mat.map = rules[0].map; mat.needsUpdate = true; }
    });
  });
}

// ─── 배치 함수들 ──────────────────────────────────────────────────────
function scatter(scene, proto, count, { area = 90, inner = 16, scaleVar = 0.3, record = null, leafRadius = 4 } = {}) {
  for (let i = 0; i < count; i++) {
    const o = proto.clone();
    const angle = Math.random() * Math.PI * 2;
    const r = inner + Math.random() * (area - inner);
    const wx = Math.cos(angle) * r, wz = Math.sin(angle) * r;
    o.position.set(wx, _h(wx, wz), wz);
    o.rotation.y = Math.random() * Math.PI * 2;
    const sf = 1 + (Math.random() - 0.5) * 2 * scaleVar;
    o.scale.multiplyScalar(sf);
    // record: 낙엽 마스크용 나무 위치/반경 수집
    if (record) record.push({ x: wx, z: wz, r: leafRadius * sf });
    scene.add(o);
  }
}

function scatterMixed(scene, protos, count, opts = {}) {
  for (let i = 0; i < count; i++) {
    scatter(scene, protos[Math.floor(Math.random() * protos.length)], 1, opts);
  }
}

function scatterInstanced(scene, proto, count, area = 95) {
  let src = null;
  proto.traverse(c => { if (c.isMesh && !src) src = c; });
  if (!src) return;
  const inst = new THREE.InstancedMesh(src.geometry.clone(), src.material, count);
  inst.castShadow = false; inst.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const ws = proto.scale.x;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * area;
    const gx = Math.cos(angle) * r, gz = Math.sin(angle) * r;
    p.set(gx, _h(gx, gz), gz);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    s.setScalar(ws * (0.7 + Math.random() * 0.6));
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
}

// ─── 잔디 텍스처 (절차적 생성) ─────────────────────────────────────────
// ─── 바닥 텍스처 3종 (canvas procedural) ────────────────────────────────
// JS 값 노이즈: 캔버스 생성 시 1회만 실행

function makeCanvasTex(size, drawFn) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  drawFn(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 잔디: 진초록 + 짧은 풀잎 스트로크
function makeTexGrass() {
  return makeCanvasTex(512, (ctx, S) => {
    ctx.fillStyle = '#537d3e'; ctx.fillRect(0,0,S,S);
    for (let i=0; i<8000; i++) {
      const g = 90 + Math.random()*80;
      ctx.fillStyle = `rgb(${30+Math.random()*35},${g},${25+Math.random()*30})`;
      ctx.fillRect(Math.random()*S, Math.random()*S, 1+Math.random(), 2+Math.random()*3);
    }
  });
}

// 흙: 갈색 흙 + 작은 돌 느낌
function makeTexDirt() {
  return makeCanvasTex(512, (ctx, S) => {
    ctx.fillStyle = '#7a5432'; ctx.fillRect(0,0,S,S);
    for (let i=0; i<9000; i++) {
      const v = Math.random();
      const r = 95+v*55, g = 62+v*38, b = 32+v*22;
      ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
      const sz = 1+Math.random()*3;
      ctx.fillRect(Math.random()*S, Math.random()*S, sz, sz);
    }
    // 작은 돌
    for (let i=0; i<80; i++) {
      const x=Math.random()*S, y=Math.random()*S, r=2+Math.random()*5;
      ctx.fillStyle = `rgba(100,80,60,0.6)`;
      ctx.beginPath(); ctx.ellipse(x,y,r,r*0.7,Math.random()*Math.PI,0,Math.PI*2); ctx.fill();
    }
  });
}

// 낙엽: 주황/노랑/갈색 잎 패치
function makeTexLeaves() {
  return makeCanvasTex(512, (ctx, S) => {
    ctx.fillStyle = '#8a6030'; ctx.fillRect(0,0,S,S);
    const colors = ['#c8601a','#d4831e','#b85010','#a04010','#c8a020','#a07828','#804020'];
    for (let i=0; i<5000; i++) {
      const col = colors[Math.floor(Math.random()*colors.length)];
      ctx.fillStyle = col;
      const x=Math.random()*S, y=Math.random()*S, w=3+Math.random()*7, h=2+Math.random()*5;
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.random()*Math.PI*2);
      ctx.fillRect(-w/2,-h/2,w,h);
      ctx.restore();
    }
  });
}

// 월드 좌표 ↔ 마스크 UV 매핑에 쓰는 지형 크기(중심 0, ±HALF)
const GROUND_SIZE = 400;
const GROUND_HALF = GROUND_SIZE / 2;

// 나무 위치 목록으로 낙엽 마스크 텍스처 생성.
// 각 나무 자리에 부드러운 흰 원을 찍어, 셰이더가 그 영역에서만 낙엽을 깔도록 함.
function buildLeafMask(trees, size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const px = size / GROUND_SIZE;          // 월드 1단위 = px 픽셀
  ctx.globalCompositeOperation = 'lighter'; // 겹치는 나무는 누적
  for (const t of trees) {
    const cx = ((t.x + GROUND_HALF) / GROUND_SIZE) * size;
    const cy = ((t.z + GROUND_HALF) / GROUND_SIZE) * size; // flipY=false 로 z→v 직접 매핑
    const rad = t.r * px;
    const g = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;                 // (u,v) → 캔버스 (u,v) 직접 매핑
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ─── 지형 메쉬 + 멀티 텍스처 블렌딩 (onBeforeCompile GLSL 주입) ───────────
export function createGround(scene) {
  const SEG = 128;
  const geo = new THREE.PlaneGeometry(400, 400, SEG, SEG);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, _h(pos.getX(i), -pos.getY(i)));
  pos.needsUpdate = true; geo.computeVertexNormals();

  const tGrass  = makeTexGrass();
  const tDirt   = makeTexDirt();
  const tLeaves = makeTexLeaves();
  [tGrass, tDirt, tLeaves].forEach(t => { t.repeat.set(18, 18); });

  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  mat.defines = {}; // prevent caching collision

  // 낙엽 마스크 유니폼(나무 배치 후 buildWorld가 .value를 채움). 초기엔 검은(=낙엽 없음) 1x1.
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  blank.needsUpdate = true;
  const leafMask = { value: blank };

  // GLSL 주입: 월드 좌표 기반 노이즈로 3가지 텍스처 블렌딩
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.tGrass  = { value: tGrass  };
    shader.uniforms.tDirt   = { value: tDirt   };
    shader.uniforms.tLeaves = { value: tLeaves };
    shader.uniforms.tLeafMask = leafMask;

    // vertex: 월드 위치 varying 추가
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP=worldPosition.xyz;');

    // fragment: 유니폼 선언 + 노이즈 함수 + 텍스처 블렌딩
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tGrass;
uniform sampler2D tDirt;
uniform sampler2D tLeaves;
uniform sampler2D tLeafMask;
varying vec3 vWP;
// value noise (hash + bilinear)
float gh(float x,float y){return fract(sin(x*127.1+y*311.7)*43758.5);}
float gn(float x,float y){
  float ix=floor(x),iy=floor(y),fx=fract(x),fy=fract(y);
  fx=fx*fx*(3.-2.*fx); fy=fy*fy*(3.-2.*fy);
  return gh(ix,iy)*(1.-fx)*(1.-fy)+gh(ix+1.,iy)*fx*(1.-fy)+gh(ix,iy+1.)*(1.-fx)*fy+gh(ix+1.,iy+1.)*fx*fy;
}
float gfbm(float x,float y){return gn(x,y)*.50+gn(x*2.,y*2.)*.25+gn(x*4.,y*4.)*.125+gn(x*8.,y*8.)*.0625;}`)
      // diffuseColor 계산 직전에 텍스처 블렌딩
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
// 월드 좌표 기반 노이즈 블렌딩 (타일링 없음)
vec2 wp = vWP.xz;
float nd = gfbm(wp.x*0.035, wp.y*0.035);          // 흙 노이즈
float nl = gfbm(wp.x*0.042+3.7, wp.y*0.042+5.1);  // 낙엽 노이즈
float nd2= gfbm(wp.x*0.09+1.3,  wp.y*0.09+2.6);   // 세부 흙

vec4 cG = texture2D(tGrass,  wp*0.065);
vec4 cD = texture2D(tDirt,   wp*0.060);
vec4 cL = texture2D(tLeaves, wp*0.055);

// 잔디가 기본, 흙은 노이즈 패치. 낙엽은 '나무 아래' 마스크 영역에만.
float wDirt   = smoothstep(0.62, 0.80, nd) * (0.5+nd2*0.5);   // 흙: 상위 20%만
float leafMaskV = texture2D(tLeafMask, (wp + ${GROUND_HALF.toFixed(1)}) / ${GROUND_SIZE.toFixed(1)}).r;
// 마스크 영역 안에서만, 노이즈로 자연스러운 농담을 줘 낙엽 분포
float wLeaves = leafMaskV * (0.55 + 0.45 * nl) * (1.0 - wDirt*0.8);
vec3 blended = mix(mix(cG.rgb, cD.rgb, clamp(wDirt,0.,1.)), cL.rgb, clamp(wLeaves,0.,0.85));
vec4 diffuseColor = vec4(blended, opacity);`);
  };

  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  scene.add(m);
  return { mesh: m, leafMask };
}

// ─── 메인 buildWorld ────────────────────────────────────────────────────
export async function buildWorld(scene, { area = 95 } = {}) {
  const { leafMask } = createGround(scene);
  const treePos = [];   // 낙엽 마스크용 나무 위치 수집

  // 지형지물 크기 배수 (지형감 강조 — 값만 바꿔 일괄 조정)
  const TREE_S = 1.45;
  const ROCK_S = 2.1;

  // 텍스처 미리 생성
  const tb = T.treeBark(), tl = T.treeLeaves();
  const bb = T.birchBark(), bg = T.birchGreen(), by = T.birchYellow();
  const pl = T.pineLeaves();
  const lo = T.leavesOrange(), lr = T.leavesRed();

  const TREE_RULES  = [{ match:['leaf','leaves','foliage'], map:tl }, { match:['bark','wood','trunk','branch'], map:tb }];
  const TREE_RULES2 = [{ match:['leaf','leaves','foliage'], map:lo }, { match:['bark','wood','trunk','branch'], map:tb }]; // 주황 단풍
  const TREE_RULES3 = [{ match:['leaf','leaves','foliage'], map:lr }, { match:['bark','wood','trunk','branch'], map:tb }]; // 붉은 단풍
  const BIRCH_G     = [{ match:['leaf','leaves','foliage'], map:bg }, { match:['bark','wood','birch'],         map:bb }];
  const BIRCH_Y     = [{ match:['leaf','leaves','foliage'], map:by }, { match:['bark','wood','birch'],         map:bb }];
  const PINE_RULES  = [{ match:['leaf','leaves','pine','needle'], map:pl }, { match:['bark','wood','trunk'], map:tb }];

  // ── 나무 로딩 (병렬) ──────────────────────────────────────────────────
  const [
    // trees/ 팩 (텍스처 적용)
    tree1, tree2, tree3, tree4,
    birch1, birch2, birch3,
    deadTree1, deadTree2,
    pine1, pine2,
    // nature/ 팩 (단색)
    pineN1, pineN2, pineNAutumn,
    commonTree, commonAutumn, commonDead,
    willowGreen, willowAutumn, willowDead,
    birchN, birchNAutumn,
    // 바닥 오브젝트
    rock1, rock2, rock3, rockMoss1, rockMoss2,
    bush, bushBerries,
    stump, stumpMoss, woodLog, woodLogMoss,
    flower, plant1, plant2,
    grass, grassShort,
  ] = await Promise.all([
    // trees/ 팩
    loadFBX('assets/trees/FBX/Tree_1.fbx', 7 * TREE_S),
    loadFBX('assets/trees/FBX/Tree_3.fbx', 8 * TREE_S),
    loadFBX('assets/trees/FBX/Tree_6.fbx', 6.5 * TREE_S),
    loadFBX('assets/trees/FBX/Tree_9.fbx', 7.5 * TREE_S),
    loadFBX('assets/trees/FBX/Birch_2.fbx', 7 * TREE_S),
    loadFBX('assets/trees/FBX/Birch_5.fbx', 8 * TREE_S),
    loadFBX('assets/trees/FBX/Birch_8.fbx', 6.5 * TREE_S),
    loadFBX('assets/trees/FBX/DeadTree_2.fbx', 7 * TREE_S),
    loadFBX('assets/trees/FBX/DeadTree_5.fbx', 6 * TREE_S),
    loadFBX('assets/trees/FBX/Pine_2.fbx', 8 * TREE_S),
    loadFBX('assets/trees/FBX/Pine_4.fbx', 9 * TREE_S),
    // nature/ 팩
    loadFBX('assets/nature/FBX/PineTree_2.fbx', 8 * TREE_S),
    loadFBX('assets/nature/FBX/PineTree_4.fbx', 9 * TREE_S),
    loadFBX('assets/nature/FBX/PineTree_Autumn_3.fbx', 8 * TREE_S),
    loadFBX('assets/nature/FBX/CommonTree_2.fbx', 7 * TREE_S),
    loadFBX('assets/nature/FBX/CommonTree_Autumn_4.fbx', 7 * TREE_S),
    loadFBX('assets/nature/FBX/CommonTree_Dead_1.fbx', 6 * TREE_S),
    loadFBX('assets/nature/FBX/Willow_3.fbx', 8 * TREE_S),
    loadFBX('assets/nature/FBX/Willow_Autumn_2.fbx', 8 * TREE_S),
    loadFBX('assets/nature/FBX/Willow_Dead_1.fbx', 7 * TREE_S),
    loadFBX('assets/nature/FBX/BirchTree_3.fbx', 7 * TREE_S),
    loadFBX('assets/nature/FBX/BirchTree_Autumn_2.fbx', 7 * TREE_S),
    // 바닥 오브젝트
    loadFBX('assets/nature/FBX/Rock_2.fbx', 1.4 * ROCK_S),
    loadFBX('assets/nature/FBX/Rock_5.fbx', 1.0 * ROCK_S),
    loadFBX('assets/nature/FBX/Rock_7.fbx', 1.8 * ROCK_S),
    loadFBX('assets/nature/FBX/Rock_Moss_2.fbx', 1.2 * ROCK_S),
    loadFBX('assets/nature/FBX/Rock_Moss_6.fbx', 0.9 * ROCK_S),
    loadFBX('assets/nature/FBX/Bush_1.fbx', 1.0),
    loadFBX('assets/nature/FBX/BushBerries_1.fbx', 0.9),
    loadFBX('assets/nature/FBX/TreeStump.fbx', 0.7),
    loadFBX('assets/nature/FBX/TreeStump_Moss.fbx', 0.7),
    loadFBX('assets/nature/FBX/WoodLog.fbx', 0.6),
    loadFBX('assets/nature/FBX/WoodLog_Moss.fbx', 0.6),
    loadFBX('assets/nature/FBX/Flowers.fbx', 0.4),
    loadFBX('assets/nature/FBX/Plant_2.fbx', 0.6),
    loadFBX('assets/nature/FBX/Plant_4.fbx', 0.5),
    loadFBX('assets/nature/FBX/Grass.fbx', 0.55),
    loadFBX('assets/nature/FBX/Grass_Short.fbx', 0.35),
  ]);

  // 텍스처 적용 (trees/ 팩)
  [tree1, tree2, tree3, tree4].forEach((t, i) => {
    const rules = [TREE_RULES, TREE_RULES2, TREE_RULES3, TREE_RULES][i];
    applyTex(t, rules);
  });
  [birch1, birch2, birch3].forEach((t, i) => applyTex(t, [BIRCH_G, BIRCH_Y, BIRCH_G][i]));
  [pine1, pine2].forEach(t => applyTex(t, PINE_RULES));
  applyTex(deadTree1, [{ match:['bark','wood','dead','trunk'], map:T.treeBark() }]);
  applyTex(deadTree2, [{ match:['bark','wood','dead','trunk'], map:T.treeBark() }]);

  // ── 나무 배치 (수량 최적화: draw call 절감) ────────────────────────────
  // 텍스처 나무 (다채로운 색). 활엽수는 낙엽 반경 크게, 침엽수는 작게.
  scatter(scene, tree1,  12, { area, inner:18, scaleVar:0.25, record:treePos, leafRadius:4.5 });
  scatter(scene, tree2,  10, { area, inner:18, scaleVar:0.3,  record:treePos, leafRadius:4.5 });
  scatter(scene, tree3,   9, { area, inner:20, scaleVar:0.3,  record:treePos, leafRadius:4.5 });
  scatter(scene, tree4,   9, { area, inner:18, scaleVar:0.25, record:treePos, leafRadius:4.5 });
  scatter(scene, birch1, 10, { area, inner:18, scaleVar:0.25, record:treePos, leafRadius:4 });
  scatter(scene, birch2, 10, { area, inner:20, scaleVar:0.3,  record:treePos, leafRadius:4 });
  scatter(scene, birch3,  8, { area, inner:22, scaleVar:0.25, record:treePos, leafRadius:4 });
  scatter(scene, pine1,  10, { area, inner:18, scaleVar:0.2,  record:treePos, leafRadius:3 });
  scatter(scene, pine2,  10, { area, inner:18, scaleVar:0.2,  record:treePos, leafRadius:3 });
  scatter(scene, deadTree1, 5, { area, inner:20, scaleVar:0.35, record:treePos, leafRadius:3.5 });
  scatter(scene, deadTree2, 4, { area, inner:22, scaleVar:0.35, record:treePos, leafRadius:3.5 });

  // nature 나무
  scatter(scene, pineN1,       10, { area, inner:18, scaleVar:0.2,  record:treePos, leafRadius:3 });
  scatter(scene, pineN2,       10, { area, inner:18, scaleVar:0.2,  record:treePos, leafRadius:3 });
  scatter(scene, pineNAutumn,   8, { area, inner:20, scaleVar:0.25, record:treePos, leafRadius:3.5 });
  scatter(scene, commonTree,   10, { area, inner:18, scaleVar:0.3,  record:treePos, leafRadius:4.5 });
  scatter(scene, commonAutumn,  8, { area, inner:20, scaleVar:0.3,  record:treePos, leafRadius:5 });
  scatter(scene, commonDead,    5, { area, inner:22, scaleVar:0.35, record:treePos, leafRadius:3.5 });
  scatter(scene, willowGreen,   8, { area, inner:20, scaleVar:0.3,  record:treePos, leafRadius:5.5 });
  scatter(scene, willowAutumn,  7, { area, inner:22, scaleVar:0.3,  record:treePos, leafRadius:6 });
  scatter(scene, willowDead,    5, { area, inner:24, scaleVar:0.35, record:treePos, leafRadius:4.5 });
  scatter(scene, birchN,        8, { area, inner:18, scaleVar:0.25, record:treePos, leafRadius:4 });
  scatter(scene, birchNAutumn,  7, { area, inner:20, scaleVar:0.25, record:treePos, leafRadius:4.5 });

  // ── 바위 ───────────────────────────────────────────────────────────────
  scatterMixed(scene, [rock1, rock2, rock3],    14, { area, inner:12, scaleVar:0.55 });
  scatterMixed(scene, [rockMoss1, rockMoss2],   12, { area, inner:12, scaleVar:0.5 });

  // ── 바닥 장식물 ────────────────────────────────────────────────────────
  scatter(scene, bush,       18, { area, inner:12, scaleVar:0.4 });
  scatter(scene, bushBerries,14, { area, inner:12, scaleVar:0.35 });
  scatterMixed(scene, [stump, stumpMoss],       10, { area, inner:14, scaleVar:0.3 });
  scatterMixed(scene, [woodLog, woodLogMoss],   10, { area, inner:12, scaleVar:0.4 });
  scatter(scene, flower, 28, { area, inner:8,  scaleVar:0.4 });
  scatter(scene, plant1, 20, { area, inner:8,  scaleVar:0.4 });
  scatter(scene, plant2, 18, { area, inner:8,  scaleVar:0.4 });

  // ── 풀 (Instanced Mesh, 대량) ──────────────────────────────────────────
  scatterInstanced(scene, grass,      1000, area);
  scatterInstanced(scene, grassShort,  600, area);

  // ── 낙엽 마스크: 수집한 나무 위치로 생성 → 지형 셰이더에 주입 ──────────────
  leafMask.value = buildLeafMask(treePos);

  console.log('[world] built — trees:', treePos.length);
}
