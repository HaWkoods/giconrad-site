"use strict";
const $=s=>document.querySelector(s), dom=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
const S={notes:[],taxonomy:null,fieldInfo:new Map(),topicInfo:new Map(),fields:new Set(),topics:new Set(),view:"number",word:"",privatePdfLinks:{},publicPdfLinks:{},conceptInfo:new Map()};
function initMeta(){for(const g of S.taxonomy.fields){S.fieldInfo.set(g.id,{label:g.label,parent:null});for(const c of g.children||[])S.fieldInfo.set(c.id,{label:c.label,parent:g.id});}for(const g of S.taxonomy.topic_groups)for(const t of g.items)S.topicInfo.set(t.id,t.label);}
function btnFilter(key,x,parent){const b=dom("button","chip"+(parent?" group":""),x.label);b.type="button";b.setAttribute("aria-pressed",String(S[key].has(x.id)));b.addEventListener("click",()=>{S[key].has(x.id)?S[key].delete(x.id):S[key].add(x.id);render()});return b;}
function filterPanels(){
 const f=$("#fields"),t=$("#topics");
 const opened=new Set([...t.querySelectorAll("details.topicGroup[open]")].map(el=>el.dataset.group));
 const usage=new Map();
 for(const note of S.notes)for(const id of note.topics||[])usage.set(id,(usage.get(id)||0)+1);
 f.replaceChildren();t.replaceChildren();
 for(const g of S.taxonomy.fields){
   const box=dom("div","filterGroup");box.append(btnFilter("fields",g,true));
   if(g.children?.length){const items=dom("div","chips");for(const c of g.children)items.append(btnFilter("fields",c,false));box.append(items);}
   f.append(box);
 }
 for(const g of S.taxonomy.topic_groups){
   const active=g.items.filter(x=>usage.has(x.id));if(!active.length)continue;
   const box=dom("details","topicGroup");box.dataset.group=g.label;box.open=opened.has(g.label);
   box.append(dom("summary","topicGroupHead",g.label+"（"+active.length+"）"));
   const items=dom("div","chips");
   for(const c of active)items.append(btnFilter("topics",{...c,label:c.label+" · "+usage.get(c.id)},false));
   box.append(items);t.append(box);
 }
}
function selectedPanel(){const el=$("#selected");el.replaceChildren();for(const key of ["fields","topics"])for(const id of S[key]){const label=key==="fields"?S.fieldInfo.get(id)?.label:S.topicInfo.get(id);const b=dom("button","selectedChip",(key==="fields"?"分野：":"概念：")+(label||id)+" ×");b.type="button";b.onclick=()=>{S[key].delete(id);render()};el.append(b)}}
function closure(fs){const ret=new Set(fs);for(const f of fs){let p=S.fieldInfo.get(f)?.parent;while(p){ret.add(p);p=S.fieldInfo.get(p)?.parent;}}return ret;}
function norm(s){return String(s||"").normalize("NFKC").toLocaleLowerCase("ja")}
function match(n){const fs=closure(n.fields||[]);if([...S.fields].some(x=>!fs.has(x)))return false;if([...S.topics].some(x=>!(n.topics||[]).includes(x)))return false;const words=[n.id,n.title,n.legacy_title,n.summary,n.description,...(n.keywords||[]),...(n.fields||[]).flatMap(x=>[S.fieldInfo.get(x)?.label,S.fieldInfo.get(S.fieldInfo.get(x)?.parent)?.label]),...(n.main_concepts||[]).flatMap(x=>{const c=S.conceptInfo.get(x);return c?[c.name_ja,c.name_en,...(c.aliases||[])]:[];})].join(" ");const hay=norm(words);return !S.word.trim()||S.word.trim().split(/\s+/).every(q=>hay.includes(norm(q)));}
function addLink(el,url,label){if(!url)return;try{const u=new URL(url,location.href);if(u.protocol!=="https:"&&u.protocol!=="http:")return;}catch{return;}const a=dom("a","",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";el.append(a);}
function card(n){const box=dom("article","card"),heading=dom("div","heading");heading.append(dom("span","number",n.id));const headingTitle=dom("h3","");const titleLink=dom("a","noteTitle",n.title);titleLink.href="./note.html?id="+encodeURIComponent(n.id);headingTitle.append(titleLink);heading.append(headingTitle);box.append(heading);
const tags=dom("div","tags");for(const id of n.fields||[]){const d=S.fieldInfo.get(id);if(d)tags.append(dom("span","tag",(d.parent?S.fieldInfo.get(d.parent)?.label+" / ":"")+d.label));}for(const id of n.topics||[])tags.append(dom("span","tag topic","# "+(S.topicInfo.get(id)||id)));box.append(tags);if(n.summary)box.append(dom("p","indexSummary",n.summary));if((n.main_results||[]).length)box.append(dom("p","indexResult","主な主題・結果： "+n.main_results.slice(0,3).join(" / ")));
const pub=S.publicPdfLinks[n.id];
if(pub?.pdf&&pub?.tex&&pub.pdf.startsWith("./public_notes/")&&pub.tex.startsWith("./public_notes/")&&!pub.pdf.includes("..")&&!pub.tex.includes("..")){
 const links=dom("div","privatePdfCardLinks");
 addLink(links,"./viewer.html?id="+encodeURIComponent(n.id),"サイト内で読む");links.append(document.createTextNode("　"));
 addLink(links,pub.pdf,"PDFファイル ↗");links.append(document.createTextNode("　"));
 addLink(links,pub.tex,"pLaTeX原稿 ↗");
 box.append(links);
 box.append(dom("p","status","公開中（初稿・数学的校閲中）"));
}else{
 const url=S.privatePdfLinks[n.id];
 if(typeof url==="string"&&/^https:\/\/github\.com\/HaWkoods\/giconrad\/blob\/main\/notes\/[A-Za-z0-9_./-]+\.pdf$/.test(url)){
  const links=dom("div","privatePdfCardLinks");addLink(links,url,"PDFを開く（要閲覧権限） ↗");box.append(links);
 }
 box.append(dom("p","status",typeof url==="string"?"PDF本文はPrivateリポジトリにあります（閲覧権限が必要）。":"索引のみ公開。PDF・pLaTeX原稿は未公開です。"));
}
return box;}
function render(){if(!S.taxonomy)return;filterPanels();selectedPanel();const matchNotes=S.notes.filter(match).sort((a,b)=>a.id.localeCompare(b.id,"ja"));$("#title").textContent={number:"番号順一覧",fields:"分野別索引",topics:"概念・手法別索引"}[S.view];$("#count").textContent=matchNotes.length.toLocaleString("ja-JP");const el=$("#list");el.replaceChildren();for(const n of matchNotes)el.append(card(n));$("#message").textContent=matchNotes.length?"":"条件に一致するノートはありません。";}
function setView(view){S.view=view;for(const b of document.querySelectorAll("[data-view]")){const on=b.dataset.view===view;b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));}$("#fieldDetails").open=view==="fields";$("#topicDetails").open=view==="topics";render();}
async function load(){try{const rr=await Promise.all([fetch("./data/taxonomy.json"),fetch("./data/notes.json"),fetch("./data/private_pdf_links.json"),fetch("./data/public_pdf_links.json"),fetch("./data/concepts.json")]);if(rr.some(x=>!x.ok))throw Error("データを取得できませんでした");S.taxonomy=await rr[0].json();const data=await rr[1].json();if(!Array.isArray(data.notes))throw Error("データ形式が正しくありません");S.notes=data.notes;const pdfData=await rr[2].json();S.privatePdfLinks=pdfData.links||{};const publicData=await rr[3].json();S.publicPdfLinks=publicData.notes||{};const concepts=await rr[4].json();S.conceptInfo=new Map((concepts.concepts||[]).map(c=>[c.id,c]));initMeta();const q=new URLSearchParams(location.search).get("q");if(q){S.word=q;$("#search").value=q;}$("#message").textContent="";setView("number");}catch(e){$("#message").textContent="索引を読み込めませんでした："+e.message;}}
$("#search").addEventListener("input",e=>{S.word=e.target.value;render()});$("#clear").onclick=()=>{S.word="";S.fields.clear();S.topics.clear();$("#search").value="";render()};for(const b of document.querySelectorAll("[data-view]"))b.onclick=()=>setView(b.dataset.view);load();
