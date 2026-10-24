const files=actor=>({...Object.fromEntries(['closed','half','open'].map(key=>[key,`./assets3d/portraits_r3/${actor}_${key}.png`])),blink:`./assets3d/portraits_r3/${actor}_blink_overlay.png`});
export const portraitsR3={aoao:{id:'aoao-raster-r3',images:files('aoao')},yekari:{id:'yekari-raster-r3',images:files('yekari')}};
