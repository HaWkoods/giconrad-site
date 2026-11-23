"use strict";
/* Interactive theorem roadmap, based on the published catalogue and guide. */
const $=s=>document.querySelector(s);
const make=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
const focal={
"03.010":"健全性定理・Gödelの完全性定理","03.020":"一階論理のコンパクト性定理","03.030":"超積と移行原理","03.040":"Gödelの第一・第二不完全性定理",
"05.010":"Möbius反転公式","05.020":"生成関数による漸化式の解法","05.040":"Hallの結婚定理・最大流最小カット定理","05.050":"Burnsideの補題","05.060":"確率的方法",
"11.010":"Dirichlet畳み込みと反転","11.020":"平方剰余相互法則","11.030":"Pell方程式と単数","11.040":"Dirichletの算術級数定理","11.050":"素数定理",
"12.010":"有限体の構造定理","12.020":"Galois理論の基本定理と根号可解性","12.040":"定規・コンパス作図可能性","12.050":"付値と完備化",
"13.010":"Hilbertの基底定理","13.020":"Krull次元とHilbert多項式","13.030":"Buchbergerのアルゴリズム","13.040":"終結式と消去定理","13.050":"Hilbert–Serre・Hilbert–Samuel多項式","13.060":"Artin–Rees補題・Krullの交叉定理",
"15.010":"Smith標準形の存在","18.010":"米田の補題","18.020":"自由対象の普遍性","18.030":"極限・随伴函手","18.040":"層化と茎","18.050":"Ext・Torと長完全列","18.060":"層コホモロジー",
"22.030":"Haar測度の存在と一意性","28.010":"Radon–Nikodymの定理","28.020":"Lebesgue積分の変数変換公式",
"30.020":"Cauchyの積分定理・積分公式","30.030":"偏角の原理・Rouchéの定理","30.040":"解析接続とモノドロミー",
"35.020":"Sobolev空間と楕円型問題","35.030":"Sobolevトレース定理","35.050":"周期波動方程式の適切性",
"41.010":"Stone–Weierstrassの定理","42.020":"Plancherelの定理","43.010":"コンパクトAbel群のFourier解析",
"46.010":"Arzelà–Ascoliの定理","46.020":"Baireのカテゴリー定理・一様有界性原理","46.030":"Rieszの表現定理","46.040":"Hahn–Banachの定理","46.050":"開写像定理・閉グラフ定理","46.060":"弱位相・弱*位相",
"47.010":"Banachの不動点定理","47.020":"コンパクト作用素のスペクトル定理",
"53.020":"Levi-Civita接続の存在と一意性","53.040":"Hopf–Rinowの定理","53.070":"Gauss–Bonnetの定理",
"54.050":"Tychonoffの定理","54.060":"Urysohnの補題・Tietzeの拡張定理","54.070":"距離化定理","55.030":"Seifert–van Kampenの定理",
"57.030":"Sardの定理・横断性","58.030":"Frobeniusの定理","58.040":"Poincaréの補題","58.050":"Stokesの定理","58.060":"de Rhamの定理への道筋","58.100":"Morse理論",
"60.005":"大数の法則・中心極限定理","60.010":"条件付き期待値とマルチンゲール","60.040":"Itôの公式","60.070":"Girsanovの定理","60.080":"Feynman–Kacの公式",
"60.090":"局所中心極限定理","62.020":"十分統計量・完備統計量","62.030":"最尤推定量の漸近理論",
"65.090":"Zoutendijkの収束定理","68.040":"NP完全性","68.050":"Rice–Shapiroの定理",
"70.030":"Liouville–Arnoldの定理","81.020":"スペクトル定理・Stoneの定理","90.010":"Fenchelの双対性","90.020":"Karush–Kuhn–Tucker条件","91.020":"Black–Scholes方程式",
"93.020":"可制御性・可観測性","94.010":"情報源符号化定理"
};
const specialSubfields={
 "05.010":"enumeration","05.020":"enumeration","05.050":"enumeration","05.030":"graph-theory","05.040":"graph-theory","05.060":"graph-theory",
 "11.010":"analytic-number-theory","11.020":"elementary-number-theory","11.030":"algebraic-number-theory","11.040":"analytic-number-theory","11.050":"analytic-number-theory",
 "97.030":"entrance-math","97.050":"entrance-math","97.120":"entrance-math","97.130":"entrance-math","97.170":"entrance-math","97.200":"entrance-math"
};
function hasField(n,id){return (n.fields||[]).includes(id)||specialSubfields[n.id]===id;}
const noteUrl=id=>"./note.html?id="+encodeURIComponent(id);
const viewerUrl=id=>"./viewer.html?id="+encodeURIComponent(id);
let notes=new Map(),details=new Map(),domains=[],allFields=new Map(),selectedId=null,openNodes=new Set(),query="";
function fieldIds(n){return n.fields||[];}
function matches(n,q){return !q||(n.id+" "+n.title+" "+(focal[n.id]||"")).toLocaleLowerCase().includes(q);}
function relevantCount(field,q){return [...notes.values()].filter(n=>hasField(n,field)&&matches(n,q)).length;}
function childrenFor(domain,field){
 const matching=[...notes.values()].filter(n=>matches(n,query)&&hasField(n,field.id));
 return matching.sort((a,b)=>a.id.localeCompare(b.id,"ja"));
}
function nodeButton(title,count,level,expanded,click){
 const b=make("button","mapNode level"+level);
 b.type="button";b.setAttribute("aria-expanded",String(expanded));
 const icon=make("span","mapChevron",expanded?"−":"+");icon.setAttribute("aria-hidden","true");
 b.append(icon,make("span","mapNodeTitle",title),make("span","mapCount",count+"冊"));
 b.addEventListener("click",click);return b;
}
function toggle(key){if(openNodes.has(key))openNodes.delete(key);else openNodes.add(key);renderTree();}
function renderTree(){
 const tree=$("#roadmapTree");tree.replaceChildren();let shown=0;
 for(const group of domains){
  const members=[...notes.values()].filter(n=>matches(n,query)&&(hasField(n,group.id)||(group.children||[]).some(f=>hasField(n,f.id))));
  if(!members.length)continue;shown++;
  const domainKey="d:"+group.id,force=!!query,expanded=force||openNodes.has(domainKey);
  const block=make("section","mapDomain");block.append(nodeButton(group.label,new Set(members.map(n=>n.id)).size,0,expanded,()=>toggle(domainKey)));
  if(expanded){
   const branch=make("div","mapBranch");
   const children=(group.children||[]).map(field=>({field,members:childrenFor(group,field)})).filter(x=>x.members.length);
   const assigned=new Set(children.flatMap(x=>x.members.map(n=>n.id)));
   const extra=members.filter(n=>!assigned.has(n.id));
   if(extra.length)children.push({field:{id:group.id,label:"分野横断・その他"},members:extra});
   for(const child of children){
    const key="s:"+group.id+":"+child.field.id,expandedChild=force||openNodes.has(key);
    const section=make("section","mapSubfield");
    section.append(nodeButton(child.field.label,child.members.length,1,expandedChild,()=>toggle(key)));
    if(expandedChild){
     const list=make("div","mapLeaves");
     for(const n of child.members){
      const b=make("button","mapLeaf"+(selectedId===n.id?" selected":""));
      b.type="button";b.setAttribute("aria-pressed",String(selectedId===n.id));
      const dot=make("span","mapLeafDot","•");dot.setAttribute("aria-hidden","true");
      const labels=make("span","mapLeafText");labels.append(make("span","mapLeafHeading",focal[n.id]||n.title));
      if(focal[n.id])labels.append(make("small","mapLeafNote",n.title));
      else labels.append(make("small","mapLeafNote","ノート主題"));
      b.append(dot,labels,make("span","mapLeafId",n.id));
      b.addEventListener("click",()=>selectNote(n.id));
      list.append(b);
     }
     section.append(list);
    }
    branch.append(section);
   }
   block.append(branch);
  }
  tree.append(block);
 }
 $("#roadmapCount").textContent=shown+" 分野 · "+[...notes.values()].filter(n=>matches(n,query)).length+" ノート";
 if(!shown)tree.append(make("p","mapEmpty","一致する定理・ノートはありません。"));
}
function related(title,ids){
 const valid=(ids||[]).filter(id=>notes.has(id));
 const section=make("section","mapRelated");
 section.append(make("h3","",title));
 if(!valid.length){section.append(make("p","mapFine","登録された推奨経路はありません。"));return section;}
 const grid=make("div","mapRelatedGrid");
 for(const id of valid){
  const n=notes.get(id),b=make("button","mapRelatedLink",((focal[id]||n.title)+"　"+id));
  b.type="button";b.addEventListener("click",()=>selectNote(id));grid.append(b);
 }
 section.append(grid);return section;
}

// Construct a stable topological learning order from the catalogue's recommended
// prerequisite edges. They are recommendations, not formally proved dependencies.
function buildLearningRoute(target){
 const done=new Set(),active=new Set(),order=[],cycles=[],unlisted=new Set(),missing=new Set();
 function walk(id){
  if(active.has(id)){cycles.push(id);return;}
  if(done.has(id))return;
  if(!notes.has(id)){missing.add(id);return;}
  active.add(id);
  const prereqs=details.get(id)?.prerequisites;
  if(!Array.isArray(prereqs)||prereqs.length===0)unlisted.add(id);
  for(const parent of prereqs||[])walk(parent);
  active.delete(id);
  done.add(id);order.push(id);
 }
 walk(target);
 return {order,cycles,unlisted,missing};
}
const progressKey="giconrad-roadmap-checked-v1";
function readProgress(){
 try{const obj=JSON.parse(localStorage.getItem(progressKey)||"[]");return new Set(Array.isArray(obj)?obj.filter(x=>typeof x==="string"):[]);}
 catch{return new Set();}
}
function saveProgress(checked){
 try{localStorage.setItem(progressKey,JSON.stringify([...checked]));}catch{/* storage disabled */}
}
// Editorial foundational checkpoints: useful preparation, not verified proof dependencies.
const conceptGuides={
 "46.040":["実線形空間・線形汎関数・部分空間","半ノルムと劣線形汎関数","線形汎関数の延長と順序による極大化"],
 "53.040":["距離空間の完備性とコンパクト性","滑らかな多様体・接空間・Riemann計量","測地線・指数写像と測地的完備性"],
 "28.010":["σ-加法族と測度","Lebesgue積分と収束定理","絶対連続な測度と符号付き測度"],
 "81.020":["Hilbert空間・有界線形作用素","非有界作用素の定義域と自己共役性","強連続ユニタリ群と生成作用素"],
 "30.020":["複素微分・正則性","曲線に沿う複素積分","単連結性と原始関数"],
 "54.050":["位相空間・開被覆によるコンパクト性","積位相と射影","有限交叉性と超フィルター"],
 "11.050":["素数計数関数とDirichlet級数","複素正則関数と解析接続","ゼータ関数とTauber型議論"],
 "12.020":["体の拡大と最小多項式","分離拡大・正規拡大","自己同型群・中間体"],
 "13.030":["多項式環とイデアル","単項式順序・割り算アルゴリズム","S多項式と停止性"],
 "58.050":["滑らかな多様体と接ベクトル","外積代数と微分形式","向き・境界・局所座標での積分"]
};
const fieldConcepts={
 "logic":["集合・写像・述語論理の記法","形式的証明と数学的意味論"],
 "combinatorics":["集合と写像の数え上げ","漸化式・数学的帰納法"],
 "number-theory":["整除性・合同式","群・環・体の基本概念"],
 "field-theory":["群・環・体の定義","多項式と体の拡大"],
 "commutative-algebra":["イデアルと商環","加群・準同型"],
 "linear-algebra":["行列・線形写像","基底・次元・線形独立"],
 "category-theory":["写像と合成・普遍性","群・環・加群の具体例"],
 "functional-analysis":["線形代数とノルム空間","距離空間の完備性"],
 "operator-theory":["Banach空間・Hilbert空間","有界線形作用素"],
 "measure-theory":["測度と可測関数","Lebesgue積分と収束定理"],
 "complex-analysis":["複素数と複素微分","実解析の基本定理"],
 "general-topology":["集合・写像","位相空間と連続性"],
 "differential-geometry":["多変数微分積分","滑らかな多様体と接空間"],
 "manifold-analysis":["多変数微分積分と線形代数","滑らかな多様体"],
 "algebraic-topology":["位相空間と連続写像","ホモトピーと基本群"],
 "probability-theory":["測度論的確率と積分","確率変数と期待値"],
 "statistics":["確率変数と確率分布","推定と確率収束"],
 "pde":["多変数微積分と積分","関数空間と弱微分"],
 "optimization":["微分積分と線形代数","凸集合・凸関数"],
 "numerical-analysis":["微積分と線形代数","誤差と極限"],
 "theoretical-cs":["離散数学と論理","アルゴリズムと数学的帰納法"]
};
function showFoundationChecks(id){
 const n=notes.get(id),topics=conceptGuides[id]||
  [...new Set((n.fields||[]).flatMap(f=>fieldConcepts[f]||[]))].slice(0,4);
 const section=make("section","learningFoundations");
 section.append(make("h3","","学習前の基礎確認"));
 section.append(make("p","mapFine","以下は学習を始めるための補助的なチェック項目です。ノートの正式な必要十分条件や、定理の論理的な依存関係を主張するものではありません。"));
 if(!topics.length){
  section.append(make("p","mapFine","この主題の基礎確認項目はまだ個別に整理されていません。対応ノートの冒頭にある前提・定義を確認してください。"));
 }else{
  const ul=make("ul","learningFoundationList");
  for(const item of topics)ul.append(make("li","",item));
  section.append(ul);
 }
 return section;
}
function renderLearningRoute(id){
 const {order,cycles,unlisted,missing}=buildLearningRoute(id);
 const section=make("section","learningRoute");section.id="learningRoute";
 section.append(make("h3","learningRouteTitle","この定理に到達する学習ルート"));
 section.append(make("p","mapFine","既存ノートの「先に読むとよいノート」を再帰的にたどり、重複を除いて基礎から並べます。各ノートの読了チェックはこの端末に保存されます。"));section.append(showFoundationChecks(id));
 const summary=make("div","learningRouteSummary"),counter=make("strong","learningRouteCounter"),bar=make("progress","learningRouteProgress");
 bar.max=order.length;const checked=readProgress();
 const steps=make("ol","learningRouteSteps");
 function refresh(){
  const count=order.filter(x=>checked.has(x)).length;
  counter.textContent=count+" / "+order.length+" ノート完了";
  bar.value=count;
 }
 summary.append(counter,bar);section.append(summary);
 for(const [i,stepId] of order.entries()){
  const n=notes.get(stepId),final=stepId===id;
  const li=make("li","learningRouteStep"+(final?" learningRouteGoal":""));
  const checkbox=make("input","learningRouteCheck");
  checkbox.type="checkbox";checkbox.id="learningStep-"+stepId;checkbox.checked=checked.has(stepId);
  const label=make("label","learningRouteLabel");label.htmlFor=checkbox.id;
  label.append(make("span","learningRouteStepNumber",final?"GOAL":"STEP "+(i+1)));
  label.append(make("strong","learningRouteName",focal[stepId]||n.title));
  if(focal[stepId])label.append(make("span","mapFine",n.title));
  const controls=make("div","learningRouteLinks");
  const detailLink=make("a","","概要");detailLink.href=noteUrl(stepId);
  const readLink=make("a","","本文を読む");readLink.href=viewerUrl(stepId);
  controls.append(detailLink,readLink);
  checkbox.addEventListener("change",()=>{if(checkbox.checked)checked.add(stepId);else checked.delete(stepId);saveProgress(checked);refresh();});
  li.append(checkbox,label,controls);steps.append(li);
 }
 section.append(steps);refresh();
 if(unlisted.size){
  const p=make("p","learningRouteCaution",
   "前提ノートが登録されていない項目："+[...unlisted].map(x=>x+" "+notes.get(x)?.title).join("、")+
   "。これらは前提知識不要という意味ではありません。特に大学数学の基礎（線形代数・解析・集合と位相など）は必要に応じて補ってください。");
  section.append(p);
 }
 if(missing.size||cycles.length){
  section.append(make("p","learningRouteCaution",
    "索引の前提関係に要確認の項目があります。未登録："+[...missing].join("、")+" ／ 循環："+cycles.join("、")));
 }
 const actions=make("div","learningRouteActions");
 const copy=make("button","learningRouteCopy","ルートをコピー");
 copy.type="button";
 copy.addEventListener("click",async()=>{
  const content=order.map((x,i)=>(i+1)+". "+x+" "+notes.get(x).title).join("\n");
  try{await navigator.clipboard.writeText("目標："+notes.get(id).title+"\n"+content);copy.textContent="コピーしました";}
  catch{copy.textContent="コピーできませんでした";}
 });
 actions.append(copy);section.append(actions);
 return section;
}
function selectNote(id,scrollToMap=true){
 const n=notes.get(id);if(!n)return;selectedId=id;
 if(typeof radialSelectTarget==="function")radialSelectTarget(id);
 const info=details.get(id)||{};
 const box=$("#roadmapDetail");box.replaceChildren();box.classList.remove("mapDetailEmpty");
 const top=make("div","mapDetailTop");top.append(make("span","mapEyebrow","THEOREM / TOPIC · "+id));
 const heading=make("h2","mapDetailHeading",focal[id]||n.title);top.append(heading);
 if(focal[id])top.append(make("p","mapFine","対応する公開ノート： "+n.title));
 box.append(top);
 const desc=make("section","mapDescription");desc.append(make("h3","","学習内容"));
 desc.append(make("p","",info.summary||"ノートの内容と証明を確認できます。"));box.append(desc);
 const tags=make("div","mapDetailTags");for(const f of n.fields||[]){const meta=allFields.get(f);if(meta)tags.append(make("span","mapTag",meta.label));}box.append(tags);
 box.append(renderLearningRoute(id));
 box.append(related("直前の推奨ノート",info.prerequisites));
 box.append(related("次に読むとよいノート",info.successors));
 const links=make("div","mapDetailActions");
 for(const [label,url] of [["ノートの概要",noteUrl(id)],["本文を画像で読む",viewerUrl(id)]]){
  const a=make("a","mapAction",label);a.href=url;links.append(a);
 }
 box.append(links);
 const foot=make("p","mapFine","注意：枝は主題ごとの分類です。前提と次のノートは既存索引の推奨読書順であり、定理の証明に必要な論理的依存関係を完全に表すものではありません。「主要定理」の名称は学習の焦点を示す案内であり、掲載ノートが一般形の全証明を収録していることを保証しません。");
 box.append(foot);
 $("#roadmapActive").textContent="選択中： "+id;
 renderTree();
 if(scrollToMap)document.querySelector("#radialSection")?.scrollIntoView({behavior:"smooth",block:"start"});
}
async function init(){
 try{
  const responses=await Promise.all(["./data/notes.json","./data/details.json","./data/taxonomy.json","./data/roadmap_graph.json"].map(x=>fetch(x)));
  if(responses.some(r=>!r.ok))throw Error("取得に失敗しました");
  const [catalog,descriptions,taxonomy,graph]=await Promise.all(responses.map(r=>r.json()));
  notes=new Map(catalog.notes.map(n=>[n.id,n]));details=new Map(descriptions.notes.map(n=>[n.id,n]));
  domains=taxonomy.fields;
  for(const d of domains){allFields.set(d.id,d);for(const c of d.children||[])allFields.set(c.id,c);}
 radialSetup(graph);
  $("#roadmapSearch").addEventListener("input",e=>{query=e.target.value.trim().toLocaleLowerCase();renderTree();});
  $("#roadmapExpand").addEventListener("click",()=>{openNodes=new Set(domains.flatMap(d=>["d:"+d.id,...(d.children||[]).map(c=>"s:"+d.id+":"+c.id),"s:"+d.id+":"+d.id]));renderTree();});
  $("#roadmapCollapse").addEventListener("click",()=>{query="";$("#roadmapSearch").value="";openNodes.clear();renderTree();});
  renderTree();
  const initial=new URLSearchParams(location.search).get("note");
  selectNote(initial&&notes.has(initial)?initial:"54.050",false);
  $("#roadmapStatus").textContent="";
 }catch(error){$("#roadmapStatus").textContent="ロードマップの読み込みに失敗しました。再読み込みしてください。";}
}
init();
