// 인트로 컷신 — 뉴스 속보로 거대 운석 충돌 임박을 알리고,
// 주인공이 "사라지기 전에 이 행성의 생명을 기록하겠다"고 결심하는 흐름.
// onStart() 콜백으로 게임을 시작한다.

const SCENES = [
  {
    tag: '🔴 BREAKING NEWS',
    title: '거대 소행성, 지구 충돌 궤도 진입',
    body: '국제천문연맹 긴급 발표 — 지름 수 킬로미터의 소행성이\n사흘 뒤 지구와 충돌할 것으로 확인되었습니다.',
    quote: '"막을 방법은 없습니다. 남은 시간은… 약 3일입니다." — 천문학 박사',
  },
  {
    tag: '⚠ 전 세계 비상',
    title: '하늘이 붉게 물들기 시작했다',
    body: '대기권 진입을 앞둔 파편들이 곳곳에 떨어지고,\n땅이 흔들리며 숲의 생명들이 술렁인다.',
    quote: '도시는 마비됐고, 사람들은 각자의 마지막을 준비한다.',
  },
  {
    tag: '📷 당신의 선택',
    title: '마지막 기록',
    body: '사진가인 당신은 결심한다.\n사라지기 전에, 이 행성의 살아있는 모든 것을 카메라에 담기로.',
    quote: '"누군가는 이들이 여기 있었음을 남겨야 해."',
  },
];

export function showIntro(onStart) {
  const root = document.createElement('div');
  root.id = 'intro';
  const style = document.createElement('style');
  style.textContent = `
    #intro { position:fixed; inset:0; z-index:50; background:#05070a; color:#eee;
      font-family:'Segoe UI',sans-serif; display:flex; flex-direction:column;
      align-items:center; justify-content:center; text-align:center; padding:6vw;
      overflow:hidden; }
    #intro .scanlines { position:absolute; inset:0; pointer-events:none; opacity:.25;
      background:repeating-linear-gradient(rgba(255,255,255,.04) 0 1px, transparent 1px 3px); }
    #intro .glow { position:absolute; left:50%; top:-30%; width:120vw; height:80vh;
      transform:translateX(-50%); pointer-events:none;
      background:radial-gradient(ellipse at center, rgba(200,60,20,.35), transparent 60%);
      animation:doomPulse 4s ease-in-out infinite; }
    @keyframes doomPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
    #intro .tag { display:inline-block; font:bold 14px monospace; letter-spacing:.15em;
      color:#ff5a3c; border:1px solid #ff5a3c55; padding:4px 12px; border-radius:4px;
      margin-bottom:22px; animation:tagBlink 1.4s step-end infinite; }
    @keyframes tagBlink { 0%,100%{opacity:1} 50%{opacity:.45} }
    #intro h1 { font-size:clamp(22px,4.4vw,46px); margin:0 0 20px; line-height:1.25;
      text-shadow:0 2px 18px rgba(255,80,40,.4); }
    #intro p.body { font-size:clamp(14px,2vw,19px); color:#cdd3da; line-height:1.7;
      white-space:pre-line; max-width:760px; margin:0 0 18px; }
    #intro p.quote { font-size:clamp(13px,1.7vw,17px); color:#9aa3ad; font-style:italic;
      max-width:680px; }
    #intro .controls { position:absolute; bottom:6vh; left:0; right:0;
      display:flex; gap:14px; justify-content:center; align-items:center; }
    #intro button { font:bold 16px sans-serif; padding:12px 26px; border-radius:8px;
      border:0; cursor:pointer; }
    #intro .next { background:#c0381f; color:#fff; }
    #intro .next:hover { background:#e04826; }
    #intro .skip { background:transparent; color:#7a828c; border:1px solid #2a3038; }
    #intro .skip:hover { color:#aeb6bf; }
    #intro .stage { max-width:840px; animation:fadeUp .6s ease both; }
    @keyframes fadeUp { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:none} }
    #intro .dots { position:absolute; bottom:6vh; left:50%; transform:translateX(-50%);
      display:flex; gap:8px; }
    #intro .dots i { width:8px; height:8px; border-radius:50%; background:#333; }
    #intro .dots i.on { background:#ff5a3c; }
  `;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="glow"></div><div class="scanlines"></div>
    <div class="stage"></div>
    <div class="dots"></div>
    <div class="controls">
      <button class="skip">건너뛰기</button>
      <button class="next">다음 ▶</button>
    </div>`;
  document.body.appendChild(root);

  const stage = root.querySelector('.stage');
  const dots = root.querySelector('.dots');
  const nextBtn = root.querySelector('.next');
  const skipBtn = root.querySelector('.skip');
  dots.innerHTML = SCENES.map(() => '<i></i>').join('');

  let i = 0;
  const render = () => {
    const s = SCENES[i];
    stage.style.animation = 'none'; void stage.offsetWidth; stage.style.animation = '';
    stage.innerHTML = `
      <span class="tag">${s.tag}</span>
      <h1>${s.title}</h1>
      <p class="body">${s.body}</p>
      <p class="quote">${s.quote}</p>`;
    dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i));
    nextBtn.textContent = i === SCENES.length - 1 ? '기록을 시작한다 📷' : '다음 ▶';
  };

  const finish = () => {
    root.remove();
    onStart();
  };

  nextBtn.onclick = () => { if (i < SCENES.length - 1) { i++; render(); } else finish(); };
  skipBtn.onclick = finish;
  render();
}
