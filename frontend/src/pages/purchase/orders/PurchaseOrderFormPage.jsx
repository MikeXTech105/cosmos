import PurchaseDocumentFormPage from "../documents/PurchaseDocumentFormPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseOrderFormPage = () => {
  return <PurchaseDocumentFormPage config={purchaseDocumentConfigs.orders} />;
};

export default PurchaseOrderFormPage;
