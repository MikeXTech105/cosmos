import PurchaseDocumentListPage from "../documents/PurchaseDocumentListPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseReturnsPage = () => {
  return <PurchaseDocumentListPage config={purchaseDocumentConfigs.returns} />;
};

export default PurchaseReturnsPage;
