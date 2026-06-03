import { ANIMAL_DEFS } from './animals.js';

// 게임 UI: 조준선/뷰파인더, 점수, 토스트, 촬영 플래시, 도감 패널
export class UI {
  constructor() {
    this.captured = {};        // key -> { photo, def }
    this.total = Object.keys(ANIMAL_DEFS).length;
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
    document.body.append(this.crosshair, this.flash, this.score, this.toast, this.dex);

    this._updateScore();
    this._buildDex();
  }

  setCameraMode(on) { this.crosshair.classList.toggle('on', on); }

  _updateScore() {
    const n = Object.keys(this.captured).length;
    this.score.textContent = `📷 도감 ${n} / ${this.total}`;
    if (n === this.total && !this._won) { this._won = true; this.showToast('🏆 도감 완성! 모든 동물을 찍었어요!'); }
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

  toggleDex() { this.dex.classList.toggle('on'); }

  _buildDex() {
    const n = Object.keys(this.captured).length;
    const cards = Object.entries(ANIMAL_DEFS).map(([key, def]) => {
      const got = this.captured[key];
      const media = got
        ? `<img src="${got.photo}" alt="${def.name}">`
        : `<div class="ph">?</div>`;
      return `<div class="card">${media}
        <div class="nm">${got ? def.name : '???'}</div>
        <div class="ds">${got ? def.desc : '아직 발견하지 못했어요'}</div></div>`;
    }).join('');
    this.dex.innerHTML = `<h2>📖 동물 도감 — ${n}/${this.total}</h2>
      <div class="grid">${cards}</div>
      <div class="hint">Tab: 닫기 · C: 카메라 모드 · 좌클릭: 촬영</div>`;
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
