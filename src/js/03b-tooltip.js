/* =====================================================================
   One small tooltip for anything that carries data-tip="Heading\nDetail\nMore".
   Pointer: follows the mouse on hover. Keyboard: shows on focus. Touch: a tap shows it for a moment (hover does not exist there).
   It is a popover so it also appears above an open dialog.
   ===================================================================== */
const TIP = { el:null, timer:0 };
function tipEl() {
  if (TIP.el) return TIP.el;
  const el = TIP.el = document.createElement('div'); el.className = 'tip'; el.setAttribute('role', 'tooltip'); el.setAttribute('popover', 'manual'); document.body.appendChild(el); return el;
}
const TIP_COLOR = /^(#[0-9a-f]{3,8}|[a-z]+\([^)]*\))$/i;
function tipShow(src, x, y) {
  const text = src.getAttribute('data-tip'); if (!text) return tipHide(); const el = tipEl(), [first, ...rest] = text.split('\n'), [label, value, color] = first.split('\t');
  el.innerHTML = (value === undefined ? `<b>${esc(label)}</b>` : `<div class="tip-row">${color && TIP_COLOR.test(color) ? `<i class="tip-sw" style="background:${esc(color)}"></i>` : ''}<span>${esc(label)}</span><em>${esc(value)}</em></div>`)
    + rest.map(r => `<span class="tip-x">${esc(r)}</span>`).join('') + (src.hasAttribute('data-pick') ? `<div class="tip-act"><i class="ti ti-list"></i>${esc(t('ins_click_data'))}</div>` : '');
  try { if (!el.matches(':popover-open')) el.showPopover(); } catch (e) { el.classList.add('open'); }
  const w = el.offsetWidth, h = el.offsetHeight, vw = innerWidth, vh = innerHeight; let left = x + 14, top = y + 18;
  if (left + w > vw - 8) left = Math.max(8, x - w - 14); if (top + h > vh - 8) top = Math.max(8, y - h - 14);
  el.style.left = left + 'px'; el.style.top = top + 'px';
}
const tipOpen = () => { if (!TIP.el) return false; try { return TIP.el.matches(':popover-open'); } catch (e) { return TIP.el.classList.contains('open'); } };
function tipHide() { clearTimeout(TIP.timer); if (!TIP.el) return; try { TIP.el.hidePopover(); } catch (e) {} TIP.el.classList.remove('open'); }
const tipOf = e => e.target.closest ? e.target.closest('[data-tip]') : null;
document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const s = tipOf(e); if (s) tipShow(s, e.clientX, e.clientY); });
document.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || !tipOpen()) return; const s = tipOf(e); if (s) tipShow(s, e.clientX, e.clientY); });
document.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && tipOf(e)) tipHide(); });
document.addEventListener('focusin', e => { const s = tipOf(e); if (s) { const r = s.getBoundingClientRect(); tipShow(s, r.left + r.width / 2, r.top + r.height / 2); } });
document.addEventListener('focusout', tipHide);
document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return tipHide(); const s = tipOf(e); if (!s || s.hasAttribute('data-pick')) return tipHide();      // on touch a tap that opens the data needs no tooltip first
  tipShow(s, e.clientX, e.clientY - 40); clearTimeout(TIP.timer); TIP.timer = setTimeout(tipHide, 2600); });
addEventListener('scroll', tipHide, true);
