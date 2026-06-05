import { ANIMAL_DEFS } from './animals.js';

// 게임 UI: 조준선/뷰파인더, 점수, 토스트, 촬영 플래시, 도감 패널
export class UI {
  constructor() {
    this.captured = {};        // key -> { photo, def }
    this.total = Object.keys(ANIMAL_DEFS).length;
    this.animalMgr = null;     // main에서 주입 (도감 생존 수 표시용)
    this._build();
  }

  _build() {
    // 스타일
    const style = document.createElement('style');
    style.textContent = `
      /* ── 카메라 뷰파인더 ─────────────────────────────────────── */
      #crosshair { position:fixed; inset:0; pointer-events:none; display:none; z-index:5; }
      #crosshair.on { display:block; }

      /* 배경 비네트 */
      #crosshair .vignette {
        position:absolute; inset:0;
        background: radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,.55) 100%);
      }

      /* 뷰파인더 프레임 */
      #crosshair .frame {
        position:absolute; left:50%; top:50%;
        width:48vmin; height:48vmin;
        transform:translate(-50%,-50%);
        border:1px solid rgba(255,255,255,.35);
        box-shadow: inset 0 0 0 1px rgba(0,0,0,.3);
      }

      /* 코너 브래킷 (L자형) */
      #crosshair .corner {
        position:absolute; width:18px; height:18px;
        border-color:#fff; border-style:solid; border-width:0;
      }
      #crosshair .corner.tl { top:-1px; left:-1px;  border-top-width:3px; border-left-width:3px; }
      #crosshair .corner.tr { top:-1px; right:-1px; border-top-width:3px; border-right-width:3px; }
      #crosshair .corner.bl { bottom:-1px; left:-1px;  border-bottom-width:3px; border-left-width:3px; }
      #crosshair .corner.br { bottom:-1px; right:-1px; border-bottom-width:3px; border-right-width:3px; }

      /* 삼등분선(격자) */
      #crosshair .grid-h, #crosshair .grid-v {
        position:absolute; background:rgba(255,255,255,.15);
      }
      #crosshair .grid-h { left:0; right:0; height:1px; }
      #crosshair .grid-h.h1 { top:33.33%; } #crosshair .grid-h.h2 { top:66.66%; }
      #crosshair .grid-v { top:0; bottom:0; width:1px; }
      #crosshair .grid-v.v1 { left:33.33%; } #crosshair .grid-v.v2 { left:66.66%; }

      /* 중앙 조준점 */
      #crosshair .dot {
        position:absolute; left:50%; top:50%;
        width:6px; height:6px; margin:-3px;
        background:#fff; border-radius:50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,.4);
      }
      #crosshair .crossline-h, #crosshair .crossline-v {
        position:absolute; background:rgba(255,255,255,.7);
      }
      #crosshair .crossline-h { left:calc(50% - 14px); width:28px; height:1px; top:50%; margin-top:0; }
      #crosshair .crossline-v { top:calc(50% - 14px); height:28px; width:1px; left:50%; margin-left:0; }
      /* 중앙 선 가운데 빈 gap */
      #crosshair .crossline-h::before, #crosshair .crossline-v::before {
        content:''; position:absolute; background:#000; opacity:0; /* gap은 dot로 대체 */
      }

      /* 포커스 링 (동물 감지 시 표시, JS로 .found 토글) */
      #crosshair .focus-ring {
        position:absolute; left:50%; top:50%;
        width:28px; height:28px; margin:-14px;
        border:2px solid rgba(255,220,0,0);
        border-radius:50%;
        transition: border-color .15s, transform .15s;
        transform: scale(1.6);
      }
      #crosshair.found .focus-ring {
        border-color:rgba(255,220,0,.9);
        transform: scale(1);
        animation: focusPulse .8s ease-in-out infinite;
      }
      @keyframes focusPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(255,220,0,.4); }
        50%      { box-shadow: 0 0 0 6px rgba(255,220,0,0); }
      }

      /* HUD: 셔터속도·ISO */
      #crosshair .caminfo {
        position:absolute; left:50%; bottom:calc(50% - 26vmin);
        transform:translateX(-50%);
        font:bold 12px monospace; color:#fff;
        text-shadow:0 1px 2px #000;
        letter-spacing:.08em; white-space:nowrap;
      }

      /* REC 표시 */
      #crosshair .rec {
        position:absolute; left:50%; top:calc(50% - 26vmin);
        transform:translateX(-50%);
        color:#ff4444; font:bold 13px monospace;
        text-shadow:0 1px 2px #000;
        animation: recBlink 1s step-end infinite;
      }
      @keyframes recBlink { 0%,100%{opacity:1} 50%{opacity:0} }
      #flash { position:fixed; inset:0; background:#fff; opacity:0; pointer-events:none; z-index:9;
        transition:opacity .08s; }
      #score { position:fixed; top:12px; right:16px; color:#fff; font:bold 16px sans-serif;
        text-shadow:0 1px 3px rgba(0,0,0,.6); z-index:6; }
      #toast { position:fixed; top:60px; left:50%; transform:translateX(-50%); z-index:7;
        background:rgba(0,0,0,.7); color:#fff; padding:8px 18px; border-radius:20px; font:bold 15px sans-serif;
        opacity:0; transition:opacity .25s; pointer-events:none; }
      #toast.on { opacity:1; }
      #dex { position:fixed; inset:0; background:rgba(15,25,20,.92); z-index:20; display:none;
        padding:5vh 6vw; overflow:auto; color:#fff; font-family:sans-serif; }
      #dex.on { display:block; }
      #dex h2 { margin-bottom:18px; }
      #dex .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:14px; }
      #dex .card { background:rgba(255,255,255,.08); border-radius:10px; overflow:hidden; text-align:center; }
      #dex .card img, #dex .card .ph { width:100%; aspect-ratio:1/1; object-fit:cover; display:block;
        background:#0b140f; }
      #dex .card .ph { display:flex; align-items:center; justify-content:center; font-size:48px; color:#2c3c33; }
      #dex .card .nm { padding:8px 4px; font-size:14px; }
      #dex .card .ds { padding:0 6px 10px; font-size:11px; color:#bcd; min-height:28px; }
      #dex .hint { margin-top:18px; color:#9ab; font-size:13px; }
      /* 종별 생존 수 / 상태 */
      #dex .card.danger { box-shadow: inset 0 0 0 2px rgba(255,180,0,.85); }
      #dex .card.lost { opacity:.5; filter:grayscale(.7); }
      #dex .card .rem { padding:2px 4px 0; font-size:11px; color:#bcd; }
      #dex .card .rem.warn { color:#ffc24a; font-weight:bold; }
      #dex .card .rem.gone { color:#e0623f; font-weight:bold; }
      #dex .card .ds .ext { display:block; margin-top:3px; font-size:10px; color:#d9a06a; font-style:italic; }
      /* 일시정지 오버레이 */
      #pause { position:fixed; inset:0; z-index:25; display:none; pointer-events:none;
        background:rgba(8,12,16,.55); color:#fff; flex-direction:column;
        align-items:center; justify-content:center; text-align:center; font-family:sans-serif; }
      #pause.on { display:flex; }
      #pause h2 { font-size:30px; margin-bottom:8px; letter-spacing:.04em; }
      #pause p { color:#cdd; font-size:15px; }
    `;
    document.head.appendChild(style);

    this.crosshair = el('div', { id: 'crosshair' },
      el('div', { class: 'vignette' }),
      el('div', { class: 'frame' },
        el('div', { class: 'corner tl' }),
        el('div', { class: 'corner tr' }),
        el('div', { class: 'corner bl' }),
        el('div', { class: 'corner br' }),
        el('div', { class: 'grid-h h1' }),
        el('div', { class: 'grid-h h2' }),
        el('div', { class: 'grid-v v1' }),
        el('div', { class: 'grid-v v2' }),
        el('div', { class: 'focus-ring' }),
        el('div', { class: 'crossline-h' }),
        el('div', { class: 'crossline-v' }),
        el('div', { class: 'dot' }),
      ),
      el('div', { class: 'rec' }, '● REC'),
      el('div', { class: 'caminfo' }, '1/125s  ISO 400'),
    );
    this._focusEl = this.crosshair.querySelector('.focus-ring');
    this.flash = el('div', { id: 'flash' });
    this.score = el('div', { id: 'score' });
    this.toast = el('div', { id: 'toast' });
    this.dex = el('div', { id: 'dex' });
    this.pause = el('div', { id: 'pause' },
      el('h2', {}, '⏸ 일시정지'),
      el('p', {}, '화면을 클릭하면 계속합니다'));
    document.body.append(this.crosshair, this.flash, this.score, this.toast, this.dex, this.pause);

    this._updateScore();
    this._buildDex();
  }

  setCameraMode(on) { this.crosshair.classList.toggle('on', on); }

  setPaused(on) { this.pause.classList.toggle('on', on); }

  _updateScore() {
    const n = Object.keys(this.captured).length;
    let lost = 0;
    if (this.animalMgr) {
      const counts = this.animalMgr.countsBySpecies();
      for (const key of Object.keys(ANIMAL_DEFS)) {
        if (!this.captured[key] && this.animalMgr.spawnCounts[key] > 0 && !(counts[key] > 0)) lost++;
      }
    }
    this.score.innerHTML = `📷 도감 ${n} / ${this.total}` + (lost ? ` <span style="color:#e0623f">· 소실 ${lost}</span>` : '');
    if (n === this.total && !this._won) { this._won = true; this.showToast('🏆 도감 완성! 모든 생명을 기록했어요!'); }
  }

  isCaptured(key) { return !!this.captured[key]; }

  // 촬영 성공 처리
  capture(key, def, photoDataURL) {
    const first = !this.captured[key];
    this.captured[key] = { photo: photoDataURL, def };
    this._flash();
    this._updateScore();
    this._buildDex();
    this.showToast(first ? `📸 새로운 발견! ${def.name}` : `📸 ${def.name} (이미 등록됨)`);
    return first;
  }

  _flash() {
    this.flash.style.opacity = '0.9';
    setTimeout(() => (this.flash.style.opacity = '0'), 90);
  }

  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.classList.add('on');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toast.classList.remove('on'), 1600);
  }

  toggleDex() {
    const opening = !this.dex.classList.contains('on');
    if (opening) this._buildDex();   // 열 때마다 최신 생존 수 반영
    this.dex.classList.toggle('on');
  }

  _buildDex() {
    const n = Object.keys(this.captured).length;
    const counts = this.animalMgr ? this.animalMgr.countsBySpecies() : null;
    const spawn = this.animalMgr ? this.animalMgr.spawnCounts : null;
    const cards = Object.entries(ANIMAL_DEFS).map(([key, def]) => {
      const got = this.captured[key];
      const alive = counts ? (counts[key] || 0) : null;
      const born = spawn ? (spawn[key] || 0) : null;

      const lost = !got && alive === 0 && born > 0;            // 못 찍고 절멸 → 소실
      const endangered = !got && alive !== null && alive === 1; // 마지막 한 마리
      const wildExtinct = got && alive === 0;                  // 기록은 남았으나 야생 절멸

      const media = got
        ? `<img src="${got.photo}" alt="${def.name}">`
        : `<div class="ph">${lost ? '✕' : '?'}</div>`;

      let cls = 'card';
      if (lost) cls += ' lost'; else if (endangered) cls += ' danger';

      const nm = got ? def.name : (lost ? '소실됨' : '???');

      let ds;
      if (got) ds = wildExtinct ? `${def.desc}<span class="ext">야생 절멸 · 기록 보존됨</span>` : def.desc;
      else if (lost) ds = '기록하지 못한 채 영원히 사라졌습니다';
      else ds = '아직 발견하지 못했어요';

      let badge = '';
      if (alive !== null) {
        if (lost || wildExtinct) badge = `<div class="rem gone">남은 개체 0</div>`;
        else badge = `<div class="rem${endangered ? ' warn' : ''}">남은 개체 ${alive}${born ? ' / ' + born : ''}${endangered ? ' ⚠ 마지막!' : ''}</div>`;
      }

      return `<div class="${cls}">${media}
        <div class="nm">${nm}</div>
        ${badge}
        <div class="ds">${ds}</div></div>`;
    }).join('');
    this.dex.innerHTML = `<h2>📖 동물 도감 — ${n}/${this.total}</h2>
      <div class="grid">${cards}</div>
      <div class="hint">빛나는 동물을 먼저 · 운석에 쓸려간 종은 영영 기록할 수 없습니다 · Tab: 닫기</div>`;
  }
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else e.setAttribute(k, v);
  }
  for (const c of children) e.append(c);
  return e;
}
