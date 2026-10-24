const files=actor=>({...Object.fromEntries(['closed','half','open'].map(key=>[key,`./assets3d/portraits_r5/${actor}_${key}.png`])),blink:`./assets3d/portraits_r5/${actor}_blink_overlay.png`});
const strain=actor=>Object.fromEntries(['closed','half','open'].map(key=>[key,`./assets3d/portraits_r5/${actor}_strain_${key}.png`]));
export const portraitsR6={aoao:{id:'aoao-raster-r6',expressionTransition:'cel',images:files('aoao'),expressions:{strain:strain('aoao')}},yekari:{id:'yekari-raster-r6',expressionTransition:'cel',images:files('yekari'),expressions:{strain:strain('yekari')}}};
