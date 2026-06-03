import * as THREE from 'three';
import { Animal, loadSpecies } from './animals.js';

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
      for (let i = 0; i < count; i++) {
        const animal = new Animal(species);
        const angle = Math.random() * Math.PI * 2;
        const r = 15 + Math.random() * (bounds - 15);
        const wx = Math.cos(angle) * r, wz = Math.sin(angle) * r;
        animal.object.position.set(wx, getHeight(wx, wz), wz);
        this.scene.add(animal.object);
        this.agents.push(new AnimalAgent(animal, { bounds, id: id++ }));
      }
    }
    return this.agents;
  }

  update(dt, playerPos, getHeight = () => 0) {
    for (const a of this.agents) {
      a._groundY = getHeight(a.obj.position.x, a.obj.position.z);
      a.update(dt, playerPos);
    }
  }
}
