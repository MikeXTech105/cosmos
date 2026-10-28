# COSMOS — ક્લાયન્ટ કાર્યપ્રવાહ માર્ગદર્શિકા

તારીખ: 28 ઑક્ટોબર 2026. આ guide નવા code માં જોડાયેલા પ્રવાહ સમજાવે છે. સાચા company database પર નવી SQL scripts લાગુ કરીને અધિકૃત roles થી acceptance ચકાસ્યા પછી જ release નક્કી કરવો. હાલના screenshots synthetic component verification છે.

## શરૂઆત અને સામાન્ય નિયંત્રણો

Login પછી Today માં તમારી પરવાનગી પ્રમાણે Commerce, Production, Warehouse, HR અથવા Admin કામ મળે છે. જરૂરી destinations pin કરો; Recently opened માં આ browser/account/company ના અધિકૃત destinations મળે છે. કામ માટે સંબંધિત list ખોલો; source load ન થાય તો તેને શૂન્ય pending માનો નહીં.

Search dropdown માં નામ/code લખો, પછી keyboard arrows અને Enter થી પસંદ કરો અથવા આગળના results લોડ કરો. Saved inactive reference ઇતિહાસ માટે દેખાય શકે છે; નવી entry માં active reference પસંદ કરો. Search નિષ્ફળ જાય તો Retry કરો; typed form પોતાની રીતે submit થતું નથી.

Dirty form છોડતી વખતે Stay/Leave પસંદગી મળે છે. Recoverable draft મળે તો Restore and review અથવા Discard સ્પષ્ટ પસંદ કરો. Recovery માત્ર local data પાછો આપે છે; stock, cash, payroll કે approval પોતાની રીતે post કરતું નથી. અન્ય tab માં નવો draft હોય તો તેને overwrite કરવાને બદલે review સૂચના મળે છે.

Reports માં period/entity filters નાખીને results જુઓ. View ને નામ આપી સાચવો, favourite/spacing/columns પસંદ કરો; જરૂરી identity, quantity, currency અને status columns જળવાય છે. Drilldown થી source record ખોલ્યા પછી Return to report થી filters સાથે પાછા આવો. Export માટે અલગ પરવાનગી જરૂરી છે. Mobile cards માં record identity, મૂળ quantity, amount અને status જુઓ.

Save માં field/line error આવે તો ઉપરની persistent error summary માંથી સંબંધિત input પર જાઓ; ભરેલી અન્ય માહિતી જળવાય છે. Unknown outcome હોય તો saved history/readback તપાસ્યા પછી જ retry કરો. List માંથી form/detail ખોલ્યા પછી Return to list થી પાછા આવતાં એ tab ના filters અને scroll ફરી મળે છે; અધિકૃત save થયેલો record highlight થાય છે. અલગ deep-link query જૂના filters થી બદલાતી નથી.

## માન્ય કરેલા વ્યવસાયના નિયમો

- Payroll: calendar-day પ્રમાણે earnings prorate, deductions fixed; attendance અને approved paid leave overlap થાય તો HR correction પછી જ ગણતરી. Resigned employee નો employed period ગણાય છે. Salary વચ્ચે બદલાય તો review માં એક period rate પસંદ કરો.
- Party: grouping, shipping અને status ના supported controls કામ કરે છે. Reminders, loyalty અને custom fields હાલ future unavailable options છે.
- GST: rounding, discount allocation અને component rules હજી નક્કી કરવાના છે. PendingPolicy snapshot source review માટે છે; proposal પસંદ કરવાથી કાનૂની issuance ચાલુ થતું નથી.


# Commerce અને GST

આ માર્ગદર્શિકા નવા code flow માટે છે. Actual SQL અને provider sandbox journeys અહીં ચલાવ્યા નથી; release verification બાકી છે.

## Item, Party અને documents

- Item/Party/category/unit/bill ના search માં નામ અથવા code લખો. આગળના pages પણ મળે છે; dropdown ની શરૂઆતની list પૂરતી મર્યાદા નથી. જૂના selected inactive master ને by-ID load કરી શકાય છે.
- Invoice date અથવા Item બદલવાથી effective HSN/SAC ફરી resolve થાય છે. Product override પહેલાં અને Category default પછી લાગુ પડે છે. Lookup નિષ્ફળ થાય તો તેનું કારણ દેખાશે; જૂની value ને નવી lookup ની સફળતા માનવામાં નહીં આવે.
- Item stock માં છ decimal સુધી અને amount માં બે decimal સુધીનું મૂળ text સાચવાય છે. વધારાના decimal અથવા range બહારની value ને બદલી નાખવાને બદલે validation બતાવે છે.
- Item/Party/Invoice/Purchase drafts માટે Restore and review પસંદ કરો. Draft account/company પ્રમાણે અલગ છે. Item image ફરી પસંદ કરવી પડે છે; current/reserved stock server પરથી જ રહે છે. Save સફળ થયા પછી draft clear થાય છે.
- List માંથી New/Edit/View કર્યા પછી Back થી અગાઉના search, filters, page અને scroll પર પરત આવી શકાય છે. સફળ save પછી એ જ record એક વાર highlight થાય છે. Record હાલના filter/page બહાર હોય તો notice મળે છે; filters આપમેળે બદલાતા નથી.
- Validation summary માં ભૂલનું નામ પસંદ કરવાથી તે field/line સુધી focus જાય છે. Item ના Stock tab માં ભૂલ હોય તો tab પહેલાં ખુલે છે. કોઈ line કાઢ્યા પછી summary બાકી રહેલી સાચી line ને જ બતાવે છે.
- Party એક જ master છે: Customer, Supplier અથવા Both. જૂના API client PartyType મોકલે નહીં તો saved role જળવાય છે.

## Purchase અને cash

- Bill confirmed હોય ત્યારે તેના original line પરથી financial return બનાવો. Remaining returnable quantity જુઓ. Receipt-owned physical stock માટે PO/receipt return flow વાપરો; financial return થી stock ફરીથી બદલાતું નથી.
- Supplier બદલવાથી અગાઉની payment allocations clear થાય છે. નવી supplier bills load થાય પછી જ allocation કરો. Timeout પછી history/readback તપાસો; નવી payment ફરી submit ન કરો.
- Save નો network/503 result અજાણ્યો હોય ત્યારે તરત journal સાચવાય છે અને ફરી save lock થાય છે, unchanged Edit Save માં પણ. Reload પછી optional draft restore કર્યા વગર આ lock દેખાય છે. જાણીતા record નું Read current saved record ફક્ત GET કરે છે; ફરી save કરતું નથી. History તપાસ્યા પછી જ “I reviewed saved records…” અને reviewed retry પસંદ કરો. આ local recovery છે; server idempotency હોવાનો દાવો નથી.
- Operating cost નો document Expenses માં નોંધો. Rojmel/My Wallet વાસ્તવિક cash movement નોંધે છે. Expense આપમેળે wallet debit કરતું નથી. Cash ખરેખર ચૂકવાયો હોય ત્યારે અલગ movement માં Expense number ને Reference No. તરીકે લખો; આ manual reconciliation reference છે.

## Production

- Daily Production / production board order-based કામ માટે છે. Item tab નો legacy manufacture flow draft → material snapshot → Post છે. OEE readings stock post કરતી નથી.
- New production માટે verified company business date જોઈએ. Date બદલતાં તે date નો applicable BOM ફરી load થાય છે. જૂની production edit માં saved BOM snapshot જળવાય છે.
- Post/Cancel માટે Approve permission જોઈએ. Approved BOM ની End effectivity અલગ Approve action છે. Production history અને BOM versions આગળના pages સુધી જોઈ શકાય છે.

## Party settings

- Grouping, shipping address entry, shipping print અને status editing તેમના screens પર અસર કરે છે. Disabled shipping/status historical values કાઢતા નથી.
- તમારી સૂચના મુજબ reminder dispatch, loyalty અને custom fields હાલ unavailable છે. Saved configuration ને કાર્યરત feature તરીકે રજૂ કરવામાં આવતું નથી.

## GST

- Registration GSTIN/branch name થી શોધો. State GSTIN પરથી આવે છે. Company/Branch numeric references માત્ર read-only support metadata છે; application માં તેમની maintained master lookup નથી.
- Session માટે saved registration પસંદ કરીને OTP explicitly મોકલો/authenticate કરો. OTP draft માં સાચવાતો નથી. Unknown outcome પછી session status તપાસો.
- E-Way Bill extension માં current location, PIN, remaining distance, transport અને approved provider reason code review કરો. Provider success ની later validity જ save થાય છે. Unknown result માટે Reconcile extension from provider વાપરો; extension ફરી મોકલાતી નથી. URL માં command reference રહે છે.
- Confirmed Invoice માં GST source preparation review કરીને current buyer/seller details freeze કરી શકાય છે. Policy proposals માટે Decide later રાખી શકાય છે. Result `PendingPolicy` છે; કોઈ government document issue થતું નથી. Saved source readback માં મૂળ frozen identity જ રહે છે.
- તમારી સૂચના મુજબ rounding/discount/issuance policy નો નિર્ણય પછી થશે. CGST/SGST split અનુમાનથી બનાવાતો નથી; approved effective component rules અને policy validation વગર issuance unavailable રહેશે.

## SQL અને external verification

Unified guarded SQL handoff root agent તૈયાર કરે છે. તેમાં migrations `20261028_05_gst_eway_extension_commands.sql` અને `20261028_06_gst_pending_source_snapshots.sql` જરૂરી છે. Existing database માટે reset/full setup ચલાવશો નહીં. SQL integration tests ફક્ત `CosmosSalesGstIntegrationTests_*` disposable catalogue માં ચાલે છે. Snapshot suite immutable synthetic rows ત્યાં જ છોડે છે; તે immutability trigger disable કરતી નથી. Actual upgrade, backup/restore, ordinary-role browser and provider sandbox evidence release પહેલાં બાકી છે.


# Production, OEE અને Warehouse

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


# HR, Admin અને Website

આ નોંધ હાલના implementation પ્રમાણે છે. નવી HR SQL migration userએ હજી ચલાવવાની છે. નીચેના save અને approval પ્રવાહ માટે સામાન્ય user permissions સાથેની live database ચકાસણી release પહેલાં બાકી છે.

## કર્મચારી તૈયાર કરવો

1. **HR → Employees → Add employee**માં પહેલા નામ, સંપર્ક અને employmentની જરૂરી વિગતો ભરો. Address અને Bankના optional વિભાગ જરૂર હોય ત્યારે ખોલો.
2. Department, Designation કે Shift બનાવવાની પરવાનગી હોય તો એ જ formમાંથી બનાવો. સફળતાથી બનેલી પસંદગી મૂળ formમાં પસંદ થાય છે.
3. **Keep draft**થી ખાતા અને કંપની પ્રમાણે draft રાખી શકાય છે. પાછા આવતાં draftને restore કરીને તપાસો અને પછી save કરો. Bank વિગતો draftમાં રાખવામાં આવતી નથી.
4. Employee save થયા પછી bank save નિષ્ફળ થાય તો employee ફરીથી બનાવશો નહીં. દેખાતી pending bank actionથી ફક્ત bankનો બાકી પગલું ફરી કરો. અનિશ્ચિત save પછી હાલની bank entry પહેલા તપાસાય છે.
5. Employee profile download માટે સફળ save પછી દેખાતું અલગ download action વાપરો.

## હાજરી અને સુધારો

દૈનિક હાજરીમાં તારીખ બદલતાં બાકી ફેરફારો માટે review બતાવાય છે. **Keep draft** અને explicit recovery વાપરી શકાય છે; recovery આપમેળે હાજરી save કરતી નથી.

કર્મચારીના attendance historyમાં સંબંધિત દિવસ પરથી correction માગો. Employee અને દિવસ મૂળ record સાથે બંધાયેલા રહે છે. હાલની તથા સૂચવેલી status/time અને કારણ તપાસીને મોકલો. Company timezone ઉપલબ્ધ હોય ત્યારે clock time એ timezoneમાં દાખલ કરો. ફક્ત status બદલવાથી મૂળ timeની precision જળવાય છે.

Approve પરવાનગી ધરાવનાર pending correction inboxમાં employee, date, current/proposed values અને કારણ જોઈ શકે છે. Approvalથી હાજરી અને request સાથે બદલાય છે. વચ્ચે હાજરી બદલાઈ હોય અથવા સંબંધિત payroll process થઈ ગયો હોય તો નવી review જરૂરી બને છે. જૂના decision-only requests હાજરી બદલતા નથી.

Department attendance reportમાંથી filtered daily roster ખોલી શકાય છે. Dashboardમાં કોઈ source load ન થયું હોય તો તેને શૂન્ય તરીકે માનશો નહીં; unavailable/partial સંદેશ તપાસો.

## Leave અને પગારનું setup

**HR → Leaves**ના setupમાં Leave Type અને employee entitlement સાચવો. Entitlement બદલવાથી used leave કાઢી નાખાતી નથી; total entitlement usedથી ઓછું થઈ શકતું નથી. Annual quota બદલવાથી જૂના તમામ employeesના balances reset થતા નથી. Carry-forward અને year-end reset માટે નવી formula ઉમેરવામાં આવી નથી.

**HR → Payroll**ના setupમાં earning/deduction components બનાવો, structureમાં ચોક્કસ amounts મૂકો અને employeeને effective dateથી structure assign કરો. ઉપયોગમાં આવી ગયેલું structure બદલવા માટે નવું structure અને નવી effective assignment બનાવો. Process થયેલા payrollનું જૂનું પરિણામ બદલાતું નથી.

## Payroll ચલાવવું

1. Month/year પસંદ કરીને **Review payroll preflight** ચલાવો. દરેક employeeની setup, employed days અને blocker તપાસો. Missing setup અથવા અસંપૂર્ણ resign/rejoin history હોય તો પહેલા અધિકૃત HR correction કરો.
2. એક જ સમયગાળામાં અનેક salary structures લાગુ પડ્યા હોય તો દરેક સંબંધિત employee માટે એક actual applicable assignment પસંદ કરો અને review checkboxથી સ્વીકારો. Rate પોતે પસંદ થતો નથી. એક unambiguous structure હોય તો તે આપમેળે વપરાઈ શકે છે.
3. તમારી મંજૂર policy પ્રમાણે પસંદ કરેલી monthly earnings × payable employed days ÷ મહિનાના calendar daysથી earnings બને છે. પસંદ કરેલા structureના fixed deductions વપરાય છે. અલગ દિવસના rates blend થતા નથી.
4. Attendance અને approved paid leave એક જ employed date પર હોય તો payroll અટકે છે. HRએ attendance/leave સુધારવી પડે છે. Cross-month leave ફક્ત period અને employmentમાં આવતા દિવસો માટે ગણાય છે.
5. મહિનામાં resigned થયેલા employee માટે ખરેખર employed સમય આવે છે. જાણીતા resign/rejoin gaps ગણાતા નથી. જૂની employment boundaries સાબિત ન થાય તો run અટકે છે.
6. બધા blockers દૂર થયા પછી process કરો. Period duplicate, stale rate selection કે negative net માટે આખો run reject થાય છે. Approval પહેલાં period, employee count અને total તપાસો. Historyમાં month/yearથી run શોધો; numeric ID લખવાની જરૂર નથી.

હાલના existing population filterમાં current **Active** અને **Resigned** employees આવે છે. Current **Inactive/Terminated** recordsનો historical payrollમાં સમાવેશ નવી policy તરીકે બદલાયો નથી; આવા periodનો release પહેલાં ખાસ review કરો.

Leave balanceમાં entitlement/used/remaining અને payslipમાં employee/period/earnings/deductions/net દેખાય છે. **Print / Save PDF** અલગ action છે.

## Users, Roles અને Data Book

- User create સફળ થયા પછી role assignment નિષ્ફળ થાય તો saved user જ રહે છે. Pending role bannerમાંથી ફક્ત role assignment retry કરો.
- Role save પછી permissions ખોલીને actions તપાસો. બીજા existing roleની permissions template તરીકે copy થઈ શકે છે; save પહેલાં review કરો. Preview roleની permissions બતાવે છે; એક userને મળેલા બધા rolesનું combined access ગણતું નથી.
- Role બદલતાં unsaved matrix અને Data Bookમાં sheet/view/public-private context બદલતાં pending entries માટે guard આવે છે. **Keep draft** પછી ફરી આવતાં restore કરીને review કરો.
- Data Book refresh વચ્ચે typed/pasted pending work જળવાય છે. Server પર એ જ row બદલાઈ હોય તો conflict બતાવે છે; જૂની value આપમેળે overwrite થતી નથી. Save જાતે કરો.

## Website content અને settings

Blog, Product અને Announcement editorમાં previewથી supported content, media/fields અને announcement link તપાસો. Blog category એ જ editorમાં બનાવી શકાય છે. Previewમાં raw script/HTML ચલાવવામાં આવતું નથી. અલગ public website renderer/assets આ checkoutમાં નથી, તેથી production websiteનું ચોક્કસ visual matching હજી verify કરવાનું છે.

Scheduling માટે configured company timezoneમાં time લખો; system APIને UTC મોકલે છે. Company timezone load ન થાય તો નવા scheduling ફેરફાર પહેલાં તે setup સુધારો. હાલના saved UTC schedules જળવાય છે. ખોટા કે ambiguous clock times સ્વીકારાતા નથી.

Website settingsમાં friendly નામ અને યોગ્ય email/URL/Yes-No fields છે. બદલાયેલી settings જ save થાય છે. Public/private visibility બદલતાં review આવે છે. Public value કોઈ પણ website visitor વાંચી શકે છે. પરીક્ષણ માટે કોઈ content publish અથવા customer communication કરવામાં આવ્યું નથી.

Profileની identity details read-only હોય ત્યારે administratorનો સંપર્ક કરો. **Preferences / Item display settings** આ browserના display options છે; company configuration બદલતાં નથી. Password reset માટે મળેલી reset link ખોલો; token જાતે લખવાનો નથી. Link અધૂરી કે expired હોય તો નવી reset link માગો.

## User-run SQL અને release gates

`backend/database/migrations/20261028_02_hr_operator_setup.sql` હાલના HR schema પછી લાગુ કરવી. Existing company databaseમાં reset/full-setup script ચલાવવી નહીં. Root handoffની unified guarded SQL scripts અને backup/upgrade instructions અનુસરો.

HR integration tests ફક્ત અલગ `CosmosHrIntegrationTests_*` catalog માટે તૈયાર છે; તેમાં active company staff ન હોવો જોઈએ. Fresh અને populated upgrade, repeated migration, concurrency અને payroll/correction fixtures userએ ચલાવવાના છે. આ turnમાં SQL ચલાવાયું નથી.

Focused checksમાં **80 frontend tests** અને **37 backend tests** પાસ છે; **1 SQL integration test skip** છે. આ mocked/component/validator/parser checks છે. Ordinary-role authenticated browser/API save, approval, mobile/desktop અને exact public-site preview checksને live pass તરીકે રજૂ કરવામાં આવતા નથી.


## SQL અને acceptance માટે આગળનું પગલું

.NET 10 SDK, Node dependencies અને Microsoft SQL Server LocalDB ઉપલબ્ધ થાય પછી repository root માં `./backend/scripts/Test-CompleteImplementation.ps1 -UseLocalDb` ચલાવો. અલગ SQL Server માટે `docs/OPERATIONS.md` માં આપેલી private environment રીત વાપરો; connection string/password chat માં ન મોકલો. Runner fresh અને upgrade test databases રાખે છે, company database reset કરતું નથી. SQL logs/TRX માં pass ચકાસો; skipped અથવા missing environment release pass નથી.

સાચા ordinary roles થી create → review/approve → post/receive → return/cancel → report/export journeys, stock/cash conservation અને source readback reconcile કરવાના છે. GST provider sandbox અને અંતિમ tax policy અલગથી review કરવા.
