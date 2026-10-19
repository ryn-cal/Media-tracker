/* touch only: press and hold a card or row in the Tracker or the Files library to start selecting.
   The pointer equivalents are the Select button, shift-click for a range and Ctrl/⌘-A — those stay for mouse and keyboard. */
(function () {
  const HOST = { tracker:() => ({ st:TS, draw:renderTracker }), files:() => ({ st:FS, draw:renderFilesLib }) }, ITEM = '.mcard[data-id], tr[data-id], .drow[data-id]';
  let timer = 0, fired = false, sx = 0, sy = 0;
  const stop = () => clearTimeout(timer);
  document.addEventListener('pointerdown', e => {
    const h = HOST[curTab] && HOST[curTab](); if (e.pointerType !== 'touch' || !h || h.st.selecting) return;
    const c = e.target.closest(ITEM); if (!c) return; const id = Number(c.dataset.id); sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => { fired = true; h.st.selecting = true; h.st.sel.add(id); h.draw(); if (navigator.vibrate) navigator.vibrate(12); }, 480);
  }, true);
  document.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) stop(); }, true);
  ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { stop(); if (fired) setTimeout(() => { fired = false; }, 350); }, true));
  document.addEventListener('click', e => { if (fired) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', e => { if (PLAT.touch() && e.target.closest(ITEM)) e.preventDefault(); });
})();
