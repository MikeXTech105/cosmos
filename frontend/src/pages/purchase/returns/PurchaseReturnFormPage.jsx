import PurchaseDocumentFormPage from "../documents/PurchaseDocumentFormPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseReturnFormPage = () => {
  return <PurchaseDocumentFormPage config={purchaseDocumentConfigs.returns} />;
};

export default PurchaseReturnFormPage;
