// Original, bounded pre-purchase checks. No model-specific performance claims.
export const SCHEMA={pool:{debris:['leaves','fine','green','unknown'],obstacle:['clear','stairs','unknown'],care:['yes','no','unknown']},garden:{route:['open','narrow','unknown'],slope:['measured','unmeasured'],signal:['clear','blocked','unknown']},repair:{use:['organizer','replacement','critical','unknown'],measure:['yes','no'],printer:['yes','no']}};
export function decide(mode,v){
 const schema=SCHEMA[mode];if(!schema||!v||!Object.entries(schema).every(([k,options])=>options.includes(v[k])))return null;
 if(mode==='pool')return {code:v.debris==='green'?'water':v.debris==='unknown'?'identify':v.obstacle!=='clear'?'geometry':v.debris==='fine'?'filter':v.care!=='yes'?'care':'compare',checks:['debris','geometry','care']};
 if(mode==='garden')return {code:v.route==='unknown'||v.slope==='unmeasured'?'measure':v.route==='narrow'?'passage':v.signal!=='clear'?'signal':'compare',checks:['passage','slope','signal']};
 return {code:v.use==='critical'?'stop':v.use==='unknown'?'identify':v.measure==='no'?'measure':v.use==='replacement'?'match':v.printer==='no'?'service':'template',checks:['purpose','dimensions','material']};
}
export function dividerDimensions(v){
 const d={length:Number(v.length),height:Number(v.height),thickness:Number(v.thickness)};
 if(Object.values(v).some(x=>x===''||x==null)||!Object.values(d).every(Number.isFinite)||d.length<20||d.length>250||d.height<10||d.height>100||d.thickness<2||d.thickness>8||d.thickness>=d.height)return null;
 return d;
}
// Closed, manifold rectangular divider. Millimetres; unvalidated physical fit.
export function dividerSTL(v){const d=dividerDimensions(v);if(!d)return null;
 const {length:x,height:y,thickness:z}=d,p=[[0,0,0],[x,0,0],[x,y,0],[0,y,0],[0,0,z],[x,0,z],[x,y,z],[0,y,z]],faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
 return 'solid ecoback_drawer_divider\n'+faces.map(f=>{const [a,b,c]=f.map(i=>p[i]),u=b.map((n,i)=>n-a[i]),w=c.map((n,i)=>n-a[i]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],m=Math.hypot(...n);return `facet normal ${n.map(q=>q/m).join(' ')}\nouter loop\n${[a,b,c].map(q=>'vertex '+q.join(' ')).join('\n')}\nendloop\nendfacet\n`;}).join('')+'endsolid ecoback_drawer_divider\n';
}
