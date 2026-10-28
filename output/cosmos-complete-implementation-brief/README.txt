COSMOS COMPLETE IMPLEMENTATION BRIEF
Prepared: 28 October 2026
Audit baseline: da46203

આ packageમાં શું છે
- PROMPT_COSMOS_COMPLETE_IMPLEMENTATION.txt: સંપૂર્ણ વિગતવાર implementation prompt.
- START_HERE.txt: નવા implementation chatમાં paste કરવા માટે ટૂંકું starting message.
- audits/: મૂળ સંપૂર્ણ UX/flow audit, HTML report અને JSON inventories/evidence.
- finding-tracker-template.json: બધા56 original finding IDs માટે tracking template.
- coverage-tracker-template.json: બધા125 coverage rows માટે tracking template.
- prompt-validation.json: prompt coverage/count/hash checks.
- PACKAGE_MANIFEST.json: included files and SHA-256 checksums.

કેવી રીતે વાપરવું
1. Existing Cosmos projectને coding agent/IDEમાં ખોલો.
2. આ ZIP extract કરીને આખું folder accessible રાખો અથવા agentને ZIP attach કરો.
3. START_HERE.txtનું text મોકલો. એ agentને આખો વિગતવાર prompt વાંચીને કામ શરૂ કરવા કહે છે.
4. જો આ જ F:\FI\cosmos workspaceમાં કામ કરો છો તો promptનો local path launcherમાં તૈયાર છે.
5. Agentને project source પણ મળવો જરૂરી છે. આ ZIPમાં project code, node_modules, database backup કે secrets નથી.

Full prompt self-contained છે: તેમાં56 findings,125 coverage rows,95 menu entries,136 literal routes,43 registry reports,44 verification scenarios, API/SQL work અને completion evidence requirements છે.
Inventory counts અલગ અર્થ ધરાવે છે;125 rowsનો અર્થ125 અલગ masters નથી.

આ package બનાવતી વખતે application code કે database બદલવામાં આવ્યાં નથી. Source audit live SQL/provider verificationનું પ્રમાણ નથી.
Credentials/passwords chatમાં મોકલવા નહીં; implementation દરમ્યાન યોગ્ય private local configuration વાપરવી.

The prompt is deliberately detailed. START_HERE is the short launcher; it does not replace reading the full execution specification.

