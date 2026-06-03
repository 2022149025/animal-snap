import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

// Controls 패널 — 우상단 lil-gui
// player, dayNight 객체를 받아 실시간 연결
export function createSettingsPanel(player, dayNight) {
  const gui = new GUI({ title: 'Controls', width: 220 });

  const params = {
    '마우스 감도': 1.0,
    '카메라 거리': 8,
    '상하 감도':   1.0,
    '낮밤 속도':   0.25,
    '낮으로':      () => { dayNight.action.time = 0; dayNight.mixer.update(0); dayNight.update(0); },
    '밤으로':      () => { dayNight.action.time = 30; dayNight.mixer.update(0); dayNight.update(0); },
  };

  // 마우스 감도
  gui.add(params, '마우스 감도', 0.2, 3.0, 0.05).onChange(v => {
    player.sensitivityX = v;
  });

  // 상하 감도 (독립 조절)
  gui.add(params, '상하 감도', 0.2, 3.0, 0.05).onChange(v => {
    player.sensitivityY = v;
  });

  // 카메라 거리
  gui.add(params, '카메라 거리', 4, 16, 0.5).onChange(v => {
    player.cameraDistance = v;
  });

  // 낮밤 속도
  gui.add(params, '낮밤 속도', 0, 1, 0.05).onChange(v => {
    dayNight.mixer.timeScale = v;
  });

  // 낮/밤 즉시 전환 버튼
  const timeFolder = gui.addFolder('시간 전환');
  timeFolder.add(params, '낮으로');
  timeFolder.add(params, '밤으로');
  timeFolder.close();

  return gui;
}
