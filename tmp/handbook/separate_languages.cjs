const {chromium}=require('C:/Users/Sahil/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const root='F:/FI/cosmos',out=root+'/output/cosmos-handbook',qa=root+'/tmp/handbook/qa-separated';
(async()=>{
 await fs.mkdir(qa,{recursive:true});
 const index=JSON.parse(await fs.readFile(root+'/tmp/handbook/page-index.json','utf8'));
 const labels=JSON.parse(await fs.readFile(root+'/tmp/handbook/language_labels.json','utf8'));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const lang of ['en','hi']){
  const name=lang==='en'?'English':'Hindi';
  const p=await browser.newPage({viewport:{width:1000,height:1300}});
  await p.goto(pathToFileURL(out+'/Cosmos_ERP_Handbook_English_Hindi.html').href,{waitUntil:'load'});
  await p.evaluate(({lang,index,labels})=>{
   const isHi=lang==='hi';const byId=Object.fromEntries(index.map(x=>[x.id,x]));
   const hasHi=s=>/[\u0900-\u097f]/.test(s);
   const splitLabel=s=>{const parts=s.split(' · ');if(parts.length>1&&hasHi(parts.slice(1).join(' · ')))return isHi?parts.slice(1).join(' · '):parts[0];return isHi?(labels[s]||s):s;};
   // Rewrite the edition introduction before removing the parallel language.
   const intro=[...document.querySelectorAll('.explain')].find(x=>x.querySelector('h3')?.textContent==='English labels and Hindi explanations');
   if(intro){intro.querySelector('.en').textContent='This English edition keeps application labels unchanged so you can match each instruction to the screen. The Hindi edition is a separate book.';intro.querySelector('.hi').textContent='इस हिंदी संस्करण में निर्देश हिंदी में हैं। ऐप के बटन, फ़ील्ड और तकनीकी नाम मूल रूप में हैं ताकि स्क्रीन से मिलान हो। अंग्रेजी संस्करण अलग पुस्तक है।';}
   // Preserve one actual language, rather than merely hiding a parallel column.
   document.querySelectorAll('.pair').forEach(pair=>{pair.querySelector(isHi?'.en':'.hi')?.remove();});
   document.querySelectorAll('table .'+(isHi?'en':'hi')).forEach(e=>e.remove());
   document.querySelectorAll('.brick').forEach(b=>{if(isHi)b.querySelector('b').textContent=b.querySelector('small').textContent;b.querySelector('small')?.remove();});
   document.querySelectorAll('.page').forEach(page=>{
    const meta=byId[page.id];if(!meta)return;
    const title=isHi?(meta.kind==='atlas'?(labels[meta.title]||meta.hi):meta.hi):meta.title;
    if(page.querySelector('.page-title'))page.querySelector('.page-title').textContent=title;
    page.querySelector('.page-hi')?.remove();page.dataset.title=title;
    page.querySelectorAll('.running span')[0]&&(page.querySelectorAll('.running span')[0].textContent=isHi?'कॉसमॉस ERP · हिंदी संस्करण':'COSMOS ERP · ENGLISH EDITION');
    page.querySelectorAll('.running span')[1]&&(page.querySelectorAll('.running span')[1].textContent=isHi?(labels[meta.group]||meta.group):meta.group);
    const foot=page.querySelector('.page-footer span');if(foot)foot.textContent=isHi?'कॉसमॉस · प्रोजेक्ट 21 अक्टूबर 2026':'COSMOS · PROJECT SNAPSHOT 21 OCT 2026';
   });
   document.querySelectorAll('.toc-list a').forEach(a=>{const id=a.getAttribute('href').slice(1),m=byId[id];if(!m)return;const s=a.querySelector('span');s.textContent=isHi?(m.kind==='atlas'?(labels[m.title]||m.hi):m.hi):m.title;});
   document.querySelectorAll('.sidebar a,.atlas-text a,.atlas-link a').forEach(a=>{const id=a.getAttribute('href').slice(1),m=byId[id];if(m)a.textContent=isHi?(m.kind==='atlas'?(labels[m.title]||m.hi):m.hi):m.title;});
   document.querySelectorAll('.sidebar summary').forEach(e=>{if(isHi)e.textContent=labels[e.textContent]||e.textContent;});
   document.querySelectorAll('.atlas-text').forEach(e=>{const paras=[...e.querySelectorAll(':scope > p')];for(let i=0;i<paras.length;i++){if(paras[i].hasAttribute('lang')&&paras[i].getAttribute('lang')==='hi'){if(!isHi)paras[i].remove();else if(paras[i-1]?.querySelector('a'))paras[i].remove();}}});
   document.querySelectorAll('h3,.minor,.field-line b,.state,th,.controls').forEach(e=>{if(!e.querySelector('img'))e.textContent=splitLabel(e.textContent);});
   if(isHi){document.querySelectorAll('th').forEach(e=>{if(e.textContent==='Field or control')e.textContent='फ़ील्ड या कंट्रोल';if(e.textContent==='Term')e.textContent='शब्द';});document.querySelectorAll('td small').forEach(e=>e.textContent=labels[e.textContent]||e.textContent);}
   document.querySelectorAll('.lesson-label').forEach(e=>{const n=e.textContent.match(/\d+/)?.[0]||'';e.textContent=isHi?'अध्याय '+n:'LESSON '+n;});
   document.querySelectorAll('.read-check').forEach(e=>{for(const n of [...e.childNodes])if(n.nodeType===Node.TEXT_NODE)n.textContent=isHi?'पढ़ा':'Read';});
   document.querySelectorAll('.atlas-link').forEach(e=>{for(const n of [...e.childNodes])if(n.nodeType===Node.TEXT_NODE&&n.textContent.includes('Screens'))n.textContent=isHi?'स्क्रीन संदर्भ · ':'Screen references · ';});
   document.querySelectorAll('figcaption').forEach(e=>{const n=e.textContent.match(/\d+/)?.[0]||'';e.textContent=isHi?'चित्र '+n+' · वास्तविक ऐप का दिखता भाग':'Figure '+n+' · Actual visible app screen';});
   document.querySelectorAll('.source').forEach(e=>{if(isHi){if(e.textContent.includes('Current frontend forms'))e.textContent='स्रोत · संबंधित प्रक्रियाओं में दिए गए वर्तमान फॉर्म, वैलिडेशन नियम और रिपोर्ट रजिस्ट्री।';else if(e.textContent.includes('Live read-only capture'))e.textContent='स्रोत · वास्तविक स्क्रीन का केवल देखने वाला चित्र · 21 अक्टूबर 2026 · संबंधित प्रक्रिया में सोर्स का संदर्भ देखें।';else e.textContent=e.textContent.replace(/^Source · /,'स्रोत · ');}});
   document.querySelectorAll('.field-guide .page-content > p').forEach(e=>e.textContent=isHi?'ऐप से मिलान के लिए फ़ील्ड और बटन के मूल अंग्रेजी नाम रखे हैं।':'Exact English labels are retained for matching the application.');
   const c=document.querySelector('#cover .page-content');
   c.innerHTML=isHi?'<p class="edition">हिंदी संस्करण · 22 अक्टूबर 2026</p><h1>कॉसमॉस ERP<br>संचालन पुस्तिका</h1><p class="cover-sub">कार्यक्षेत्र तैयार करें<br>प्रक्रिया सीखें<br>परिणाम जाँचें</p><div class="flow"><div class="brick"><span>01</span><b>सेटअप</b></div><div class="brick"><span>02</span><b>संचालन</b></div><div class="brick"><span>03</span><b>जाँच</b></div></div><div class="cover-stats"><p><b>39</b>संचालन अध्याय</p><p><b>100</b>वास्तविक स्क्रीन चित्र</p><p><b>हिंदी</b>अलग भाषा संस्करण</p></div><p class="cover-end">पहले लॉगिन से रिपोर्टिंग और रखरखाव तक<br>ऐप के फ़ील्ड और बटन के मूल नाम सुरक्षित रखे गए हैं।</p>':'<p class="edition">ENGLISH EDITION · 22 OCTOBER 2026</p><h1>Cosmos ERP<br>operating handbook</h1><p class="cover-sub">Build your workspace<br>Learn every workflow<br>Check every result</p><div class="flow"><div class="brick"><span>01</span><b>Set up</b></div><div class="brick"><span>02</span><b>Operate</b></div><div class="brick"><span>03</span><b>Verify</b></div></div><div class="cover-stats"><p><b>39</b>operating lessons</p><p><b>100</b>actual screen captures</p><p><b>English</b>separate language edition</p></div><p class="cover-end">From first login to reporting and maintenance</p>';
   document.documentElement.lang=lang;document.body.dataset.lang=lang;
   document.title=isHi?'कॉसमॉस ERP संचालन पुस्तिका हिंदी संस्करण':'Cosmos ERP operating handbook English edition';
   const toolbar=document.querySelector('.toolbar');toolbar.innerHTML=isHi?'<strong>कॉसमॉस संचालन पुस्तिका</strong><input id="search" aria-label="पुस्तक में खोजें" placeholder="अध्याय या शब्द खोजें"><span id="count" class="count">194 पृष्ठ</span><button id="print">प्रिंट या PDF</button>':'<strong>COSMOS operating handbook · English</strong><input id="search" aria-label="Search the handbook" placeholder="Search the book"><span id="count" class="count">194 pages</span><button id="print">Print / PDF</button>';
   document.querySelector('.no-results').textContent=isHi?'कोई पृष्ठ नहीं मिला':'No matching pages';
   const close=document.querySelector('#image-modal button');close.textContent=isHi?'बंद करें ×':'Close ×';close.setAttribute('aria-label',isHi?'चित्र बंद करें':'Close image');
   // Strip leftover standalone alternate-language spans in the English edition.
   if(!isHi)document.querySelectorAll('[lang="hi"],.hi').forEach(e=>e.remove());
   if(isHi)document.querySelectorAll('.en').forEach(e=>e.remove());
   const s=document.createElement('style');s.textContent=`.page-content{font-size:15px;line-height:1.7}.pair{display:block!important}.pair .en,.pair .hi{font-size:15px!important;line-height:1.8!important}.page-title{margin-bottom:27px}.page-hi{display:none}.atlas-text .pair .en,.atlas-text .pair .hi{font-size:13px!important;line-height:1.75!important}.atlas-text .pair .hi{margin-top:0}.atlas-text p{font-size:13px}.pair.small .en,.pair.small .hi{font-size:12px!important}.cover h1{margin-bottom:48px}.cover .cover-sub{font-size:25px;margin-bottom:40px}.cover .flow{margin-top:55px}.cover-stats{margin-top:45px}.cover-end{margin-top:50px}.toc-list a{font-size:14px;padding:11px 0}.explain{margin-bottom:20px}.explain h3{font-size:15px}td p{font-size:13px}td p.hi{font-size:13px;line-height:1.8}.atlas-layout{margin-top:20px}.book .page[lang=hi]{font-family:BookHindi,'Mangal',sans-serif}${isHi?"body{font-family:BookHindi,'Mangal',sans-serif}.page-title{font-size:25px;line-height:1.65}.cover h1{font-size:44px;line-height:1.7;letter-spacing:0}.cover-stats b{font-size:23px}.running{letter-spacing:0}.minor,.lesson-label{letter-spacing:0}":''}`;document.head.append(s);
   document.querySelectorAll('script').forEach(e=>e.remove());
   const script=document.createElement('script');script.textContent=`const ps=[...document.querySelectorAll('.page')],search=document.querySelector('#search'),count=document.querySelector('#count');search.addEventListener('input',()=>{let n=0;const q=search.value.toLocaleLowerCase().trim();for(const p of ps){const v=!q||p.textContent.toLocaleLowerCase().includes(q);p.classList.toggle('hidden',!v);n+=v?1:0}count.textContent=n+' ${isHi?'पृष्ठ':'pages'}';document.querySelector('.no-results').style.display=n?'none':'block'});document.querySelector('#print').addEventListener('click',()=>window.print());document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{search.value='';search.dispatchEvent(new Event('input'))}));const modal=document.querySelector('#image-modal');document.querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>{modal.querySelector('img').src=b.querySelector('img').src;modal.showModal()}));modal.querySelector('button').addEventListener('click',()=>modal.close());modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});let read={};try{read=JSON.parse(localStorage.getItem('cosmos-handbook-${lang}-read')||'{}')}catch{}document.querySelectorAll('[data-read]').forEach(c=>{c.checked=!!read[c.dataset.read];c.addEventListener('change',()=>{read[c.dataset.read]=c.checked;try{localStorage.setItem('cosmos-handbook-${lang}-read',JSON.stringify(read))}catch{}})});`;
   document.body.append(script);
  },{lang,index,labels});
  await p.emulateMedia({media:'print'});await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  const report=await p.evaluate(()=>({pages:[...document.querySelectorAll('.page')].map((e,n)=>({page:n+1,id:e.id,overflow:Math.ceil(e.querySelector('.page-content').getBoundingClientRect().bottom-e.querySelector('.page-footer').getBoundingClientRect().top+14),widthOverflow:e.scrollWidth-e.clientWidth})),devanagari:(document.querySelector('.book').innerText.match(/[\u0900-\u097f]/g)||[]).length,brokenLinks:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.getAttribute('href').slice(1))).length}));
  await fs.writeFile(qa+'/'+lang+'-layout.json',JSON.stringify(report,null,2));
  const bad=report.pages.filter(x=>x.overflow>0||x.widthOverflow>1);
  await fs.writeFile(out+'/Cosmos_ERP_Handbook_'+name+'.html',await p.content(),'utf8');
  for(const id of ['cover','lesson-items','lesson-gst','screen-items-new','field-guide-1','reading-guide'])await p.locator('#'+id).screenshot({path:qa+'/'+lang+'-'+id+'.png'});
  console.log(JSON.stringify({language:name,pages:report.pages.length,overflow:bad,devanagariCharacters:report.devanagari,brokenLinks:report.brokenLinks}));
  if(!bad.length&&(!report.devanagari||lang==='hi')){await p.pdf({path:out+'/Cosmos_ERP_Handbook_'+name+'.pdf',preferCSSPageSize:true,printBackground:true,tagged:true,outline:true});console.log(name+' PDF created');}
  await p.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
