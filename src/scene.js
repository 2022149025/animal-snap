import * as THREE from 'three';

// 씬, 카메라, 렌더러, 조명, 그림자, 안개 구성
export function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b9d4);
  // 거리 안개 — 분위기 + 원경 드로우 절감
  scene.fog = new THREE.Fog(0x87b9d4, 40, 120);

  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 500
  );
  camera.position.set(0, 6, 10);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 환경광 + 태양(그림자 생성용 DirectionalLight)
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4f6b3a, 0.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2cc, 2.2);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  const d = 60;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, sun, hemi };
}

// 임시 지형(바닥). 추후 텍스처/높낮이로 교체 예정.
export function createGround(scene) {
  const geo = new THREE.PlaneGeometry(300, 300, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a8f43, roughness: 1 });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}
