export function capture(sample){
 for(const t of sample.pre??[])window.renderAt(t,{encode:false});
 return window.renderAt(sample.t);
}
