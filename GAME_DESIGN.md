# 동물 찾기 — 게임 기획서 (Computer Graphics Term Project)

> **가제: Safari Snap — 숲속 동물 도감 탐험대**
> Three.js 기반 3D 웹 게임 · 에셋: Quaternius.com (CC0)
> 마감: 2026.6.5(금) 자정 · 팀 3인

---

## 1. 한 줄 컨셉
저폴리 숲을 3인칭으로 탐험하며, 숨어 있는 동물들을 **카메라로 촬영해 도감(Pokédex 식)을 완성**하는 힐링 탐험 게임. 낮에는 자유 탐험, 밤에는 손전등으로 야행성 동물을 찾는다.

## 2. 승리 조건 / 코어 루프
1. 플레이어가 숲 맵을 자유 이동 (WASD + 마우스)
2. 동물들이 맵 곳곳에 배치되어 idle/걷기 (Skeletal Animation)
3. 가까이 가면 동물이 도망 (도주 AI + 가속 물리)
4. **C 키 → 카메라 모드**: 줌인, 조준선 안에 동물을 담아 **스페이스로 촬영**
5. 촬영 성공 시 **도감에 등록** (이름/사진/설명) + 점수
6. 전체 동물 도감을 모두 채우면 클리어 (또는 제한시간 내 최다 촬영)
7. **N 키 → 낮↔밤 토글**: 밤엔 손전등(Spotlight)으로만 시야 확보, 야행성 동물 등장

## 3. 조작
| 키 | 동작 |
|---|---|
| W A S D | 이동 |
| Mouse | 시점 회전 |
| Shift | 달리기 |
| Space | 점프 / (카메라 모드에서) 촬영 |
| C | 카메라 모드 토글 (줌/조준) |
| N | 낮↔밤 전환 |
| Tab | 도감 열기/닫기 |

## 4. CG 기법 ↔ 구현 매핑 (리포트 "기능 구현 표" 직결)
점수의 핵심. 각 기법이 게임 안에서 **자연스럽게** 드러나도록 설계.

| # | CG 기법 | 게임 내 구현 | 예정 소스 위치 |
|---|---|---|---|
| 1 | Skeletal Animation | Quaternius 애니 동물 idle/walk/run 전환 | animals.js |
| 2 | Keyframe Animation | 낮↔밤 태양 궤도, 도감 UI 등장, 셔터 연출 | dayNight.js / ui.js |
| 3 | Physically based Animation | 동물 도주 가속/방향전환, 점프 중력, 풀 흔들림 | animalAI.js / player.js |
| 4 | Shadows | 태양 DirectionalLight 그림자 맵 (PCFSoft) | scene.js |
| 5 | Spotlight | 야간 손전등 콘 라이트 (카메라에 부착) | flashlight.js |
| 6 | Texture mapping | 지형/스카이박스/모델 텍스처 | world.js |
| 7 | (기타) Fog | 거리 안개 — 분위기 + 드로우 최적화 | scene.js |
| 8 | (기타) Postprocessing | Bloom (밤 빛 강조), Vignette | postfx.js |
| 9 | (기타) Particles | 촬영 성공 반짝임, 낙엽/먼지 | particles.js |
| 10 | (기타) Instancing | 나무·풀 대량 배치 성능 최적화 | world.js |

> "기타" 항목(7~10)은 수업에서 안 배웠다면 리포트 **"기타 사용 기능"** 섹션에 출처·이론 정리.

## 5. 에셋 (Quaternius.com, 전부 CC0)
- **Animated Animals** — 동물 본체 (핵심, 스켈레탈 애니 포함): 여우/사슴/토끼/곰/늑대 등
- **Ultimate Nature Pack** — 나무, 바위, 풀, 버섯, 그루터기 (맵 구성)
- **RPG Characters / Cute Characters** — 플레이어 캐릭터 (애니 포함된 것 선택)
- 포맷: GLTF/GLB 우선 (Three.js GLTFLoader). FBX면 변환.

## 6. 기술 스택 / 실행 환경
- **Three.js** (모듈 import, r160+) + Vite (개발) → 정적 빌드
- 배포: **GitHub Pages** 또는 Vercel (브라우저 실행 필수 — 안 되면 0점)
- 외부 라이브러리 최소화. 사용 시 리포트 출처 명시.
- 에셋·텍스처는 상대경로로 포함 (CORS/경로 깨짐 주의)

## 7. 폴더 구조(안)
```
3jsZombie/
├─ index.html
├─ src/
│  ├─ main.js          # 부트스트랩, 게임 루프
│  ├─ scene.js         # 씬/카메라/렌더러/조명/그림자/안개
│  ├─ world.js         # 지형, 나무/풀 instancing, 텍스처
│  ├─ player.js        # 3인칭 이동/점프/카메라 추적
│  ├─ animals.js       # 동물 로딩, 스켈레탈 애니
│  ├─ animalAI.js      # 도주 AI + 물리
│  ├─ camera_mode.js   # 촬영 모드(줌/조준/판정)
│  ├─ dayNight.js      # 낮밤 전환(keyframe)
│  ├─ flashlight.js    # 야간 spotlight
│  ├─ postfx.js        # bloom/vignette
│  ├─ particles.js     # 파티클
│  └─ ui.js            # 도감/HUD
├─ assets/             # Quaternius 모델, 텍스처
└─ README.md
```

## 8. 일정 (오늘 6/3 → 마감 6/5 자정, 약 2.5일)
- **Day 0 (6/3 밤)**: 기획 확정 ✅ · 프로젝트 셋업(Vite+Three) · 에셋 다운로드 · 빈 씬+바닥+조명+3인칭 카메라
- **Day 1 (6/4)**: 지형/나무 배치 · 플레이어 이동/애니 · 동물 1종 로딩+스켈레탈 애니 · 그림자
- **Day 2 (6/5 오전)**: 동물 도주 AI · 카메라 촬영 모드 · 도감 UI · 낮밤+손전등
- **Day 2 (6/5 오후)**: 파티클/포스트FX/사운드 · 밸런싱 · **배포** · 시연영상 · **리포트 작성**

## 9. 분담 (본인 주력)
- **본인**: 전체 코드 구현
- **팀원 A**: 에셋 수집/정리, Quaternius 모델 선별·변환, 리포트 "기능 표" 위치 기록 보조
- **팀원 B**: 3분 시연영상 촬영·편집(자막), 리포트 문서화·교정, 발표 자료

## 10. 리스크 & 대응
- ⏰ **시간 부족**: MVP(이동+동물1종+촬영+도감) 먼저 완성 → 이후 낮밤/파티클은 가산점성. 기능별 우선순위 사수.
- 🌐 **브라우저 미실행=0점**: 매일 배포 테스트. 경로/CORS 사전 점검.
- 🐾 **애니 호환**: Quaternius GLB 애니 클립 이름 확인 후 동물 선정.

---

## 다음 단계
1. 프로젝트 셋업(Vite + Three.js) 생성
2. Quaternius에서 에셋 다운로드 (Animated Animals / Ultimate Nature / Characters)
3. 첫 씬: 바닥 + 조명 + 그림자 + 3인칭 카메라 동작 확인
