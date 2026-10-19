/* =====================================================================
   One quiet line under the level bar on the Profile: the next small number worth reaching.
   It appears only when you are more than halfway to it, so it reads as encouragement and never as a to-do list.
   (Finishing things is already the level bar above it.)
   ===================================================================== */
const NUDGES = [
  ['hours',  [10, 50, 100, 250, 500, 1000], S => Math.floor(S.mins / 60)],
  ['streak', [3, 7, 14, 30, 100],           S => S.best],
  ['lib',    [10, 50, 100, 250, 500, 1000], S => S.lib],
  ['notes',  [5, 25, 100],                  S => S.noted]
];
function nudgeHtml(S) {
  const near = NUDGES.map(([k, steps, val]) => { const v = val(S), i = steps.findIndex(n => n > v); if (i < 0) return null; const lo = i ? steps[i - 1] : 0; return { k, n:steps[i], d:steps[i] - v, pct:(v - lo) / (steps[i] - lo) }; })
    .filter(x => x && x.pct >= .5).sort((a, b) => b.pct - a.pct)[0];
  return near ? `<div class="pf-nudge"><i class="ti ti-flag-3"></i>${esc(t('nx_' + near.k, { n:near.n, d:near.d }))}</div>` : '';
}
