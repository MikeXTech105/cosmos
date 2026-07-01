import PurchaseDocumentDetailPage from "../documents/PurchaseDocumentDetailPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseOrderDetailPage = () => {
  return <PurchaseDocumentDetailPage config={purchaseDocumentConfigs.orders} />;
};

export default PurchaseOrderDetailPage;
