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
 if(!id||!/^\d{2}\.\d{3}$/.test(id)){showError("ノート番号が指定されていません。索引に戻ってノートを選択してください。");return;}
 try{
   const response=await Promise.all(["./data/notes.json","./data/details.json","./data/taxonomy.json","./data/private_pdf_links.json","./data/public_pdf_links.json"].map(url=>fetch(url)));
   if(response.some(r=>!r.ok))throw Error("ノート情報の取得に失敗しました");
   const [catalog,pages,taxonomy,pdfData,publicData]=await Promise.all(response.map(r=>r.json()));
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
   $("#noteSummary").textContent=detail.summary;
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
     $("#privateNotice").textContent="このノートのPDF・pLaTeX原稿は公開されていますが、初稿・数学的校閲中であり完成認定ではありません。ほかの多くのノートは引き続き非公開です。";
   }else{
     const pdfUrl=pdfData.links?.[id];
     if(typeof pdfUrl==="string"&&/^https:\/\/github\.com\/HaWkoods\/giconrad\/blob\/main\/notes\/[A-Za-z0-9_./-]+\.pdf$/.test(pdfUrl)){
       $("#privatePdfLink").href=pdfUrl;
       $("#privatePdfPanel").hidden=false;
     }
   }
   $("#currentNumber").textContent=info.id;
   $("#currentTitle").textContent=info.title;
   $("#basis").textContent=detail.summary_basis==="planned_goal"?"この概要には、既存の到達目標設計を利用しています。到達目標の記載は原稿の完成・検証を意味しません。":"この概要は主題に基づく案内文です。原稿全体の内容・数学的完成度を保証するものではありません。";
   const tagWrap=$("#noteTags");tagWrap.replaceChildren();
   appendTags(tagWrap,info.fields,fields,"field");appendTags(tagWrap,info.topics,topics,"topic");
   renderLinks($("#beforeList"),detail.prerequisites,index,details);
   renderLinks($("#afterList"),detail.successors,index,details);
   if(detail.related?.length){$("#relatedSection").hidden=false;renderLinks($("#relatedList"),detail.related,index,details);}
   $("#noteContent").hidden=false;$("#noteStatus").textContent="";
 }catch(e){showError("ノート情報を表示できませんでした。ページを再読み込みしてください。");}
}
load();
