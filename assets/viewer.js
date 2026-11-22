"use strict";
async function loadPublicPdf(){
 const id=new URLSearchParams(location.search).get("id");
 const status=document.querySelector("#viewerStatus");
 if(!/^\d{2}\.\d{3}$/.test(id||"")){status.textContent="ノート番号が正しくありません。横断索引から選択してください。";return;}
 try{
  const res=await Promise.all([fetch("./data/public_pdf_links.json"),fetch("./data/notes.json")]);
  if(res.some(r=>!r.ok))throw Error("ノート情報を取得できませんでした");
  const [data,catalog]=await Promise.all(res.map(r=>r.json()));
  const item=data.notes?.[id];
  if(!item){status.textContent="このノートはサイト内公開の対象外です。詳細ページで閲覧権限を確認してください。";return;}
  const ok=s=>typeof s==="string"&&/^\.\/public_notes\/[A-Za-z0-9_./-]+$/.test(s)&&!s.includes("..");
  if(!ok(item.pdf)||!ok(item.tex)||!item.pdf.endsWith(".pdf")||!item.tex.endsWith(".tex"))throw Error("公開PDFの参照先が正しくありません");
  const note=catalog.notes?.find(n=>n.id===id);
  const name=(note?.title||"数学ノート");
  document.title=id+" "+name+" | PDF閲覧 | 擬コンラット";
  document.querySelector("#viewerTitle").textContent=id+" "+name;
  document.querySelector("#viewerNoteLink").href="./note.html?id="+encodeURIComponent(id);
  document.querySelector("#viewerPdfLink").href=item.pdf;
  document.querySelector("#viewerDownloadLink").href=item.pdf;
  document.querySelector("#viewerTexLink").href=item.tex;
  document.querySelector("#viewerFrame").src=item.pdf;
  document.querySelector("#viewerDocument").hidden=false;
  status.textContent="";
 }catch(e){status.textContent="PDFを表示できませんでした。再読み込みするか、公開一覧からファイルを開いてください。";}
}
loadPublicPdf();
