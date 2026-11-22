"use strict";
/* Render PDF pages as images on canvas instead of using the browser PDF viewer. */
(function(){
 const LIB="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
 const WORKER="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
 let loading;
 function loadLibrary(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(!loading)loading=new Promise((resolve,reject)=>{
   const script=document.createElement("script");script.src=LIB;script.async=true;
   script.onload=()=>{if(!window.pdfjsLib){reject(Error("PDF.js unavailable"));return;}window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;resolve(window.pdfjsLib);};
   script.onerror=()=>reject(Error("PDF.js failed to load"));document.head.append(script);
  });
  return loading;
 }
 async function renderPdfPages(container,url,options={}){
  const maxPages=options.maxPages||Infinity;
  container.replaceChildren();
  const message=document.createElement("p");message.className="pdfRenderStatus";message.setAttribute("role","status");message.textContent="ページ画像を準備しています…";container.append(message);
  try{
   const lib=await loadLibrary();const task=lib.getDocument(url);const pdf=await task.promise;
   const total=Math.min(pdf.numPages,maxPages);
   const pages=document.createElement("div");pages.className="pdfPageList";
   for(let i=1;i<=total;i++){
    const figure=document.createElement("figure");figure.className="pdfPage";
    const canvas=document.createElement("canvas");canvas.setAttribute("aria-label","PDF "+i+"ページ");canvas.setAttribute("role","img");
    const caption=document.createElement("figcaption");caption.textContent=i+" / "+pdf.numPages;
    figure.append(canvas,caption);pages.append(figure);
   }
   container.replaceChildren(pages);
   // Render on demand to keep large PDFs responsive and avoid unnecessary memory use.
   const figures=[...pages.children];const rendered=new Set();const working=new Set();
   async function draw(i){
    if(rendered.has(i)||working.has(i))return;working.add(i);
    const figure=figures[i-1];const canvas=figure.querySelector("canvas");
    try{
     const page=await pdf.getPage(i);
     const available=Math.max(260,Math.min(1000,figure.clientWidth-2));
     const base=page.getViewport({scale:1});
     const scale=available/base.width;
     const viewport=page.getViewport({scale});
     const pixelRatio=Math.min(window.devicePixelRatio||1,2);
     canvas.width=Math.round(viewport.width*pixelRatio);canvas.height=Math.round(viewport.height*pixelRatio);
     canvas.style.width="100%";canvas.style.height="auto";
     const context=canvas.getContext("2d",{alpha:false});
     if(!context)throw Error("Canvas not supported");
     await page.render({canvasContext:context,viewport,transform:[pixelRatio,0,0,pixelRatio,0,0]}).promise;
     rendered.add(i);
    }catch(error){
     const warning=document.createElement("p");warning.className="pdfRenderStatus";
     warning.textContent=i+"ページを画像表示できませんでした。PDFへの直接リンクをご利用ください。";
     figure.replaceChildren(warning,figure.querySelector("figcaption"));
    }finally{working.delete(i);}
   }
   if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>{
     for(const entry of entries)if(entry.isIntersecting){const index=figures.indexOf(entry.target)+1;observer.unobserve(entry.target);void draw(index);}
    },{rootMargin:"700px 0px"});
    figures.forEach(f=>observer.observe(f));
   }else{for(let i=1;i<=total;i++)await draw(i);}
   return pdf.numPages;
  }catch(error){
   message.textContent="ページ画像を表示できませんでした。PDFへの直接リンクから閲覧してください。";
   throw error;
  }
 }
 window.renderPdfPages=renderPdfPages;
})();
