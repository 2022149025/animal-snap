import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 플레이어: 3인칭 이동 + 마우스 시점(포인터 잠금) + 점프(중력).
// 시각 모델은 Mixamo 캐릭터(glb, idle/walk/run 애니 내장 + webp 텍스처로 경량화).
// this.mesh(Group)가 이동/회전/물리를 담당하고, 로드된 모델을 그 자식으로 붙여
// 다른 모듈(카메라/동물 AI)은 기존 인터페이스 그대로 사용.
const PLAYER_PATH = 'assets/player/Player.glb';
const TARGET_HEIGHT = 1.9;   // 모델을 정규화할 키(m)
const FACE_FIX = 0;          // 모델 정면이 진행방향과 반대면 Math.PI 로 변경

const loader = new GLTFLoader();

export class Player {
  constructor(scene) {
    // 이동/물리/회전을 담당하는 컨테이너 (모델 로드 전에도 동작)
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 1, 0);
    scene.add(this.mesh);

    this.velocityY = 0;
    this.onGround = true;
    this.yaw = 0;           // 좌우 회전(마우스 X)
    this.cameraPitch = 0.3; // 카메라 상하 각(마우스 Y)
    this.speed = 6;
    this.runSpeed = 11;
    this.sensitivityX = 1.0;
    this.sensitivityY = 1.0;
    this.cameraDistance = 8;
    this.turnSpeed = 10;    // 캐릭터 회전 보간 속도(클수록 빠르게 돌아봄)
    this.groundOffset = 0;  // 발이 모델 원점(y=0)에 정렬되므로 0

    // 애니메이션
    this.mixer = null;
    this.actions = {};         // idle/walk/run/jump ...
    this.current = null;

    this.keys = {};
    this._initInput();
    this._loadModel();
  }

  _loadModel() {
    loader.load(PLAYER_PATH, (gltf) => {
      const model = gltf.scene;
      // 키 정규화 + 발을 y=0에 정렬
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      model.scale.setScalar(TARGET_HEIGHT / (size.y || 1));
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.y -= box2.min.y;
      model.rotation.y = FACE_FIX;

      model.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.frustumCulled = false;
        }
      });

      this.mesh.add(model);
      this.model = model;
      this.mixer = new THREE.AnimationMixer(model);

      // glb 내장 클립(idle/walk/run) 등록 + Mixamo 전진 모션 제거
      for (const clip of (gltf.animations || [])) {
        const kind = classifyClip(clip.name);
        if (!kind) continue;
        stripRootMotion(clip);
        this.actions[kind] = this.mixer.clipAction(clip);
      }

      this._setAction('idle', 0);
    }, undefined, (err) => {
      console.error('[player] GLB 로드 실패:', err);
    });
  }

  _setAction(kind, fade = 0.2) {
    const next = this.actions[kind] || this.actions.idle;
    if (!next || next === this.current) return;
    next.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
  }

  _initInput() {
    window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));

    const canvas = document.getElementById('app');
    canvas.addEventListener('click', () => canvas.requestPointerLock());
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      this.yaw -= e.movementX * 0.0025 * this.sensitivityX;
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch + e.movementY * 0.0025 * this.sensitivityY, -0.6, 1.3
      );
    });
  }

  update(dt, camera, getHeight = () => 0) {
    const k = this.keys;
    const running = k['ShiftLeft'] || k['ShiftRight'];
    const spd = running ? this.runSpeed : this.speed;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (k['KeyW']) move.add(forward);
    if (k['KeyS']) move.sub(forward);
    if (k['KeyD']) move.add(right);
    if (k['KeyA']) move.sub(right);

    const moving = move.lengthSq() > 0;
    if (moving) {
      move.normalize().multiplyScalar(spd * dt);
      this.mesh.position.add(move);
      this.targetFacing = Math.atan2(move.x, move.z);
    }

    // 목표 방향으로 부드럽게 회전(최단 경로) — 즉시 꺾임/순간이동 방지
    if (this.targetFacing !== undefined) {
      let diff = this.targetFacing - this.mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // [-π, π]로 래핑
      this.mesh.rotation.y += diff * Math.min(1, this.turnSpeed * dt);
    }

    // 점프 + 중력
    if (k['Space'] && this.onGround) {
      this.velocityY = 8;
      this.onGround = false;
    }
    this.velocityY -= 22 * dt;
    this.mesh.position.y += this.velocityY * dt;

    const groundY = getHeight(this.mesh.position.x, this.mesh.position.z) + this.groundOffset;
    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      this.velocityY = 0;
      this.onGround = true;
    }

    // 애니메이션 상태 선택 (클립이 있을 때만)
    if (this.mixer) {
      let kind = 'idle';
      if (!this.onGround && this.actions.jump) kind = 'jump';
      else if (moving) kind = running && this.actions.run ? 'run' : 'walk';
      this._setAction(kind);
      this.mixer.update(dt);
    }

    this._updateCamera(camera);
  }

  _updateCamera(camera) {
    const dist = this.cameraDistance;
    const height = dist * 0.35;
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * dist * Math.cos(this.cameraPitch),
      height + Math.sin(this.cameraPitch) * dist,
      Math.cos(this.yaw) * dist * Math.cos(this.cameraPitch)
    );
    const target = this.mesh.position.clone().add(offset);
    camera.position.lerp(target, 0.15);
    camera.lookAt(
      this.mesh.position.x,
      this.mesh.position.y + 1.5,
      this.mesh.position.z
    );
  }
}

// 클립 이름 → 동작 키워드 (Mixamo/Quaternius 공통)
function classifyClip(clipName) {
  const n = (clipName || '').toLowerCase();
  if (n.includes('idle')) return 'idle';
  if (n.includes('walk')) return 'walk';
  if (n.includes('run') || n.includes('jog')) return 'run';
  if (n.includes('jump')) return 'jump';
  return null;
}

// Mixamo 루트 모션 제거: 엉덩이(Hips) 위치 트랙의 수평(X,Z) 성분을 0으로 고정해
// 제자리 애니메이션으로 만든다. 수직(Y, 상하 흔들림)은 보존.
// → 클립 반복 시 위치가 리셋되며 뒤로 튀던 현상 해결.
function stripRootMotion(clip) {
  for (const track of clip.tracks) {
    if (/hips?\.position$/i.test(track.name)) {
      const v = track.values; // [x,y,z, x,y,z, ...]
      for (let i = 0; i < v.length; i += 3) {
        v[i] = 0;       // X
        v[i + 2] = 0;   // Z
      }
    }
  }
}
