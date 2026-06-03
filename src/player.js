import * as THREE from 'three';

// 임시 플레이어(캡슐). 추후 Quaternius 캐릭터 모델로 교체.
// 3인칭 이동 + 마우스 시점(포인터 잠금) + 점프(중력).
export class Player {
  constructor(scene) {
    const geo = new THREE.CapsuleGeometry(0.5, 1, 6, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff7043 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, 1, 0);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // 바라보는 방향 표시용 코(임시)
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    nose.position.set(0, 0.3, -0.6);
    this.mesh.add(nose);

    this.velocityY = 0;
    this.onGround = true;
    this.yaw = 0;           // 좌우 회전(마우스 X)
    this.cameraPitch = 0.3; // 카메라 상하 각(마우스 Y)
    this.speed = 6;
    this.runSpeed = 11;
    this.sensitivityX = 1.0;   // 좌우 마우스 감도 (Controls 패널)
    this.sensitivityY = 1.0;   // 상하 마우스 감도
    this.cameraDistance = 8;   // 3인칭 카메라 거리

    this.keys = {};
    this._initInput();
  }

  _initInput() {
    window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));

    // 포인터 잠금으로 시점 조작
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

  // getHeight: (x, z) → 지형 높이 (buildWorld 완료 전엔 0 반환해도 무방)
  update(dt, camera, getHeight = () => 0) {
    const k = this.keys;
    const running = k['ShiftLeft'] || k['ShiftRight'];
    const spd = running ? this.runSpeed : this.speed;

    // 카메라 yaw 기준 이동 방향 계산
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (k['KeyW']) move.add(forward);
    if (k['KeyS']) move.sub(forward);
    if (k['KeyD']) move.add(right);
    if (k['KeyA']) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(spd * dt);
      this.mesh.position.add(move);
      const targetAngle = Math.atan2(move.x, move.z);
      this.mesh.rotation.y = targetAngle;
    }

    // 점프 + 중력 (Physically based Animation)
    if (k['Space'] && this.onGround) {
      this.velocityY = 8;
      this.onGround = false;
    }
    this.velocityY -= 22 * dt;
    this.mesh.position.y += this.velocityY * dt;

    // 지형 높이에 맞춰 착지 (캡슐 반지름=0.5 + 높이/2=0.5 → 중심이 지형+1 위)
    const groundY = getHeight(this.mesh.position.x, this.mesh.position.z) + 1;
    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      this.velocityY = 0;
      this.onGround = true;
    }

    this._updateCamera(camera);
  }

  // 3인칭: 플레이어 뒤에서 yaw/pitch 만큼 떨어진 위치로 부드럽게 추적
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
