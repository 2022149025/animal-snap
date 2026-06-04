import * as THREE from 'three';

// 3D 시네마틱 인트로 — 실제 게임 씬(숲)을 그대로 사용해 카메라가 움직이고,
// 절차적 운석(불꼬리)이 하늘을 가로지르며, 뉴스 자막이 흐른 뒤 섬광과 함께 게임이 시작된다.

const TOTAL = 16; // 전체 길이(초)

// 카메라 웨이포인트 { t, pos, look, fov }
const PATH = [
  { t: 0.0,  pos: [-6, 34, 64],  look: [-30, 58, -150], fov: 55 }, // 하늘의 소행성을 올려다봄
  { t: 4.5,  pos: [4, 26, 46],   look: [0, 16, -40],    fov: 52 }, // 숲 캐노피로 하강
  { t: 9.0,  pos: [10, 9, 22],   look: [0, 4, -8],      fov: 46 }, // 숲 위 낮게 비행
  { t: 13.0, pos: [0.5, 4.2, 9], look: [0, 2.4, 0],     fov: 60 }, // 플레이어 뒤(게임 시점)
  { t: 16.0, pos: [0.2, 4, 8.4], look: [0, 2.2, 0],     fov: 60 },
];

const CAPTIONS = [
  { t0: 0.4, t1: 5.4, tag: '🔴 BREAKING NEWS', title: '거대 소행성, 충돌 궤도 진입',
    body: '국제천문연맹 긴급 발표 — 사흘 뒤, 막을 수 없는 충돌.' },
  { t0: 8.6, t1: 15.4, tag: '', title: '마지막 기록',
    body: '사라지기 전에, 이 행성의 살아있는 모든 것을 카메라에 담는다.' },
];

function ease(a, b, t) { t = t * t * (3 - 2 * t); return a + (b - a) * t; }

export class IntroCinematic {
  constructor(scene, camera, doomsday) {
    this.scene = scene;
    this.camera = camera;
    this.doomsday = doomsday;
    this.time = 0;
    this.done = false;
    this.onDone = null;
    this._shake = 0;
    this._streaks = [];
    this._tmp = new THREE.Vector3();

    // 분위기용 옅은 종말 기운(자막 진행에 맞춰 약간 붉게) — 시작 시 초기화됨
    if (doomsday) doomsday.elapsed = doomsday.duration * 0.05;

    this._group = new THREE.Group();
    scene.add(this._group);

    // 멀리 떠 있는 거대 소행성(다가오는 운명)
    const ast = new THREE.Mesh(
      new THREE.IcosahedronGeometry(7, 1),
      new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0xff5a22, emissiveIntensity: 0.7, flatShading: true })
    );
    ast.position.set(-34, 60, -150);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(14, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff7a33, transparent: true, opacity: 0.22 })
    );
    ast.add(glow);
    this._asteroid = ast;
    this._group.add(ast);

    // 운석에 드라마틱한 빛
    this._meteorLight = new THREE.PointLight(0xff7a33, 0, 120, 2);
    this._group.add(this._meteorLight);

    this._buildOverlay();
    this._sampleCamera(0);
  }

  // 화면을 가로지르는 운석 스트릭 생성
  _spawnStreak(from, to, speed = 1) {
    const head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 0),
      new THREE.MeshStandardMaterial({ color: 0x1a120c, emissive: 0xffb24a, emissiveIntensity: 1.4, flatShading: true })
    );
    const trail = new THREE.Mesh(
      new THREE.ConeGeometry(1.3, 14, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    const g = new THREE.Group();
    g.add(head); g.add(trail);
    g.position.copy(from);
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    // 꼬리를 진행 반대 방향으로 정렬
    trail.position.copy(dir.clone().multiplyScalar(7));
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    this._group.add(g);
    this._streaks.push({ g, from: from.clone(), to: to.clone(), p: 0, speed, light: null });
  }

  _buildOverlay() {
    const root = document.createElement('div');
    root.id = 'intro3d';
    const style = document.createElement('style');
    style.textContent = `
      #intro3d { position:fixed; inset:0; z-index:50; pointer-events:auto;
        font-family:'Segoe UI',sans-serif; color:#fff; overflow:hidden; }
      #intro3d .bars { position:absolute; inset:0; pointer-events:none; }
      #intro3d .bars::before, #intro3d .bars::after { content:''; position:absolute; left:0; right:0;
        height:9vh; background:#000; }
      #intro3d .bars::before { top:0; } #intro3d .bars::after { bottom:0; }
      #intro3d .vig { position:absolute; inset:0; pointer-events:none;
        background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.5)); }
      #intro3d .cap { position:absolute; left:0; right:0; bottom:13vh; text-align:center;
        padding:0 8vw; opacity:0; transition:opacity .6s; text-shadow:0 2px 12px #000; }
      #intro3d .cap.on { opacity:1; }
      #intro3d .cap .tag { display:inline-block; font:bold 13px monospace; letter-spacing:.15em;
        color:#ff6a44; border:1px solid #ff6a4477; background:rgba(0,0,0,.35); padding:4px 12px;
        border-radius:4px; margin-bottom:14px; }
      #intro3d .cap h1 { font-family:'Nanum Myeongjo',serif; font-weight:800;
        font-size:clamp(24px,4.6vw,46px); margin:0 0 12px; letter-spacing:.02em; }
      #intro3d .cap p { font-family:'Nanum Myeongjo',serif; font-weight:400;
        font-size:clamp(14px,1.9vw,20px); color:#e7ebf0; margin:0; letter-spacing:.01em; }
      #intro3d .skip { position:absolute; top:calc(9vh + 14px); right:22px; pointer-events:auto;
        background:rgba(0,0,0,.4); color:#cfd6df; border:1px solid #ffffff33; border-radius:6px;
        padding:8px 16px; font:bold 13px sans-serif; cursor:pointer; }
      #intro3d .skip:hover { color:#fff; border-color:#ffffff66; }
      #intro3d .flash { position:absolute; inset:0; background:#fff; opacity:0; pointer-events:none; }
    `;
    document.head.appendChild(style);
    root.innerHTML = `
      <div class="bars"></div><div class="vig"></div>
      <div class="cap"><span class="tag"></span><h1></h1><p></p></div>
      <button class="skip">건너뛰기 ▶</button>
      <div class="flash"></div>`;
    document.body.appendChild(root);
    this._overlay = root;
    this._capEl = root.querySelector('.cap');
    this._capTag = root.querySelector('.tag');
    this._capTitle = root.querySelector('h1');
    this._capBody = root.querySelector('p');
    this._flashEl = root.querySelector('.flash');
    this._curCap = -1;
    root.querySelector('.skip').onclick = () => this._finish();
  }

  _updateCaptions() {
    let idx = -1;
    for (let i = 0; i < CAPTIONS.length; i++) {
      if (this.time >= CAPTIONS[i].t0 && this.time <= CAPTIONS[i].t1) { idx = i; break; }
    }
    if (idx !== this._curCap) {
      this._curCap = idx;
      if (idx === -1) { this._capEl.classList.remove('on'); }
      else {
        const c = CAPTIONS[idx];
        this._capTag.textContent = c.tag;
        this._capTag.style.display = c.tag ? '' : 'none';
        this._capTitle.textContent = c.title;
        this._capBody.textContent = c.body;
        this._capEl.classList.add('on');
      }
    }
  }

  _sampleCamera(t) {
    let a = PATH[0], b = PATH[PATH.length - 1];
    for (let i = 0; i < PATH.length - 1; i++) {
      if (t >= PATH[i].t && t <= PATH[i + 1].t) { a = PATH[i]; b = PATH[i + 1]; break; }
    }
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
    const cam = this.camera;
    cam.position.set(
      ease(a.pos[0], b.pos[0], f), ease(a.pos[1], b.pos[1], f), ease(a.pos[2], b.pos[2], f));
    const lx = ease(a.look[0], b.look[0], f), ly = ease(a.look[1], b.look[1], f), lz = ease(a.look[2], b.look[2], f);
    // 화면 흔들림
    if (this._shake > 0.001) {
      cam.position.x += (Math.random() - 0.5) * this._shake;
      cam.position.y += (Math.random() - 0.5) * this._shake;
    }
    cam.lookAt(lx, ly, lz);
    cam.fov = ease(a.fov, b.fov, f);
    cam.updateProjectionMatrix();
  }

  update(dt) {
    if (this.done) return;
    this.time += dt;
    const t = this.time;

    // 소행성 천천히 다가옴 + 맥동
    this._asteroid.rotation.y += dt * 0.2;
    this._asteroid.position.x += dt * 0.5;
    this._asteroid.position.y -= dt * 0.25;
    this._asteroid.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.15;

    // 스트릭 트리거
    if (!this._s1 && t > 5.2) { this._s1 = true;
      this._spawnStreak(new THREE.Vector3(60, 70, -90), new THREE.Vector3(-50, 20, -60)); }
    if (!this._s2 && t > 9.6) { this._s2 = true;
      // 가까운 운석 — 화면 흔들림 유발
      this._spawnStreak(new THREE.Vector3(40, 55, 10), new THREE.Vector3(-20, 6, -30), 1.4);
      this._meteorLight.intensity = 60;
    }

    // 스트릭 이동
    for (let i = this._streaks.length - 1; i >= 0; i--) {
      const s = this._streaks[i];
      s.p += dt * 0.45 * s.speed;
      s.g.position.lerpVectors(s.from, s.to, Math.min(1, s.p));
      if (s.speed > 1.2) this._meteorLight.position.copy(s.g.position);
      if (s.p >= 1) {
        this._shake = Math.max(this._shake, s.speed > 1.2 ? 1.6 : 0.0); // 근접 운석 충격
        this._group.remove(s.g);
        this._streaks.splice(i, 1);
      }
    }
    this._shake *= Math.pow(0.06, dt);          // 흔들림 감쇠
    this._meteorLight.intensity *= Math.pow(0.2, dt);

    this._sampleCamera(Math.min(t, TOTAL));
    this._updateCaptions();

    if (t >= TOTAL) this._finish();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    // 섬광
    this._flashEl.style.transition = 'none';
    this._flashEl.style.opacity = '0.95';
    requestAnimationFrame(() => {
      this._flashEl.style.transition = 'opacity .6s ease';
      this._flashEl.style.opacity = '0';
    });
    setTimeout(() => { this._overlay && this._overlay.remove(); }, 650);

    // 씬 정리
    this.scene.remove(this._group);
    this.camera.fov = 60; this.camera.updateProjectionMatrix();

    // 종말 카운트다운을 D-3부터 새로 시작
    if (this.doomsday) { this.doomsday.elapsed = 0; this.doomsday.update(0); this.doomsday.start(); }

    if (this.onDone) this.onDone();
  }
}
