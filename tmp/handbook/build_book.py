from pathlib import Path
import base64,html,json,re,sys,collections,hashlib
from content import LESSONS,GLOSSARY
from extra import EXTRAS
from fields import FIELD_ROWS
ROOT=Path('F:/FI/cosmos'); OUT=ROOT/'output/cosmos-handbook'; TMP=ROOT/'tmp/handbook'
OUT.mkdir(parents=True,exist_ok=True)
CAP=json.loads((TMP/'captures.json').read_text(encoding='utf-8'))
assert len({c['id'] for c in CAP})==len(CAP),'Duplicate capture identifiers'
assert all(c['route'] in c.get('url','') for c in CAP),'Screenshot route and snapshot mismatch'
SRC=json.loads((TMP/'source-index.json').read_text(encoding='utf-8'))
H=html.escape
def pair(v,cls=''):
 en,hi=v.split('||',1)
 return f'<div class="pair {cls}"><div class="en" lang="en">{H(en)}</div><div class="hi" lang="hi">{H(hi)}</div></div>'
def img(id):
 p=OUT/'assets'/f'{id}.jpg'
 if not p.exists():return ''
 return 'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode()
def diagram(nodes):
 return '<div class="flow">'+''.join(f'<div class="brick"><span>{i+1:02d}</span><b>{H(en)}</b><small lang="hi">{H(hi)}</small></div>' for i,(en,hi) in enumerate(nodes))+'</div>'
PAGES=[]
def page(id,title,hi,group,body,kind='normal'):
 PAGES.append(dict(id=id,title=title,hi=hi,group=group,body=body,kind=kind))
def source_note(s):return '<div class="source">Source · '+H(s)+'</div>'

page('cover','Cosmos ERP operating handbook','कॉसमॉस ERP संचालन पुस्तिका','Cover',
 '<p class="edition">PROJECT EDITION · 21 OCTOBER 2026</p><h1>Cosmos ERP<br>operating handbook</h1><p class="cover-hi" lang="hi">कॉसमॉस ERP संचालन पुस्तिका</p><p class="cover-sub">Build your workspace<br>Learn every workflow<br>Check every result</p><p class="hi cover-sub-hi" lang="hi">कार्यक्षेत्र तैयार करें · प्रक्रिया सीखें · परिणाम जाँचें</p>'
 +diagram([('Set up','सेटअप'),('Operate','संचालन'),('Verify','जाँच')])
 +f'<div class="cover-stats"><p><b>{len(LESSONS)}</b> operating lessons<br><span lang="hi">संचालन अध्याय</span></p><p><b>{len(CAP)}</b> actual screen captures<br><span lang="hi">वास्तविक स्क्रीन चित्र</span></p><p><b>EN + HI</b> paired explanations<br><span lang="hi">दो भाषाओं में समझ</span></p></div>'
 +'<p class="cover-end">From first login to reporting and maintenance<br><span lang="hi">पहले लॉगिन से रिपोर्टिंग और रखरखाव तक</span></p>','cover')

# Add the contents after all pages have been collected.
for x in EXTRAS[:2]:
 body=''.join('<section class="explain"><h3>'+H(t)+'</h3>'+pair(en+'||'+hi)+'</section>' for t,en,hi in x['rows'])
 page(x['id'],x['title'],x['hi'],'01 Start here',body)

page('system-map','How the operating blocks connect','संचालन के हिस्से कैसे जुड़ते हैं','01 Start here',
 pair('Start with shared masters, then follow the branch that matches the work. Each block produces inputs or records used by later blocks.||Shared masters से शुरू करें और अपने काम की branch लें। हर हिस्सा अगले हिस्से के लिए inputs या records देता है।')
 +diagram([('Roles and users','भूमिका और यूजर'),('Parties and items','पार्टी और आइटम'),('Opening values','शुरुआती बैलेंस')])
 +'<h3>Buying and making · खरीद और उत्पादन</h3>'+diagram([('Mapped sales','मैप हुई बिक्री'),('BOM and rules','BOM और नियम'),('Procurement plan','खरीद योजना')])
 +pair('A planner reviews the saved buying decision and separately creates the necessary purchase documents. Manufacturing posts component consumption and finished stock.||Planner saved buying decision देखकर purchase documents अलग बनाता है। Manufacturing में components घटते और finished stock बढ़ता है।')
 +'<h3>Moving goods · माल भेजना</h3>'+diagram([('Warehouse snapshots','वेयरहाउस स्नैपशॉट'),('Dispatch run','डिस्पैच प्लान'),('Shipment execution','शिपमेंट संचालन')])
 +pair('Finalization freezes recommendations. Packing and dispatch execute a shipment; dispatch is the stock-changing action shown by the UI.||Finalization recommendations freeze करती है। Packing और dispatch shipment चलाते हैं; UI में dispatch stock बदलने वाला action है।')
 +'<h3>People cash and evidence · लोग नकद और प्रमाण</h3>'+diagram([('HR and attendance','HR और हाजिरी'),('Payroll and wallets','पेरोल और वॉलेट'),('Reports and audit','रिपोर्ट और ऑडिट')])
 +source_note('frontend/src/routes/AppRoutes.jsx · backend/src/Cosmos.Application/Services · backend/src/Cosmos.Application/ShipmentOperations'))

LESSONS.sort(key=lambda l:l['group'])
for n,l in enumerate(LESSONS,1):
 body='<p class="lesson-label">LESSON '+f'{n:02d}'+' · <span lang="hi">संचालन प्रक्रिया</span></p>'
 body+=pair(l['purpose'],'purpose')+'<h3>Before you begin · शुरू करने से पहले</h3>'+pair(l['before'])
 body+='<div class="steps">'+''.join('<section class="step"><div class="step-no">'+str(i)+'</div>'+pair(s)+'</section>' for i,s in enumerate(l['steps'],1))+'</div>'
 body+='<h3>Check the result · परिणाम जाँचें</h3>'+pair(l['check'])
 body+='<p class="field-line"><b>Key fields · मुख्य फ़ील्ड</b><br>'+H(l['fields'])+'</p>'
 if l['shots'] and l['shots'][0]:body+='<p class="atlas-link">Screens · चित्र संदर्भ '+ ' · '.join(f'<a href="#screen-{H(s)}">{H(s)}</a>' for s in l['shots'] if any(c['id']==s for c in CAP))+'</p>'
 body+=source_note(l['source'])
 page('lesson-'+l['id'],l['title'],l['hi'],l['group'],body,'lesson')

for x in EXTRAS[2:5]:
 body=''.join('<section class="explain"><h3>'+H(t)+'</h3>'+pair(en+'||'+hi)+'</section>' for t,en,hi in x['rows'])
 page(x['id'],x['title'],x['hi'],'18 Worked examples and checks',body)

page('lifecycle-map','Document and stock lifecycle map','डॉक्यूमेंट और स्टॉक की अवस्थाएँ','18 Worked examples and checks',
 '<h3>Sales and purchase bills · बिक्री और खरीद बिल</h3>'+diagram([('Save draft','ड्राफ्ट सेव'),('Review and confirm','जाँच और पुष्टि'),('Payments and balance','भुगतान और बैलेंस')])
 +pair('Review cancel actions on the original detail record. Do not assume every list exposes the same action in every status. Purchase orders also have a separate conversion-to-bill workflow.||Cancel action original detail record पर देखें। हर status में एक जैसे actions नहीं होते। Purchase order को bill में बदलने का अलग workflow है।')
 +'<h3>Manufacturing · निर्माण</h3>'+diagram([('Draft and snapshot','ड्राफ्ट और स्नैपशॉट'),('Post both sides','दोनों stock पक्ष पोस्ट'),('Cancel with reversal','कारण से उलटें')])
 +pair('Posting consumes raw material and receives finished goods together. Saving the draft does not do this. After a timeout, check whether posting already succeeded.||Posting में raw material घटता और finished goods बढ़ता है। Draft save से यह नहीं होता। Timeout के बाद पहले जाँचें कि posting हो चुकी है या नहीं।')
 +'<h3>Procurement · खरीद योजना</h3>'+diagram([('Validate and preview','जाँच और preview'),('Save draft snapshot','ड्राफ्ट snapshot सेव'),('Finalize and export','फाइनल और export')])
 +pair('Saved history preserves the calculated values. Finalizing a plan does not create a supplier order automatically.||Saved history गणना वाले values रखती है। Plan finalize से supplier order अपने आप नहीं बनता।')
 +'<h3>Dispatch planning · डिस्पैच योजना</h3>'+diagram([('Draft then Calculate','ड्राफ्ट फिर गणना'),('Override then Allocate','बदलाव फिर आवंटन'),('Finalize','फाइनल')])
 +source_note('Sales and purchase document configs · ManufacturingService · ProcurementPlanningService · DispatchRunDetailPage'))

page('shipment-lifecycle','Shipment stages and exception branches','शिपमेंट की अवस्थाएँ और अपवाद','18 Worked examples and checks',
 diagram([('Draft','ड्राफ्ट'),('ReadyForPacking','पैकिंग तैयार'),('PackingInProgress','पैकिंग जारी')])
 +diagram([('Packed','पैक हो गया'),('ReadyForDispatch','डिस्पैच तैयार'),('Dispatched','डिस्पैच किया')])
 +pair('The UI shows Dispatch and reduce stock for ReadyForDispatch → Dispatched. The normal status workflow does not provide an undo for this action.||ReadyForDispatch → Dispatched पर UI में Dispatch and reduce stock है। सामान्य status workflow में इस action का undo नहीं है।')
 +diagram([('InTransit or appointment','रास्ते में या appointment'),('Attempt or partial delivery','प्रयास या आंशिक delivery'),('Delivered then Closed','डिलीवरी फिर बंद')])
 +pair('After dispatch, allowed branches include AppointmentPending, AppointmentBooked, InTransit, DeliveryAttempted, PartiallyDelivered, Delivered and ReturnInProgress. The enabled target list is authoritative for the current record.||Dispatch के बाद AppointmentPending, AppointmentBooked, InTransit, DeliveryAttempted, PartiallyDelivered, Delivered और ReturnInProgress branches हो सकती हैं। Current record की enabled target list मानें।')
 +diagram([('ReturnInProgress','वापसी जारी'),('Returned','वापस आया'),('Closed','बंद')])
 +pair('Cancellation is a separate guarded action. Closed shipments are immutable. Delivery attempts, receipts and returns require their own quantity and evidence records; a status label alone is insufficient.||Cancellation अलग guarded action है। Closed shipment बदल नहीं सकती। Attempt, receipt और return में quantity और evidence records भी चाहिए; केवल status label पर्याप्त नहीं।')
 +source_note('backend/src/Cosmos.Application/ShipmentOperations/ShipmentStatusTransitionService.cs · frontend/src/pages/shipments/detail/ShipmentDetailPage.jsx'))

page('planning-formulas','Read the procurement calculation','प्रोक्योरमेंट गणना समझें','18 Worked examples and checks',
 pair('These relationships follow the current calculation service. The saved server line includes the explanation, warnings and final rounded quantity.||ये संबंध current calculation service से हैं। Saved server line में explanation, warnings और final rounded quantity रहती है।')
 +'<section class="explain"><h3>01 Lead time</h3>'+pair('Override days take precedence over received-order history average, which takes precedence over configured days. Missing automatic-planning prerequisites can be blocking errors.||Override days पहले, फिर received-order history average, फिर configured days उपयोग होते हैं। Automatic planning के missing prerequisites blocking error हो सकते हैं।')+'</section>'
 +'<section class="explain"><h3>02 Demand</h3>'+pair('Average daily usage × effective lead time = lead-time demand. Total material requirement × safety factor = safety stock.||Average daily usage × effective lead time = lead-time demand। Total material requirement × safety factor = safety stock।')+'</section>'
 +'<section class="explain"><h3>03 Reorder point</h3>'+pair('Lead-time demand + safety stock = reorder point. Physical stock + eligible inbound = projected available stock.||Lead-time demand + safety stock = reorder point। Physical stock + eligible inbound = projected available stock।')+'</section>'
 +'<section class="explain"><h3>04 Shortage</h3>'+pair('Shortage is max zero or reorder point minus projected available. Automatic ordering may apply MOQ when stock is at or below the reorder point, then the configured order-multiple and rounding rules.||Shortage = max zero या reorder point minus projected available। Stock reorder point पर या नीचे हो तो automatic order में MOQ और फिर order-multiple तथा rounding rules लग सकते हैं।')+'</section>'
 +'<section class="explain"><h3>05 Manual mode</h3>'+pair('Manual planning forces the automatic suggestion to zero. The planner must deliberately enter the final quantity through the supported draft workflow.||Manual planning में automatic suggestion zero रहता है। Planner supported draft workflow से final quantity जानबूझकर देता है।')+'</section>'
 +source_note('backend/src/Cosmos.Application/Services/ProcurementCalculationService.cs'))

def lesson_for(c):
 r=c['route']; key='navigation'
 if c['id']=='items-stock-tab':key='stock'
 elif c['id']=='items-manufacturing-tab':key='manufacturing-bom'
 elif r=='/dashboard':key='dashboard'
 elif r in ['/users','/roles','/permissions']:key='administration'
 elif r.startswith('/rbac/'):key='page-registry'
 elif r.startswith('/party'):key='party'
 elif r.startswith(('/items','/categories','/units')):key='items'
 elif r.startswith('/sales/'):key='sales'
 elif r.startswith('/purchase/orders'):key='purchase-order'
 elif r.startswith(('/purchase/bills','/purchase/supplier')):key='purchase-bill'
 elif r.startswith(('/purchase/returns','/purchase/expenses','/purchase/expense-categories')):key='purchase-return-expense'
 elif r.startswith(('/reports','/purchase/reports')):key='reports'
 elif r.startswith('/rojmel/'):key='rojmel'
 elif r.startswith('/hr/payroll'):key='payroll'
 elif r.startswith(('/hr/attendance','/hr/leaves')):key='hr-attendance'
 elif r.startswith('/hr/'):key='hr-masters'
 elif r.startswith('/oee/'):key='oee'
 elif r.startswith('/supply-chain/packaging'):key='packaging'
 elif r.startswith('/supply-chain/imports'):key='imports'
 elif r.startswith('/supply-chain/'):key='supply-foundation'
 elif r.startswith('/procurement/sales'):key='procurement-data'
 elif r.startswith('/procurement/setup'):key='procurement-data'
 elif r.startswith('/procurement/'):key='procurement-plan'
 elif r=='/procurement':key='procurement-plan'
 elif r.startswith(('/dispatch/settings','/dispatch/imports')):key='dispatch-policy'
 elif r.startswith('/dispatch/'):key='dispatch-run'
 elif r.startswith(('/shipments/freight','/shipments/imports')):key='freight-history'
 elif r.startswith('/shipments/transporters'):key='party'
 elif r.startswith('/shipments/'):key='shipment-create'
 elif r=='/data-book':key='data-book'
 elif r=='/activity-logs':key='audit'
 elif r.startswith('/website/warranty'):key='warranty'
 elif r.startswith('/website/'):key='website-content'
 elif r.startswith('/gst/'):key='gst'
 elif r in ['/settings','/preferences']:key='preferences'
 elif r=='/profile':key='first-session'
 return next(l for l in LESSONS if l['id']==key)

atlas_intro=pair('Each atlas page pairs a real screenshot with the exact controls exposed in its captured state. Field lists can include controls below the visible screenshot. Read the linked lesson before performing business actions.||हर atlas page में वास्तविक screenshot और captured state के exact controls हैं। Field list में screenshot के नीचे वाले controls भी हो सकते हैं। Business action से पहले linked lesson पढ़ें।')
page('atlas-intro','Screen atlas and control index','स्क्रीन एटलस और कंट्रोल इंडेक्स','19 Screen atlas',atlas_intro+diagram([('Find the screen','स्क्रीन खोजें'),('Read the controls','कंट्रोल पढ़ें'),('Follow the lesson','प्रक्रिया अपनाएँ')])
 +pair('All captures use the existing application window, so the sidebar may be collapsed and tables may need horizontal scrolling. Screenshot numbers identify documentation figures, not database records.||सभी captures मौजूदा app window से हैं, इसलिए sidebar बंद और tables में horizontal scrolling हो सकती है। चित्र संख्या documentation के लिए है, database record नहीं।')
 +pair('Screens with no records still show their real available controls. Record-dependent detail workflows are described in the operating lessons and require selecting an existing record in the app.||खाली screens में भी वास्तविक controls दिखते हैं। Record-dependent details के लिए app में existing record चुनें और संबंधित lesson पढ़ें।'))

nav=['Open navigation menu','Open search','Open account menu']
capture_manifest=[]
for k,c in enumerate(CAP,1):
 dom=c['dom']; l=lesson_for(c)
 title=c.get('label') or (re.search(r'heading "([^"\n]+)" \[level=1\]',dom) or re.search(r'heading "([^"\n]+)"',dom)).group(1)
 controls=[]
 for kind,label,tail in re.findall(r'- (textbox|combobox|spinbutton|checkbox|button) "([^"\n]+)"([^\n]*)',dom):
  if any(label.startswith(v) for v in nav) or label in ['0','1','2','3','4','5']:continue
  label=re.sub(r'\s+',' ',label).strip()
  if c['id']=='activity-logs' and kind=='button' and re.search(r'\b(?:POST|PUT|DELETE)\b',label):label='Activity row opens its detail view'
  if len(label)>120:label=label[:117]+'…'
  ent=(kind,label,'[disabled]' in tail)
  if not any(x[0:2]==ent[0:2] for x in controls):controls.append(ent)
 fields=[x for x in controls if x[0]!='button'];buttons=[x for x in controls if x[0]=='button']
 statuses=[]
 if re.search(r'No (?:records|items|shipments|data)|Nothing|No .* (?:found|available|match)',dom,re.I):statuses.append('Empty or filtered state · खाली या filtered स्थिति')
 if re.search(r'paragraph: .*?(?:failed|unavailable)|alert:',dom,re.I):statuses.append('A status or error message is present · status या error संदेश है')
 body=f'<p class="route">{H(c.get("url",c["route"]).replace("http://localhost:5173", ""))}</p>'
 body+='<div class="atlas-layout"><figure><button class="image-button" data-image="'+H(c['id'])+'" aria-label="Open screenshot at native size"><img alt="Actual Cosmos screen '+H(title)+'" src="'+img(c['id'])+'"></button><figcaption>Figure '+f'{k:03d}'+' · Actual app capture<br><span lang="hi">वास्तविक ऐप का दिखता भाग</span></figcaption></figure><div class="atlas-text">'
 body+='<p class="minor">USE THIS SCREEN · उपयोग</p>'+pair(l['purpose'])
 body+='<p class="minor">OPERATING LESSON · प्रक्रिया</p><p><a href="#lesson-'+l['id']+'">'+H(l['title'])+'</a></p><p lang="hi">'+H(l['hi'])+'</p>'
 if statuses:body+='<p class="state">'+H(' / '.join(statuses))+'</p>'
 body+='</div></div>'
 body+='<div class="control-layout"><section><h3>Fields and filters · फ़ील्ड और फ़िल्टर</h3><p class="controls">'+(' · '.join(H(x[1]) for x in fields) or 'No named input fields in this captured state · इस स्थिति में input fields नहीं')+'</p></section><section><h3>Buttons and tabs · बटन और टैब</h3><p class="controls">'+(' · '.join(H(x[1]) for x in buttons) or 'No page buttons in this captured state')+'</p></section></div>'
 body+=pair('Choose a control by its label, complete the required inputs and verify the returned result. Disabled controls may depend on permissions, loading, missing data or lifecycle state.||Label से control चुनें, जरूरी inputs भरें और returned result जाँचें। बंद controls permission, loading, missing data या lifecycle पर निर्भर हो सकते हैं।','small')
 body+=source_note('Live read-only capture · '+c['route']+' · 21 October 2026 · related operating lesson cites implementation source')
 page('screen-'+c['id'],title,l['hi'],'19 Screen atlas',body,'atlas')
 capture_manifest.append({'figure':k,'id':c['id'],'route':c['route'],'title':title,'sha256':hashlib.sha256((OUT/'assets'/f'{c["id"]}.jpg').read_bytes()).hexdigest()})

# Report registry is parsed from the actual object bodies, never guessed routes.
registry=(ROOT/'frontend/src/pages/reports/reportRegistry.js').read_text(encoding='utf-8')
parts=re.split(r'\n  \{',registry.split('export const reportRegistry = [',1)[1].split('\n];',1)[0])
REPORTS=[]
HI_REPORT={
'Sales Summary':'कुल बिक्री tax paid amount और receivables देखें।','Sales Invoices':'Invoice register में status payment status और balances देखें।','Sales By Party':'Party के अनुसार sales tax paid और balance totals देखें।','Sales By Item':'Item के अनुसार quantity taxable amount और tax देखें।','Payments In':'Customer के मिले हुए payments और invoice links देखें।','Sales Receivables':'ग्राहकों से लेना बाकी amount देखें।','Sales Tax Summary':'HSN और GST rate के अनुसार बिक्री tax देखें।',
'Purchase Summary':'कुल खरीद tax paid और payable देखें।','Purchase Bills':'Supplier bills के status और balances देखें।','Purchase By Supplier':'Supplier के अनुसार purchase paid और balance देखें।','Purchase By Item':'खरीदे items की quantity value और tax देखें।','Payments Out':'Supplier को दिए payments mode और date से देखें।','Purchase Payables':'Suppliers को देना बाकी amount देखें।','Purchase Tax Summary':'HSN और GST rate के अनुसार purchase tax देखें।',
'Stock Summary':'Current reserved minimum stock और value देखें।','Stock Ledger':'In और Out movements तथा running balance देखें।','Item Movement':'अवधि में item का net movement देखें।','Low Stock':'Minimum stock से कम items देखें।','Stock Valuation':'Current stock और valuation rate से value देखें।','Negative Stock':'Zero से नीचे stock वाले items देखें।','Stock Movements':'हर inward और outward stock transaction देखें।','Item Ledger':'चुने एक item का running ledger देखें।','Dead Stock':'तय दिनों से movement बिना items देखें।','Fast Moving Items':'अवधि में ज्यादा transaction-volume items देखें।','Slow Moving Items':'कम transaction-volume items देखें।',
'Manufacturing History':'Production drafts posted runs reversals और output देखें।','Raw Material Consumption':'Production BOM snapshot से raw materials का consumption देखें।',
'Party Ledger':'Party की debit credit और running balance entries देखें।','Customer Statement':'चुनी अवधि का customer statement देखें।','Supplier Statement':'चुनी अवधि का supplier statement देखें।','Receivable Aging':'ग्राहकों से बाकी amount को age buckets में देखें।','Payable Aging':'Suppliers को बाकी amount को age buckets में देखें।',
'Expense Summary':'अवधि के expense count amount tax और total देखें।','Expense By Category':'Category के अनुसार खर्च और tax देखें।','Expense By Party':'Party के अनुसार खर्च और tax देखें।','Monthly Expense Summary':'महीने के अनुसार खर्च का trend देखें।',
'Wallet Ledger':'Wallet का running balance ledger देखें।','All Transactions':'Income expense transfers और adjustments अलग types में देखें।','Income vs Expense':'Transfers adjustments और opening balances बाहर रखकर income expense और net देखें।','Category-wise Expense':'Cash-book category के अनुसार expense totals और counts देखें।','Transfers':'Wallet transfer और reversal status देखें।','Daily Cash Flow':'रोज के income expense और net cash result देखें।','User Wallet Balances':'Users से जुड़े wallets के current balances देखें।'}
for part in parts:
 def get(key):
  m=re.search(r'\b'+key+r': "([^"\n]+)"',part);return m.group(1) if m else ''
 if get('title') and get('route'):REPORTS.append({k:get(k) for k in ['title','description','route','group','permission']})
for b in range(0,len(REPORTS),5):
 body=pair('Choose the question first, then set the period and filters. Export uses the current report context and requires the relevant action right.||पहले सवाल चुनें, फिर period और filters दें। Export current report context लेता है और संबंधित action की अनुमति चाहिए।')
 for r in REPORTS[b:b+5]:
  body+='<section class="report-entry"><h3>'+H(r['title'])+'</h3><p class="route">'+H(r['route'])+'</p>'+pair(r['description']+'||'+HI_REPORT.get(r['title'],'संबंधित अवधि और filters चुनकर details तथा totals जाँचें।'))+'</section>'
 body+=source_note('frontend/src/pages/reports/reportRegistry.js · frontend/src/pages/reports/filters/filterRegistry.js')
 page(f'reports-directory-{b//5+1}','Report directory '+str(b//5+1),'रिपोर्ट डायरेक्टरी','20 Reference',body)

for b in range(0,len(FIELD_ROWS),7):
 rows=FIELD_ROWS[b:b+7]
 body='<p>Exact English labels are retained for matching the app. <span lang="hi">ऐप से मिलान के लिए English labels रखे हैं।</span></p><table><thead><tr><th>Field or control</th><th>Use · उपयोग</th></tr></thead><tbody>'
 for group,label,en,hi in rows:body+='<tr><td><small>'+H(group)+'</small><br><b>'+H(label)+'</b></td><td><p class="en">'+H(en)+'</p><p class="hi" lang="hi">'+H(hi)+'</p></td></tr>'
 body+='</tbody></table>'+source_note('Current frontend forms, shared schemas, data-book controls and report registry; source paths are listed in the corresponding operating lessons.')
 page(f'field-guide-{b//7+1}','Field guide '+str(b//7+1),'फ़ील्ड उपयोग गाइड','20 Reference',body,'field-guide')

for b in range(0,len(GLOSSARY),9):
 body='<table><thead><tr><th>Term</th><th>Meaning · अर्थ</th></tr></thead><tbody>'
 for term,en,hi in GLOSSARY[b:b+9]:body+='<tr><td><b>'+H(term)+'</b></td><td><p class="en">'+H(en)+'</p><p class="hi" lang="hi">'+H(hi)+'</p></td></tr>'
 body+='</tbody></table>'
 page(f'glossary-{b//9+1}','Glossary '+str(b//9+1),'शब्दावली','20 Reference',body)

for x in EXTRAS[5:]:
 body=''.join('<section class="explain"><h3>'+H(t)+'</h3>'+pair(en+'||'+hi)+'</section>' for t,en,hi in x['rows'])
 page(x['id'],x['title'],x['hi'],'21 Setup and maintenance',body)
 if x['id']=='developer-setup':
  commands=pair('Use these commands from the repository root after preparing the database and configuration. Keep the API running in one terminal and the frontend in another.||Database और configuration तैयार करके root से ये commands लें। API एक terminal और frontend दूसरे terminal में चालू रखें।')
  commands+='<h3>Terminal 1 · API</h3><pre>dotnet restore backend/Cosmos.slnx\ndotnet build backend/Cosmos.slnx\ndotnet run --project backend/src/Cosmos.API --launch-profile http</pre>'
  commands+='<h3>Terminal 2 · Frontend</h3><pre>Set-Location frontend\nnpm ci\n$env:VITE_API_BASE_URL = "http://localhost:5278"\nnpm run dev</pre>'
  commands+=pair('The example API origin matches the checked-in HTTP launch profile. Use your actual API origin if you choose another profile or host. Open the Vite URL printed in the terminal.||Example API origin checked-in HTTP profile के अनुसार है। दूसरे profile या host पर actual API origin दें। Terminal में printed Vite URL खोलें।')
  commands+='<h3>Maintenance validation · रखरखाव की जाँच</h3><pre># From frontend\nnpm test\nnpm run lint\nnpm run build\n\n# From repository root\ndotnet test backend/Cosmos.slnx</pre>'
  commands+=source_note('frontend/package.json · frontend/src/config/runtimeConfig.js · backend/src/Cosmos.API/Properties/launchSettings.json')
  page('setup-commands','Local build and validation commands','लोकल बिल्ड और जाँच के कमांड','21 Setup and maintenance',commands)

# Human-readable evidence/source directory, without credentials or private app data.
used=[]
for l in LESSONS:
 for p in l['source'].split('; '):
  if (ROOT/p).exists() and p not in used:used.append(p)
for b in range(0,len(used),18):
 body=pair('These repository locations support the operating lessons. Read the current implementation when extending a workflow. Capture hashes and the source inventory accompany the editable book source.||ये repository locations lessons का आधार हैं। Workflow बदलते समय current implementation पढ़ें। Capture hashes और source inventory editable book source के साथ हैं।')
 body+='<ol class="source-list">'+''.join('<li>'+H(p)+'</li>' for p in used[b:b+18])+'</ol>'
 page(f'source-directory-{b//18+1}','Source directory '+str(b//18+1),'सोर्स डायरेक्टरी','21 Setup and maintenance',body)

# Insert compact, navigable contents pages with final page numbers.
toc_items=[p for p in PAGES if p['kind']!='atlas' and p['id']!='cover']
toc_n=(len(toc_items)+16)//17
for i in range(toc_n):
 chunk=toc_items[i*17:(i+1)*17]
 body='<div class="toc-list">'+''.join('<a href="#'+p['id']+'"><span>'+H(p['title'])+'<small lang="hi">'+H(p['hi'])+'</small></span><b data-page-ref="'+p['id']+'"></b></a>' for p in chunk)+'</div>'
 PAGES.insert(1+i,dict(id='contents-'+str(i+1),title='Contents '+str(i+1),hi='विषय सूची',group='Contents',body=body,kind='toc'))

for n,p in enumerate(PAGES,1):p['number']=n
numbers={p['id']:p['number'] for p in PAGES}
for p in PAGES:
 p['body']=re.sub(r'<b data-page-ref="([^"]+)"></b>',lambda m:'<b>'+str(numbers[m.group(1)])+'</b>',p['body'])

font=base64.b64encode(Path('C:/Windows/Fonts/mangal.ttf').read_bytes()).decode()
CSS='''
@font-face{font-family:BookHindi;src:url(data:font/ttf;base64,FONTDATA) format('truetype');font-weight:100 900;font-display:block}
:root{--ink:#151622;--muted:#596273;--purple:#5345d9;--line:#dcdfe7;--paper:#fff;--bg:#ecedf3}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.55}.hi,[lang=hi]{font-family:BookHindi,'Mangal',sans-serif}.page{width:794px;height:1122px;background:var(--paper);padding:48px 54px 42px;margin:28px auto;position:relative;box-shadow:0 12px 46px #10152812;break-after:page;page-break-after:always}.page:last-child{break-after:auto}.running{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1.3px;text-transform:uppercase;color:var(--muted);height:24px}.page-title{font-size:29px;line-height:1.16;font-weight:750;color:#000;margin:18px 0 10px;letter-spacing:-.5px}.page-hi{font-size:18px;font-weight:400;color:#000;margin:0 0 22px;line-height:1.6}.page-content{font-size:13px;line-height:1.6}.page-footer{position:absolute;bottom:22px;left:54px;right:54px;display:flex;justify-content:space-between;color:var(--muted);font-size:10px}h1,h2,h3{color:#000}h3{font-size:13px;line-height:1.45;margin:16px 0 7px}p{margin:0 0 10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:12px}.pair .hi{font-size:12.8px;line-height:1.8}.pair.purpose{font-size:14px;line-height:1.7}.pair.purpose .hi{font-size:13.2px}.pair.small{font-size:11.4px;margin-top:20px}.pair.small .hi{font-size:11.4px}.lesson-label,.minor{font-size:10px;letter-spacing:1.1px;color:var(--purple);font-weight:700;margin-bottom:9px}.steps{margin-top:16px}.step{display:grid;grid-template-columns:27px 1fr;gap:12px;margin:0 0 15px;break-inside:avoid}.step-no{font-size:17px;font-weight:750;color:var(--purple);padding-top:1px}.step .pair{margin:0}.field-line{font-size:11px;line-height:1.6;margin-top:13px}.atlas-link{font-size:10px;margin:12px 0 4px}.source{font-size:8px;line-height:1.5;color:#667085;overflow-wrap:anywhere;margin-top:15px}.flow{display:flex;gap:14px;margin:25px 0 32px}.brick{position:relative;flex:1;background:#efedff;padding:21px 15px 15px;border-radius:5px;border-bottom:5px solid #d4cff9;min-height:103px}.brick:before{content:'';position:absolute;top:-9px;left:19px;width:27px;height:12px;background:#e4dffc;border-radius:5px 5px 0 0;box-shadow:47px 0 0 #e4dffc}.brick>span{font-size:10px;color:var(--purple);display:block;margin-bottom:4px}.brick b{font-size:13px;display:block}.brick small{font-size:11px;display:block;margin-top:7px}.explain{margin-bottom:19px}.explain h3{font-size:13px}.cover{padding-top:68px}.cover .running{display:none}.cover .page-title,.cover .page-hi{display:none}.edition{color:var(--purple);font-size:11px;letter-spacing:1.6px;font-weight:700;margin-bottom:44px}.cover h1{font-size:57px;line-height:1.08;letter-spacing:-2px;font-weight:780;margin:0 0 24px}.cover-hi{font-size:28px;line-height:1.7;margin-bottom:35px}.cover-sub{font-size:21px;line-height:1.45;font-weight:350}.cover-sub-hi{font-size:13px;margin-top:10px}.cover .flow{margin-top:49px}.cover .brick{min-height:115px}.cover-stats{display:flex;justify-content:space-between;margin-top:37px;font-size:11px}.cover-stats b{font-size:24px;display:block;margin-bottom:7px}.cover-stats span{font-size:10px}.cover-end{margin-top:42px;font-size:12px}.cover-end span{font-size:11px}.route{font-family:Consolas,monospace;font-size:10px;overflow-wrap:anywhere;color:#596273}.atlas-layout{display:grid;grid-template-columns:285px 1fr;gap:25px;margin-top:20px}.atlas-layout figure{margin:0}.image-button{border:0;padding:0;background:transparent;cursor:zoom-in;display:block;width:100%}.atlas-layout img{width:285px;height:auto;display:block;border:1px solid #e2e4ec;border-radius:7px}.atlas-layout figcaption{font-size:9px;color:#687081;margin-top:10px}.atlas-text .pair{display:block;font-size:12.2px;line-height:1.65}.atlas-text .pair .hi{font-size:11.7px;line-height:1.85;margin-top:13px}.atlas-text p{font-size:12px}.state{font-size:10px!important;color:#596273;margin-top:13px}.control-layout{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:23px}.controls{font-size:11px;line-height:1.85;overflow-wrap:anywhere}.atlas .page-content>.pair.small{margin-top:18px}.report-entry{margin:23px 0}.report-entry h3{font-size:16px;margin-bottom:2px}.report-entry .route{margin:0 0 8px}table{border-collapse:collapse;width:100%;font-size:12px;margin-top:16px}td,th{border:1px solid #d9d9d9;padding:10px 12px;vertical-align:middle;text-align:left}th{background:#253354;color:#fff;font-weight:600}tr:nth-child(even) td{background:#f5f7fb}td:first-child{width:29%}td p{margin-bottom:6px}td p:last-child{margin:0}td p.hi{font-size:11.5px;line-height:1.8}td small{font-size:9px;color:#667085}.toc-list{display:grid;gap:0}.toc-list a{display:flex;align-items:center;justify-content:space-between;gap:15px;text-decoration:none;color:#151622;padding:7px 0;border-bottom:1px solid #eceef4;font-size:12px;line-height:1.4}.toc-list small{display:block;font-size:10px;margin-top:3px;color:#62687b}.toc-list b{color:var(--purple);font-weight:650}.source-list{padding-left:18px;font-size:11px;line-height:1.8;overflow-wrap:anywhere}.source-list li{margin-bottom:10px}pre{font:10px/1.65 Consolas,monospace;background:#f4f5f9;padding:14px;white-space:pre-wrap;overflow-wrap:anywhere;margin-top:18px}a{color:#493bc4;text-decoration:none}a:hover{text-decoration:underline}.toolbar{position:fixed;z-index:4;top:0;left:0;right:0;background:#151622;color:white;display:flex;gap:12px;align-items:center;padding:12px 22px;box-shadow:0 2px 10px #0003}.toolbar strong{font-size:13px;margin-right:auto}.toolbar input{background:#ffffff14;border:1px solid #ffffff44;padding:8px 12px;color:white;border-radius:6px;width:240px}.toolbar input::placeholder{color:#ccd0e3}.toolbar button,.toolbar select{background:#fff;border:0;padding:8px 11px;border-radius:6px;font:12px 'Segoe UI';cursor:pointer}.toolbar .count{font-size:11px;color:#c8c9dc}.book{padding-top:60px}.sidebar{position:fixed;top:70px;bottom:15px;left:14px;width:200px;overflow:auto;padding:14px;background:#ffffffb8;border-radius:8px;font-size:11px;z-index:2}.sidebar summary{font-weight:650;cursor:pointer;margin:9px 0}.sidebar a{display:block;color:#505568;padding:6px 2px}.sidebar a:hover{color:var(--purple)}dialog{max-width:95vw;max-height:94vh;border:0;border-radius:12px;padding:20px;background:#f8f9ff}dialog::backdrop{background:#111827bd}dialog img{max-width:87vw;max-height:82vh;object-fit:contain;display:block;margin:auto}dialog button{position:absolute;right:3px;top:1px;background:white;border:1px solid #ddd;border-radius:20px;padding:6px 10px;cursor:pointer}.no-results{display:none;text-align:center;margin:120px 0}body[data-lang=en] .hi,body[data-lang=hi] .en{display:none}body[data-lang=en] .pair,body[data-lang=hi] .pair{grid-template-columns:1fr}body[data-lang=hi] .pair .hi{font-size:14px}.read-check{display:flex;gap:5px;align-items:center;position:absolute;right:54px;top:45px;font-size:10px;color:#596273}.read-check input{accent-color:var(--purple)}.hidden{display:none!important}
@media(min-width:1300px){.book{margin-left:180px}}@media(max-width:900px){.sidebar{display:none}.toolbar strong{display:none}.toolbar input{width:150px}.toolbar{gap:6px;padding:10px}.page{margin:18px auto}.book{overflow-x:auto}.count{display:none}}@media print{@page{size:A4;margin:0}html{scroll-behavior:auto}body{background:white}.toolbar,.sidebar,dialog,.read-check,.no-results{display:none!important}.book{margin:0;padding:0;overflow:visible}.page{margin:0;box-shadow:none;border-radius:0;width:210mm;height:297mm;padding:12.7mm 14.3mm 11.1mm;print-color-adjust:exact;-webkit-print-color-adjust:exact}.page-footer{bottom:5.8mm;left:14.3mm;right:14.3mm}a{color:inherit}.image-button{cursor:default}.hidden{display:block!important}}
'''.replace('FONTDATA',font)
CSS+='\n.flow{margin:19px 0 24px}.brick{min-height:92px}.explain{margin-bottom:16px}\n'
CSS+='#system-map .flow,#lifecycle-map .flow,#shipment-lifecycle .flow{margin:18px 0 20px}#system-map .brick,#lifecycle-map .brick,#shipment-lifecycle .brick{padding:15px 13px 12px;min-height:80px}\n'

groups=collections.defaultdict(list)
for p in PAGES:
 if p['kind'] not in ['cover','toc']:groups[p['group']].append(p)
navhtml=''.join('<details'+(' open' if g.startswith('01') else '')+'><summary>'+H(g)+'</summary>'+''.join('<a href="#'+p['id']+'">'+H(p['title'])+'</a>' for p in ps)+'</details>' for g,ps in groups.items())
pageshtml=''
for p in PAGES:
 header='' if p['kind']=='cover' else '<header class="running"><span>COSMOS ERP · ENGLISH + HINDI</span><span>'+H(p['group'])+'</span></header><h1 class="page-title">'+H(p['title'])+'</h1><h2 class="page-hi" lang="hi">'+H(p['hi'])+'</h2>'
 check='<label class="read-check"><input type="checkbox" data-read="'+p['id']+'">Read · पढ़ा</label>' if p['kind']=='lesson' else ''
 pageshtml+='<article class="page '+p['kind']+'" id="'+p['id']+'" data-title="'+H(p['title'])+'">'+header+check+'<div class="page-content">'+p['body']+'</div><footer class="page-footer"><span>COSMOS · 21 OCT 2026</span><span>'+str(p['number'])+' / '+str(len(PAGES))+'</span></footer></article>'
JS='''
const pages=[...document.querySelectorAll('.page')];const search=document.querySelector('#search');const count=document.querySelector('#count');
search.addEventListener('input',()=>{const q=search.value.toLocaleLowerCase().trim();let visible=0;for(const p of pages){const show=!q||p.textContent.toLocaleLowerCase().includes(q);p.classList.toggle('hidden',!show);visible+=show?1:0}count.textContent=visible+' pages';document.querySelector('.no-results').style.display=visible?'none':'block'});
document.querySelector('#language').addEventListener('change',e=>{document.body.dataset.lang=e.target.value});
document.querySelector('#print').addEventListener('click',()=>window.print());
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{if(search.value){search.value='';search.dispatchEvent(new Event('input'))}}));
const modal=document.querySelector('#image-modal');document.querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>{modal.querySelector('img').src=b.querySelector('img').src;modal.showModal()}));modal.querySelector('button').addEventListener('click',()=>modal.close());modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
let read={};try{read=JSON.parse(localStorage.getItem('cosmos-handbook-read')||'{}')}catch{}document.querySelectorAll('[data-read]').forEach(c=>{c.checked=!!read[c.dataset.read];c.addEventListener('change',()=>{read[c.dataset.read]=c.checked;try{localStorage.setItem('cosmos-handbook-read',JSON.stringify(read))}catch{}})});
'''
doc='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cosmos ERP operating handbook English and Hindi</title><style>'+CSS+'</style></head><body data-lang="both"><div class="toolbar"><strong>COSMOS operating handbook</strong><input id="search" aria-label="Search the handbook" placeholder="Search English or Hindi"><span id="count" class="count">'+str(len(PAGES))+' pages</span><select id="language" aria-label="Reading language"><option value="both">English + हिंदी</option><option value="en">English</option><option value="hi">हिंदी</option></select><button id="print">Print / PDF</button></div><nav class="sidebar" aria-label="Handbook chapters">'+navhtml+'</nav><main class="book">'+pageshtml+'<p class="no-results">No matching pages · कोई पेज नहीं मिला</p></main><dialog id="image-modal"><button aria-label="Close image">Close ×</button><img alt="Screenshot at native size"></dialog><script>'+JS+'</script></body></html>'
(OUT/'Cosmos_ERP_Handbook_English_Hindi.html').write_text(doc,encoding='utf-8')
(TMP/'page-index.json').write_text(json.dumps([{k:v for k,v in p.items() if k!='body'} for p in PAGES],ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'capture-index.json').write_text(json.dumps(capture_manifest,ensure_ascii=False,indent=2),encoding='utf-8')
missing=[p for l in LESSONS for p in l['source'].split('; ') if not (ROOT/p).exists()]
(TMP/'build-summary.json').write_text(json.dumps({'pages':len(PAGES),'lessons':len(LESSONS),'captures':len(CAP),'reports':len(REPORTS),'field_groups':len(FIELD_ROWS),'source_files_indexed':len(SRC),'missing_sources':missing},indent=2),encoding='utf-8')
print((TMP/'build-summary.json').read_text())
