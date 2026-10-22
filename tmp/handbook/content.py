"""Reviewed bilingual operating procedures for the repository snapshot."""
LESSONS=[]
def lesson(key,group,title,hi,purpose,before,steps,check,fields='',source='',shots=''):
 LESSONS.append(dict(id=key,group=group,title=title,hi=hi,purpose=purpose,before=before,steps=steps,check=check,fields=fields,source=source,shots=shots.split(',')))

lesson('first-session','01 Start here','Sign in and find your workspace','लॉगिन करके अपना कार्यक्षेत्र खोलें',
'Use your assigned account to enter the ERP and see the pages allowed by your role.||अपने दिए गए खाते से ERP खोलें। भूमिका के अनुसार उपलब्ध पेज दिखाई देंगे।',
'Keep the application address and your username or email ready. An administrator must create your account and assign a role.||ऐप का पता और username या email तैयार रखें। प्रशासक पहले आपका खाता और भूमिका बनाए।',[
'Open /login. Enter Username or Email and Password. Use the password visibility control only when your screen is private.||/login खोलें। Username or Email और Password भरें। पासवर्ड दिखाने का विकल्प निजी स्क्रीन पर ही इस्तेमाल करें।',
'Choose Remember me only if you want the session retained on this device, then sign in.||इस डिवाइस पर सत्र बनाए रखना हो तभी Remember me चुनें और लॉगिन करें।',
'Open the navigation menu. Expand a module and select its page. On narrow windows the sidebar starts collapsed.||Navigation menu खोलें। Module खोलकर पेज चुनें। छोटे विंडो में sidebar बंद रह सकता है।',
'Use the account menu for My Profile, Preferences and Change Password. Use logout when finishing a shared-device session.||Account menu से My Profile, Preferences और Change Password खोलें। साझा डिवाइस पर काम के बाद logout करें।',
'For a forgotten password, open Forgot Password and follow the reset flow. If no reset message arrives, contact the administrator; delivery depends on the configured recovery service.||पासवर्ड भूलने पर Forgot Password का reset flow अपनाएँ। संदेश न मिले तो प्रशासक से संपर्क करें; delivery recovery service पर निर्भर है।'],
'A permitted page opens. A 403 means access is missing; a 404 means the route is unknown. Signing in does not grant every action.||अनुमति वाला पेज खुलता है। 403 का अर्थ अनुमति नहीं; 404 का अर्थ पता नहीं मिला। लॉगिन से हर action की अनुमति नहीं मिलती।',
'Username or Email; Password; Remember me; Current Password; New Password; Confirm Password',
'frontend/src/pages/auth; frontend/src/routes/ProtectedRoute.jsx; frontend/src/services/sessionService.js','dashboard')

lesson('navigation','01 Start here','Read lists forms and dashboards','सूचियाँ फॉर्म और डैशबोर्ड समझें',
'Recognize the same controls across modules before entering business data.||व्यापारिक डेटा भरने से पहले सभी modules में उपयोग होने वाले controls पहचानें।',
'Open any list such as Items. Have View permission for that page.||Items जैसी सूची खोलें। उस पेज की View अनुमति होनी चाहिए।',[
'Read the page heading and breadcrumb to confirm the module. Open search to locate navigation destinations.||Heading और breadcrumb से module की पुष्टि करें। पेज ढूँढने के लिए search खोलें।',
'Set search, status and date filters. Apply or refresh where offered. Clear filters before deciding that a record is missing.||Search, status और date filters चुनें। जहाँ उपलब्ध हो Apply या Refresh करें। रिकॉर्ड न दिखे तो पहले filters हटाएँ।',
'Use sort headings and rows per page to inspect results. Scroll wide tables sideways on a narrow screen.||Sort headings और rows per page से परिणाम देखें। छोटे स्क्रीन पर चौड़ी table को दाएँ बाएँ scroll करें।',
'Open View for inspection or Edit for changes. Required fields have an asterisk. Save and Save & New have different effects.||देखने के लिए View और बदलने के लिए Edit खोलें। तारांकन वाले fields जरूरी हैं। Save और Save & New के परिणाम अलग हैं।',
'Wait for the response, then reopen the saved record. Cancel closes an unfinished form; a business Cancel action may reverse or stop an existing document.||Response आने दें और saved record दोबारा खोलें। Form का Cancel अधूरा फॉर्म बंद करता है; document का Cancel मौजूदा रिकॉर्ड पर action है।'],
'A success message plus the reopened record verifies a save. A disabled or absent button can be caused by rights, record status or missing prerequisites.||Success संदेश और दोबारा खुले रिकॉर्ड से save की पुष्टि करें। Button बंद या गायब होने का कारण permission, status या prerequisites हो सकता है।',
'Search; Status; From date; To date; Sort; Refresh; View; Edit; Save; Save & New; Cancel',
'frontend/src/components/common; frontend/src/routes/PermissionGuard.jsx','items')

lesson('administration','02 Administration','Create roles users and action permissions','भूमिकाएँ यूजर और अधिकार बनाएँ',
'Give each operator the pages and actions needed for their job.||हर operator को उसके काम के लिए जरूरी पेज और actions दें।',
'An authorized administrator must be signed in. Decide the job responsibilities before granting access.||अधिकृत प्रशासक लॉगिन करे। अधिकार देने से पहले काम की जिम्मेदारियाँ तय करें।',[
'Open Roles. Add a role with a name and description, or inspect an existing role.||Roles में नाम और विवरण के साथ भूमिका बनाएँ या मौजूदा भूमिका देखें।',
'Open Permissions and select the role. Review page rows and the separate View, Create, Edit or Update, Delete, Export and Approve actions shown.||Permissions में भूमिका चुनें। हर पेज के View, Create, Edit या Update, Delete, Export और Approve actions अलग देखें।',
'Select only intended actions and save the permission set. View access alone does not permit editing or approval.||जरूरी actions ही चुनें और permissions save करें। केवल View से edit या approval की अनुमति नहीं मिलती।',
'Open Users and add username, email, display name, initial password and role. Review active status and save.||Users में username, email, display name, शुरुआती password और role भरें। Active स्थिति देखकर save करें।',
'Ask the operator to sign in again after access changes. Check both page visibility and the allowed action buttons.||अधिकार बदलने के बाद operator दोबारा लॉगिन करे। पेज और action buttons दोनों की जाँच करें।'],
'The user can open permitted pages and perform only granted actions. Keep user deactivation separate from deleting business records.||यूजर अनुमति वाले पेज और actions इस्तेमाल कर सके। यूजर को deactivate करना व्यापारिक records मिटाना नहीं है।',
'Role name; Description; Username; Email; Display name; Password; Role; Active; Permission actions',
'frontend/src/pages/rbac; backend/src/Cosmos.API/Security','roles,permissions,users')

lesson('page-registry','02 Administration','Maintain the page registry','पेज रजिस्ट्री सँभालें',
'Register routes and navigation metadata used by administration.||Administration में प्रयुक्त routes और navigation metadata सँभालें।',
'Know the implemented route and permission page name. Creating a registry row does not implement a new application screen.||Implemented route और permission page name मालूम हो। Registry row बनाने से नया app screen नहीं बनता।',[
'Open Pages to review page hierarchy and existing names. Check for a matching route first.||Pages में hierarchy और names देखें। पहले समान route खोजें।',
'Choose Add page and enter the internal Name, Display Name and Route exactly.||Add page में internal Name, Display Name और Route सही भरें।',
'Set Icon, Parent Page and Sort Order to control presentation. Set active status as intended.||Presentation के लिए Icon, Parent Page और Sort Order चुनें। Active status तय करें।',
'Save and return to Permissions to grant the page to the intended roles.||Save करके Permissions में संबंधित roles को अधिकार दें।',
'Reopen the page through navigation. If it returns 404, verify the frontend route implementation rather than adding another registry row.||Navigation से पेज खोलें। 404 आए तो दूसरी registry row बनाने के बजाय frontend route जाँचें।'],
'The route and registry match and the intended role can find the page.||Route और registry मेल खाते हों तथा संबंधित role पेज खोल सके।',
'Name; Display Name; Route; Icon; Parent Page; Sort Order; Active',
'frontend/src/pages/rbac/pages/PageFormPage.jsx; frontend/src/config/sidebar.js','rbac-pages-new')

lesson('party','03 Master data','Create a customer supplier or transporter party','ग्राहक सप्लायर या ट्रांसपोर्टर पार्टी बनाएँ',
'Keep identity, contact, addresses, tax details and opening balances in one party record.||एक party record में पहचान, संपर्क, पते, tax details और opening balance रखें।',
'Know which roles the party performs and have its verified business details.||Party की भूमिकाएँ और सत्यापित व्यापारिक विवरण तैयार रखें।',[
'Open Party Master and search before adding a new party. Use the appropriate type or role filters.||Party Master में नई party बनाने से पहले खोजें। सही type या role filter चुनें।',
'Choose Add Party. Enter the required Party Code and Party Name, then complete contact details and review the current party settings.||Add Party में जरूरी Party Code और Party Name दें। Contact details भरें और मौजूदा party settings देखें।',
'Enter registration type and GSTIN if applicable. Add billing and delivery addresses without confusing the two.||लागू होने पर registration type और GSTIN भरें। Billing और delivery addresses सही स्थान पर रखें।',
'Enter opening balance with the intended Debit receivable or Credit payable direction. Add payment terms and active status.||Opening balance के साथ सही Debit receivable या Credit payable दिशा चुनें। Payment terms और active स्थिति भरें।',
'Save, reopen and verify. To use an existing party for shipping, open Shipments > Transporters and add its transporter role.||Save करके जाँचें। Shipping में उपयोग के लिए Shipments > Transporters से उसी party को transporter role दें।'],
'The party is available in the relevant customer or supplier picker. Transporter assignment reuses a party instead of duplicating its identity.||Party सही customer या supplier picker में मिले। Transporter role उसी party पर जोड़ा जाए।',
'Party name; Contact; Registration type; GSTIN; Billing address; Delivery address; Opening balance; Debit or Credit; Payment terms; Active',
'frontend/src/pages/party/PartyFormModal.jsx; frontend/src/pages/shipments/transporters','party-new')

lesson('items','03 Master data','Build the item catalogue','आइटम कैटलॉग तैयार करें',
'Define the products, services, prices and classifications used throughout operations.||काम में प्रयुक्त products, services, prices और classifications तय करें।',
'Create Categories and Units first. Prepare item name, unit, prices and the correct material classification.||पहले Categories और Units बनाएँ। Item name, unit, prices और सही material classification तैयार रखें।',[
'Add a Category with a name and optional description. Add a Unit with its full name and short name, then keep required masters active.||Category में नाम और विवरण भरें। Unit में पूरा नाम और short name दें। जरूरी masters active रखें।',
'Open Items > Add item. Choose Product or Service and the Material type used by procurement.||Items > Add item खोलें। Product या Service और procurement के लिए सही Material type चुनें।',
'Fill Item Name, assign or enter Item Code, and select Category and Unit. Add Barcode and an image if useful.||Item Name, Item Code, Category और Unit भरें। जरूरत हो तो Barcode और image जोड़ें।',
'In Pricing enter Sales Price, Purchase Price, HSN Code and GST Rate. In Stock set inventory tracking and opening values for products.||Pricing में Sales Price, Purchase Price, HSN Code और GST Rate भरें। Product के Stock tab में tracking और opening values भरें।',
'Set description and Active item. Save Item to finish, or Save & New to continue adding items. Reopen and verify all tabs.||Description और Active item तय करें। Save Item से पूरा करें या Save & New से अगला item बनाएँ। सभी tabs जाँचें।'],
'The item appears in transaction pickers. Image uploads support PNG, JPG and WebP up to 5 MB. Stock quantities and prices cannot be negative in the form.||Item transaction pickers में मिले। Image PNG, JPG या WebP और अधिकतम 5 MB हो। Form में stock और prices negative नहीं हो सकते।',
'Item type; Material type; Item Name; Item Code; Barcode; Category; Unit; Image; Sales Price; Purchase Price; HSN Code; GST Rate',
'frontend/src/pages/inventory/items/ItemFormPage.jsx; frontend/src/utils/validationSchemas.js','items-new')

lesson('stock','03 Master data','Understand stock without double counting','स्टॉक समझें और दोहरी गिनती से बचें',
'Separate opening balances, physical stock, reservations, planning snapshots and actual movements.||Opening balance, physical stock, reserved stock, planning snapshots और असली movements अलग समझें।',
'Use an inventory-tracked product and the correct unit. Reconcile opening values before normal transactions begin.||Inventory tracking वाला product और सही unit लें। Transactions शुरू करने से पहले opening values मिलाएँ।',[
'Open the item Stock tab. Review Opening Stock, Opening Stock Value, Current Stock, Reserved Stock and Minimum Stock.||Item का Stock tab खोलें। Opening Stock, Opening Stock Value, Current Stock, Reserved Stock और Minimum Stock देखें।',
'Use Opening Stock for initial setup. Avoid treating opening entries as daily purchase receipts or manufacturing output.||Opening Stock शुरुआती setup के लिए है। इसे रोज की purchase receipt या production output न समझें।',
'Use stock reports to trace a change back to its document. A draft or planning recommendation is not proof of a stock movement.||Stock reports से बदलाव के मूल document तक जाएँ। Draft या planning recommendation stock movement का प्रमाण नहीं है।',
'Review negative stock, low stock and valuation separately. Reserved stock is a commitment indicator, not another pile of physical goods.||Negative stock, low stock और valuation अलग देखें। Reserved stock प्रतिबद्ध quantity है, अलग physical stock नहीं।',
'For discrepancies compare the item ledger, source status and quantities in the same unit before correcting the source document.||अंतर मिले तो same unit में item ledger, source status और quantities मिलाकर source document सुधारें।'],
'Opening balances are not counted again through duplicate receipts. Procurement uses global item stock plus eligible inbound snapshots, not warehouse allocation.||Opening balance duplicate receipt से दोबारा न गिने। Procurement global item stock और योग्य inbound snapshot लेता है; warehouse allocation नहीं।',
'Opening Stock; Opening Stock Value; Current Stock; Reserved Stock; Minimum Stock; Track inventory',
'frontend/src/pages/inventory/items; frontend/src/pages/procurement/home/procurementHomeHelpers.js','items-new')

lesson('manufacturing-bom','04 Manufacturing','Build the manufacturing recipe','निर्माण की BOM रेसिपी बनाएँ',
'A bill of materials states what raw materials are needed for one finished unit.||Bill of materials बताती है कि एक finished unit के लिए कौन सा raw material कितना चाहिए।',
'Save an active inventory-tracked Product. Enable manufacturing in Item Settings if hidden, and ensure component items exist.||Active inventory-tracked Product पहले save करें। Tab छिपा हो तो Item Settings में manufacturing चालू करें। Component items पहले बनाएँ।',[
'Edit the finished item and open Manufacturing. Enable Manufactured item where eligible, save it and reopen if requested.||Finished item edit करके Manufacturing खोलें। योग्य होने पर Manufactured item चालू करें, save करें और जरूरत पर दोबारा खोलें।',
'Choose Add BOM. Enter Version and Effective from, with Effective to only when the recipe has an end date.||Add BOM में Version और Effective from दें। Recipe समाप्त होनी हो तभी Effective to दें।',
'Add each Raw material, Qty / unit, Wastage % and optional component notes. Check the component unit.||हर Raw material, Qty / unit, Wastage % और जरूरत पर notes भरें। Component unit जाँचें।',
'Save and activate the appropriate version. Use effective dates so the production date resolves to the intended BOM.||सही version save और activate करें। Effective dates ऐसी हों कि production date पर सही BOM मिले।',
'Review the component list and use Procurement > Setup > BOM to inspect the same manufacturing-owned recipe and its issues.||Components देखें। Procurement > Setup > BOM में उसी manufacturing-owned recipe और issues की जाँच करें।'],
'An active effective BOM is available. Procurement BOM Mapping is an inspection view; maintain the recipe in the item Manufacturing tab.||Active और effective BOM उपलब्ध हो। Procurement का BOM Mapping देखने के लिए है; recipe Item Manufacturing tab में बदलें।',
'Version; Effective from; Effective to; Raw material; Qty / unit; Wastage %; Component notes; Active; Default',
'frontend/src/pages/inventory/items/ItemManufacturingTab.jsx; frontend/src/pages/procurement/bomMapping/BomMappingPage.jsx','items-new,procurement-setup')

lesson('manufacturing-production','04 Manufacturing','Manufacture post and reverse stock','उत्पादन दर्ज करें पोस्ट करें और स्टॉक वापस करें',
'Save a production draft, then post the actual material consumption and finished output together.||पहले production draft save करें, फिर raw material consumption और finished output साथ में post करें।',
'Have an active effective BOM, sufficient component stock and manufacturing action permissions.||Active effective BOM, पर्याप्त component stock और manufacturing actions की अनुमति हो।',[
'Open the saved finished item > Manufacturing > Manufacture. Select the BOM version and production date.||Saved finished item > Manufacturing > Manufacture खोलें। BOM version और production date चुनें।',
'Enter Planned quantity, Produced quantity, Reference and Notes. Save the draft and inspect its material snapshot.||Planned quantity, Produced quantity, Reference और Notes भरें। Draft save करके material snapshot देखें।',
'Check required material and wastage quantities against the actual production. A saved draft has not yet posted stock.||जरूरी material और wastage को असली उत्पादन से मिलाएँ। केवल draft save करने से stock post नहीं हुआ है।',
'Choose Post and update stock and confirm after review. Posting consumes raw materials and receives finished units atomically.||जाँच के बाद Post and update stock चुनकर पुष्टि करें। Posting में raw material घटता और finished units stock में बढ़ते हैं।',
'If posting times out, reload status before retrying. For a wrong posted run use Cancel and reverse stock with a reason, then verify the reversal in reports.||Timeout पर दोबारा post करने से पहले status reload करें। गलत posted run के लिए reason के साथ Cancel and reverse stock करें और reports में reversal जाँचें।'],
'Production shows Posted and stock reports reflect both sides. Cancellation reverses the posted movements. OEE shot entry is a separate measurement workflow.||Production Posted हो और stock reports में दोनों movements दिखें। Cancellation में वे उलटें। OEE shot entry अलग measurement workflow है।',
'BOM version; Planned quantity; Produced quantity; Production date; Reference; Notes; Status; Cancellation reason',
'frontend/src/pages/inventory/items/ItemManufacturingTab.jsx; backend/src/Cosmos.Application/Services/ManufacturingService.cs','items')

lesson('sales','05 Sales and purchase','Create confirm and collect a sale','विक्रय बिल बनाएँ पुष्टि करें और भुगतान दर्ज करें',
'Create a draft sale invoice, verify its calculation and track customer payments.||Draft sale invoice बनाएँ, गणना जाँचें और customer payments दर्ज करें।',
'An active customer and items must exist. Confirm the agreed price, quantity, tax data and invoice dates.||Active customer और items हों। तय price, quantity, tax data और invoice dates तैयार रखें।',[
'Open Sale Invoices > New sale invoice. Select Customer, Invoice Date and Due Date. The backend assigns the invoice number.||Sale Invoices > New sale invoice में Customer, Invoice Date और Due Date चुनें। Invoice number backend देता है।',
'Add item lines with quantity, rate, discount and the shown tax fields. Remove unintended lines and review line totals.||Item lines में quantity, rate, discount और दिखाए tax fields भरें। अनचाही lines हटाएँ और totals जाँचें।',
'Review invoice discount and totals. Add an initial payment only if received; check its amount, date, mode and reference. Save the draft.||Invoice discount और totals जाँचें। Payment मिला हो तभी amount, date, mode और reference भरें। Draft save करें।',
'Open the detail page, review and Confirm when the invoice is ready. Use the available print or PDF action for the business document.||Detail page पर review करके तैयार invoice Confirm करें। Document के लिए उपलब्ध print या PDF action लें।',
'Use Add Payment for later collections. Review payment history and balance. Use Cancel only after checking the document state and resulting reversal.||बाद के भुगतान Add Payment से भरें। History और balance मिलाएँ। Document state और reversal समझकर ही Cancel करें।'],
'The invoice status, paid total and outstanding balance match the intended sale. Government E-Invoice and accounting invoice statuses are independent.||Invoice status, paid total और balance सही हों। सरकारी E-Invoice और accounting invoice के statuses अलग हैं।',
'Customer; Invoice Date; Due Date; Item; Quantity; Rate; Discount; Tax; Amount; Payment Date; Mode; Reference',
'frontend/src/pages/sales/invoices/InvoiceFormPage.jsx; frontend/src/pages/sales/invoices/InvoiceDetailPage.jsx','sales-invoices-new')

lesson('purchase-order','05 Sales and purchase','Order from a supplier and convert to a bill','सप्लायर को ऑर्डर दें और बिल में बदलें',
'Keep an order commitment separate from the supplier bill.||Purchase order की प्रतिबद्धता और supplier bill अलग रखें।',
'Create the supplier and required items. Prepare quantities, negotiated rates and expected delivery.||Supplier और items बनाएँ। Quantity, rate और expected delivery तैयार रखें।',[
'Open Purchase Orders > New Purchase Order. Select Supplier, Order Date and Expected Delivery.||Purchase Orders > New Purchase Order में Supplier, Order Date और Expected Delivery चुनें।',
'Add item lines, quantity, rate, discount and tax as shown. Add terms or notes and check document totals.||Item lines, quantity, rate, discount और tax भरें। Terms या notes जोड़ें और totals जाँचें।',
'Save and reopen the order. Check status and the available lifecycle actions before sending it for fulfillment.||Save करके order दोबारा खोलें। Fulfillment से पहले status और lifecycle actions देखें।',
'When a supplier bill is ready, use the order conversion action. Enter Bill Date, Due Date, Payment Type, Supplier Invoice # and any paid amount.||Supplier bill तैयार हो तो conversion action लें। Bill Date, Due Date, Payment Type, Supplier Invoice # और paid amount भरें।',
'Open the resulting bill and review it independently. Do not enter the same supplier invoice again as a separate manual bill.||बने हुए bill को अलग से जाँचें। उसी supplier invoice का दूसरा manual bill न बनाएँ।'],
'The order links to the intended bill and quantities are correct. Order cancellation and bill cancellation are distinct actions.||Order सही bill से जुड़ा हो और quantities सही हों। Order cancel और bill cancel अलग actions हैं।',
'Supplier; Order Date; Expected Delivery; Item; Quantity; Rate; Discount; Terms; Bill Date; Due Date; Supplier Invoice #',
'frontend/src/pages/purchase/documents/documentConfigs.js; frontend/src/pages/purchase/documents/ConvertOrderModal.jsx','purchase-orders-new')

lesson('purchase-bill','05 Sales and purchase','Record a purchase bill and supplier payment','खरीद बिल और सप्लायर भुगतान दर्ज करें',
'Record the purchase document, confirmation state and money paid to the supplier.||Purchase document, उसकी confirmation स्थिति और supplier को दिया payment दर्ज करें।',
'Have a supplier invoice, active supplier, item details and any existing order or bill reference.||Supplier invoice, active supplier, item details और existing order या bill reference तैयार रखें।',[
'Open Purchase Bills and search Supplier Invoice # first. Create a new bill only when it is not already recorded.||Purchase Bills में पहले Supplier Invoice # खोजें। पहले से रिकॉर्ड न हो तभी नया bill बनाएँ।',
'Fill Supplier, Bill Date, Due Date and Supplier Invoice #. Add item quantities, rates and tax details.||Supplier, Bill Date, Due Date और Supplier Invoice # भरें। Items, quantities, rates और tax details जोड़ें।',
'Review document discount, round off, payment type and any Paid Amount. Save and inspect the detail page.||Document discount, round off, payment type और Paid Amount जाँचें। Save करके detail खोलें।',
'Confirm the bill when the document is ready. Check its final totals and status after the server response.||Bill तैयार हो तो Confirm करें। Server response के बाद totals और status जाँचें।',
'Open Supplier Payments for a later payment, select the correct supplier or bill context and enter date, amount, mode and reference. Check the remaining payable.||बाद का payment Supplier Payments में सही supplier या bill context पर date, amount, mode और reference के साथ भरें। बचा payable जाँचें।'],
'Bill balance and payment history agree with the supplier statement. A ledger entry is not proof that a bank transfer was executed.||Bill balance और payment history supplier statement से मिलें। Ledger entry का अर्थ बैंक से पैसा भेजा जाना नहीं है।',
'Supplier; Supplier Invoice #; Bill Date; Due Date; Payment Type; Document Discount; Round Off; Paid Amount; Payment mode; Reference',
'frontend/src/pages/purchase/documents/PurchaseDocumentFormPage.jsx; frontend/src/pages/purchase/supplierPayments','purchase-bills-new,purchase-supplier-payments')

lesson('purchase-return-expense','05 Sales and purchase','Return purchases and record expenses','खरीद वापसी और खर्च दर्ज करें',
'Use returns for supplier goods and expenses for business costs outside item purchases.||Supplier के माल की वापसी के लिए return और अन्य business costs के लिए expense लें।',
'Prepare the linked bill for a return, or an expense category and evidence for a cost.||Return के लिए linked bill तथा खर्च के लिए category और प्रमाण तैयार रखें।',[
'Open Purchase Returns > New Purchase Return. Select Supplier and the linked Purchase Bill.||Purchase Returns > New Purchase Return में Supplier और linked Purchase Bill चुनें।',
'Enter Return Date, returned item quantities and Reason. Verify that the intended items and quantities belong to this transaction, then save.||Return Date, लौटे items की quantities और Reason भरें। सही transaction से मिलाकर save करें।',
'For business costs open Expense Categories and create an active classification such as transport or repairs.||Business costs के लिए Expense Categories में transport या repairs जैसी active category बनाएँ।',
'Open Expenses, add the expense with category, party if applicable, date, amount, tax and payment details shown, then save.||Expenses में category, लागू party, date, amount, tax और उपलब्ध payment details भरकर save करें।',
'Review Purchase Reports and Expense reports. A purchase return, expense and Rojmel expense are different records; avoid recording the same cash event twice.||Purchase Reports और Expense reports मिलाएँ। Purchase return, expense और Rojmel expense अलग records हैं; एक cash event दो बार न भरें।'],
'The return and cost appear under the correct period and party or category.||Return और खर्च सही अवधि, party या category में दिखें।',
'Purchase Bill; Return Date; Reason; Item; Return quantity; Expense category; Amount; Tax; Payment details',
'frontend/src/pages/purchase/documents; frontend/src/pages/purchase/expenses; frontend/src/pages/purchase/expenseCategories','purchase-returns-new,purchase-expenses')

lesson('supply-foundation','06 Supply chain','Connect channels warehouses and SKUs','चैनल वेयरहाउस और SKU जोड़ें',
'Translate marketplace data into internal ERP items and warehouse identities.||Marketplace data को ERP items और warehouses से जोड़ें।',
'Create internal items first. Know the external channel SKU and warehouse codes exactly.||पहले internal items बनाएँ। External channel SKU और warehouse codes सही रखें।',[
'In Channels add Code, Name, Description, Sort order and active status. Keep codes stable for imports.||Channels में Code, Name, Description, Sort order और Active भरें। Imports के लिए code स्थिर रखें।',
'In Warehouses choose Channel, add Warehouse code and name, address, priority and sorting data, then save.||Warehouses में Channel चुनें। Warehouse code, name, address, priority और sort details भरकर save करें।',
'In Item mappings choose Channel and existing Item. Enter Channel SKU and optional external item ID or channel product name.||Item mappings में Channel और existing Item चुनें। Channel SKU तथा जरूरत पर external item ID या channel product name भरें।',
'Set effective dates, Active and Primary as intended. Effective to must not precede Effective from.||Effective dates, Active और Primary तय करें। Effective to, Effective from से पहले न हो।',
'Reopen the mapping and verify the exact external SKU. Resolve unmapped procurement sales rows through this shared mapping owner.||Mapping दोबारा खोलकर external SKU जाँचें। Procurement sales के unmapped rows इसी shared mapping से सुधारें।'],
'Each incoming channel SKU resolves to the intended internal item and warehouse belongs to the intended channel.||हर channel SKU सही internal item से जुड़े और warehouse सही channel में हो।',
'Channel Code; Channel Name; Warehouse code; Warehouse name; Priority; Channel SKU; Item; External item ID; Primary; Effective dates',
'frontend/src/pages/supplyChain/supplyChainSchemas.js; frontend/src/pages/procurement/skuMapping/SkuMappingPage.jsx','supply-chain-item-mappings')

lesson('packaging','06 Supply chain','Create packaging profiles','पैकेजिंग प्रोफाइल बनाएँ',
'Define box quantities, dimensions and weight inputs used by planning and packing.||Planning और packing के लिए box quantity, dimensions और weights तय करें।',
'Have the internal item, optional channel and measured packaging specifications.||Internal item, जरूरत पर channel और पैकेज के सही measurements तैयार रखें।',[
'Open Packaging Profiles > New packaging profile. Choose the existing Item and Channel, or use global scope.||Packaging Profiles > New packaging profile खोलें। Item और Channel चुनें या global scope रखें।',
'Enter a stable Packaging code and name. Set Units per box to a positive value.||स्थिर Packaging code और name दें। Units per box positive रखें।',
'Enter Length, Width, Height and the matching Dimension unit. Enter Net and Gross weight with the correct Weight unit.||Length, Width, Height और सही Dimension unit भरें। Net और Gross weight के साथ सही Weight unit चुनें।',
'Set a positive volumetric divisor when needed. Review the server-calculated volumetric weight rather than typing your own derived answer.||जरूरत पर positive volumetric divisor दें। निकला volumetric weight server से जाँचें; derived answer अलग से न मानें।',
'Set effective dates, default and active flags. Save and reopen. Net weight must not exceed gross weight.||Effective dates, Default और Active तय करें। Save करके जाँचें। Net weight, Gross weight से अधिक न हो।'],
'Packing and planning can select the intended effective profile. Check units before comparing dimensional and actual weights.||Packing और planning सही effective profile ले सकें। Dimensional और actual weights की तुलना से पहले units मिलाएँ।',
'Item; Channel; Packaging code; Units per box; Length; Width; Height; Dimension unit; Net weight; Gross weight; Weight unit; Volumetric divisor',
'frontend/src/pages/supplyChain/packagingProfiles/PackagingProfileFormPage.jsx; frontend/src/pages/supplyChain/supplyChainSchemas.js','supply-chain-packaging-profiles-new')

lesson('imports','06 Supply chain','Import validate and commit snapshots','स्नैपशॉट इंपोर्ट जाँच और कमिट करें',
'Stage external rows, fix validation errors and commit only a reviewed batch.||External rows पहले stage करें, errors सुधारें और review के बाद batch commit करें।',
'Use the template for the specific module. Channels, warehouses and mappings must match imported codes.||उसी module का template लें। Channels, warehouses और mappings के codes file से मिलने चाहिए।',[
'Choose the import type and channel. Use the current template and preserve its headers, dates and units.||Import type और channel चुनें। Current template के headers, dates और units बनाए रखें।',
'Upload or add manual rows where supported. Review the staged batch; Uploaded does not mean Committed.||जहाँ उपलब्ध हो file upload या manual rows भरें। Staged batch देखें; Uploaded का अर्थ Committed नहीं।',
'Run validation and inspect row-level errors, unmapped SKUs and duplicates. Correct source data or masters and validate again.||Validation चलाएँ। Row errors, unmapped SKU और duplicates देखें। Source या masters सुधारकर दोबारा validate करें।',
'Commit a valid reviewed batch. Duplicate-file correction requires the explicit correction path and a reason where requested.||सही reviewed batch Commit करें। Duplicate file सुधारने पर explicit correction path और माँगा गया reason दें।',
'Record the batch ID and committed row count. For a failed or uncertain operation, reopen batch details before retrying.||Batch ID और committed row count लिख लें। Failure या uncertain result पर retry से पहले batch details खोलें।'],
'The batch is Committed and the intended rows are retained once. Cancelling a staged batch is different from reversing business documents.||Batch Committed हो और सही rows एक बार रहें। Staged batch cancel करना business documents reverse करना नहीं है।',
'Import type; Channel; File; Batch ID; Source reference; Validation status; Row errors; Correction reason; Committed rows',
'frontend/src/pages/supplyChain/imports; frontend/src/pages/dispatch/imports; frontend/src/constants/dispatchEnums.js','dispatch-imports,supply-chain-imports')

lesson('procurement-data','07 Procurement','Prepare sales demand and planning setup','बिक्री मांग और प्लानिंग सेटअप तैयार करें',
'Make sales demand resolvable to finished products and their purchased materials.||Sales demand को finished products और खरीदे जाने वाले materials से जोड़ें।',
'Have shared SKU mappings, manufacturing BOMs and item material classifications.||Shared SKU mappings, manufacturing BOM और item classifications तैयार हों।',[
'Open Sales Data. Use Import to download the workbook template, upload the retained file and inspect preview counts and exact invalid rows.||Sales Data > Import में template download करें, file upload करें और preview counts तथा invalid rows देखें।',
'Resolve Invalid, Unmapped and Duplicate rows. Confirm the import only after review; use History and Batches to trace retained source rows.||Invalid, Unmapped और Duplicate rows सुधारें। Review के बाद import confirm करें। History और Batches से source rows खोजें।',
'Use manual sales entry only for deliberate corrections or missing demand. Imported entries remain read-only; manual entries expose edit and delete controls.||Manual sales entry केवल जरूरी correction या missing demand के लिए लें। Imported rows read-only हैं; manual rows edit और delete हो सकती हैं।',
'Open Setup > SKU mapping to resolve the inbox. Use Supply Chain for mapping maintenance. Open Setup > BOM to inspect active effective recipes.||Setup > SKU mapping में unresolved SKUs देखें। Mapping Supply Chain में सुधारें। Setup > BOM में active effective recipes जाँचें।',
'In Product Summary review the product by channel matrix. Check the sales range and exact channel context before generating a plan.||Product Summary में product by channel matrix देखें। Plan से पहले sales range और channel context जाँचें।'],
'Demand rows map to finished items and their components. Unmapped demand and missing recipes must be resolved before relying on the plan.||Demand सही finished items और components तक पहुँचे। Unmapped demand और missing recipe सुधारकर ही plan पर भरोसा करें।',
'Sales date; Sales channel; Channel SKU; Channel product name; Resolved item; Quantity; Notes; Import batch ID',
'frontend/src/pages/procurement/salesImport/SalesImportPage.jsx; frontend/src/pages/procurement/setup','procurement-sales-import,procurement-setup')

lesson('procurement-settings','07 Procurement','Set material lead times and order rules','लीड टाइम और ऑर्डर नियम तय करें',
'Explain how each purchased material should be replenished.||हर खरीदे जाने वाले material की replenishment नीति तय करें।',
'Use Setup > Settings and identify items missing configuration. Lead times must represent real sourcing assumptions.||Setup > Settings में बिना configuration वाले items खोजें। Lead time वास्तविक sourcing के अनुसार रखें।',[
'Choose Configure material. Select configured lead time, history average or an override according to the offered sourcing options.||Configure material खोलें। उपलब्ध विकल्प में configured lead time, history average या override चुनें।',
'For history-based lead time add received-order history with reference, ordered date and received date. Received date cannot be before ordered date.||History-based lead time के लिए reference, ordered date और received date दें। Received date, ordered date से पहले न हो।',
'Set Safety factor, Minimum order qty, Order multiple and Rounding rule. Check that units match the material unit.||Safety factor, Minimum order qty, Order multiple और Rounding rule भरें। Material unit से units मिलाएँ।',
'Choose Automatic calculation for a system suggestion, or Manual planning for a deliberate planner quantity. Manual mode forces automatic result to zero.||System suggestion के लिए Automatic calculation चुनें। खुद quantity तय करनी हो तो Manual planning लें; इसमें automatic result zero रहता है।',
'Keep intended settings active, save and return to the plan preview. Revalidate after changing prerequisites.||जरूरी settings Active रखकर save करें। Plan preview में लौटें और prerequisites बदलने पर दोबारा validate करें।'],
'The material has an explicit rule and an explainable lead-time source. A zero automatic suggestion in manual mode is not proof of no demand.||Material का rule और lead-time source स्पष्ट हो। Manual mode में zero suggestion का अर्थ demand न होना नहीं है।',
'Lead-time source; Configured days; Override days; Safety factor; Minimum order qty; Order multiple; Rounding rule; Automatic calculation; Manual planning; Active',
'frontend/src/pages/procurement/settings/ProcurementSettingFormPage.jsx; frontend/src/pages/procurement/settings/LeadTimeHistoryModal.jsx','procurement-setup')

lesson('procurement-plan','07 Procurement','Review save and finalize a procurement plan','खरीद योजना देखें सेव करें और फाइनल करें',
'Turn validated demand and stock into a traceable buying decision.||Validated demand और stock से traceable खरीद निर्णय बनाएँ।',
'Complete sales imports, SKU mappings, BOMs and material settings. Understand that the preview uses global item stock.||Sales imports, SKU mappings, BOMs और material settings पूरे हों। Preview global item stock लेता है।',[
'Open Procurement and choose the sales date range. Review Order now, Watch and OK, then expand a line to see its calculation.||Procurement में sales date range चुनें। Order now, Watch और OK देखें। Line खोलकर calculation समझें।',
'Open Create a saved plan. Resolve blocking errors; warnings remain visible but do not necessarily prevent a preview.||Create a saved plan खोलें। Blocking errors सुधारें। Warnings दिखेंगी लेकिन हमेशा preview नहीं रोकतीं।',
'Review average daily usage, lead time, safety stock, reorder point, physical stock, eligible inbound, projected available and To order.||Average daily usage, lead time, safety stock, reorder point, physical stock, inbound, projected available और To order मिलाएँ।',
'Save the draft. In Plans open the preserved snapshot and adjust a draft line with a traceable reason where required. Revalidate if prerequisites changed before saving.||Draft save करें। Plans में snapshot खोलकर जरूरत पर reason सहित draft line बदलें। Save से पहले prerequisites बदलें तो दोबारा validate करें।',
'Finalize after review and export the saved result. History opens stored values without recalculating them; finalized plans are immutable.||Review के बाद Finalize और export करें। History पुराने stored values खोलती है, नई गणना नहीं करती। Finalized plan बदला नहीं जा सकता।'],
'A saved run number, intended final quantities and finalized status are visible. A procurement plan is not an automatically placed supplier purchase order.||Saved run number, final quantities और finalized status दिखें। Procurement plan से supplier को अपने आप purchase order नहीं जाता।',
'Sales range; Validation messages; Lead-time demand; Safety stock; Physical stock; Inbound; Projected available; To order; Plan status',
'frontend/src/pages/procurement/generatePlan; frontend/src/pages/procurement/planningHistory','procurement-generate-plan,procurement-planning-history')

lesson('dispatch-policy','08 Dispatch planning','Prepare warehouse dispatch inputs','वेयरहाउस डिस्पैच के इनपुट तैयार करें',
'Create channel-specific warehouse snapshots and SKU rules before calculating recommendations.||Recommendations से पहले channel के warehouse snapshots और SKU rules तैयार करें।',
'Shared channels, warehouses, mappings and packaging profiles must exist.||Shared channels, warehouses, mappings और packaging profiles पहले हों।',[
'In Dispatch Imports choose Sales, Warehouse stock or Inbound. Import or enter the correct snapshot and validate then commit it.||Dispatch Imports में Sales, Warehouse stock या Inbound चुनें। सही snapshot import या enter करके validate और commit करें।',
'Sales rows use WarehouseCode, ChannelSku, PeriodFrom, PeriodTo and SalesQuantity. Keep the reporting period consistent.||Sales rows में WarehouseCode, ChannelSku, PeriodFrom, PeriodTo और SalesQuantity रखें। Reporting period एक जैसा हो।',
'Stock rows use SnapshotDate, AvailableQuantity, ReservedQuantity and DamagedQuantity. Inbound adds status and expected arrival.||Stock rows में SnapshotDate, AvailableQuantity, ReservedQuantity और DamagedQuantity दें। Inbound में status और expected arrival भी दें।',
'Open SKU Settings > New dispatch setting. Choose item, global or channel scope, tier, priority, rounding and effective dates.||SKU Settings > New dispatch setting में item, global या channel scope, tier, priority, rounding और effective dates चुनें।',
'Review packaging selection and active status. If a legacy item is hidden by Finished products only, inspect its material classification before widening the picker filter.||Packaging और Active जाँचें। Finished products only में legacy item न दिखे तो filter बदलने से पहले classification देखें।'],
'Committed batches and effective SKU settings exist for the same channel and planning context.||Same channel और planning context के committed batches और effective SKU settings उपलब्ध हों।',
'Sales batch; Stock batch; Inbound batch; Snapshot date; Tier; Priority; Rounding mode; Packaging profile; Effective dates',
'frontend/src/constants/dispatchEnums.js; frontend/src/pages/dispatch/settings','dispatch-settings-new,dispatch-imports')

lesson('dispatch-run','08 Dispatch planning','Calculate allocate and finalize a dispatch run','डिस्पैच की गणना आवंटन और फाइनल करें',
'Decide recommendations first, allocate available company stock next and freeze the reviewed result.||पहले recommendation तय करें, फिर company stock allocate करें और reviewed result freeze करें।',
'Use committed sales and warehouse-stock batches for the selected channel; include inbound only when appropriate.||चुने channel के committed sales और warehouse-stock batches लें। जरूरत पर सही inbound batch जोड़ें।',[
'Open Planning Runs > New dispatch planning run. Select Channel, Planning date, Sales batch, Warehouse stock batch and optional Inbound batch.||Planning Runs > New dispatch planning run में Channel, Planning date, Sales batch, Warehouse stock batch और जरूरत पर Inbound batch चुनें।',
'Create the Draft run, open it and Calculate. Inspect the item by warehouse matrix and server calculation details.||Draft run बनाएँ, खोलें और Calculate करें। Item by warehouse matrix और server calculations देखें।',
'Before allocation, override a final recommendation only when needed and record the reason. Review boxes and quantities.||Allocation से पहले जरूरत हो तभी final recommendation override करें और reason दें। Boxes और quantities जाँचें।',
'Allocate company stock. Review shortfalls and allocated quantities rather than assuming every recommendation can be fulfilled.||Company stock Allocate करें। Shortfalls और allocated quantities देखें; हर recommendation पूरी होगी ऐसा न मानें।',
'Finalize the reviewed recommendations. Use the finalized run when creating a shipment from a plan. Cancellation is an auditable lifecycle action.||Reviewed recommendations Finalize करें। इसी finalized run से shipment बनाएँ। Cancellation audit में दर्ज lifecycle action है।'],
'The run progresses Draft > Calculated > Allocated > Finalized. Finalization freezes recommendations; it does not itself dispatch goods.||Run Draft > Calculated > Allocated > Finalized जाए। Finalize से recommendation freeze होती है; माल अपने आप dispatch नहीं होता।',
'Channel; Planning date; Batch IDs; Calculated recommendation; Final recommendation; Override reason; Allocated quantity; Run status',
'frontend/src/pages/dispatch/runs/DispatchRunsPage.jsx; frontend/src/pages/dispatch/runs/DispatchRunDetailPage.jsx','dispatch-runs,dispatch-reports')

lesson('shipment-create','09 Shipment operations','Create a shipment from a plan or manually','प्लान से या मैन्युअल शिपमेंट बनाएँ',
'Start an operational shipment without confusing its creation with physical dispatch.||Operational shipment शुरू करें और उसके creation को physical dispatch से अलग समझें।',
'Have active channel, warehouse and items. Plan-based creation needs a finalized dispatch run.||Active channel, warehouse और items हों। Plan-based shipment के लिए finalized dispatch run चाहिए।',[
'Open Work List. Choose the manual creation action for an independent shipment or Create from dispatch plan for a finalized run.||Work List में independent shipment के लिए manual creation या finalized run के लिए Create from dispatch plan चुनें।',
'For manual entry choose Channel, Warehouse, Shipment date, Expected delivery, Dispatch mode and Priority. Add a manual reason.||Manual entry में Channel, Warehouse, Shipment date, Expected delivery, Dispatch mode, Priority और Manual reason भरें।',
'For plan-based entry choose Finalized dispatch run and Warehouse, then review the available planned lines and quantities.||Plan-based entry में Finalized dispatch run और Warehouse चुनें। Planned lines और quantities जाँचें।',
'Add transporter, invoice or STO reference, marketplace reference and notes as applicable. Review each item and planned quantity.||लागू Transporter, invoice या STO reference, marketplace reference और notes दें। हर item और planned quantity देखें।',
'Save and open the detail workspace. Use its Items, Packing, Transport, Receipts & returns, Freight and Timeline tabs.||Save करके detail workspace खोलें। Items, Packing, Transport, Receipts & returns, Freight और Timeline tabs इस्तेमाल करें।'],
'A Draft shipment exists. Manual creation does not move or reserve stock. Stock effects occur only through supported operational actions.||Draft shipment बने। Manual creation से stock move या reserve नहीं होता। Stock effect निर्धारित operational actions पर होता है।',
'Channel; Warehouse; Shipment date; Expected delivery; Dispatch mode; Priority; Item; Planned quantity; Manual reason; Invoice number; STO number',
'frontend/src/pages/shipments/workList; frontend/src/pages/shipments/detail/ShipmentDetailPage.jsx','shipments-work-list-new,shipments-work-list-new-from-plan')

lesson('shipment-packing','09 Shipment operations','Pack goods and prepare dispatch','माल पैक करें और डिस्पैच तैयार करें',
'Allocate item quantities to real packages and verify readiness before moving stock.||Items की quantity वास्तविक packages में बाँटें और stock move से पहले readiness जाँचें।',
'Use a saved shipment with items and packaging data. Follow only the enabled next-status actions.||Items और packaging data वाला saved shipment लें। केवल enabled next-status actions अपनाएँ।',[
'Open Packing and request suggestions where offered. Review remaining unpacked quantities and allow mixed or loose packages only when intended.||Packing में उपलब्ध suggestions लें। बची unpacked quantity देखें। जरूरत हो तभी mixed या loose package की अनुमति दें।',
'Build each package with Package number, Package type and profile. Enter dimensions and weights with the matching units.||हर package में Package number, Package type और profile दें। Dimensions और weights सही units में भरें।',
'Assign Quantity in package for each item. Review total packed quantities, tracking label, barcode and seal number.||हर item की Quantity in package दें। Total packed quantity, tracking label, barcode और seal जाँचें।',
'Use the enabled status transitions through packing and Ready for Dispatch. Check required docket or operational information in Transport.||Enabled status transitions से packing और Ready for Dispatch तक जाएँ। Transport में जरूरी docket या operational details जाँचें।',
'Review the dispatch confirmation and stock effect before moving ReadyForDispatch to Dispatched. After any timeout reload the shipment first.||ReadyForDispatch से Dispatched करने से पहले confirmation और stock effect देखें। Timeout पर पहले shipment reload करें।'],
'Packages agree with the item quantities and shipment status reflects the actual stage. A packing suggestion is not a completed packing record.||Packages की quantity items से मिले और status वास्तविक stage हो। Packing suggestion का अर्थ packing पूरी होना नहीं है।',
'Package number; Package type; Packaging profile; Quantity in package; Dimensions; Weight; Barcode; Seal number; Target status',
'frontend/src/pages/shipments/detail/ShipmentPackingTab.jsx; frontend/src/pages/shipments/detail/ShipmentDetailPage.jsx','shipments-work-list')

lesson('shipment-delivery','09 Shipment operations','Track transport delivery and returns','ट्रांसपोर्ट डिलीवरी और रिटर्न ट्रैक करें',
'Keep dockets, appointments, delivery attempts, receipts and returns distinct and traceable.||Docket, appointment, delivery attempt, receipt और return अलग तथा traceable रखें।',
'Open the correct saved shipment. Have transport references and actual event times.||सही saved shipment खोलें। Transport references और actual event times तैयार रखें।',[
'In Transport add a docket with transporter, mode, number, date, vehicle and tracking details.||Transport में transporter, mode, number, date, vehicle और tracking details सहित docket जोड़ें।',
'Record appointments with date, time window, status and reference. Record each delivery attempt with outcome, reason and next attempt date where applicable.||Appointment की date, time window, status और reference दें। हर delivery attempt का outcome, reason और जरूरत पर next attempt date भरें।',
'In Receipts & returns record the actual receipt date, received quantities, marketplace receipt reference and proof.||Receipts & returns में actual receipt date, received quantities, marketplace reference और proof दर्ज करें।',
'For returned goods create a return with date, reason, item quantities and transporter details. Record received-back quantities when goods arrive.||वापसी पर date, reason, item quantities और transporter के साथ return बनाएँ। माल लौटे तो received-back quantity दर्ज करें।',
'Use Timeline to review tracking events and status changes. Move to final statuses only through enabled actions after quantities and outstanding work are resolved.||Timeline में events और status changes देखें। Quantities और बाकी काम मिलने के बाद enabled actions से final status लें।'],
'Partial delivery, delivery attempt and returned stock are represented by their own records. A tracking note alone does not prove receipt.||Partial delivery, delivery attempt और return के अलग records हों। केवल tracking note receipt का प्रमाण नहीं है।',
'Docket number; Appointment status; Attempt outcome; Receipt date; Received quantity; Proof URL; Return reason; Return quantity; Received-back date',
'frontend/src/pages/shipments/detail/ShipmentTransportTab.jsx; frontend/src/pages/shipments/detail/ShipmentReceiptsReturnsTab.jsx','shipments-work-list')

lesson('freight-history','09 Shipment operations','Manage freight and historical imports','फ्रेट और पुराने शिपमेंट इंपोर्ट सँभालें',
'Track freight approval and payment separately from posting a cash-book expense.||Freight approval और payment को cash-book expense posting से अलग रखें।',
'Have a saved shipment and freight evidence. Historical CSV files must use the module mapping workflow.||Saved shipment और freight प्रमाण हो। Historical CSV के लिए उसी module का mapping workflow लें।',[
'Open Freight, select the shipment and add charge type, amount, currency, transporter and invoice information.||Freight में shipment खोलकर charge type, amount, currency, transporter और invoice details दें।',
'Follow enabled charge actions through submission and approval. Record paid date and payment reference only for an actual payment.||Enabled actions से submission और approval करें। वास्तविक payment पर ही paid date और payment reference दें।',
'Use Post freight to Rojmel explicitly when this cash-book entry is required. Choose Wallet, transaction date, expense category and payment mode.||Cash-book entry चाहिए तो Post freight to Rojmel अलग से करें। Wallet, transaction date, expense category और payment mode चुनें।',
'Verify the linked Rojmel transaction before retrying or entering a separate expense. Payment state and posting state are different.||Retry या दूसरा expense बनाने से पहले linked Rojmel transaction जाँचें। Payment status और posting status अलग हैं।',
'For old shipments use Historical import: upload, map columns, validate and commit. Reversal of an uncommitted batch is separate from cancelling a live shipment.||पुराने shipments के लिए Historical import में upload, column mapping, validation और commit करें। Uncommitted batch reversal, live shipment cancel से अलग है।'],
'Freight lifecycle and posting links are correct. Historical-import shipments are labeled history and do not change current stock.||Freight lifecycle और posting links सही हों। Historical-import shipments history हैं और current stock नहीं बदलते।',
'Charge type; Currency; Transporter invoice; Paid at; Payment reference; Wallet; Expense category; Historical column mapping; Batch status',
'frontend/src/pages/shipments/detail/ShipmentFreightTab.jsx; frontend/src/pages/shipments/imports/ShipmentImportsPage.jsx','shipments-freight,shipments-imports')

lesson('hr-masters','10 Human resources','Prepare HR and employee records','HR और कर्मचारी रिकॉर्ड तैयार करें',
'Build the organizational masters before adding employees and attendance.||Employees और attendance से पहले संगठन के masters बनाएँ।',
'Prepare department, designation and shift details. Use authorized HR access for employee information.||Department, designation और shift details तैयार रखें। Employee data के लिए अधिकृत HR access लें।',[
'Create Departments with code, name and description. Create Designations and link each to the correct Department.||Departments में code, name और description दें। Designations बनाकर सही Department से जोड़ें।',
'Create Shifts with code, name, start and end time, grace minutes, weekly hours and night-shift flag where appropriate.||Shifts में code, name, start और end time, grace minutes, weekly hours और जरूरत पर night-shift flag भरें।',
'Open Employees > Add employee. Fill code, name, gender, birth and joining dates, contact information and photo as applicable.||Employees > Add employee में code, name, gender, birth और joining dates, contact तथा जरूरत पर photo भरें।',
'Assign Department, Designation, Reporting Manager, Shift, Employment Type and Status. Add addresses and bank details when required.||Department, Designation, Reporting Manager, Shift, Employment Type और Status चुनें। जरूरत पर address और bank details जोड़ें।',
'Save and reopen the employee profile. Use bank, document and lifecycle actions separately; resignation needs last working date and reason, while rejoining needs its date.||Save करके profile खोलें। Bank, document और lifecycle actions अलग लें। Resignation में last working date और reason तथा rejoin में उसकी date दें।'],
'The employee is linked to the correct organizational masters. Document metadata, a file reference and an uploaded binary are not interchangeable.||Employee सही masters से जुड़ा हो। Document metadata, file reference और uploaded file को एक जैसा न मानें।',
'Employee Code; First Name; Last Name; Joining Date; Department; Designation; Reporting Manager; Shift; Employment Type; Status; Addresses; Bank Details',
'frontend/src/pages/hr/employees/EmployeeFormPage.jsx; frontend/src/pages/hr/employees/EmployeeLifecycleModal.jsx','hr-employees-new')

lesson('hr-attendance','10 Human resources','Record attendance adjustments and leave','हाजिरी सुधार और छुट्टी दर्ज करें',
'Keep actual attendance, correction requests and leave approvals consistent.||Actual attendance, correction requests और leave approvals एक दूसरे से मिलाएँ।',
'Employees and shifts must exist. Confirm the intended date and employee before entry.||Employees और shifts पहले हों। Entry से पहले employee और date जाँचें।',[
'Open Attendance Workspace. Choose date and roster filters or open an employee attendance month. Review not-marked records separately.||Attendance Workspace में date और roster filters चुनें या employee का month खोलें। Not-marked records अलग देखें।',
'Use Check In and Check Out for actual events. For authorized corrections open Manual Attendance and enter date, times and Day Status.||वास्तविक events के लिए Check In और Check Out लें। अधिकृत सुधार में Manual Attendance से date, times और Day Status भरें।',
'For an adjustment use the existing Attendance Record ID and a correction reason. An authorized approver reviews the adjustment ID and approves or rejects it.||Adjustment में existing Attendance Record ID और correction reason दें। अधिकृत approver adjustment ID देखकर approve या reject करे।',
'Open Leaves and apply for the intended employee, leave type and date range. Review balances and pending applications.||Leaves में employee, leave type और date range के लिए apply करें। Balances और pending applications देखें।',
'Approve, reject or cancel leave only through the relevant authorized action. Recheck the attendance view for the same employee and dates.||संबंधित authorized action से leave approve, reject या cancel करें। उसी employee और dates की attendance दोबारा देखें।'],
'Approved corrections and leave are distinguishable from pending requests. Not Marked is not automatically the same as Absent.||Approved corrections और leave, pending requests से अलग दिखें। Not Marked का अर्थ अपने आप Absent नहीं है।',
'Attendance Date; Check In; Check Out; Day Status; Attendance Record ID; Correction reason; Adjustment ID; Leave type; Date range',
'frontend/src/pages/hr/attendance/AttendanceActionModals.jsx; frontend/src/pages/hr/leaves','hr-attendance,hr-leaves')

lesson('payroll','10 Human resources','Process approve and inspect payroll','पेरोल प्रोसेस अप्रूव और जाँच करें',
'Create a period payroll run, review employee totals and then approve it.||अवधि का payroll run बनाएँ, employee totals जाँचें और फिर approve करें।',
'Review employee status, salary configuration and attendance before processing. Use Create and Approve rights appropriately.||Processing से पहले employee status, salary configuration और attendance जाँचें। Create और Approve अधिकार सही रखें।',[
'Open Payroll and choose Process Payroll. Enter Payroll Month and Payroll Year exactly.||Payroll > Process Payroll में सही Payroll Month और Payroll Year भरें।',
'Run processing and note the returned payroll run ID. Use the existing-run loader if inspecting a previously created run.||Process करके returned payroll run ID लिखें। पुराने run के लिए existing-run loader लें।',
'Review each employee Gross, Deductions and Net Pay alongside the run totals and employee count.||हर employee का Gross, Deductions और Net Pay, run totals और employee count से मिलाएँ।',
'Open Payslip for an employee and use Employee History to compare prior periods. Investigate differences before approval.||Employee की Payslip खोलें और Employee History से पिछली अवधि मिलाएँ। Approval से पहले अंतर समझें।',
'Use Approve for the intended processed run ID only after review. If processing returns an error, inspect existing runs before processing again.||Review के बाद सही processed run ID Approve करें। Processing error पर दोबारा process से पहले existing run देखें।'],
'The correct run is approved and payslip totals match it. Payroll approval records a workflow state; it does not itself execute bank payments.||सही run approved हो और payslip totals मिलें। Approval एक workflow state है; इससे अपने आप bank payment नहीं होता।',
'Payroll Month; Payroll Year; Payroll Run ID; Gross; Deductions; Net Payable; Employee; Payslip',
'frontend/src/pages/hr/payroll/PayrollPage.jsx; backend/src/Cosmos.API/Controllers/HR/PayrollController.cs','hr-payroll')

lesson('oee','11 Production measurement','Measure machine output with OEE','OEE से मशीन का उत्पादन मापें',
'Record machine and mould production observations and review server-calculated performance.||Machine और mould की production observations भरें और server-calculated performance देखें।',
'Create Machines, Moulds and Downtime Reasons before daily entries. OEE is separate from posting manufacturing stock.||Daily entry से पहले Machines, Moulds और Downtime Reasons बनाएँ। OEE, manufacturing stock posting से अलग है।',[
'Add Machines with Machine Code, Machine Name, Tonnage, Location and Display Order. Keep active machines available for bulk daily entry.||Machines में Machine Code, Machine Name, Tonnage, Location और Display Order दें। Bulk daily entry के लिए machines Active रखें।',
'Add Moulds with Mould Name, Target Shots/Day, Cavity and Cycle Time. Add standard Downtime Reasons.||Moulds में Mould Name, Target Shots/Day, Cavity और Cycle Time दें। Standard Downtime Reasons बनाएँ।',
'Open Production Entries and choose Production Date. Enter each machine on-time, mould, Shot Count, Downtime Reason and Remarks as offered.||Production Entries में Production Date चुनें। Machine on-time, mould, Shot Count, Downtime Reason और Remarks भरें।',
'Review bulk rows or edit a specific entry, then save. Check that shot count and target use the same production context.||Bulk rows जाँचें या specific entry edit करके save करें। Shot count और target का production context मिलाएँ।',
'Open OEE Dashboard and Reports. Choose Last 7, 15, 30 or 90 days, or a custom range; filter machine, mould and reason to investigate poor output.||OEE Dashboard और Reports में Last 7, 15, 30 या 90 days अथवा custom range चुनें। Machine, mould और reason से कम output जाँचें।'],
'Ratings shown are the application bands: Critical below 40, Needs Attention from 40, Good from 65 and World-Class from 85. Use returned metrics rather than assuming a textbook formula.||App bands में 40 से नीचे Critical, 40 से Needs Attention, 65 से Good और 85 से World-Class हैं। Returned metrics लें; अलग textbook formula न मानें।',
'Machine Code; Tonnage; Mould Name; Target Shots/Day; Cavity; Cycle Time; Production Date; Machine On-Time; Shot Count; Downtime Reason',
'frontend/src/pages/oee/oeeHelpers.js; frontend/src/pages/oee/productionEntries','oee-production-entries,oee-dashboard')

lesson('rojmel','12 Rojmel cash book','Create wallets and record cash activity','वॉलेट और नकद गतिविधि दर्ज करें',
'Track wallet income, expenses, adjustments and transfers with an auditable cash book.||Audit वाले cash book में wallet income, expenses, adjustments और transfers रखें।',
'An administrator configures wallets and user links. Check whether you are using My Wallet or an administrative wallet selector.||प्रशासक wallets और user links बनाए। My Wallet और administrator wallet selector का अंतर जाँचें।',[
'In Wallets add code or let it be generated, name, wallet type, linked user, opening balance and notes. Set active status as needed.||Wallets में code दें या generate होने दें। Name, type, linked user, opening balance और notes भरें। Active स्थिति तय करें।',
'Open My Wallet or Transactions. Choose Add Income or Add Expense and enter positive Amount, Date, Category, Payment Mode, Reference No. and Description.||My Wallet या Transactions में Add Income या Add Expense लें। Positive Amount, Date, Category, Payment Mode, Reference No. और Description भरें।',
'An administrator selects the target Wallet explicitly. For Balance Adjustment choose increase or decrease and explain the correction.||प्रशासक target Wallet साफ चुनें। Balance Adjustment में increase या decrease और correction का कारण दें।',
'For wallet movement use Transfers with From Wallet and To Wallet. Enter amount, date, reference and purpose; source and destination must differ.||Wallet movement के लिए Transfers में अलग From Wallet और To Wallet चुनें। Amount, date, reference और purpose भरें।',
'Review the ledger and balances. Correct a posted mistake using the available reversal action and a reason instead of entering an unexplained opposite transaction.||Ledger और balances देखें। Posted गलती में reason सहित reversal लें; बिना कारण उल्टा transaction न भरें।'],
'Balances reconcile. Transfers, opening balances and adjustments are excluded from the Income vs Expense profit comparison; they remain visible in the relevant ledgers.||Balances मिलें। Income vs Expense में transfers, opening balances और adjustments बाहर रहते हैं; ledger में वे फिर भी दिखते हैं।',
'Wallet; Amount; Date; Category; Payment Mode; Reference No.; Description; From Wallet; To Wallet; Adjustment direction; Reversal reason',
'frontend/src/pages/rojmel/components; frontend/src/pages/reports/reportRegistry.js','rojmel-my-wallet,rojmel-transfers')

lesson('reports','13 Reporting','Choose the right report and export it','सही रिपोर्ट चुनें और एक्सपोर्ट करें',
'Answer operational questions with the right period, scope and report grain.||सही अवधि, scope और report detail से operational सवालों का जवाब लें।',
'Have View and Export rights where needed. Decide whether the question needs current stock, period movements, balances or document history.||जरूरी View और Export अधिकार हों। तय करें कि current stock, period movements, balances या document history चाहिए।',[
'Open All Reports and choose Sales, Purchase, Inventory, Manufacturing, Party, Expense or Rojmel.||All Reports में Sales, Purchase, Inventory, Manufacturing, Party, Expense या Rojmel चुनें।',
'Choose the report that matches your question. Summary totals, transaction lists and item or party grouping have different grains.||सवाल के अनुसार report लें। Summary totals, transaction list और item या party grouping की detail अलग होती है।',
'Set date range or As of date and relevant item, party, category, status or wallet filters. Item Ledger requires an item selection.||Date range या As of date और item, party, category, status या wallet filters दें। Item Ledger में item चुनना जरूरी है।',
'Load the report, inspect totals and a few source documents. An empty result may come from the selected period or filters.||Report load करके totals और कुछ source documents मिलाएँ। Empty result का कारण period या filters हो सकते हैं।',
'Export using the available format and permission. Reopen the downloaded file and confirm the same report context and totals.||उपलब्ध format और permission से Export करें। Downloaded file खोलकर वही context और totals जाँचें।'],
'The report answers the intended question and its filters are recorded with the result. Refer to the report directory for every registered report.||Report सही सवाल का जवाब दे और result के साथ filters दर्ज हों। सभी reports के लिए आगे की report directory देखें।',
'Date range; As of date; Item; Party; Category; Status; Payment status; Wallet; Inactive days; Top count; Export',
'frontend/src/pages/reports/reportRegistry.js; frontend/src/pages/reports/filters/filterRegistry.js','reports')

lesson('data-book','14 Data and audit','Maintain shared and private reference values','साझा और निजी संदर्भ वैल्यू सँभालें',
'Store reference entries in category sheets and inspect their change history.||Category sheets में reference entries रखें और उनकी change history देखें।',
'Know the intended visibility and owner. Have entry action rights. Privacy is an access setting, not just hiding text on screen.||Visibility और owner तय हों। Entry actions की अनुमति हो। Privacy access setting है; केवल text छिपाना नहीं।',[
'Open Data Book and choose a category sheet or list view. Use search and filters to find an existing entry first.||Data Book में category sheet या list view चुनें। पहले search और filters से entry खोजें।',
'Add an entry with Name, required Value, Description and Category. Choose shared or private visibility deliberately.||Name, जरूरी Value, Description और Category के साथ entry बनाएँ। Shared या private visibility सोचकर चुनें।',
'Use Show or Hide to control on-screen visibility. It does not by itself change whether an entry is private.||Screen पर value के लिए Show या Hide लें। इससे entry की private setting अपने आप नहीं बदलती।',
'Use grid paste preview before committing pasted cells. Review mapped columns, row content and errors. Column renaming changes local display labels.||Cells paste करने से पहले grid paste preview जाँचें। Columns, rows और errors देखें। Column rename स्थानीय display labels बदलता है।',
'Save and inspect entry details and history. If a conflict appears, compare your change with the server version and resolve it before saving again.||Save करके details और history देखें। Conflict आए तो अपने बदलाव और server version की तुलना करके resolve करें।'],
'The value and visibility are correct and history is traceable. Another user changing the same record requires conflict resolution rather than a blind overwrite.||Value और visibility सही हों और history मिले। दूसरे user के बदलाव पर बिना जाँच overwrite करने के बजाय conflict resolve करें।',
'Name; Value; Description; Category; Private; Owner; Row version; History; Paste preview',
'frontend/src/pages/dataBook/EntryFormModal.jsx; frontend/src/pages/dataBook/DataBookGrid.jsx','data-book')

lesson('audit','14 Data and audit','Investigate activity and recover from errors','गतिविधि जाँचें और त्रुटि का समाधान करें',
'Trace who changed a record and capture enough context for a useful support request.||किसने रिकॉर्ड बदला यह खोजें और support के लिए जरूरी context रखें।',
'Have Activity Logs access and the approximate date, module, user or record reference.||Activity Logs access तथा अनुमानित date, module, user या record reference हो।',[
'Open Activity Logs. Filter the date range, module, action, actor and reference using the available controls.||Activity Logs में उपलब्ध date range, module, action, actor और reference filters चुनें।',
'Open an activity row to inspect its detail. Compare before and after values when they are provided.||Activity row खोलकर details देखें। उपलब्ध before और after values मिलाएँ।',
'For validation errors correct the indicated field. For 401 sign in again; for 403 ask an administrator to review the specific page and action.||Validation error में संबंधित field सुधारें। 401 पर दोबारा sign in करें; 403 पर specific page और action की permission जाँचवाएँ।',
'For a conflict refresh the latest record and compare changes. For a timeout inspect the record status before repeating a stock, payment or provider action.||Conflict पर latest record refresh करके बदलाव मिलाएँ। Timeout पर stock, payment या provider action दोहराने से पहले status देखें।',
'When escalating include page, record or run ID, operation, time and the safe correlation reference. Exclude passwords, tokens and raw private payloads.||Support में page, record या run ID, operation, time और safe correlation reference दें। Password, token और private payload न भेजें।'],
'The original business record and audit trail explain the event. An activity entry alone does not prove a financial or stock outcome; verify the source status too.||Business record और audit trail घटना समझाएँ। केवल activity entry से money या stock outcome साबित नहीं होता; source status भी जाँचें।',
'Date range; Module; Action; User; Record reference; Before; After; Correlation ID',
'frontend/src/pages/activityLogs; frontend/src/utils/apiError.js','activity-logs')

lesson('website-content','15 Website management','Publish website products posts and announcements','वेबसाइट प्रोडक्ट लेख और घोषणाएँ सँभालें',
'Maintain the independent public catalogue and editorial content.||अलग public catalogue और website content सँभालें।',
'Have website management rights and reviewed public copy, images and destinations. Website products are not ERP inventory items.||Website management अधिकार और reviewed public copy, images तथा links हों। Website products ERP inventory items से अलग हैं।',[
'Open Website > Products and add a product. Fill code, name, description, display price and commercial information only when confirmed.||Website > Products में नया product बनाएँ। Code, name, description, display price और commercial details सत्यापित होने पर भरें।',
'Add comparison specifications, benefits and media. Write meaningful image alt text and select exactly one uploaded image as primary.||Comparison specifications, benefits और media दें। Image का अर्थपूर्ण alt text दें और ठीक एक uploaded image Primary रखें।',
'Choose active and publish status, review the public-change confirmation and save. Catalogue publication does not change ERP stock.||Active और publish status चुनें। Public-change confirmation पढ़कर save करें। Catalogue publication से ERP stock नहीं बदलता।',
'In Blog manage Categories, then add title, slug, excerpt, category, content, cover image and SEO fields. Review publish status and Published at UTC.||Blog में Categories बनाएँ। Title, slug, excerpt, category, content, cover image और SEO भरें। Publish status तथा Published at UTC जाँचें।',
'In Announcements set title, message, CTA label and URL, priority, order, UTC schedule and dismissal version. In Site settings edit only the exposed approved values.||Announcements में title, message, CTA label और URL, priority, order, UTC schedule और dismissal version दें। Site settings में exposed approved values ही बदलें।'],
'Public content is intentionally published with correct media and links. A saved draft is not the same as a published public page.||सही media और links वाला content जानबूझकर publish हो। Saved draft और published page अलग स्थितियाँ हैं।',
'Publish status; Slug; Display price; Specifications; Benefits; Primary image; Alt text; SEO; CTA URL; Starts at UTC; Ends at UTC',
'frontend/src/pages/website/products/WebsiteProductFormPage.jsx; frontend/src/pages/website/blog; frontend/src/pages/website/announcements','website-products-new,website-blog-new')

lesson('warranty','15 Website management','Handle warranty claims and customer updates','वारंटी दावे और ग्राहक अपडेट सँभालें',
'Review customer evidence, assign responsibility and document a claim resolution.||Customer evidence जाँचें, जिम्मेदारी दें और claim resolution दर्ज करें।',
'Have the relevant claim and action permissions. Verify order, product and evidence before a decision.||सही claim और action permissions हों। निर्णय से पहले order, product और evidence जाँचें।',[
'Open Warranty Claims, filter reference, status, assignee and dates, then open the correct claim.||Warranty Claims में reference, status, assignee और dates से सही claim खोलें।',
'Review evidence and immutable claim history. Use Assign or Start review only for the intended claim.||Evidence और claim history देखें। सही claim पर Assign या Start review लें।',
'Keep internal notes separate from Customer messages. Sending a customer message explicitly transmits it to the customer.||Internal notes और Customer messages अलग रखें। Customer message भेजने पर वह ग्राहक को जाता है।',
'Use enabled Request information, Approve or Reject actions with the necessary remarks. For resolution choose the offered resolution type.||जरूरी remarks के साथ enabled Request information, Approve या Reject लें। Resolution में उपलब्ध type चुनें।',
'Enter the relevant refund, replacement, repair or tracking references, then Resolve or Complete when work is actually finished. Review history.||संबंधित refund, replacement, repair या tracking references दें। काम पूरा हो तभी Resolve या Complete करें और history जाँचें।'],
'Status, assigned owner, decision and resolution references agree. Recording a refund reference does not prove a refund was executed.||Status, assigned owner, decision और resolution references मिलें। Refund reference भरना अपने आप refund execution नहीं है।',
'Claim reference; Status; Assignee; Internal note; Customer message; Resolution type; Refund reference; Replacement reference; Repair reference; Tracking number',
'frontend/src/pages/website/warranty/WebsiteWarrantyDetailPage.jsx','website-warranty')

lesson('gst','16 GST workspace','Use the GST workspace','GST कार्यक्षेत्र उपयोग करें',
'Inspect GST configuration and existing government documents.||GST configuration और existing सरकारी documents देखें।',
'Have configured provider access, a verified company registration and the required page and action permissions.||Configured provider access, verified company registration और जरूरी page तथा action permissions हों।',[
'Open GST overview and review environment, configured features and missing setting names. A configured indicator is not proof of provider availability.||GST overview में environment, configured features और missing setting names देखें। Configured indicator से provider availability साबित नहीं होती।',
'In GST registrations enter the verified GSTIN and status with legal name, state, address and company or branch context. Set feature flags and default deliberately.||GST registrations में सही GSTIN, status, legal name, state, address और company या branch context भरें। Feature flags और default सोचकर चुनें।',
'Use GSTIN verification for a supplied GSTIN. Use E-Invoice lookup with an existing IRN or E-Way Bill lookup with an existing number; lookup does not generate a document.||GSTIN verification से दिए GSTIN की जाँच करें। Existing IRN से E-Invoice या existing number से E-Way Bill lookup करें; lookup नया document नहीं बनाता।',
'Refresh provider status before supported changes. Cancellation or vehicle updates require matching stored registration and identifier, an explicitly active provider state and the required action right.||Supported बदलाव से पहले provider status refresh करें। Cancellation या vehicle update के लिए matching registration, identifier, active provider state और action permission चाहिए।',
'For uncertain outcomes reconcile status before retrying. Use GST session status and API logs for diagnostics; retain only the safe correlation reference.||Uncertain result पर retry से पहले status मिलाएँ। Diagnosis के लिए GST session status और API logs देखें; safe correlation reference ही रखें।'],
'Generation, extension, OTP and dated HSN or rate management need backend support here. Government cancellation leaves the accounting invoice unchanged.||Generation, extension, OTP और dated HSN या rate management में backend support चाहिए। सरकारी cancellation से accounting invoice नहीं बदलता।',
'GSTIN; Status; State code; Registration ID; Default registration; IRN; E-Way Bill number; Provider status; Vehicle number; Reason code',
'frontend/src/utils/gstCompliance.js; frontend/src/pages/gst/GstOverviewPage.jsx; frontend/src/pages/gst/GstDocumentPage.jsx','gst-configuration,gst-e-invoices')

lesson('preferences','17 Personalization','Set appearance documents and table preferences','दिखावट दस्तावेज और टेबल पसंद तय करें',
'Adjust the interface and document presentation to fit daily work.||रोज के काम के लिए interface और documents की presentation तय करें।',
'Open the account menu for personal preferences, or System Settings for the available workspace settings.||Personal preferences के लिए account menu या उपलब्ध workspace settings के लिए System Settings खोलें।',[
'Open Preferences and choose from the available appearance and sidebar theme options.||Preferences में उपलब्ध appearance और sidebar theme चुनें।',
'Set default rows per page for tables that use the shared preference. Some modules use their own domain-specific page sizes.||Shared preference वाली tables के लिए default rows per page चुनें। कुछ modules के page sizes अलग हैं।',
'Open Settings > Appearance to review additional presentation controls, including the available login theme.||Settings > Appearance में अतिरिक्त presentation controls और login theme देखें।',
'Open Invoice Template to choose the available business-document layout. Review a document preview or print output after switching.||Invoice Template में business-document layout चुनें। बदलने के बाद document preview या print output जाँचें।',
'Open Item Settings to review manufacturing-related visibility. Preferences that save automatically may be stored on this browser or device.||Item Settings में manufacturing visibility देखें। Automatically saved preferences इस browser या device में stored हो सकती हैं।'],
'The next list or document reflects the intended preference. Appearance changes do not grant permissions or change business calculations.||अगली list या document में सही preference दिखे। Appearance से permissions या business calculations नहीं बदलतीं।',
'Appearance; Sidebar theme; Login theme; Invoice template; Item settings; Default rows per page',
'frontend/src/pages/settings; frontend/src/pages/preferences/PreferencesPage.jsx; frontend/src/utils/preferencesStorage.js','settings,preferences')

lesson('dashboard','01 Start here','Read the analytics dashboard','एनालिटिक्स डैशबोर्ड पढ़ें',
'Review the business period, trends, ranked lists, alerts and workforce signals before opening detail reports.||Detail reports से पहले business period, trends, ranked lists, alerts और workforce signals देखें।',
'Have Dashboard View access and know which period and comparison you need.||Dashboard View access हो और देखने की अवधि तथा comparison तय हों।',[
'Open Dashboard and set Dashboard date preset or a custom Date range. Choose Comparison period and Trend grouping.||Dashboard में date preset या custom Date range चुनें। Comparison period और Trend grouping तय करें।',
'Refresh and read the returned overview metrics. The page explicitly reports when no overview metrics were returned.||Refresh करके returned metrics देखें। Metrics न लौटें तो पेज उसका संदेश दिखाता है।',
'In Top Selling Items set count and category. In Top Parties select customer or supplier scope and count.||Top Selling Items में count और category चुनें। Top Parties में customer या supplier scope और count दें।',
'Review Recent activity and open the linked audit view for details. For Alerts select preview limit and minimum amount where useful.||Recent activity और linked audit details देखें। Alerts में जरूरत पर preview limit और minimum amount दें।',
'Set the HR Summary attendance date separately. Do not assume its daily snapshot follows every business-period filter.||HR Summary की attendance date अलग तय करें। उसका daily snapshot हर business-period filter का अनुसरण करेगा ऐसा न मानें।'],
'The date, comparison and scope are recorded with any conclusion. Dashboard summaries lead to investigation; source documents and reports verify the outcome.||निष्कर्ष के साथ date, comparison और scope रखें। Dashboard से जाँच शुरू करें; source documents और reports से पुष्टि करें।',
'Date preset; Date range; Comparison period; Trend grouping; Top count; Category; Party type; Alert limit; Minimum alert amount; Attendance date',
'frontend/src/pages/dashboard; frontend/src/services/dashboard/dashboardService.js','dashboard')

lesson('party-settings','03 Master data','Configure party settings and local drafts','पार्टी सेटिंग और लोकल ड्राफ्ट सँभालें',
'Control the supported party form behavior and understand what a local draft saves.||Supported party form behavior तय करें और local draft का मतलब समझें।',
'Have party-settings rights. Review current form requirements before changing field presentation.||Party settings अधिकार हों। Field presentation बदलने से पहले जरूरी fields देखें।',[
'Open Party Master > Party Settings. Review General settings for grouping, shipping address, printing and party status.||Party Master > Party Settings में General के grouping, shipping address, printing और party status देखें।',
'Review Payment Reminder settings, reminder days and message. These configuration fields alone do not prove an automatic reminder delivery service is running.||Payment Reminder में days और message देखें। केवल settings होने से automatic message delivery चालू होना साबित नहीं होता।',
'Review Loyalty and Additional Field 1 to 4 options. Set supported names, enable flags, print visibility and the fourth field type as needed.||Loyalty और Additional Field 1 से 4 देखें। Names, enable flags, print visibility और चौथे field का type तय करें।',
'Save the intended settings, reopen a party form and verify the visible fields and required identity information.||Settings save करके party form दोबारा खोलें। Visible fields और जरूरी identity information जाँचें।',
'On a new Party or Employee form, Save as Draft stores the incomplete form on this device. Return and finish creation to produce the server record.||नई Party या Employee form का Save as Draft अधूरी form इसी device पर रखता है। लौटकर creation पूरा करें तभी server record बनेगा।'],
'The form reflects the supported settings. A local draft does not appear as a completed party or employee in shared server lists.||Form में सही settings दिखें। Local draft shared server list में completed party या employee नहीं है।',
'Party grouping; Shipping address; Print shipping; Party status; Reminder days; Reminder message; Loyalty; Additional field name; Show in print; Save as Draft',
'frontend/src/pages/party/partyColumns.js; frontend/src/utils/formDraftStorage.js','party')

GLOSSARY=[
('Master','A reusable definition such as an item, party or unit.','बार बार उपयोग होने वाला मूल रिकॉर्ड जैसे item, party या unit।'),
('Transaction','A dated business record such as an invoice, payment or production.','तारीख वाला व्यापारिक रिकॉर्ड जैसे invoice, payment या production।'),
('Draft','A saved record awaiting review or the next action.','Save किया रिकॉर्ड जिसे review या अगला action चाहिए।'),
('Confirm','A document action that applies its defined business effects.','Document का action जो उसके तय business effects लागू करता है।'),
('Post','Apply a reviewed transaction to the relevant ledger or stock.','Reviewed transaction को ledger या stock में लागू करना।'),
('Finalize','Freeze a reviewed planning snapshot.','Reviewed planning snapshot को बदलने से रोकना।'),
('Cancel','Stop or reverse a record according to its lifecycle.','Lifecycle के अनुसार रिकॉर्ड रोकना या उलटना।'),
('Reverse','Create the defined compensating effect for a posted entry.','Posted entry का निर्धारित उल्टा प्रभाव बनाना।'),
('SKU','A channel or internal product identifier.','Channel या internal product की पहचान।'),
('BOM','The component recipe for one finished unit.','एक finished unit की component recipe।'),
('Lead time','Time between ordering and receiving a material.','Material का order देने से मिलने तक का समय।'),
('Safety stock','Additional stock included for planning protection.','Planning में सुरक्षा के लिए अतिरिक्त stock।'),
('Reorder point','A stock threshold used in replenishment planning.','Replenishment planning में stock की सीमा।'),
('MOQ','Minimum order quantity.','ऑर्डर की न्यूनतम quantity।'),
('Order multiple','Permitted quantity increment for an order.','Order quantity बढ़ाने का तय गुणक।'),
('Physical stock','Global current item stock in procurement preview.','Procurement preview में item का global current stock।'),
('Projected available','Physical stock plus eligible inbound used by the plan.','Plan में physical stock और योग्य inbound का जोड़।'),
('Reserved stock','Quantity committed rather than freely available.','पहले से प्रतिबद्ध quantity।'),
('Snapshot','Values retained for a specific time or planning run.','किसी समय या planning run के लिए रखे values।'),
('Allocate','Distribute limited available stock among recommendations.','सीमित stock को recommendations में बाँटना।'),
('Docket','A transport consignment reference.','Transport consignment का reference।'),
('STO','A shipment stock-transfer reference field in this app.','App में shipment का stock-transfer reference field।'),
('Receipt','An actual received-goods record.','असल में माल मिलने का रिकॉर्ड।'),
('Freight','Transport-related charges and their lifecycle.','Transport charges और उनका lifecycle।'),
('Receivable','Amount still due from a customer.','Customer से लेना बाकी amount।'),
('Payable','Amount still due to a supplier.','Supplier को देना बाकी amount।'),
('Aging','Outstanding balances grouped by time overdue or age.','बाकी balances को समय के अनुसार बाँटना।'),
('Wallet','A cash-book balance container with an owner or purpose.','Owner या purpose वाला cash-book balance container।'),
('OEE','The application machine-production performance workspace.','App में machine-production performance का workspace।'),
('Row version','A marker used to detect concurrent edits.','एक साथ हुए बदलाव पहचानने का marker।'),
('Correlation ID','A safe request reference used to trace an operation.','Operation खोजने के लिए सुरक्षित request reference।'),
('IRN','The reference identifier used for an existing E-Invoice lookup.','Existing E-Invoice lookup में उपयोग reference identifier।'),
('UTC','The time standard explicitly used by website scheduling fields.','Website schedule fields में दिखाया गया समय मानक।'),
('Publish status','Whether website content is draft or publicly published.','Website content draft है या public published यह स्थिति।'),
('Primary image','The single main image selected for a website product.','Website product की चुनी हुई एक मुख्य image।'),
('Alt text','An image description for accessibility and context.','Image का अर्थ बताने वाला accessibility विवरण।'),
]
