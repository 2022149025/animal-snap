// 엔딩 — D-0 충돌 후 화이트아웃에서 결과 화면으로.
// 기록한 종 수 + 사진 갤러리 + 소실된 생명체 수 + 재시작.

export function showEnding({ capturedMap, total, lost }, onRestart) {
  const got = Object.keys(capturedMap).length;
  const ratio = total ? got / total : 0;
  let verdict;
  if (got === total && total > 0)
    verdict = '🏆 완벽한 기록 — 이 행성의 모든 생명이 당신의 카메라에 남았습니다.';
  else if (ratio >= 0.5)
    verdict = '사라진 세계의 절반 이상을, 당신은 기록으로 남겼습니다.';
  else if (got > 0)
    verdict = '비록 일부지만, 당신의 기록이 그들이 존재했음을 증명합니다.';
  else
    verdict = '아무것도 담지 못한 채, 세계는 저물었습니다.';

  const style = document.createElement('style');
  style.textContent = `
    #ending { position:fixed; inset:0; z-index:60; background:#fff;
      font-family:'Nanum Myeongjo',serif; color:#eee; overflow:auto;
      display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
      padding:7vh 6vw; transition:background 1.4s ease; }
    #ending.dark { background:#0a0608; }
    #ending .inner { max-width:920px; width:100%; text-align:center; opacity:0;
      transform:translateY(12px); transition:opacity 1s ease 0.5s, transform 1s ease 0.5s; }
    #ending.dark .inner { opacity:1; transform:none; }
    #ending h1 { font-size:clamp(28px,5vw,52px); font-weight:800; margin:0 0 6px;
      color:#ff6a44; text-shadow:0 2px 24px rgba(255,90,40,.4); }
    #ending .sub { color:#aeb6bf; font-size:clamp(14px,2vw,18px); margin-bottom:26px; }
    #ending .stat { font-size:clamp(34px,7vw,72px); font-weight:800; color:#fff; margin:8px 0; }
    #ending .stat small { font-size:.4em; color:#9aa3ad; font-weight:400; }
    #ending .verdict { font-size:clamp(15px,2.1vw,21px); color:#e7ebf0; margin:18px auto 6px; max-width:680px; line-height:1.7; }
    #ending .lost { color:#c98; font-size:14px; margin-bottom:28px; }
    #ending .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
      gap:10px; margin:8px 0 30px; }
    #ending .card { background:rgba(255,255,255,.06); border-radius:10px; overflow:hidden; }
    #ending .card img { width:100%; aspect-ratio:1/1; object-fit:cover; display:block; }
    #ending .card .nm { font-size:12px; padding:6px 2px; color:#cdd; }
    #ending .empty { color:#778; font-size:14px; margin:14px 0 30px; }
    #ending button { font-family:'Segoe UI',sans-serif; font:bold 16px sans-serif;
      padding:13px 30px; border-radius:9px; border:0; cursor:pointer;
      background:#c0381f; color:#fff; box-shadow:0 0 24px rgba(192,56,31,.45); }
    #ending button:hover { background:#e04826; }
  `;
  document.head.appendChild(style);

  const cards = Object.values(capturedMap).map(c =>
    `<div class="card"><img src="${c.photo}" alt="${c.def.name}"><div class="nm">${c.def.name}</div></div>`
  ).join('');

  const root = document.createElement('div');
  root.id = 'ending';
  root.innerHTML = `
    <div class="inner">
      <h1>지구 최후의 날</h1>
      <div class="sub">거대 운석이 충돌했고, 이 세계는 사라졌습니다.</div>
      <div class="stat">${got} <small>/ ${total} 종 기록</small></div>
      <div class="verdict">${verdict}</div>
      <div class="lost">충돌로 소실된 생명체: ${lost}</div>
      ${got ? `<div class="grid">${cards}</div>` : `<div class="empty">남긴 사진이 없습니다.</div>`}
      <button class="restart">다시 기록하기 ↺</button>
    </div>`;
  document.body.appendChild(root);
  root.querySelector('.restart').onclick = () => onRestart();

  // 화이트아웃 → 어둠 + 결과 페이드인
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('dark')));
}
