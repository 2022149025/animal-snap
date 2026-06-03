import * as THREE from 'three';

// 카메라에 부착된 손전등(SpotLight) — 밤에만 켜짐 (Spotlight 시연)
export class Flashlight {
  constructor(scene, camera) {
    this.camera = camera;
    this.light = new THREE.SpotLight(0xfff0cc, 0, 60, Math.PI / 7, 0.4, 1.2);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 60;

    // 카메라 기준 위치/타깃을 매 프레임 갱신
    this.target = new THREE.Object3D();
    scene.add(this.light);
    scene.add(this.target);
    this.light.target = this.target;

    this._fwd = new THREE.Vector3();
    this.maxIntensity = 40;
  }

  update(dayFactor) {
    const cam = this.camera;
    // 손전등을 카메라 약간 위에 두고 카메라 정면을 비춤
    this.light.position.copy(cam.position);
    cam.getWorldDirection(this._fwd);
    this.target.position.copy(cam.position).addScaledVector(this._fwd, 10);

    // 밤일수록 밝게 (낮엔 꺼짐)
    const nightness = THREE.MathUtils.clamp(1 - dayFactor / 0.5, 0, 1);
    this.light.intensity = nightness * this.maxIntensity;
  }
}
