import { createScene } from './scene.js';
import { Player } from './player.js';
import { AnimalManager } from './animalAI.js';
import { UI } from './ui.js';
import { CameraMode } from './cameraMode.js';
import { buildWorld, getTerrainHeight } from './world.js';
import { Doomsday } from './doomsday.js';
import { Flashlight } from './flashlight.js';
import { createSettingsPanel } from './settings.js';
import { IntroCinematic } from './intro3d.js';
import { MeteorStrikes } from './meteors.js';

const canvas = document.getElementById('app');
const { scene, camera, renderer, sun, hemi } = createScene(canvas);

// 숲 월드 구성 (지형 텍스처 + 나무/바위/풀)
buildWorld(scene, { area: 95 }).then(() => console.log('[world] built'));

const player = new Player(scene);

// 동물 스폰 (지형 높이 전달)
const animalMgr = new AnimalManager(scene);
animalMgr.spawn(
  {
    Cow: 2, Horse: 2, Zebra: 2, Pig: 2, Sheep: 2, Rat: 2, Frog: 2, Spider: 2, Trex: 1, Triceratops: 1,
    // 추가 동물
    Deer: 3, Stag: 2, Fox: 3, Wolf: 2, Alpaca: 2, Bull: 2, Donkey: 2, Husky: 2, ShibaInu: 2,
  },
  { bounds: 90, getHeight: getTerrainHeight }
).then((agents) => console.log('[spawn] total animals:', agents.length));

// UI + 카메라(촬영) 모드
const ui = new UI();
const cameraMode = new CameraMode(camera, renderer, animalMgr, ui, player);

// 종말 진행(붉어지는 하늘 + 카운트다운) + 손전등
const doomsday = new Doomsday(scene, sun, hemi, { duration: 600 }); // 기본 10분
const flashlight = new Flashlight(scene, camera);

// Controls 패널 (감도, 카메라 거리, 종말 시간 등)
createSettingsPanel(player, doomsday, cameraMode);

// 게임 중 운석 낙하(흔들림·크레이터·생명체 사망) — 종말 카운트다운 중에만 활성
const meteors = new MeteorStrikes(scene, camera, animalMgr, doomsday, getTerrainHeight, ui, player);

// 3D 시네마틱 인트로 (게임 씬 위에서 카메라 연출 + 운석). 종료 시 게임플레이 시작.
const intro = new IntroCinematic(scene, camera, doomsday);
let introActive = true;
intro.onDone = () => { introActive = false; };

// 디버그 핸들 (개발용)
window.__game = { scene, camera, renderer, player, animalMgr, ui, cameraMode, doomsday, flashlight, intro, meteors };

let last = performance.now();
function animate(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (introActive) {
    // 인트로 중: 카메라는 시네마틱이 제어, 동물은 살아 움직이게 둠
    intro.update(dt);
    animalMgr.update(dt, player.mesh.position, getTerrainHeight);
    doomsday.update(dt);
  } else {
    player.update(dt, camera, getTerrainHeight);
    animalMgr.update(dt, player.mesh.position, getTerrainHeight);
    cameraMode.update(dt);
    doomsday.update(dt);
    meteors.update(dt);
    meteors.applyShake(camera);   // player.update 이후 카메라에 흔들림 적용
  }
  flashlight.update(doomsday.dayFactor);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
