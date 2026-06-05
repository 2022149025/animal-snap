# 사라지기 전에 (Before It's Gone) — 게임 설계서

> Three.js 기반 3D 웹 게임 · 에셋: Quaternius.com (CC0)
> Computer Graphics Term Project

---

## 1. 한 줄 컨셉
막을 수 없는 거대 운석 충돌까지 사흘. 사진가가 된 플레이어가 **사라지기 전에 이 행성의 모든 생명을 카메라로 기록**하는 3인칭 탐험 게임. 시간이 흐를수록 하늘이 붉게 타오르고 운석이 쏟아지며, 미처 찍지 못한 종은 영영 사라진다.

## 2. 코어 루프 / 승패
1. 저폴리 숲을 3인칭(또는 1인칭)으로 자유 탐험한다.
2. 아직 촬영하지 않은 동물은 푸르게 **발광**한다 — "아직 기록되지 않은 생명".
3. **C**로 카메라(촬영) 모드 진입 → 줌·뷰파인더로 조준 → **좌클릭**으로 촬영.
4. 촬영에 성공하면 **도감에 사진·이름·설명이 등록**된다(종 단위, 총 24종).
5. 화면 상단 **종말 카운트다운(D-3 → D-0)** 이 흐르고, 하늘·안개·빛이 낮 → 황혼 → 주황 → 핏빛 → 암흑으로 물든다.
6. 진행될수록 **운석 낙하**가 잦고 격렬해진다. 낙하 6초 전 지면에 경고 마커가 뜨고, 충돌 시 섬광·화면 흔들림·그을림 크레이터와 함께 **반경 내 생명체가 사망**한다.
7. **영구 소멸**: 못 찍은 종의 마지막 개체가 죽으면 도감에 "소실됨"으로 영영 빈칸이 된다(몸도 기억도 사라짐).
8. 플레이어도 운석에 직격당하면 **즉사** → "기록, 여기서 멈추다" 조기 엔딩.
9. **D-0 대충돌** 시 화이트아웃 → 결과 화면(기록한 종 수 / 사진 갤러리 / 소실된 생명체 수 / 평가).
10. 목표는 사라지기 전에 **최대한 많은 종을 기록**하는 것. 24종 전부(=완벽한 기록)는 무자비한 운석 탓에 달성이 매우 어렵고, "얼마나 남겼는가"가 곧 점수다.

## 3. 조작
| 키 | 동작 |
|---|---|
| W A S D | 이동 |
| Shift | 달리기 |
| Space | 점프 |
| Mouse | 시점 회전 (클릭하여 잠금) |
| C | 카메라(촬영) 모드 토글 |
| 좌클릭 | 촬영 |
| Tab | 도감 열기/닫기 |
| V | 1·3인칭 전환 |
| Esc | 포인터 잠금 해제 → 일시정지 |

## 4. CG 기법 ↔ 구현 매핑 (리포트 핵심)
| # | CG 기법 | 게임 내 구현 | 소스 |
|---|---|---|---|
| 1 | Skeletal Animation | 동물·플레이어의 idle/walk/run/jump 스켈레탈 애니 + 속도 기반 전환 | animals.js, player.js |
| 2 | Keyframe 보간 | 종말 진행도에 따른 하늘·안개·태양 색 스톱 보간 | doomsday.js |
| 3 | Physically based Animation | 동물 도주 가속·관성, 점프 중력, 물고기 부유, 카메라 트라우마 흔들림 | animalAI.js, player.js, meteors.js |
| 4 | Shadows | 태양 DirectionalLight PCF 그림자 맵 | scene.js |
| 5 | Spotlight | 카메라에 부착된 손전등(어두워질수록 밝아짐) | flashlight.js |
| 6 | Texture Mapping | 지형 멀티텍스처, 모델 텍스처, 스카이 색 | world.js, scene.js |
| 7 | Custom GLSL Shader | onBeforeCompile로 지형에 값 노이즈 기반 잔디/흙/낙엽 블렌딩 + 나무 밑 낙엽 마스크 | world.js |
| 8 | Fog | 거리 안개(종말이 가까울수록 자욱해져 시야 제한) | scene.js, doomsday.js |
| 9 | Instancing | 풀 대량 배치(InstancedMesh, 약 1,600개) | world.js |
| 10 | Particles / FX | 운석 불꼬리, 크레이터 데칼, 사망 연기 고리, 화면 섬광 | meteors.js |
| 11 | Procedural Texture | 캔버스 절차적 텍스처(잔디/흙/낙엽/그을림/발광 오라) | world.js, meteors.js, animals.js |
| 12 | Render-to-Image | 현재 프레임 캡처 → 사진(dataURL) 도감 등록 | cameraMode.js |
| 13 | 2D HUD / Minimap | 뷰파인더·도감·일시정지 + 캔버스 미니맵(플레이어·미촬영 종·운석 경고) | ui.js, minimap.js |

> 수업에서 다루지 않은 기법(커스텀 GLSL 셰이더, 인스턴싱, 절차적 텍스처, 화면 효과 등)은 리포트 "기타 사용 기능"에 이론·출처를 정리한다.

## 5. 에셋 (Quaternius.com, 전부 CC0 1.0)
- **Ultimate Animated Animals** — 사슴·여우·늑대·알파카·소·말 등 (스켈레탈 애니 내장, glTF)
- **Ultimate Animated Characters** — 플레이어 캐릭터(Doctor_Male_Young, 애니 내장 FBX)
- **Ultimate Nature / Nature Megapack / Trees** — 나무·바위·풀·꽃·그루터기 (FBX/glTF + 텍스처)
- **Farm / Dino / Enemy / Fishes** — 농장동물·공룡·소형동물·연못 어류 (FBX)
- 각 팩에 CC0 `License.txt` 포함. 런타임 미사용 포맷(Blends/OBJ 등)은 배포에서 제외.

## 6. 기술 스택 / 실행·배포
- **Three.js r0.184** + **Vite 8** (ES 모듈 import → 정적 빌드)
- 로컬 실행: `start.bat` 더블클릭 (또는 `npm install` → `npm run dev`)
- 배포: **GitHub Pages** (Actions 자동 빌드/배포, `vite base:'./'` 상대경로)
- 미사용 대용량 에셋은 `.gitignore`로 git·배포에서 제외(로컬 보존)

## 7. 폴더 구조
```
animal-snap-main/
├─ index.html
├─ start.bat              # 로컬 원클릭 실행 (설치+서버)
├─ vite.config.js
├─ src/
│  ├─ main.js             # 부트스트랩 · 게임 루프
│  ├─ scene.js            # 씬/카메라/렌더러/조명/그림자/안개
│  ├─ world.js            # 지형(커스텀 셰이더) · 나무/풀 배치 · 연못
│  ├─ player.js           # 3·1인칭 이동/점프/시점 · 캐릭터 로딩(FBX/glTF)
│  ├─ animals.js          # 동물 정의 · 로딩 · 스켈레탈 애니
│  ├─ animalAI.js         # 배회/도주 AI · 물고기 · 매니저
│  ├─ cameraMode.js       # 촬영 모드(줌/조준/판정/스냅샷)
│  ├─ doomsday.js         # 종말 카운트다운(하늘·빛 보간)
│  ├─ meteors.js          # 운석 예고·낙하·사망·화면 효과
│  ├─ flashlight.js       # 손전등(Spotlight)
│  ├─ minimap.js          # 코너 미니맵
│  ├─ ending.js           # 결과 화면
│  ├─ ui.js               # 도감/HUD/일시정지
│  ├─ settings.js         # lil-gui 설정 패널
│  └─ intro3d.js          # 3D 시네마틱 인트로
├─ public/assets/         # Quaternius 모델·텍스처 (CC0)
└─ .github/workflows/     # GitHub Pages 자동 배포
```

## 8. 구현 현황
- ✅ 3·1인칭 이동·점프·중력, 마우스 포인터 잠금 시점, 일시정지
- ✅ 커스텀 GLSL 지형, 인스턴스 풀, 연못과 헤엄치는 물고기
- ✅ 24종 동물 로딩·스켈레탈 애니·도주 AI·미촬영 발광
- ✅ 촬영 모드·뷰파인더·도감(종별 생존 수·소실 표시)
- ✅ 종말 카운트다운·운석 예고/낙하·영구 소멸·플레이어 즉사
- ✅ 미니맵·3D 시네마틱 인트로·결과 엔딩
- ✅ GitHub Pages 배포 구성

## 9. 크레딧
- 3D 에셋: **Quaternius** (quaternius.com) — CC0 1.0 Universal
- 폰트: Nanum Myeongjo (Google Fonts)
- 엔진: Three.js · 빌드: Vite
