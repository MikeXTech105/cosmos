const {chromium}=require('C:/Users/Sahil/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const out='F:/FI/cosmos/output/cosmos-handbook';const qa='F:/FI/cosmos/tmp/handbook/qa';await fs.mkdir(qa,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await browser.newPage({viewport:{width:1000,height:1300},deviceScaleFactor:1});
 await p.goto(pathToFileURL(path.join(out,'Cosmos_ERP_Handbook_English_Hindi.html')).href,{waitUntil:'load'});
 await p.emulateMedia({media:'print'});await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});
 const report=await p.evaluate(()=>[...document.querySelectorAll('.page')].map((e,n)=>{let c=e.querySelector('.page-content').getBoundingClientRect(),f=e.querySelector('.page-footer').getBoundingClientRect();return {page:n+1,id:e.id,title:e.dataset.title,contentBottom:Math.round(c.bottom-e.getBoundingClientRect().top),limit:Math.round(f.top-e.getBoundingClientRect().top-14),overflow:Math.ceil(c.bottom-f.top+14),widthOverflow:e.scrollWidth-e.clientWidth};}));
 await fs.writeFile(path.join(qa,'layout-report.json'),JSON.stringify(report,null,2));const bad=report.filter(r=>r.overflow>0||r.widthOverflow>1);console.log(JSON.stringify({pages:report.length,overflowPages:bad},null,2));
 const samples=['cover','lesson-first-session','lesson-items','lesson-manufacturing-production','lesson-procurement-plan','example','screen-items-new','screen-website-products-new','field-guide-1','developer-setup','planning-formulas'];
 for(const id of samples){await p.locator('#'+id).screenshot({path:path.join(qa,id+'.png')});}
 if(!bad.length){await p.pdf({path:path.join(out,'Cosmos_ERP_Handbook_English_Hindi.pdf'),preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,tagged:true,outline:true});console.log('PDF created');}
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
