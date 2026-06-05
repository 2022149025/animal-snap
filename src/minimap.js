import { POND } from './world.js';

// 코너 미니맵 — 플레이어, 미촬영 종(빛나는 동물), 운석 경고, 맵 경계.
// 북쪽 고정(맵 회전 없음). 월드 (x,z) → 캔버스 (x=오른쪽, z=아래).
export class Minimap {
  constructor(player, animalMgr, meteors, ui, { radius = 92, size = 168 } = {}) {
    this.player = player;
    this.animalMgr = animalMgr;
    this.meteors = meteors;
    this.ui = ui;
    this.worldR = radius;
    this.size = size;

    const wrap = document.createElement('div');
    wrap.id = 'minimap';
    wrap.style.cssText =
      `position:fixed; right:14px; bottom:14px; width:${size}px; height:${size}px; z-index:6;` +
      'border-radius:50%; overflow:hidden; pointer-events:none;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.18);' +
      'background:rgba(10,16,12,.55);';
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);

    this.wrap = wrap;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // 월드(x,z) → 캔버스 픽셀. 가장자리 8px 여백.
  _k() { return (this.size / 2 - 8) / this.worldR; }
  _toMap(x, z) {
    const c = this.size / 2, k = this._k();
    return [c + x * k, c + z * k];
  }

  update() {
    const ctx = this.ctx, s = this.size, c = s / 2, k = this._k();
    ctx.clearRect(0, 0, s, s);

    // 맵 경계 원
    ctx.beginPath(); ctx.arc(c, c, c - 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();

    // 연못 (방향 참조용 랜드마크)
    {
      const [px, pz] = this._toMap(POND.x, POND.z);
      ctx.beginPath(); ctx.arc(px, pz, POND.r * k, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(70,140,180,.5)'; ctx.fill();
    }

    // 운석 경고 (임박할수록 진하고 또렷)
    const warns = this.meteors.getWarnings ? this.meteors.getWarnings() : [];
    for (const w of warns) {
      const [wx, wz] = this._toMap(w.x, w.z);
      const wr = Math.max(3, w.r * k);
      ctx.beginPath(); ctx.arc(wx, wz, wr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,60,30,${0.12 + 0.40 * w.progress})`; ctx.fill();
      ctx.beginPath(); ctx.arc(wx, wz, wr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,90,40,${0.5 + 0.5 * w.progress})`; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // 미촬영 종 동물 점 (이미 기록한 종은 숨김)
    for (const a of this.animalMgr.agents) {
      if (this.ui && a.key && this.ui.isCaptured(a.key)) continue;
      const [ax, az] = this._toMap(a.obj.position.x, a.obj.position.z);
      ctx.beginPath(); ctx.arc(ax, az, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = '#9be9ff'; ctx.fill();
    }

    // 플레이어 (바라보는 방향으로 회전하는 삼각형)
    const pp = this.player.mesh.position;
    const [mx, my] = this._toMap(pp.x, pp.z);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-this.player.yaw);   // forward=(-sin,-cos) → 화면상 -yaw 회전
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1;
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  setHidden(on) { this.wrap.style.display = on ? 'none' : 'block'; }
}
