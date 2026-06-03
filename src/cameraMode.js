import * as THREE from 'three';

const NORMAL_FOV = 60;
const ZOOM_FOV = 32;
const MAX_PHOTO_DIST = 45;
const CENTER_TOL = 0.28;   // 화면 중앙 허용 반경(NDC)

// 카메라(촬영) 모드: 줌, 뷰파인더, 촬영 판정
export class CameraMode {
  constructor(camera, renderer, animalMgr, ui) {
    this.camera = camera;
    this.renderer = renderer;
    this.animalMgr = animalMgr;
    this.ui = ui;
    this.active = false;
    this.targetFov = NORMAL_FOV;
    this._tmp = new THREE.Vector3();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyC') this.toggle();
      else if (e.code === 'Tab') { e.preventDefault(); this.ui.toggleDex(); }
    });

    // 촬영 = 마우스 좌클릭 (카메라 모드 + 포인터 잠금 상태일 때만)
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.active && document.pointerLockElement) this.capture();
    });
  }

  toggle() {
    this.active = !this.active;
    this.targetFov = this.active ? ZOOM_FOV : NORMAL_FOV;
    this.ui.setCameraMode(this.active);
  }

  update(dt) {
    // FOV 부드럽게 보간 (줌)
    const cam = this.camera;
    cam.fov += (this.targetFov - cam.fov) * Math.min(dt * 8, 1);
    cam.updateProjectionMatrix();

    // 동물이 조준선 안에 있으면 포커스 링 활성화
    if (this.active) {
      const found = this._findTarget() !== null;
      this.ui.crosshair.classList.toggle('found', found);
    }
  }

  // 촬영 대상 탐색 (capture와 동일 로직, 결과만 반환)
  _findTarget() {
    const cam = this.camera;
    for (const agent of this.animalMgr.agents) {
      this._tmp.copy(agent.obj.position);
      this._tmp.y += (agent.def.h || 1) * 0.5;
      const p = this._tmp.clone().project(cam);
      if (p.z > 1) continue;
      const offset = Math.hypot(p.x, p.y);
      const dist = agent.obj.position.distanceTo(cam.position);
      if (offset <= CENTER_TOL && dist <= MAX_PHOTO_DIST) return agent;
    }
    return null;
  }

  // 뷰파인더 중앙에 가장 잘 들어온 동물을 찾아 촬영
  capture() {
    const best = this._findTarget();
    if (!best) {
      this.ui.showToast('🔍 화면 중앙에 동물을 담아보세요');
      return;
    }
    // 현재 프레임을 사진으로 캡처 (중앙 정사각형 크롭)
    const photo = this._snapshot();
    const key = keyOf(best);
    const first = this.ui.capture(key, best.def, photo);
    if (first) best.captured = true;
  }

  _snapshot() {
    const src = this.renderer.domElement;
    const side = Math.min(src.width, src.height);
    const sx = (src.width - side) / 2;
    const sy = (src.height - side) / 2;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, sx, sy, side, side, 0, 0, 256, 256);
    return c.toDataURL('image/jpeg', 0.7);
  }
}

// agent.def에서 ANIMAL_DEFS 키를 역추적
import { ANIMAL_DEFS } from './animals.js';
function keyOf(agent) {
  for (const [k, d] of Object.entries(ANIMAL_DEFS)) if (d === agent.def) return k;
  return null;
}
