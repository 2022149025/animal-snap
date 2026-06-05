import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

// 확장자에 따라 FBX/glTF 로더 선택 → { scene, animations } 반환
function loadModel(path) {
  return new Promise((resolve, reject) => {
    if (/\.gl(tf|b)$/i.test(path)) {
      gltfLoader.load(path, (g) => resolve({ scene: g.scene, animations: g.animations }), undefined, reject);
    } else {
      fbxLoader.load(path, (o) => resolve({ scene: o, animations: o.animations }), undefined, reject);
    }
  });
}

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

  // 추가 동물 (Quaternius 애니메이션 glTF — Idle/Walk/Gallop 내장)
  Deer:        { path: 'assets/animals/glTF/Deer.gltf',      name: '사슴',     h: 1.8, faceFix: 0, timid: 0.85, desc: '숲을 거니는 우아한 초식동물.' },
  Stag:        { path: 'assets/animals/glTF/Stag.gltf',      name: '수사슴',   h: 2.0, faceFix: 0, timid: 0.75, desc: '큰 뿔을 가진 숲의 군주.' },
  Fox:         { path: 'assets/animals/glTF/Fox.gltf',       name: '여우',     h: 0.8, faceFix: 0, timid: 0.9,  desc: '재빠르고 영리한 사냥꾼.' },
  Wolf:        { path: 'assets/animals/glTF/Wolf.gltf',      name: '늑대',     h: 1.1, faceFix: 0, timid: 0.5,  desc: '무리를 이루는 야생의 포식자.' },
  Alpaca:      { path: 'assets/animals/glTF/Alpaca.gltf',    name: '알파카',   h: 1.7, faceFix: 0, timid: 0.6,  desc: '복슬복슬한 안데스의 친구.' },
  Bull:        { path: 'assets/animals/glTF/Bull.gltf',      name: '황소',     h: 1.9, faceFix: 0, timid: 0.4,  desc: '힘이 넘치는 큰 뿔의 소.' },
  Donkey:      { path: 'assets/animals/glTF/Donkey.gltf',    name: '당나귀',   h: 1.6, faceFix: 0, timid: 0.5,  desc: '온순하고 끈기 있는 일꾼.' },
  Husky:       { path: 'assets/animals/glTF/Husky.gltf',     name: '허스키',   h: 0.9, faceFix: 0, timid: 0.4,  desc: '눈을 좋아하는 썰매견.' },
  ShibaInu:    { path: 'assets/animals/glTF/ShibaInu.gltf',  name: '시바견',   h: 0.7, faceFix: 0, timid: 0.45, desc: '동글동글 귀여운 강아지.' },

  // 물고기 (연못에서 헤엄침 — Swimming 애니메이션 내장 FBX)
  Clownfish:   { path: 'assets/fishes/FBX/Clownfish.fbx',  name: '흰동가리', h: 0.45, faceFix: 0, timid: 0.7, aquatic: true, desc: '주황 줄무늬의 산호초 물고기.' },
  Koi:         { path: 'assets/fishes/FBX/Koi.fbx',        name: '비단잉어', h: 0.7,  faceFix: 0, timid: 0.6, aquatic: true, desc: '연못을 우아하게 도는 잉어.' },
  BlueTang:    { path: 'assets/fishes/FBX/BlueTang.fbx',   name: '블루탱',   h: 0.5,  faceFix: 0, timid: 0.7, aquatic: true, desc: '선명한 파란빛 열대어.' },
  Puffer:      { path: 'assets/fishes/FBX/Puffer.fbx',     name: '복어',     h: 0.5,  faceFix: 0, timid: 0.6, aquatic: true, desc: '부풀어 오르는 동그란 물고기.' },
  Goldfish:    { path: 'assets/fishes/FBX/Goldfish.fbx',   name: '금붕어',   h: 0.4,  faceFix: 0, timid: 0.65, aquatic: true, desc: '반짝이는 금빛 물고기.' },
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

// 종별 원본 모델을 1회만 로드해 캐시 (Promise 캐싱). FBX/glTF 모두 지원.
const speciesCache = {};
export function loadSpecies(key) {
  if (speciesCache[key]) return speciesCache[key];
  const def = ANIMAL_DEFS[key];
  if (!def) return Promise.reject(new Error('unknown animal ' + key));

  speciesCache[key] = loadModel(def.path).then(({ scene, animations }) => {
    // 목표 높이에 맞춰 스케일 정규화 + 발을 y=0에 정렬
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    scene.scale.setScalar(def.h / (size.y || 1));
    const box2 = new THREE.Box3().setFromObject(scene);
    scene.position.y -= box2.min.y;

    return { prototype: scene, animations, def };
  });
  return speciesCache[key];
}

// 발광용 부드러운 원형 텍스처 (1회 생성)
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.4, 'rgba(170,225,255,0.55)');
  g.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
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

    // 아직 촬영하지 않은(도감에 없는) 동물 표시용 발광 오라
    const hh = this.def.h || 1;
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xaee4ff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    }));
    this.glow.scale.set(hh * 2.6, hh * 2.6, 1);
    this.glow.position.y = hh * 0.55;
    this.object.add(this.glow);

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
