import PurchaseDocumentListPage from "../documents/PurchaseDocumentListPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseOrdersPage = () => {
  return <PurchaseDocumentListPage config={purchaseDocumentConfigs.orders} />;
};

export default PurchaseOrdersPage;
