import pathlib,re,json,hashlib
root=pathlib.Path('F:/FI/cosmos')
out=root/'tmp/handbook'
files=[]
for base in ['frontend/src','backend/src','backend/database']:
 for p in (root/base).rglob('*'):
  if p.suffix not in ['.jsx','.js','.cs','.sql'] or any(x in p.parts for x in ['bin','obj']):continue
  t=p.read_text(encoding='utf-8-sig',errors='replace')
  files.append({'path':str(p.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(t.encode()).hexdigest(),'lines':len(t.splitlines()),'labels':list(dict.fromkeys(re.findall(r'(?:label|title|description|placeholder)\s*[:=]\s*[\"\']([^\"\'\n]{2,180})',t))), 'fields':list(dict.fromkeys(re.findall(r'(?:register\(|name=)[\"\']([\w.]+)',t)))})
(out/'source-index.json').write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf-8')
routes=re.findall(r'path="([^"]+)"',(root/'frontend/src/routes/AppRoutes.jsx').read_text())
routes+=re.findall(r'route: "([^"]+)"',(root/'frontend/src/utils/gstCompliance.js').read_text())
screens=[]
for route in routes:
 if ':' in route or route in ['*','/','/login','/forgot-password','/reset-password','/pages','/change-password','/403','/404','/gst','/dispatch','/shipments','/procurement/sku-mapping','/procurement/bom-mapping','/procurement/settings']:continue
 key=route.strip('/').replace('/','-')
 screens.append({'id':key,'route':route})
(out/'screens.json').write_text(json.dumps(screens,indent=2),encoding='utf-8')
print('Indexed',len(files),'source files;',len(screens),'static screens')
print(json.dumps(screens,indent=1))
