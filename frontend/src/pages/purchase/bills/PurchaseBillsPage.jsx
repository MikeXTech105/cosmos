import PurchaseDocumentListPage from "../documents/PurchaseDocumentListPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseBillsPage = () => {
  return <PurchaseDocumentListPage config={purchaseDocumentConfigs.bills} />;
};

export default PurchaseBillsPage;
