import * as THREE from 'three';
import { Animal, loadSpecies, ANIMAL_DEFS } from './animals.js';
import { POND } from './world.js';

const WALK = 2.2;
const RUN = 7.0;

// 개별 동물의 거동(배회/도주) 상태기계 + 간단 물리
export class AnimalAgent {
  constructor(animal, opts = {}) {
    this.animal = animal;
    this.def = animal.def;
    this.obj = animal.object;
    this.bounds = opts.bounds ?? 70;
    this.detect = opts.detect ?? (8 + this.def.timid * 10); // 겁많을수록 멀리서 도망

    this.state = 'wander';
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.vel = new THREE.Vector3();
    this.wanderTimer = Math.random() * 3;
    this.captured = false;     // 도감 등록 여부
    this.id = opts.id ?? 0;
  }

  setHeading(angle) { this.heading = angle; }

  update(dt, playerPos) {
    if (this.aquatic) return this._updateFish(dt, playerPos);
    const obj = this.obj;
    const toPlayer = new THREE.Vector3().subVectors(playerPos, obj.position);
    const dist = toPlayer.length();

    // --- 상태 전이 ---
    if (dist < this.detect) {
      this.state = 'flee';
    } else if (this.state === 'flee' && dist > this.detect * 1.6) {
      this.state = 'wander';
      this.wanderTimer = 0;
    }

    let targetSpeed = 0;
    if (this.state === 'flee') {
      // 플레이어 반대 방향으로 가속 도주 (물리 기반 가속)
      this.heading = Math.atan2(-toPlayer.x, -toPlayer.z);
      targetSpeed = RUN * (0.7 + this.def.timid * 0.5);
    } else {
      // 배회: 가끔 방향/정지 전환
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 4;
        this._wanderState = Math.random() < 0.4 ? 'idle' : 'walk';
        if (this._wanderState === 'walk') this.heading += (Math.random() - 0.5) * 2;
      }
      targetSpeed = this._wanderState === 'walk' ? WALK : 0;
    }

    // 경계 밖으로 나가면 중심으로 방향 전환
    const distFromCenter = Math.hypot(obj.position.x, obj.position.z);
    if (distFromCenter > this.bounds) {
      this.heading = Math.atan2(-obj.position.x, -obj.position.z);
    }

    // 가속/감속 (관성)
    this.speed += (targetSpeed - this.speed) * Math.min(dt * 4, 1);

    // 이동
    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    obj.position.addScaledVector(dir, this.speed * dt);
    // 지형 높이 추적 (getHeight는 manager.update에서 전달)
    obj.position.y = this._groundY ?? 0;

    // 진행 방향 바라보기 (부드럽게) — faceFix=0이므로 heading 그대로
    const targetYaw = this.heading + (this.def.faceFix || 0);
    obj.rotation.y = dampAngle(obj.rotation.y, targetYaw, dt * 8);

    // 속도에 따른 애니메이션
    if (this.speed < 0.3) this.animal.play('idle');
    else if (this.speed < WALK + 1) this.animal.play('walk');
    else this.animal.play('run');

    this.animal.update(dt);
  }

  // 물고기: 연못 안에서만 수면 아래를 헤엄. 플레이어가 가까우면 도주.
  _updateFish(dt, playerPos) {
    const obj = this.obj;
    this._t = (this._t || 0) + dt;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, obj.position);
    const dist = toPlayer.length();

    // 방향: 가끔 살짝 틀기, 플레이어 근접 시 반대로 도주
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) { this.wanderTimer = 1.5 + Math.random() * 2.5; this.heading += (Math.random() - 0.5) * 1.4; }
    let targetSpeed = 1.5;
    if (dist < 9) { this.heading = Math.atan2(-toPlayer.x, -toPlayer.z); targetSpeed = 4.0; }

    // 연못 가장자리에 닿으면 중심으로 선회
    let px = obj.position.x - POND.x, pz = obj.position.z - POND.z;
    if (Math.hypot(px, pz) > POND.r - 2.5) this.heading = Math.atan2(-px, -pz);

    this.speed += (targetSpeed - this.speed) * Math.min(dt * 3, 1);
    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    obj.position.addScaledVector(dir, this.speed * dt);

    // 연못 밖으로 못 나가게 하드 클램프
    px = obj.position.x - POND.x; pz = obj.position.z - POND.z;
    const pr = Math.hypot(px, pz), lim = POND.r - 1.5;
    if (pr > lim) { const k = lim / pr; obj.position.x = POND.x + px * k; obj.position.z = POND.z + pz * k; }

    // 수면 살짝 아래에서 위아래로 흔들며 헤엄
    obj.position.y = POND.waterY - 0.5 + Math.sin(this._t * 2 + this.id) * 0.12;
    obj.rotation.y = dampAngle(obj.rotation.y, this.heading + (this.def.faceFix || 0), dt * 6);
    this.animal.play('idle');
    this.animal.update(dt);
  }
}

// 각도 보간(최단 경로)
function dampAngle(current, target, t) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(t, 1);
}

// 여러 동물 스폰/업데이트 관리
export class AnimalManager {
  constructor(scene) {
    this.scene = scene;
    this.agents = [];
  }

  // roster: { key: count } — 종마다 count 마리 스폰
  async spawn(roster, { bounds = 70, getHeight = () => 0 } = {}) {
    let id = 0;
    for (const [key, count] of Object.entries(roster)) {
      const species = await loadSpecies(key);
      const aquatic = !!(ANIMAL_DEFS[key] && ANIMAL_DEFS[key].aquatic);
      for (let i = 0; i < count; i++) {
        const animal = new Animal(species);
        let wx, wz, wy;
        if (aquatic) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.random() * (POND.r - 3);
          wx = POND.x + Math.cos(a) * rr; wz = POND.z + Math.sin(a) * rr;
          wy = POND.waterY - 0.5;
        } else {
          const angle = Math.random() * Math.PI * 2;
          const r = 15 + Math.random() * (bounds - 15);
          wx = Math.cos(angle) * r; wz = Math.sin(angle) * r;
          wy = getHeight(wx, wz);
        }
        animal.object.position.set(wx, wy, wz);
        this.scene.add(animal.object);
        const agent = new AnimalAgent(animal, { bounds, id: id++ });
        agent.aquatic = aquatic;
        agent.key = key;
        this.agents.push(agent);
      }
    }
    return this.agents;
  }

  update(dt, playerPos, getHeight = () => 0) {
    this._t = (this._t || 0) + dt;
    const pulse = 0.55 + 0.35 * Math.sin(this._t * 3);  // 발광 맥동
    for (const a of this.agents) {
      a._groundY = getHeight(a.obj.position.x, a.obj.position.z);
      a.update(dt, playerPos);
      // 아직 촬영하지 않은(도감에 없는) 동물만 발광
      if (a.animal.glow) {
        const captured = this.ui && a.key && this.ui.isCaptured(a.key);
        a.animal.glow.visible = !captured;
        if (!captured) a.animal.glow.material.opacity = pulse;
      }
    }
  }
}
