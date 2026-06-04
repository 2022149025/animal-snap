import { createScene } from './scene.js';
import { Player } from './player.js';
import { AnimalManager } from './animalAI.js';
import { UI } from './ui.js';
import { CameraMode } from './cameraMode.js';
import { buildWorld, getTerrainHeight } from './world.js';
import { DayNight } from './dayNight.js';
import { Flashlight } from './flashlight.js';
import { createSettingsPanel } from './settings.js';

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

// 낮밤 사이클 + 손전등
const dayNight = new DayNight(scene, sun, hemi);
const flashlight = new Flashlight(scene, camera);

// Controls 패널 (감도, 카메라 거리 등)
createSettingsPanel(player, dayNight, cameraMode);

// 디버그 핸들 (개발용)
window.__game = { scene, camera, renderer, player, animalMgr, ui, cameraMode, dayNight, flashlight };

let last = performance.now();
function animate(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  player.update(dt, camera, getTerrainHeight);
  animalMgr.update(dt, player.mesh.position, getTerrainHeight);
  cameraMode.update(dt);
  dayNight.update(dt);
  flashlight.update(dayNight.dayFactor);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
