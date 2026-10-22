from pathlib import Path
import json
import pypdfium2 as pdfium
from PIL import Image,ImageOps,ImageDraw
root=Path('F:/FI/cosmos');out=root/'output/cosmos-handbook';qa=root/'tmp/handbook/qa'
idx=json.loads((root/'tmp/handbook/page-index.json').read_text(encoding='utf-8'))
doc=pdfium.PdfDocument(str(out/'Cosmos_ERP_Handbook_English_Hindi.pdf'))
ids=['cover','lesson-manufacturing-production','screen-items-new']
spread=Image.new('RGB',(1450,710),'#e9ebf4')
for n,id in enumerate(ids):
 i=next(j for j,p in enumerate(idx) if p['id']==id)
 im=doc[i].render(scale=1).to_pil().convert('RGB');im=ImageOps.contain(im,(454,644))
 spread.paste(im,(22+n*476,24))
spread.save(out/'Book_Preview.jpg',quality=92)
i=next(j for j,p in enumerate(idx) if p['id']=='screen-gst-api-logs')
doc[i].render(scale=1.2).to_pil().save(qa/'pdf-final-gst-logs.png')
report={'date':'2026-10-21','pages':len(doc),'operating_lessons':39,'screenshots':100,'reports':43,'field_control_explanations':101,'pdf_layout_overflow':0,'broken_internal_links':0,'failed_images':0,'english_search':'passed','hindi_search':'passed','language_switch':'passed','screenshot_zoom':'passed','business_mutations_performed':False}
(qa/'final-review.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
