# HR, Administration અને Website માટે ઉપયોગ માર્ગદર્શિકા

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
