import PurchaseDocumentDetailPage from "../documents/PurchaseDocumentDetailPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseBillDetailPage = () => {
  return <PurchaseDocumentDetailPage config={purchaseDocumentConfigs.bills} />;
};

export default PurchaseBillDetailPage;
