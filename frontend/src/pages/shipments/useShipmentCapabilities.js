import useCapabilities from "../../hooks/useCapabilities";

const ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "approve",
];

const usePageCapabilities = (name) =>
  useCapabilities({
    actions: ACTIONS,
    label: `ShipmentOperations.${name}`,
    pageName: `ShipmentOperations.${name}`,
    resource: `ShipmentOperations.${name}`,
  });

const useShipmentCapabilities = () => {
  const shipments = usePageCapabilities("Shipments");
  const packing = usePageCapabilities("Packing");
  const dockets = usePageCapabilities("Dockets");
  const appointments = usePageCapabilities("Appointments");
  const tracking = usePageCapabilities("Tracking");
  const receipts = usePageCapabilities("Receipts");
  const returns = usePageCapabilities("Returns");
  const freight = usePageCapabilities("Freight");
  const reports = usePageCapabilities("Reports");
  const imports = usePageCapabilities("Imports");

  return {
    appointments,
    canCancel: shipments.canDelete,
    canCreate: shipments.canCreate,
    canExportReports: reports.canExport,
    canManageAppointments:
      appointments.canCreate || appointments.canUpdate,
    canManageDockets: dockets.canCreate || dockets.canUpdate,
    canManageFreight: freight.canCreate || freight.canUpdate,
    canManageImports: imports.canCreate || imports.canUpdate,
    canManagePacking: packing.canCreate || packing.canUpdate,
    canManageReceipts: receipts.canCreate || receipts.canUpdate,
    canManageReturns: returns.canCreate || returns.canUpdate,
    canManageTracking: tracking.canCreate || tracking.canUpdate,
    canTransition: shipments.canUpdate,
    canUpdate: shipments.canUpdate,
    dockets,
    freight,
    imports,
    packing,
    receipts,
    reports,
    returns,
    shipments,
    tracking,
  };
};

export default useShipmentCapabilities;
