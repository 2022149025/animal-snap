import * as THREE from 'three';
import { ANIMAL_DEFS } from './animals.js';

// 게임 중 운석 낙하 시스템 — 종말이 가까울수록 잦고 격렬해진다.
// 낙하 → 충돌(섬광 + 화면 흔들림 + 그을림 크레이터 + 근처 생명체 사망).

const MAX_SCORCH = 28;

// 그을림 텍스처(방사형 검댕) 1회 생성
function makeScorchTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(10,6,4,0.95)');
  g.addColorStop(0.55, 'rgba(30,14,8,0.8)');
  g.addColorStop(0.8, 'rgba(60,30,15,0.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  // 불탄 가장자리 점들
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * 7, r = 30 + Math.random() * 30;
    ctx.fillStyle = `rgba(${20 + Math.random() * 40},${10},${5},0.5)`;
    ctx.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MeteorStrikes {
  constructor(scene, camera, animalMgr, doomsday, getHeight, ui, player) {
    this.scene = scene;
    this.camera = camera;
    this.animalMgr = animalMgr;
    this.doomsday = doomsday;
    this.getHeight = getHeight;
    this.ui = ui;
    this.player = player;

    this.bounds = 90;
    this.timer = 4;          // 첫 운석까지
    this.trauma = 0;         // 화면 흔들림(0~1.6)
    this.LEAD = 6;           // 운석 낙하 예고 시간(초)
    this._falling = [];
    this._scorches = [];
    this._warnings = [];     // 낙하 예고 마커들
    this.lostCount = 0;
    this.onPlayerKilled = null; // 플레이어 즉사 콜백 (main)
    this._dead = false;

    this._scorchTex = makeScorchTexture();
    this._light = new THREE.PointLight(0xff7a33, 0, 90, 2);
    scene.add(this._light);

    // 화면 섬광 오버레이
    this._flash = document.createElement('div');
    this._flash.style.cssText =
      'position:fixed;inset:0;z-index:9;pointer-events:none;opacity:0;' +
      'background:radial-gradient(ellipse at center,rgba(255,170,90,.0),rgba(255,120,40,.6));';
    document.body.appendChild(this._flash);
    this._flashV = 0;
  }

  // 종말 진행도에 따른 운석 간격(초): 초반 드문드문 → 막바지 잦게
  _nextInterval() {
    const f = this.doomsday.doomFactor;
    const base = THREE.MathUtils.lerp(15, 2.2, f);
    return base * (0.6 + Math.random() * 0.8);
  }

  // 낙하 예고 마커 생성 — LEAD초 뒤 이 자리에 운석이 떨어진다
  _spawnWarning() {
    const pp = this.player.mesh.position;
    const ang = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 60;
    const ix = pp.x + Math.cos(ang) * r;
    const iz = pp.z + Math.sin(ang) * r;
    const iy = this.getHeight(ix, iz);
    const impact = new THREE.Vector3(ix, iy, iz);
    const radius = 6 + Math.random() * 3;   // 예상 폭발 반경

    const grp = new THREE.Group();
    grp.position.set(ix, iy + 0.06, iz);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.82, radius, 40),
      new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      new THREE.MeshBasicMaterial({ color: 0xff7a33, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.16, radius * 0.04, 60, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff7a33, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 30;
    grp.add(ring); grp.add(disc); grp.add(beam); grp.renderOrder = 1;
    this.scene.add(grp);
    this._warnings.push({ impact, grp, ring, disc, beam, radius, t: 0 });
  }

  // 예고 마커 갱신 — 시간이 차면 실제 운석 낙하로 전환
  _updateWarnings(dt) {
    for (let i = this._warnings.length - 1; i >= 0; i--) {
      const w = this._warnings[i];
      w.t += dt;
      const prog = Math.min(1, w.t / this.LEAD);
      const pulse = 0.5 + 0.5 * Math.sin(w.t * (4 + prog * 16));
      w.ring.material.opacity = 0.5 + 0.45 * pulse;
      w.ring.material.color.setHSL(THREE.MathUtils.lerp(0.12, 0.0, prog), 1, 0.5);
      w.disc.material.opacity = 0.10 + 0.34 * prog;
      w.disc.scale.setScalar(0.4 + 0.6 * prog);
      w.beam.material.opacity = (0.08 + 0.2 * prog) * pulse;
      if (w.t >= this.LEAD) {
        this.scene.remove(w.grp);
        w.ring.geometry.dispose(); w.ring.material.dispose();
        w.disc.geometry.dispose(); w.disc.material.dispose();
        w.beam.geometry.dispose(); w.beam.material.dispose();
        this._warnings.splice(i, 1);
        this._spawnMeteor(w.impact);
      }
    }
  }

  // 예고된 자리(impact)로 운석 낙하
  _spawnMeteor(impact) {
    const start = new THREE.Vector3(impact.x + 22, impact.y + 130, impact.z + 14);

    const head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.6, 0),
      new THREE.MeshStandardMaterial({ color: 0x1a120c, emissive: 0xffae4a, emissiveIntensity: 1.4, flatShading: true })
    );
    const trail = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 12, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    const dir = new THREE.Vector3().subVectors(impact, start).normalize();
    trail.position.copy(dir.clone().multiplyScalar(6));
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    const g = new THREE.Group(); g.add(head); g.add(trail); g.position.copy(start);
    this.scene.add(g);
    this._falling.push({ g, start, impact, p: 0 });
  }

  _impact(impact) {
    // 그을림 크레이터
    const size = 5 + Math.random() * 4;
    const mat = new THREE.MeshBasicMaterial({ map: this._scorchTex, transparent: true,
      depthWrite: false, opacity: 0.92 });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    decal.rotation.x = -Math.PI / 2; decal.rotation.z = Math.random() * 7;
    decal.position.set(impact.x, impact.y + 0.06, impact.z);
    decal.renderOrder = 1;
    this.scene.add(decal);
    this._scorches.push(decal);
    if (this._scorches.length > MAX_SCORCH) {
      const old = this._scorches.shift(); this.scene.remove(old); old.material.dispose(); old.geometry.dispose();
    }

    // 섬광 + 빛
    this._light.position.set(impact.x, impact.y + 6, impact.z);
    this._light.intensity = 120;

    // 화면 흔들림 / 섬광 — 플레이어와의 거리로 세기 결정
    const dist = impact.distanceTo(this.player.mesh.position);
    const closeness = THREE.MathUtils.clamp(1 - dist / 70, 0, 1);
    this.trauma = Math.min(1.6, this.trauma + 0.5 + closeness * 1.1);
    this._flashV = Math.max(this._flashV, closeness * 0.9);

    // 플레이어 즉사 판정 (예고를 보고 피하지 못하면 휩쓸림)
    const killR = 7 + closeness * 7;
    const pdist = impact.distanceTo(this.player.mesh.position);
    if (!this._dead && this.doomsday.running && pdist <= killR) {
      this._dead = true;
      if (this.onPlayerKilled) this.onPlayerKilled();
    }

    // 근처 생명체 사망
    let killed = 0;
    const killedKeys = [];
    const agents = this.animalMgr.agents;
    for (let i = agents.length - 1; i >= 0; i--) {
      const a = agents[i];
      if (a.obj.position.distanceTo(impact) <= killR) {
        this._deathPoof(a.obj.position);
        this.scene.remove(a.obj);
        killedKeys.push(a.key);
        agents.splice(i, 1);
        killed++;
      }
    }
    if (killed > 0) {
      this.lostCount += killed;
      // 이번 충돌로 '미촬영 종'이 절멸했는지 — 비극의 순간
      const counts = this.animalMgr.countsBySpecies();
      const goneNow = [];
      for (const key of new Set(killedKeys)) {
        const def = ANIMAL_DEFS[key];
        if (def && !(counts[key] > 0) && this.ui && !this.ui.isCaptured(key)) goneNow.push(def.name);
      }
      if (this.ui) {
        if (goneNow.length) this.ui.showToast(`☠️ 기록 못 한 채 사라졌습니다 — ${goneNow.join(', ')}`);
        else this.ui.showToast(`☄️ 운석 충돌 — 생명체 ${killed} 소실`);
        if (this.ui._updateScore) this.ui._updateScore();
      }
    }
  }

  // 생명체 사망 — 확장하며 사라지는 연기 고리
  _deathPoof(pos) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x3a2a20, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.3, pos.z);
    this.scene.add(ring);
    this._falling.push({ poof: ring, life: 0 });
  }

  update(dt) {
    // 새 운석 스폰은 카운트다운 중에만 (인트로/엔딩 시 정지). 진행 중 연출은 계속 갱신.
    if (this.doomsday.running) {
      this.timer -= dt;
      if (this.timer <= 0) { this._spawnWarning(); this.timer = this._nextInterval(); }
    }
    this._updateWarnings(dt);

    for (let i = this._falling.length - 1; i >= 0; i--) {
      const m = this._falling[i];
      if (m.poof) { // 연기 고리 애니메이션
        m.life += dt; const k = m.life / 0.7;
        m.poof.scale.setScalar(1 + k * 5);
        m.poof.material.opacity = Math.max(0, 0.7 * (1 - k));
        if (k >= 1) { this.scene.remove(m.poof); m.poof.material.dispose(); m.poof.geometry.dispose(); this._falling.splice(i, 1); }
        continue;
      }
      m.p += dt / 1.2; // ~1.2초 낙하
      m.g.position.lerpVectors(m.start, m.impact, Math.min(1, m.p));
      this._light.position.copy(m.g.position); this._light.intensity = 40;
      if (m.p >= 1) {
        this.scene.remove(m.g);
        this._impact(m.impact);
        this._falling.splice(i, 1);
      }
    }

    // 감쇠
    this.trauma *= Math.pow(0.12, dt);
    this._light.intensity *= Math.pow(0.05, dt);
    this._flashV *= Math.pow(0.02, dt);
    this._flash.style.opacity = String(this._flashV);
  }

  // 최후의 일격 — D-0 대형 운석 충돌 (엔딩 연출)
  finalStrike(pos) {
    const impact = new THREE.Vector3(pos.x, this.getHeight(pos.x, pos.z), pos.z);
    // 큰 크레이터
    const size = 16;
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ map: this._scorchTex, transparent: true, depthWrite: false, opacity: 0.96 }));
    decal.rotation.x = -Math.PI / 2; decal.position.set(impact.x, impact.y + 0.06, impact.z);
    this.scene.add(decal); this._scorches.push(decal);
    this._light.position.set(impact.x, impact.y + 8, impact.z); this._light.intensity = 400;
    this.trauma = 1.6; this._flashV = 1;
    // 광범위 사망
    const agents = this.animalMgr.agents;
    for (let i = agents.length - 1; i >= 0; i--) {
      if (agents[i].obj.position.distanceTo(impact) <= 40) {
        this._deathPoof(agents[i].obj.position);
        this.scene.remove(agents[i].obj); agents.splice(i, 1); this.lostCount++;
      }
    }
  }

  // 카메라에 흔들림 적용 (player.update 이후 호출)
  applyShake(camera) {
    if (this.trauma < 0.001) return;
    const s = this.trauma * this.trauma * 0.6;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
    camera.position.z += (Math.random() - 0.5) * s * 0.5;
  }

  // 미니맵용 현재 예고 지점들
  getWarnings() {
    return this._warnings.map(w => ({ x: w.impact.x, z: w.impact.z, r: w.radius, progress: Math.min(1, w.t / this.LEAD) }));
  }
}
