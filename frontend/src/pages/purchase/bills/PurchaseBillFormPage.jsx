import PurchaseDocumentFormPage from "../documents/PurchaseDocumentFormPage";
import { purchaseDocumentConfigs } from "../documents/documentConfigs";

const PurchaseBillFormPage = () => {
  return <PurchaseDocumentFormPage config={purchaseDocumentConfigs.bills} />;
};

export default PurchaseBillFormPage;
