import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new FBXLoader();

// 동물별 에셋 + 도감 정보 + 거동 파라미터
// faceFix: 모델 정면이 +Z가 아닐 때 보정할 yaw(라디안)
export const ANIMAL_DEFS = {
  Cow:         { path: 'assets/farm/FBX/Cow.fbx',         name: '소',            h: 2.2, faceFix: 0, timid: 0.4,  desc: '농장의 평화로운 친구.' },
  Horse:       { path: 'assets/farm/FBX/Horse.fbx',       name: '말',            h: 2.6, faceFix: 0, timid: 0.7,  desc: '빠르게 달리는 초식동물.' },
  Zebra:       { path: 'assets/farm/FBX/Zebra.fbx',       name: '얼룩말',        h: 2.4, faceFix: 0, timid: 0.8,  desc: '줄무늬가 매력적인 동물.' },
  Pig:         { path: 'assets/farm/FBX/Pig.fbx',         name: '돼지',          h: 1.4, faceFix: 0, timid: 0.5,  desc: '진흙을 좋아하는 동물.' },
  Sheep:       { path: 'assets/farm/FBX/Sheep.fbx',       name: '양',            h: 1.6, faceFix: 0, timid: 0.5,  desc: '폭신한 양털을 가진 동물.' },
  Rat:         { path: 'assets/enemy/FBX/Rat.fbx',        name: '쥐',            h: 1.0, faceFix: 0, timid: 0.9,  desc: '재빠른 설치류.' },
  Frog:        { path: 'assets/enemy/FBX/Frog.fbx',       name: '개구리',        h: 0.9, faceFix: 0, timid: 0.85, desc: '연못가의 점프 챔피언.' },
  Spider:      { path: 'assets/enemy/FBX/Spider.fbx',     name: '거미',          h: 1.1, faceFix: 0, timid: 0.6,  desc: '여덟 다리의 사냥꾼.' },
  Trex:        { path: 'assets/dino/FBX/Trex.fbx',        name: '티라노사우루스', h: 3.2, faceFix: 0, timid: 0.3,  desc: '전설의 공룡 왕.' },
  Triceratops: { path: 'assets/dino/FBX/Triceratops.fbx', name: '트리케라톱스',   h: 2.6, faceFix: 0, timid: 0.35, desc: '뿔 셋 달린 초식 공룡.' },
};

// 클립 이름 → 동작 키워드
function classifyClip(clipName) {
  const n = clipName.toLowerCase();
  if (n.includes('idle')) return 'idle';
  if (n.includes('walk')) return 'walk';      // walkslow 포함
  if (n.includes('run') || n.includes('gallop')) return 'run';
  if (n.includes('jump')) return 'jump';
  if (n.includes('fly')) return 'walk';        // wasp
  if (n.includes('attack')) return 'attack';
  if (n.includes('death')) return 'death';
  return null;
}

// 종별 원본 FBX를 1회만 로드해 캐시 (Promise 캐싱)
const speciesCache = {};
export function loadSpecies(key) {
  if (speciesCache[key]) return speciesCache[key];
  const def = ANIMAL_DEFS[key];
  if (!def) return Promise.reject(new Error('unknown animal ' + key));

  speciesCache[key] = new Promise((resolve, reject) => {
    loader.load(
      def.path,
      (fbx) => {
        // 목표 높이에 맞춰 스케일 정규화 + 발을 y=0에 정렬
        const box = new THREE.Box3().setFromObject(fbx);
        const size = new THREE.Vector3();
        box.getSize(size);
        fbx.scale.setScalar(def.h / (size.y || 1));
        const box2 = new THREE.Box3().setFromObject(fbx);
        fbx.position.y -= box2.min.y;

        resolve({ prototype: fbx, animations: fbx.animations, def });
      },
      undefined,
      reject
    );
  });
  return speciesCache[key];
}

// 종 프로토타입을 복제해 독립 애니 믹서를 가진 인스턴스 생성
export class Animal {
  constructor(species) {
    this.def = species.def;
    this.object = cloneSkeleton(species.prototype);
    this.object.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        c.frustumCulled = false;
      }
    });

    this.mixer = new THREE.AnimationMixer(this.object);
    this.actions = {};
    for (const clip of species.animations) {
      const kind = classifyClip(clip.name);
      if (kind && !this.actions[kind]) {
        this.actions[kind] = this.mixer.clipAction(clip);
      }
    }
    if (!this.actions.idle && species.animations.length) {
      this.actions.idle = this.mixer.clipAction(species.animations[0]);
    }
    this.current = null;
    this.play('idle', 0);
  }

  play(kind, fade = 0.25) {
    const next = this.actions[kind] || this.actions.idle;
    if (!next || next === this.current) return;
    next.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
  }

  update(dt) {
    this.mixer.update(dt);
  }
}
