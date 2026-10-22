from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image,ImageOps,ImageDraw
import json
root=Path('F:/FI/cosmos');out=root/'output/cosmos-handbook';qa=root/'tmp/handbook/qa-separated'
index=json.loads((root/'tmp/handbook/page-index.json').read_text(encoding='utf8'))
results=[]
for lang,name in [('en','English'),('hi','Hindi')]:
 path=out/f'Cosmos_ERP_Handbook_{name}.pdf';reader=PdfReader(path);assert len(reader.pages)==194
 assert all(abs(float(p.mediabox.width)-595.28)<2 and abs(float(p.mediabox.height)-841.89)<2 for p in reader.pages)
 doc=pdfium.PdfDocument(str(path));sample_ids=['cover','lesson-items','lesson-gst','screen-items-new','field-guide-1','reading-guide'];tiles=[]
 for i,page in enumerate(doc):
  im=page.render(scale=.32).to_pil().convert('RGB');assert im.size[0]>100
  if index[i]['id'] in sample_ids:
   full=page.render(scale=1.25).to_pil();full.save(qa/f'{lang}-pdf-{index[i]["id"]}.png')
   tile=Image.new('RGB',(214,308),'#edf0f6');im=ImageOps.contain(full,(198,280));tile.paste(im,((214-im.width)//2,5));ImageDraw.Draw(tile).text((7,290),f'{i+1} {index[i]["id"][:21]}',fill='#26334c');tiles.append(tile)
  page.close()
 sheet=Image.new('RGB',(214*3,308*2),'white')
 for i,tile in enumerate(tiles):sheet.paste(tile,((i%3)*214,(i//3)*308))
 sheet.save(qa/f'{lang}-pdf-review.jpg',quality=93)
 results.append({'language':name,'pages':len(reader.pages),'all_pages_rendered':True,'a4':True,'bytes':path.stat().st_size})
(qa/'pdf-validation.json').write_text(json.dumps(results,indent=2),encoding='utf8')
print(json.dumps(results,indent=2))
