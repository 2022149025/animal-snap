// 인트로 컷신 — 캔버스 애니메이션(별·행성·다가오는 운석·붉어지는 하늘) 위에
// 뉴스 속보 내러티브가 흐르고, 마지막에 섬광과 함께 게임이 시작된다.
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
    body: '대기권으로 쏟아지는 파편이 곳곳에 떨어지고,\n땅이 흔들리며 숲의 생명들이 술렁인다.',
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
    #intro { position:fixed; inset:0; z-index:50; background:#030407; color:#eee;
      font-family:'Segoe UI',sans-serif; overflow:hidden; }
    #introCanvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
    #intro .scanlines { position:absolute; inset:0; pointer-events:none; opacity:.18;
      background:repeating-linear-gradient(rgba(255,255,255,.05) 0 1px, transparent 1px 3px); }
    #intro .content { position:absolute; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center; text-align:center; padding:6vw; }
    #intro .tag { display:inline-block; font:bold 14px monospace; letter-spacing:.15em;
      color:#ff5a3c; border:1px solid #ff5a3c66; background:rgba(0,0,0,.35);
      padding:5px 13px; border-radius:4px; margin-bottom:22px;
      animation:tagBlink 1.4s step-end infinite; }
    @keyframes tagBlink { 0%,100%{opacity:1} 50%{opacity:.4} }
    #intro h1 { font-size:clamp(22px,4.6vw,48px); margin:0 0 20px; line-height:1.25;
      text-shadow:0 2px 22px rgba(255,90,50,.55), 0 0 2px #000; }
    #intro p.body { font-size:clamp(14px,2vw,19px); color:#dfe4ea; line-height:1.7;
      white-space:pre-line; max-width:760px; margin:0 0 18px; text-shadow:0 1px 6px #000; }
    #intro p.quote { font-size:clamp(13px,1.7vw,17px); color:#aab2bd; font-style:italic;
      max-width:680px; text-shadow:0 1px 6px #000; }
    #intro .stage { max-width:860px; animation:fadeUp .7s ease both; }
    @keyframes fadeUp { from{opacity:0; transform:translateY(16px)} to{opacity:1; transform:none} }
    #intro .controls { position:absolute; bottom:6vh; left:0; right:0;
      display:flex; gap:14px; justify-content:center; align-items:center; z-index:2; }
    #intro button { font:bold 16px sans-serif; padding:12px 26px; border-radius:8px;
      border:0; cursor:pointer; }
    #intro .next { background:#c0381f; color:#fff; box-shadow:0 0 22px rgba(192,56,31,.5); }
    #intro .next:hover { background:#e04826; }
    #intro .skip { background:rgba(0,0,0,.3); color:#7a828c; border:1px solid #2a3038; }
    #intro .skip:hover { color:#aeb6bf; }
    #intro .dots { position:absolute; top:calc(50% + 150px); left:50%; transform:translateX(-50%);
      display:flex; gap:8px; z-index:2; }
    #intro .dots i { width:8px; height:8px; border-radius:50%; background:#333; transition:background .3s; }
    #intro .dots i.on { background:#ff5a3c; }
    #intro .flash { position:absolute; inset:0; background:#fff; opacity:0; pointer-events:none; }
  `;
  document.head.appendChild(style);

  root.innerHTML = `
    <canvas id="introCanvas"></canvas>
    <div class="scanlines"></div>
    <div class="content"><div class="stage"></div></div>
    <div class="dots"></div>
    <div class="controls">
      <button class="skip">건너뛰기</button>
      <button class="next">다음 ▶</button>
    </div>
    <div class="flash"></div>`;
  document.body.appendChild(root);

  // ── 캔버스 애니메이션 ───────────────────────────────────────────────
  const canvas = root.querySelector('#introCanvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: 140 }, () => ({
    x: Math.random(), y: Math.random() * 0.75, r: Math.random() * 1.4 + 0.3,
    tw: Math.random() * Math.PI * 2, sp: 0.5 + Math.random(),
  }));
  // 작은 유성들 (배경)
  const streaks = [];
  const spawnStreak = () => streaks.push({
    x: Math.random() * 1.1, y: -0.05, vx: -0.12 - Math.random() * 0.1,
    vy: 0.18 + Math.random() * 0.12, life: 0, len: 40 + Math.random() * 60,
  });

  let t0 = performance.now();
  let intensity = 0;      // 0→1 붉은 기운/운석 접근 (장면 진행에 따라 목표치 상승)
  let targetIntensity = 0.12;
  let flashV = 0;
  let raf = 0;

  const draw = (now) => {
    const t = (now - t0) / 1000;
    intensity += (targetIntensity - intensity) * 0.02;

    // 배경 그라데이션 (위쪽이 붉게 달아오름)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const red = Math.round(40 + intensity * 150);
    g.addColorStop(0, `rgb(${red},${Math.round(12 + intensity * 30)},${Math.round(18 + intensity * 10)})`);
    g.addColorStop(0.5, '#070611');
    g.addColorStop(1, '#02030a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 별
    for (const s of stars) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * s.sp + s.tw));
      ctx.globalAlpha = a * (1 - intensity * 0.5);
      ctx.fillStyle = '#cdd6ff';
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 행성 호 (하단)
    const pr = Math.max(W, H) * 0.9;
    const pcx = W * 0.5, pcy = H + pr * 0.72;
    const pg = ctx.createRadialGradient(pcx, pcy - pr * 0.15, pr * 0.2, pcx, pcy, pr);
    pg.addColorStop(0, `rgb(${30 + intensity * 60},${40},${50})`);
    pg.addColorStop(1, '#05070d');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, 7); ctx.fill();
    // 대기 림 (붉게)
    ctx.lineWidth = 3 + intensity * 6;
    ctx.strokeStyle = `rgba(${200 + intensity * 55},${90 - intensity * 40},${50},${0.5 + intensity * 0.5})`;
    ctx.beginPath(); ctx.arc(pcx, pcy, pr, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke();

    // 메인 운석 — 진행도에 따라 좌상단에서 행성 쪽으로 접근(점점 커짐)
    const ap = Math.min(1, intensity * 1.3);
    const mx = W * (0.18 + ap * 0.32);
    const my = H * (0.12 + ap * 0.30);
    const mr = 5 + ap * 22 + Math.sin(t * 8) * 1.5;
    // 꼬리
    const tlen = 120 + ap * 220;
    const tg = ctx.createLinearGradient(mx, my, mx - tlen * 0.7, my - tlen);
    tg.addColorStop(0, `rgba(255,${180 - ap * 80},80,0.9)`);
    tg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.strokeStyle = tg; ctx.lineWidth = mr * 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - tlen * 0.7, my - tlen); ctx.stroke();
    // 머리 (글로우)
    const hg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 2.4);
    hg.addColorStop(0, '#fff6d8'); hg.addColorStop(0.4, '#ffb347'); hg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(mx, my, mr * 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx, my, mr * 0.5, 0, 7); ctx.fill();

    // 배경 유성들
    if (Math.random() < 0.02 + intensity * 0.05) spawnStreak();
    ctx.lineCap = 'round';
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i]; s.life += 0.016;
      s.x += s.vx * 0.016; s.y += s.vy * 0.016;
      const sx = s.x * W, sy = s.y * H;
      ctx.strokeStyle = 'rgba(255,200,140,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + s.len * 0.5, sy - s.len); ctx.stroke();
      if (s.y > 1.1 || s.x < -0.1) streaks.splice(i, 1);
    }

    // 섬광 (시작 시)
    if (flashV > 0) {
      root.querySelector('.flash').style.opacity = String(flashV);
      flashV -= 0.02;
    }

    raf = requestAnimationFrame(draw);
  };
  resize();
  raf = requestAnimationFrame(draw);

  // ── 내러티브 ────────────────────────────────────────────────────────
  const stage = root.querySelector('.stage');
  const dots = root.querySelector('.dots');
  const nextBtn = root.querySelector('.next');
  const skipBtn = root.querySelector('.skip');
  dots.innerHTML = SCENES.map(() => '<i></i>').join('');

  let i = 0;
  const render = () => {
    const s = SCENES[i];
    targetIntensity = 0.12 + (i / (SCENES.length - 1)) * 0.78; // 장면 진행 → 더 붉게/운석 접근
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
    flashV = 1; // 섬광
    setTimeout(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      root.remove();
      onStart();
    }, 420);
  };

  nextBtn.onclick = () => { if (i < SCENES.length - 1) { i++; render(); } else finish(); };
  skipBtn.onclick = finish;
  render();
}
