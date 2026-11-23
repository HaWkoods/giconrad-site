"use strict";
const $=selector=>document.querySelector(selector);
const elt=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const noteHref=id=>"./note.html?id="+encodeURIComponent(id);
function showError(message){$("#noteStatus").textContent=message;$("#noteContent").hidden=true;}
function appendTags(node,ids,lookup,kind){
 for(const id of ids||[]){const meta=lookup.get(id);if(!meta)continue;
   const name=kind==="field"&&meta.parent?(lookup.get(meta.parent)?.label+" / "+meta.label):meta.label;
   node.append(elt("span","tag"+(kind==="topic"?" topic":""),kind==="topic"?"# "+name:name));}
}
function renderLinks(container,ids,index,details){
 container.replaceChildren();
 if(!ids?.length){container.append(elt("p","emptyRelation","この関係に該当するノートは、現在の索引には登録されていません。"));return;}
 for(const id of ids){
   const info=index.get(id);if(!info)continue;
   const item=elt("article","relationCard"),number=elt("span","number",id),h=elt("h4","");
   const a=elt("a","relationLink",info.title);a.href=noteHref(id);h.append(a);
   item.append(number,h);
   const description=details.get(id)?.summary;
   if(description)item.append(elt("p","relationSummary",description));
   container.append(item);
 }
}
async function load(){
 const id=new URLSearchParams(window.location.search).get("id");
 if(!id||!/^(?:\d{2}\.\d{3}|P5\.\d{3})$/.test(id)){showError("ノート番号が指定されていません。索引に戻ってノートを選択してください。");return;}
 try{
   const response=await Promise.all(["./data/notes.json","./data/details.json","./data/taxonomy.json","./data/private_pdf_links.json","./data/public_pdf_links.json","./data/concepts.json","./data/relations.json"].map(url=>fetch(url)));
   if(response.some(r=>!r.ok))throw Error("ノート情報の取得に失敗しました");
   const [catalog,pages,taxonomy,pdfData,publicData,conceptData,relationData]=await Promise.all(response.map(r=>r.json()));
   const index=new Map(catalog.notes.map(n=>[n.id,n]));
   const details=new Map(pages.notes.map(n=>[n.id,n]));
   const info=index.get(id),detail=details.get(id);
   if(!info||!detail){showError("指定されたノートが見つかりません。");return;}
   const fields=new Map(),topics=new Map();
   for(const group of taxonomy.fields){fields.set(group.id,{label:group.label,parent:null});
     for(const child of group.children||[])fields.set(child.id,{label:child.label,parent:group.id});}
   for(const group of taxonomy.topic_groups)for(const topic of group.items)topics.set(topic.id,{label:topic.label});
   document.title=info.id+" "+info.title+" | 擬コンラット";
   $("#crumb").textContent=id;
   $("#noteNumber").textContent=id;
   $("#noteTitle").textContent=info.title;
   $("#noteSummary").textContent=detail.summary;$("#noteDescription").textContent=info.description||"詳細概要を校閲中です。";const conceptLookup=new Map((conceptData.concepts||[]).map(c=>[c.id,c]));const conceptWrap=$("#indexedConcepts");conceptWrap.replaceChildren();for(const cid of info.main_concepts||[]){const c=conceptLookup.get(cid);if(!c)continue;const a=elt("a","conceptLink",c.name_ja+(c.name_en?" / "+c.name_en:""));a.href="./?q="+encodeURIComponent(c.name_ja);conceptWrap.append(a);}const resultList=$("#mainResults");resultList.replaceChildren();for(const text of info.main_results||[])resultList.append(elt("li","",text));if(!(info.main_results||[]).length)resultList.append(elt("li","","定理名の抽出は継続中です。"));$("#mainMethods").textContent=(info.methods||[]).join("・")||"本文に基づく手法索引を整備中です。";
   const publicRec=publicData.notes?.[id];
   if(publicRec?.pdf&&publicRec?.tex&&publicRec.pdf.startsWith("./public_notes/")&&publicRec.tex.startsWith("./public_notes/")&&!publicRec.pdf.includes("..")&&!publicRec.tex.includes("..")){
     $("#publicPdfLink").href=publicRec.pdf;
     $("#publicTexLink").href=publicRec.tex;
     const readerHref="./viewer.html?id="+encodeURIComponent(id);
     $("#siteReaderLink").href=readerHref;
     $("#pdfFullscreenLink").href=readerHref;
     void window.renderPdfPages($("#publicPdfPages"),publicRec.pdf,{maxPages:3}).catch(()=>{});
     $("#publicPdfPreview").hidden=false;
     $("#publicPdfPanel").hidden=false;
     $("#privateNotice").textContent="PDF・pLaTeX原稿は公開されていますが、数学的な最終承認や証明の完全性の保証ではありません。";
   }else{
     const pdfUrl=pdfData.links?.[id];
     if(typeof pdfUrl==="string"&&/^https:\/\/github\.com\/HaWkoods\/giconrad\/blob\/main\/notes\/[A-Za-z0-9_./-]+\.pdf$/.test(pdfUrl)){
       $("#privatePdfLink").href=pdfUrl;
       $("#privatePdfPanel").hidden=false;
     }
   }
   $("#currentNumber").textContent=info.id;
   $("#currentTitle").textContent=info.title;
   $("#basis").textContent=detail.summary_basis==="planned_goal"?"概要は一部、計画上の学習目標を利用しています。本文の数学的査読とは異なります。":detail.summary_basis==="source_outline"?"pLaTeX本文の節構成・演習内容に基づく概要です。証明の正確性は別途校閲中です。":"既存の主題案内とpLaTeXの節構成に基づく概要です。すべての証明を検証したものではありません。";
   const tagWrap=$("#noteTags");tagWrap.replaceChildren();
   appendTags(tagWrap,info.fields,fields,"field");appendTags(tagWrap,info.topics,topics,"topic");
   renderLinks($("#beforeList"),detail.prerequisites,index,details);
   renderLinks($("#afterList"),detail.successors,index,details);
   if(detail.related?.length){$("#relatedSection").hidden=false;renderLinks($("#relatedList"),detail.related,index,details);}
   const labels={prerequisite:"実質的な前提",generalization:"一般化",special_case:"特殊化",application:"応用",alternative_method:"異なる証明・計算法",shared_concept:"共有する概念",theoretical_connection:"理論的接続",recommended_next:"推奨読書順"};
   const all=(relationData.relations||[]).filter(r=>r.source_id===id||r.target_id===id).sort((a,b)=>(a.relevance==="高"?0:a.relevance==="中"?1:2)-(b.relevance==="高"?0:b.relevance==="中"?1:2));
   const container=$("#evidenceRelations");container.replaceChildren();
   for(const r of all){
     const other=r.source_id===id?r.target_id:r.source_id,otherInfo=index.get(other);if(!otherInfo)continue;
     const article=elt("article","evidenceCard"),title=elt("h3","evidenceTitle");
     const a=elt("a","",other+"　"+otherInfo.title);a.href=noteHref(other);title.append(a);
     const tag=elt("span","evidenceLabel",(labels[r.relation_type]||r.relation_type)+(r.symmetric?" ・双方向":r.source_id===id?" ・→":" ・←"));
     const state=elt("span","evidenceState",(r.verification_status||"要確認")+" / 関連度 "+r.relevance);
     article.append(tag,title,state,elt("p","evidenceExplanation",r.explanation));
     const e=(r.evidence||[]).map(x=>x.section||x.source_section||(x.review_basis?"出典：既存の原稿構造・前提調査":"")).filter(Boolean);
     if(e.length)article.append(elt("p","evidenceSource","根拠： "+[...new Set(e)].join(" / ")));
     container.append(article);
   }
   if(!all.length)container.append(elt("p","emptyRelation","根拠付きの関連性は現在登録されていません。"));
   if(!info.publicly_available){$("#privateNotice").textContent="このノートは検索情報のみ公開中です。PDF・pLaTeX原稿は公開サイトにはありません。";}
   
   $("#noteContent").hidden=false;$("#noteStatus").textContent="";
 }catch(e){showError("ノート情報を表示できませんでした。ページを再読み込みしてください。");}
}
load();
