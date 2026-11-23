"use strict";
/* Accessible radial prerequisite map, with no external graphics dependency.
   Edges point prerequisite -> target in data; visually they radiate outward
   from the selected target towards its prerequisites. */
const RADIAL_NS="http://www.w3.org/2000/svg";
let radialGraph=null,radialNodes=new Map(),radialIncoming=new Map();
let radialRoot=null,radialExpanded=new Set(),radialView={x:0,y:0,scale:1};
const radialLimits={maxNodes:85,maxDepth:7};
const radialNodeWidth=206,radialNodeHeight=206;
let radialScene=null,radialDragging=null,radialSuppressClick=false,radialBounds=null;
function radialEl(tag,attrs={}){
 const el=document.createElementNS(RADIAL_NS,tag);
 for(const [name,value] of Object.entries(attrs))el.setAttribute(name,String(value));
 return el;
}
function radialShortLabel(node){
 if(!node)return "";
 const id=node.id.startsWith("note:")?node.id.slice(5):null;
 return id&&(typeof focal!=="undefined"&&focal[id])||node.label;
}
function radialSources(nodeId){
 return (radialIncoming.get(nodeId)||[]).slice().sort((a,b)=>{
  const level={strong:0,weak:1,unassessed:2};
  return level[a.strength]-level[b.strength]||a.from.localeCompare(b.from,"ja");
 });
}
function radialFormatStrength(value){return {strong:"強い前提",weak:"弱い前提",unassessed:"未判定"}[value]||"未判定";}
function radialRelationText(edge){return edge.relation==="recommended_reading"?"推奨読書順":"概念的前提";}
function radialPrepareTree(rootId){
 const seen=new Set([rootId]),warnings={limited:false,repeat:0};
 function visit(nodeId,level,ancestors){
  const branch={id:nodeId,children:[],level,edge:null};
  if(level>=radialLimits.maxDepth||!radialExpanded.has(nodeId))return branch;
  for(const e of radialSources(nodeId)){
   if(seen.size>=radialLimits.maxNodes){warnings.limited=true;break;}
   if(ancestors.has(e.from)){warnings.repeat++;continue;}
   if(seen.has(e.from)){warnings.repeat++;continue;}
   seen.add(e.from);
   const child=visit(e.from,level+1,new Set([...ancestors,e.from]));
   child.edge=e;branch.children.push(child);
  }
  return branch;
 }
 return {tree:visit(rootId,0,new Set([rootId])),warnings};
}
function radialAssign(tree){
 // Allocate a separate angular sector to every branch. A descendant-rich
 // branch gets more room, but each node keeps its own circular ring.
 function mass(n){n.mass=Math.max(1,n.children.reduce((s,c)=>s+mass(c),0));return n.mass;}
 mass(tree);
 function place(n,a,b){
  n.theta=(a+b)/2;
  n.radius=n.level===0?0:Math.max(290,n.level*300);
  n.x=n.radius*Math.cos(n.theta);n.y=n.radius*Math.sin(n.theta);
  const sum=n.children.reduce((s,c)=>s+c.mass,0);
  let cursor=a;
  for(const child of n.children){
   const next=cursor+(b-a)*child.mass/sum;
   place(child,cursor,next);cursor=next;
  }
 }
 place(tree,-Math.PI*0.97,Math.PI*1.03);
 const all=[];
 function collect(n){all.push(n);n.children.forEach(collect);}collect(tree);
 // Expand rings to maintain a minimum angular separation of card centers.
 for(let depth=1;depth<=radialLimits.maxDepth;depth++){
  const ring=all.filter(n=>n.level===depth).sort((a,b)=>a.theta-b.theta);
  if(ring.length<2)continue;
  let radius=depth*300;
  for(let i=1;i<ring.length;i++){
   const delta=ring[i].theta-ring[i-1].theta;
   if(delta>0.001)radius=Math.max(radius,190/(2*Math.sin(Math.min(delta,Math.PI)/2)));
  }
  radius=Math.min(radius,depth*1800);
  for(const n of ring){n.radius=radius;n.x=radius*Math.cos(n.theta);n.y=radius*Math.sin(n.theta);}
 }
 return all;
}
function radialKindClass(node,root=false){
 return "radialNode "+(node?.kind==="concept"?"radialConcept":"radialNote")+(root?" radialGoal":"");
}
function radialNodeButton(viewNode){
 const node=radialNodes.get(viewNode.id);
 const div=document.createElement("button");div.type="button";
 div.className=radialKindClass(node,viewNode.level===0);
 const parents=radialSources(viewNode.id);
 const expandable=parents.length>0;
 div.classList.toggle("radialOpen",radialExpanded.has(viewNode.id));
 div.style.left=viewNode.x+"px";div.style.top=viewNode.y+"px";
 const meta=document.createElement("span");meta.className="radialNodeMeta";
 meta.textContent=node?.kind==="concept"?"概念":(viewNode.level===0?"目標ノート":node.id.slice(5));
 const name=document.createElement("span");name.className="radialNodeName";
 name.textContent=radialShortLabel(node);
 const marker=document.createElement("span");marker.className="radialNodeMarker";
 marker.textContent=expandable?(radialExpanded.has(viewNode.id)?"−":"＋"):"";
 div.append(meta,name,marker);
 div.title=(node?.label||"")+(expandable?" / クリックで前提を展開・折りたたむ":" / クリックで詳細を表示");
 div.setAttribute("aria-expanded",expandable?String(radialExpanded.has(viewNode.id)):"false");
 div.setAttribute("aria-label",(node?.label||"")+"。"+(expandable?parents.length+"個の登録された前提。クリックで展開・折りたたみ":"詳細を見る"));
 div.addEventListener("click",()=>{
  if(radialSuppressClick)return;
  if(expandable){
   if(radialExpanded.has(viewNode.id))radialExpanded.delete(viewNode.id);
   else radialExpanded.add(viewNode.id);
  }
  radialShowInfo(viewNode.id,viewNode.edge);
  radialDraw(false);
 });
 return div;
}
function radialShowInfo(nodeId,edge){
 const panel=document.querySelector("#radialNodeInfo");if(!panel)return;
 panel.replaceChildren();
 const node=radialNodes.get(nodeId);if(!node)return;
 const heading=document.createElement("strong");heading.textContent=node.label;
 panel.append(heading);
 const info=document.createElement("p");info.className="radialInfoText";
 if(edge){
  info.textContent=radialRelationText(edge)+"・"+radialFormatStrength(edge.strength)
   +(edge.review==="catalogue_only"?"（索引のみ・未査読）":"（原稿参照あり）");
 }else info.textContent=node.kind==="note"?"選択中の数学ノート":"概念ノード";
 panel.append(info);
 if(edge?.rationale){const p=document.createElement("p");p.className="radialInfoText";p.textContent=edge.rationale;panel.append(p);}
 const actions=document.createElement("div");actions.className="radialInfoActions";
 if(node.kind==="note"){
  const id=nodeId.slice(5);
  const center=document.createElement("button");center.type="button";center.textContent="ここを中心にする";
  center.addEventListener("click",()=>selectNote(id));
  const link=document.createElement("a");link.href=noteUrl(id);link.textContent="ノート詳細";
  const read=document.createElement("a");read.href=viewerUrl(id);read.textContent="本文を読む";
  actions.append(center,link,read);
 }
 panel.append(actions);
}
function radialApplyTransform(){
 if(!radialScene)return;
 radialScene.style.transform="translate("+radialView.x+"px,"+radialView.y+"px) scale("+radialView.scale+")";
 const z=document.querySelector("#radialZoomValue");if(z)z.textContent=Math.round(radialView.scale*100)+"%";
}
function radialFit(){
 const viewport=document.querySelector("#radialViewport");if(!viewport||!radialBounds)return;
 const w=viewport.clientWidth,h=viewport.clientHeight;
 const dx=radialBounds.maxX-radialBounds.minX+70,dy=radialBounds.maxY-radialBounds.minY+70;
 radialView.scale=Math.max(.14,Math.min(1.12,Math.min(w/dx,h/dy)));
 radialView.x=w/2-(radialBounds.minX+radialBounds.maxX)/2*radialView.scale;
 radialView.y=h/2-(radialBounds.minY+radialBounds.maxY)/2*radialView.scale;
 radialApplyTransform();
}
function radialZoom(factor,clientX,clientY){
 const viewport=document.querySelector("#radialViewport");if(!viewport)return;
 const rect=viewport.getBoundingClientRect();
 const x=clientX===undefined?rect.left+rect.width/2:clientX;
 const y=clientY===undefined?rect.top+rect.height/2:clientY;
 const px=x-rect.left,py=y-rect.top,old=radialView.scale;
 const scale=Math.min(2.6,Math.max(.12,old*factor));
 radialView.x=px-(px-radialView.x)*scale/old;
 radialView.y=py-(py-radialView.y)*scale/old;
 radialView.scale=scale;radialApplyTransform();
}
function radialDraw(fit=true){
 if(!radialGraph||!radialRoot)return;
 const viewport=document.querySelector("#radialViewport"),summary=document.querySelector("#radialSummary");
 if(!viewport)return;
 const {tree,warnings}=radialPrepareTree(radialRoot),shown=radialAssign(tree);
 const bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
 for(const n of shown){
  bounds.minX=Math.min(bounds.minX,n.x-radialNodeWidth/2-15);
  bounds.maxX=Math.max(bounds.maxX,n.x+radialNodeWidth/2+15);
  bounds.minY=Math.min(bounds.minY,n.y-radialNodeHeight/2-15);
  bounds.maxY=Math.max(bounds.maxY,n.y+radialNodeHeight/2+15);
 }
 radialBounds=bounds;
 const scene=document.createElement("div");scene.className="radialScene";
 const svg=radialEl("svg",{class:"radialEdges",viewBox:"0 0 1 1","aria-hidden":"true"});
 svg.style.overflow="visible";
 // Edges are drawn independently of node boxes for a clean visual hierarchy.
 const connections=radialEl("g");
 function drawEdges(n){
  for(const child of n.children){
   const edge=child.edge,dx=child.x-n.x,dy=child.y-n.y,len=Math.hypot(dx,dy)||1;
   const ux=dx/len,uy=dy/len;
   const line=radialEl("line",{
    x1:n.x+ux*(n.level===0?98:81),y1:n.y+uy*(n.level===0?98:81),
    x2:child.x-ux*81,y2:child.y-uy*81,
    class:"radialEdge "+edge.strength,
    "data-relation":edge.relation
   });
   connections.append(line);drawEdges(child);
  }
 }drawEdges(tree);
 svg.append(connections);scene.append(svg);
 for(const n of shown)scene.append(radialNodeButton(n));
 viewport.replaceChildren(scene);radialScene=scene;
 if(fit)radialFit();else radialApplyTransform();
 summary.textContent=shown.length+" ノード・"+(shown.length-1)+" 関係を表示"
 +(warnings.limited?"（表示上限に達しました）":"")
 +(warnings.repeat?"（共有前提 "+warnings.repeat+" 件を重複表示せず省略）":"");
}
function radialSelectTarget(noteId){
 if(!radialGraph)return;
 const root="note:"+noteId;
 if(!radialNodes.has(root))return;
 radialRoot=root;radialExpanded=new Set([root]);
 radialShowInfo(root,null);radialDraw(true);
 const section=document.querySelector("#radialSection");
 if(section)section.hidden=false;
}
function radialSetup(graph){
 if(!graph||graph.version!==1||!Array.isArray(graph.edges)||!Array.isArray(graph.nodes))throw Error("Invalid roadmap graph");
 radialGraph=graph;radialNodes=new Map(graph.nodes.map(n=>[n.id,n]));
 radialIncoming=new Map();
 for(const e of graph.edges){
  if(!radialNodes.has(e.from)||!radialNodes.has(e.to))continue;
  if(!radialIncoming.has(e.to))radialIncoming.set(e.to,[]);
  radialIncoming.get(e.to).push(e);
 }
 const viewport=document.querySelector("#radialViewport");
 if(!viewport)return;
 viewport.addEventListener("pointerdown",e=>{
  if(e.button!==0||e.target.closest("button,a"))return;
  radialDragging={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:radialView.x,y:radialView.y};
  viewport.setPointerCapture(e.pointerId);viewport.classList.add("radialDragging");
 });
 viewport.addEventListener("pointermove",e=>{
  if(!radialDragging||radialDragging.id!==e.pointerId)return;
  radialView.x=radialDragging.x+e.clientX-radialDragging.startX;
  radialView.y=radialDragging.y+e.clientY-radialDragging.startY;
  radialApplyTransform();
 });
 function endDrag(e){if(radialDragging?.id===e.pointerId){radialDragging=null;viewport.classList.remove("radialDragging");}}
 viewport.addEventListener("pointerup",endDrag);viewport.addEventListener("pointercancel",endDrag);
 viewport.addEventListener("wheel",e=>{
  e.preventDefault();radialZoom(e.deltaY<0?1.1:1/1.1,e.clientX,e.clientY);
 },{passive:false});
 document.querySelector("#radialZoomIn").addEventListener("click",()=>radialZoom(1.2));
 document.querySelector("#radialZoomOut").addEventListener("click",()=>radialZoom(1/1.2));
 document.querySelector("#radialFit").addEventListener("click",radialFit);
 document.querySelector("#radialExpandAll").addEventListener("click",()=>{
  if(!radialRoot)return;
  const queue=[radialRoot],visited=new Set();
  while(queue.length&&visited.size<radialLimits.maxNodes){
   const n=queue.shift();if(visited.has(n))continue;visited.add(n);
   radialExpanded.add(n);if(visited.size<radialLimits.maxNodes)queue.push(...radialSources(n).map(e=>e.from));
  }
  radialDraw(true);
 });
 document.querySelector("#radialReset").addEventListener("click",()=>{
  if(!radialRoot)return;radialExpanded=new Set([radialRoot]);radialDraw(true);
 });
 window.addEventListener("resize",()=>{if(radialRoot)radialFit();});
}
