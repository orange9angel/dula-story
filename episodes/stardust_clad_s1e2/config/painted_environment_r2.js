// These local source-space patches are the only generated edits applied to
// the accepted background. Geometry and palette outside them stay original.
export const flamePatches=[[139,422,73,68],[577,309,25,40],[871,313,25,41]];
export const lamps=[{id:'cage',source:[181,489],scale:.57,power:.52,seed:4},{id:'wall-left',source:[589,350],scale:.18,power:.5,seed:11},{id:'wall-right',source:[884,354],scale:.18,power:.5,seed:21}];
export const furnacePatches=[[11,128,143,139]];
export function prepareFirePlate(original,clean,patches=flamePatches){const c=document.createElement('canvas');c.width=original.width;c.height=original.height;const g=c.getContext('2d');g.drawImage(original,0,0);for(const [x,y,w,h]of patches)g.drawImage(clean,x*clean.width/c.width,y*clean.height/c.height,w*clean.width/c.width,h*clean.height/c.height,x,y,w,h);return c;}
export function environmentFires(image,rect,mode='hall'){const items=mode==='furnace'?[{id:'furnace-left',source:[32,266],scale:.65,power:.5,seed:5},{id:'furnace-right',source:[112,266],scale:.65,power:.5,seed:14}]:lamps;return items.map(l=>({...l,base:[rect[0]+l.source[0]/image.width*rect[2],rect[1]+l.source[1]/image.height*rect[3]]}));}
// Foreground cage bars and lantern rails must occlude the new flame particles.
export function restoreLampBars(ctx,plate,rect,mode='hall'){const sx=rect[2]/plate.width,sy=rect[3]/plate.height;const bars=mode==='furnace'?[[36,126,17,143],[77,126,19,143],[118,126,17,143]]:[[171,399,11,236],[211,400,11,235],[135,399,8,236],[104,400,7,235],[583,309,3,44],[591,309,3,44],[879,313,3,45],[887,313,3,45]];for(const [x,y,w,h]of bars)ctx.drawImage(plate,x,y,w,h,rect[0]+x*sx,rect[1]+y*sy,w*sx,h*sy);}
