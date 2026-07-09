import PurchaseDocumentDetailPage from "../documents/PurchaseDocumentDetailPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseReturnDetailPage = () => {
  return <PurchaseDocumentDetailPage config={purchaseDocumentConfigs.returns} />;
};

export default PurchaseReturnDetailPage;
