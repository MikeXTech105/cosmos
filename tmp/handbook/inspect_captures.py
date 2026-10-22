import json,re
a=json.load(open('tmp/handbook/captures.json',encoding='utf-8'))
for x in a:
 controls=re.findall(r'(?:textbox|combobox|spinbutton|checkbox|button) "([^"\n]+)"',x['dom'])
 print(x['id']+' | '+' / '.join(controls))
 if x['id'] in ['items','gst-api-logs','shipments-work-list']:print(x['dom'][-4500:])
