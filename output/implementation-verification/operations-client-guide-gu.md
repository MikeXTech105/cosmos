# કામગીરી માટેની માર્ગદર્શિકા

આ નોંધ નવા Production, OEE, Packaging, Dispatch અને Shipment પ્રવાહ સમજાવે છે. ઉપલબ્ધ બટનો તમારી પરવાનગી અને રેકોર્ડની હાલની સ્થિતિ મુજબ દેખાશે. ડેટાબેઝની નવી સ્ક્રિપ્ટો લગાવ્યા પછી જ નવા API આધારિત પ્રવાહ ચકાસવા.

## દૈનિક ઉત્પાદન દાખલ કરવું

1. **Production → Daily Production** ખોલો. કંપનીની તારીખ અને વાસ્તવિક સમય તપાસો.
2. સંબંધિત ઓર્ડરમાં Accepted અને Rejected જથ્થો લખો અથવા બે કૉલમ પેસ્ટ કરો. Pending, In review અને Saved ગણતરી જુઓ.
3. **Review**માં માલનો વાસ્તવિક વપરાશ તપાસીને અધિકૃત મંજૂરી આપો. આ પગલાથી જ ઉત્પાદનનો સ્ટોક બદલાય છે.
4. ભરેલા બાકી જથ્થા હોય ત્યારે તારીખ/સમય બદલાતા નથી. પહેલા સમીક્ષા કરો અથવા **Discard typed entries**થી સ્પષ્ટ રીતે છોડો.
5. **Keep draft** બ્રાઉઝરમાં તમારા ખાતા અને કંપની માટે ડ્રાફ્ટ રાખે છે. પાછા આવતાં **Recover draft** અથવા **Discard stored draft** પસંદ કરો. પુનઃપ્રાપ્તિ જાતે સ્ટોક પોસ્ટ કરતી નથી; ઓર્ડરની આવૃત્તિ અને બાકી જથ્થો ફરી ચકાસાય છે.

Order બનાવતી વખતે **Needs setup**, **Ask approver** કે **Failed to load** અલગ કારણ બતાવે છે. સંબંધિત સેટઅપ ખોલીને મૂળ કામ પર પાછા આવો; સાચવેલો ડ્રાફ્ટ સ્પષ્ટ પસંદગીથી પાછો મેળવો.

## OEEમાં મશીન ન ચાલ્યું હોય

**OEE → Production Entries**માં runtime/shot વાંચન દાખલ થાય છે. આ ઉત્પાદન સ્ટોક પોસ્ટિંગ નથી.

જો મશીન એ દિવસે ચાલ્યું ન હોય તો stopped-day વિભાગમાં મશીન, **Not run** અથવા **Planned stop** અને સાચું કારણ પસંદ કરો. નકલી શૂન્ય વાંચન દાખલ ન કરો. અગાઉની નોંધ બદલવી હોય તો સુધારો/Withdrawal સાથે કારણ આપો. સક્રિય stopped-day નોંધ હોય ત્યારે running વાંચન સ્વીકારાતું નથી; પહેલા અધિકૃત Withdrawal જરૂરી છે. ઇતિહાસમાં જૂની નોંધ રહે છે.

## પૅકેજિંગ પ્રોફાઇલ તૈયાર કરવી

1. **Supply Chain → Packaging Profiles**માં હાલનો Item અને જરૂરી Channel પસંદ કરો.
2. Units per box તથા જરૂરી સેટઅપ ભરો. ઓછી વપરાતી dimensions/weights Advanced વિભાગમાં છે.
3. **Save & verify conversion** પછી એ જ પ્રોફાઇલમાં source unit, Itemની base unit, બંનેનો સાચો જથ્થા આધાર અને પુરાવાનો સંદર્ભ તપાસો.
4. જરૂરી Approve પરવાનગી ધરાવનાર conversion સાચવે. સામાન્ય profile Saveથી conversion ચકાસાયેલ ગણાતું નથી.

Dispatch/Procurement policyમાં **Try a worked policy example**થી હાલના પરિમાણોનો સૂચિત જથ્થો જોઈ શકાય છે. આ ઉદાહરણથી કોઈ setting, plan કે સ્ટોક સાચવાતો નથી. Routing stepના ઉદાહરણમાં units/minute, seconds/unit, quantity basis અને setup minutesનો અર્થ જુઓ. Shot rate માટે Itemને લાગુ પડતું ચકાસાયેલ output per shot જરૂરી છે.

## Dispatch planમાંથી Shipment બનાવવું

**Dispatch → Planning run**માં Finalized run ખોલીને shipment બનાવવાની કડી લો. સ્રોતની actual allocation, અગાઉ પરિવર્તિત જથ્થો અને બાકી જથ્થો જુઓ. Warehouse/run બદલતાં પાછલા પરિણામનો ઉપયોગ ન કરો; તાજું વાંચન પૂરું થવા દો. Transporter લોડ નિષ્ફળ થાય તો Retry કરો; ભૂલને ખાલી યાદી સમજી ન લો.

## ખોટું પૅકિંગ સુધારવું

1. Shipmentના **Packing** ટૅબમાં તાજી આવૃત્તિ અને પૅકેજ તપાસો.
2. **Remove / repack**માં કારણ લખીને સમીક્ષા કરો. જવાબ અજ્ઞાત રહે તો એ જ intent સાથે Retry કરો; જુદો નવો પ્રયાસ બનાવતાં પહેલાં તાજો રેકોર્ડ જુઓ.
3. સફળ removal પછી બાકી packed જથ્થા/વજન ફરી ગણાય છે. પહેલેથી packed થયેલું undispatched shipment ફરી packingમાં ખૂલે છે. જૂનો package અને ઇતિહાસ પુરાવા તરીકે રહે છે.
4. સાચો Item/base unit/પૅકિંગ આધાર ચકાસીને નવા પૅકેજ બનાવો અને આગળનું જરૂરી verification કરો.

Dispatched માલ અથવા submitted/approved/paid freightને આ પ્રવાહ બદલતો નથી. દર્શાવેલ કારણ મુજબ સંબંધિત અધિકૃત કાર્ય પૂર્ણ કરવું પડે છે.

## રિપોર્ટ બહાર કાઢવો

Production Operationsમાં સામાન્ય ઉપયોગ માટે **Export CSV** લો; જરૂરી હોય તો Advanced **NDJSON** મળે છે. Production CSVમાં filter/date basis, ઉપલબ્ધ source quality અને unit પ્રમાણે totals રહે છે.

Dispatch અને Shipment CSV બધા matching pages વાંચે છે. વાંચન અધૂરું, પુનરાવર્તિત અથવા બદલાયેલ હોવાનું જણાય તો partial file આપવામાં આવતી નથી; filters refresh કરીને ફરી Export કરો. કોઈ નવા કુલ જથ્થા અંદાજથી બનાવાતા નથી.
