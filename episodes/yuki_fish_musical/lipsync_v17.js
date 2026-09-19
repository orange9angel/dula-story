// V17 lip wrapper: reuses the shared V13 mouth geometry (applyLips) and adds
// the two V17 detail channels on top, without touching lipsync_v13.js.
//
// purse (0..1, 撮口/小圆嘴): narrows the whole contour so the corners pull in,
// forces full rounding (vertical-ellipse arc + forward pucker) and slightly
// reduces the aperture — a small round hole, not a flat width-scaled slit.
// teeth (0..1, upper-teeth exposure): mapped onto the existing anchored upper
// tooth strip (labiodental channel), so sibilants/affricates show teeth with
// the same stable geometry F/V already use.
import { applyLips } from './lipsync_v13.js';

export function applyLipsV17(c, lip) {
  const purse = lip.purse || 0, teeth = lip.teeth || 0;
  if (purse <= 0 && teeth <= 0) return applyLips(c, lip);
  const eff = { ...lip };
  if (purse > 0) {
    eff.width = lip.width * (1 - .42 * purse);
    eff.rounding = Math.max(lip.rounding || 0, purse);
    eff.jaw = lip.jaw * (1 - .18 * purse);
    eff.open = lip.open * (1 - .18 * purse);
  }
  if (teeth > (eff.labiodental || 0)) eff.labiodental = teeth;
  return applyLips(c, eff);
}
