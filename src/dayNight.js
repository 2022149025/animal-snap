import * as THREE from 'three';

// 태양을 KeyframeTrack + AnimationMixer로 구동 (Keyframe Animation 시연).
// 태양 높이에서 '낮 정도(dayFactor)'를 유도해 하늘/안개/조명을 보간.
const DAY_SKY = new THREE.Color(0x87b9d4);
const NIGHT_SKY = new THREE.Color(0x0b1530);
const DAY_FOG = new THREE.Color(0x87b9d4);
const NIGHT_FOG = new THREE.Color(0x0a1228);

const CYCLE = 60; // 1주기(초)

export class DayNight {
  constructor(scene, sun, hemi) {
    this.scene = scene;
    this.sun = sun;
    this.hemi = hemi;
    this.dayFactor = 1;

    // 태양 위치 키프레임 (정오→석양→자정→여명→정오)
    const R = 60;
    const times = [0, CYCLE * 0.25, CYCLE * 0.5, CYCLE * 0.75, CYCLE];
    const pos = [
      0, R, 20,          // 정오 (높음)
      R, 4, 0,           // 석양 (낮음, 옆)
      0, -R, -20,        // 자정 (지평선 아래)
      -R, 4, 0,          // 여명
      0, R, 20,          // 정오
    ];
    const track = new THREE.VectorKeyframeTrack('.position', times, pos);
    const clip = new THREE.AnimationClip('dayCycle', CYCLE, [track]);

    this.mixer = new THREE.AnimationMixer(sun);
    this.action = this.mixer.clipAction(clip);
    this.action.play();

    this.mixer.timeScale = 0.25;  // 평상시 천천히 흐름(약 4분/주기). N으로 즉시 전환.

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyN') this.jumpPhase();
    });
  }

  // N: 낮↔밤으로 즉시 점프 (데모용). setTime은 timeScale 영향을 받으므로 action.time 직접 설정.
  jumpPhase() {
    const target = this.dayFactor > 0.5 ? CYCLE * 0.5 : 0; // 밤(자정) ↔ 낮(정오)
    this.action.time = target;
    this.mixer.update(0);
    this.update(0);
  }

  update(dt) {
    this.mixer.update(dt);

    // 태양 높이로 낮 정도(0~1) 계산
    const h = this.sun.position.y;
    this.dayFactor = THREE.MathUtils.clamp((h + 10) / 50, 0, 1);
    const f = this.dayFactor;

    // 조명 보간
    this.sun.intensity = 0.1 + f * 2.2;
    this.hemi.intensity = 0.15 + f * 0.7;
    this.sun.color.setHSL(0.12, 0.5, 0.4 + f * 0.45);

    // 하늘/안개 색 보간
    this.scene.background.copy(NIGHT_SKY).lerp(DAY_SKY, f);
    if (this.scene.fog) this.scene.fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, f);
  }

  get isNight() { return this.dayFactor < 0.35; }
}
