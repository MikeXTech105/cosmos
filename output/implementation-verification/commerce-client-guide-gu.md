# Commerce: operator guide and verification handoff

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
