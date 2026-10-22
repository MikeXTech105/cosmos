from pathlib import Path
import json
import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image,ImageOps,ImageDraw
root=Path('F:/FI/cosmos');out=root/'output/cosmos-handbook';qa=root/'tmp/handbook/qa'
pdf=out/'Cosmos_ERP_Handbook_English_Hindi.pdf'
reader=PdfReader(pdf)
index=json.loads((root/'tmp/handbook/page-index.json').read_text(encoding='utf-8'))
assert len(reader.pages)==len(index),(len(reader.pages),len(index))
assert all(abs(float(p.mediabox.width)-595.28)<2 for p in reader.pages)
assert all(abs(float(p.mediabox.height)-841.89)<2 for p in reader.pages)
alltext='\n'.join(p.extract_text() or '' for p in reader.pages)
need=['Cosmos ERP','Manufacturing','Procurement','GST','Payroll','Rojmel','Warranty','Stock','194']
assert all(n.lower() in alltext.lower() for n in need)
doc=pdfium.PdfDocument(str(pdf));thumbs=[]
for n in range(len(doc)):
 page=doc[n];im=page.render(scale=.4).to_pil().convert('RGB')
 thumb=ImageOps.contain(im,(198,280));tile=Image.new('RGB',(214,307),'#e9ecf3');tile.paste(thumb,((214-thumb.width)//2,8))
 draw=ImageDraw.Draw(tile);draw.text((9,290),f'{n+1:03d}  {index[n]["id"][:25]}',fill='#26334c');thumbs.append(tile)
 if index[n]['id'] in ['cover','contents-1','lesson-first-session','lesson-gst','lesson-manufacturing-production','system-map','lifecycle-map','shipment-lifecycle','screen-website-products-new','screen-users-create-dialog','field-guide-1','setup-commands','developer-setup']:
  page.render(scale=1.5).to_pil().save(qa/f'pdf-{index[n]["id"]}.png')
 page.close()
for start in range(0,len(thumbs),24):
 chunk=thumbs[start:start+24];sheet=Image.new('RGB',(214*6,307*4),'white')
 for j,im in enumerate(chunk):sheet.paste(im,((j%6)*214,(j//6)*307))
 sheet.save(qa/f'contact-{start//24+1:02d}.jpg',quality=91)
print(json.dumps({'pages':len(reader.pages),'characters':len(alltext),'pdf_bytes':pdf.stat().st_size,'contact_sheets':(len(thumbs)+23)//24,'all_pages_rendered':True},indent=2))
(qa/'pdf-validation.json').write_text(json.dumps({'page_count':len(reader.pages),'a4_pages':True,'all_pages_rendered':True,'required_topics_present':True,'text_characters':len(alltext)},indent=2))
