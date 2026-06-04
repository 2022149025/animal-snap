import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

// Controls 패널 — 우상단 lil-gui
// player, doomsday 객체를 받아 실시간 연결
export function createSettingsPanel(player, doomsday, cameraMode) {
  const gui = new GUI({ title: 'Controls', width: 220 });

  const params = {
    '마우스 감도': 1.0,
    '카메라 거리': 8,
    '상하 감도':   1.0,
    '카메라 줌':   1.9,   // 촬영(C) 모드 줌 배율
    '종말 시간(분)': doomsday ? doomsday.duration / 60 : 10,
    '막바지로 ▶': () => { if (doomsday) doomsday.elapsed = doomsday.duration * 0.82; }, // 데모/테스트용
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

  // 카메라 줌 (촬영 모드 확대 배율 — 클수록 더 당겨짐)
  if (cameraMode) {
    gui.add(params, '카메라 줌', 1.0, 4.0, 0.1).onChange(v => {
      cameraMode.zoomFov = cameraMode.normalFov / v;
    });
  }

  // 종말 시간(분) — 한 판(=3일)의 실제 길이
  if (doomsday) {
    gui.add(params, '종말 시간(분)', 2, 30, 1).onChange(v => {
      doomsday.duration = v * 60;
    });
    gui.add(params, '막바지로 ▶'); // 데모: 종말 직전으로 점프
  }

  return gui;
}
