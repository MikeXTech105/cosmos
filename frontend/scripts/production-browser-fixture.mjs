// Explicit local UI test fixture. No SQL, credentials, real catalog or production API.
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const version = "0x0000000000000001", snapshotId = "00000000-0000-4000-8000-000000000001";
const requests = [];
const item = { id: 101, itemCode: "TEST-FG", name: "Synthetic browser fixture output", itemType: 1, procurementClassification: 1, categoryId: 10, categoryName: "Finished products", unitId: 1, unitName: "Piece", unitShortName: "PCS", isManufactured: true, isActive: true, currentStock: 50, reservedStock: 10, minimumStock: 80, openingStock: 50, openingStockValue: 1200, salesPrice: 35, purchasePrice: 24, gstRate: 18, hsnCode: "39269099", barcode: "TEST-101", trackInventory: true, description: "Synthetic manufactured product for UI verification.", createdAt: "2026-10-01T09:00:00Z" };
const material = { id: 102, itemCode: "TEST-RM", name: "Synthetic browser fixture material", itemType: 1, procurementClassification: 2, categoryId: 11, categoryName: "Raw materials", unitId: 2, unitName: "Kilogram", unitShortName: "KG", isManufactured: false, isActive: true, currentStock: 9400, reservedStock: 500, minimumStock: 3000, openingStock: 8000, openingStockValue: 160000, salesPrice: 24, purchasePrice: 20, gstRate: 18, hsnCode: "39021000", trackInventory: true, createdAt: "2026-10-01T09:00:00Z" };
const serviceItem = { id: 103, itemCode: "TEST-SVC", name: "Synthetic maintenance service", itemType: 2, categoryId: 12, categoryName: "Services", unitId: 3, unitName: "Job", unitShortName: "JOB", isActive: false, isManufactured: false, trackInventory: false, salesPrice: 450, purchasePrice: 0, gstRate: 18, hsnCode: "9987", createdAt: "2026-10-02T09:00:00Z" };
const masterSamples = {
  machines: [{ id: 21, machineCode: "TEST-IM-01", machineName: "Synthetic injection press", tonnage: "135T", location: "Shop Floor A", displayOrder: 1, isActive: true }, { id: 22, machineCode: "TEST-IM-02", machineName: "Synthetic precision press", tonnage: "180T", location: "Shop Floor B", displayOrder: 2, isActive: true }, { id: 23, machineCode: "TEST-IM-03", machineName: "Synthetic standby press", tonnage: "90T", location: "Service bay", displayOrder: 3, isActive: false }],
  moulds: [{ id: 31, mouldName: "Synthetic hanger mould", targetShotPerDay: 4800, cavity: 8, cycleTime: 18, isActive: true }, { id: 32, mouldName: "Synthetic clip mould", targetShotPerDay: 5760, cavity: 16, cycleTime: 15, isActive: true }, { id: 33, mouldName: "Synthetic spare mould", targetShotPerDay: 0, cavity: null, cycleTime: null, isActive: false }],
  "downtime-reasons": [{ id: 41, reasonName: "Mould change", isActive: true }, { id: 42, reasonName: "Power interruption", isActive: true }, { id: 43, reasonName: "Material unavailable", isActive: true }, { id: 44, reasonName: "Scheduled maintenance", isActive: true }, { id: 45, reasonName: "Old reason (retired)", isActive: false }],
};
const planLine = { itemId: 101, unitId: 1, demandQuantity: 300, refreshedOn: "2026-10-27", physicalStock: 50, reservedStock: 0, openReleasedOutput: 10, dailyDemand: 10, target21: 210, warning15: 150, sevenDayDemand: 70, fourWeekSlice: 75, monthly30Demand: 300, coverageDays: 5, suggestedProduction: 150, freshness: 1, sourceRevision: "fixture-only", eligibleInboundQuantity: 0 };
const plan = { id: snapshotId, asOfDate: "2026-10-27", demandFrom: "2026-09-28", demandTo: "2026-10-27", freshnessDays: 30, calculationVersion: "TEST-ONLY", inventoryBasis: "Synthetic UI fixture", lines: [planLine] };
const page = (items = [], size = 50, summary) => ({ items, pageNumber: 1, pageSize: size, totalCount: items.length, totalPages: items.length ? 1 : 0, summary });
const order = { id: 201, orderNumber: "TEST-PO-201", status: 2, businessDate: "2026-10-27", plannedStart: "2026-10-27", dueDate: "2026-10-28", itemId: 101, unitId: 1, bomId: 301, routingId: 401, machineId: 21, mouldId: 31, shiftId: 41, plannedQuantity: 100, releasedQuantity: 100, completedQuantity: 0, rejectedQuantity: 0, remainingQuantity: 100, revision: 1, version, notes: "Synthetic UI fixture only" };
const deskOrders = [order, ...[1, 3, 4, 5, 6].map((status, index) => ({ ...order, id: 202 + index, orderNumber: `TEST-PO-${202 + index}`, status, remainingQuantity: [4, 5, 6].includes(status) ? 0 : 100 }))];
const deskCompletions = new Map(), deskCommands = new Map();
let staged = null;
const seed = `window.__COSMOS_CONFIG__={API_BASE_URL:location.origin};sessionStorage.setItem('accessToken','eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.test-only');sessionStorage.setItem('user',JSON.stringify({id:999,name:'Synthetic UI tester'}));sessionStorage.setItem('roles',JSON.stringify(['Super Admin']));sessionStorage.setItem('pages','[]');localStorage.setItem('cosmos_auth_storage','session');`;
const server = await createServer({ root, server: { host: "127.0.0.1", port: 4177, strictPort: true }, plugins: [{ name: "explicit-production-ui-fixture", transformIndexHtml(html) { return html.replace("<head>", `<head><script>${seed}</script>`).replace("<body>", '<body><div style="position:fixed;bottom:0;right:0;z-index:99999;background:#7c2d12;color:white;padding:5px 12px;font:12px sans-serif">SYNTHETIC UI FIXTURE · NO SQL</div>'); }, configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
  const url = new URL(req.url, "http://127.0.0.1:4177"), path = url.pathname;
  if (path === "/__fixture__/requests") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(requests)); return; }
  if (!path.startsWith("/api/")) { next(); return; }
  let raw = ""; for await (const chunk of req) raw += chunk;
  let body = {}; if (raw) { try { body = JSON.parse(raw); } catch { res.statusCode = 400; } }
  requests.push({ method: req.method, path, query: Object.fromEntries(url.searchParams), raw });
  let data = page(), message = "Synthetic UI fixture";
  const masterMatch = path.match(/^\/api\/v1\/oee\/(machines|moulds|downtime-reasons)(?:\/(\d+))?$/);
  const queryValue = name => url.searchParams.get(name) ?? url.searchParams.get(name[0].toLowerCase() + name.slice(1));
  const filterPage = collection => {
    const search = (queryValue("Search") || "").toLowerCase(), active = queryValue("IsActive");
    const matching = collection.filter(row => (!search || Object.values(row).join(" ").toLowerCase().includes(search)) && (!active || String(row.isActive) === active) && (!queryValue("CategoryId") || String(row.categoryId) === queryValue("CategoryId")) && (!queryValue("ProcurementClassification") || String(row.procurementClassification) === queryValue("ProcurementClassification")));
    const number = Number(queryValue("PageNumber") || queryValue("Page")) || 1, size = Number(queryValue("PageSize")) || 20;
    return { items: matching.slice((number - 1) * size, number * size), pageNumber: number, pageSize: size, totalCount: matching.length, totalPages: Math.max(1, Math.ceil(matching.length / size)) };
  };
  if (path.endsWith("/manufacturing/runtime")) data = { companyKey: "synthetic-ui-only", businessDate: "2026-10-28", businessTimeZone: "India Standard Time", browserTimeZone: "Asia/Kolkata", closedThroughDate: "2026-09-30" };
  else if (masterMatch) {
    const collection = masterSamples[masterMatch[1]], id = masterMatch[2];
    if (req.method === "GET") {
      data = id ? collection.find(row => String(row.id) === id) : filterPage(collection);
      if (!data) { res.statusCode = 404; message = "Synthetic master not found"; }
    } else if (req.method === "POST" && !id) { data = { ...body, id: 100 + collection.length }; collection.push(data); }
    else if (req.method === "PUT" && id) {
      const index = collection.findIndex(row => String(row.id) === id);
      if (index < 0) { res.statusCode = 404; message = "Synthetic master not found"; }
      else { collection[index] = { ...collection[index], ...body }; data = collection[index]; }
    } else { res.statusCode = 400; message = "This UI fixture does not simulate that master operation."; }
  }
  else if (path === "/api/items") data = filterPage([item, material, serviceItem]);
  else if (path === "/api/categories") data = filterPage([{ id: 10, name: "Finished products", code: "FG", isActive: true }, { id: 11, name: "Raw materials", code: "RM", isActive: true }, { id: 12, name: "Services", code: "SVC", isActive: true }]);
  else if (path === "/api/units") data = page([{ id: 1, name: "Piece", shortName: "PCS" }, { id: 2, name: "Kilogram", shortName: "KG" }], 200);
  else if (path === "/api/items/101") data = item;
  else if (path === "/api/items/102") data = material;
  else if (path === "/api/items/103") data = serviceItem;
  else if (path.endsWith("/work-centres")) data = page([{ id: 11, code: "TEST-WC", name: "Synthetic work centre", capacityBasis: "Minutes", isActive: true, version }]);
  else if (path.endsWith("/operations")) data = page([{ id: 12, code: "TEST-OP", name: "Synthetic operation", rateBasis: 1, defaultRate: 10, isActive: true, version }]);
  else if (path.endsWith("/planning/finished")) data = plan;
  else if (path.includes("/planning/snapshots/")) data = { ...plan, lines: page([planLine]) };
  else if (path.endsWith("/planning/materials")) data = { sourceSnapshotId: snapshotId, calculationVersion: "TEST-ONLY", products: [{ itemId: 101, requestedOutput: 150, feasibleOutput: 150, bottleneckItemId: 102 }], materials: [{ itemId: 102, unitId: 2, requiredQuantity: 75, proposedAllocation: 75, availableQuantity: 100, remainingQuantity: 25, shortage: 0 }] };
  else if (path.endsWith("/reports/production")) {
    const sample = [3, 6, 8, 12, 19, 26].map((day, index) => ({ sourceId: 700 + index, sourceType: "ProductionCompletion", businessDate: `2026-10-${String(day).padStart(2, "0")}`, itemId: 101, itemCode: item.itemCode, itemName: item.name, unitId: 1, unitName: "PCS", goodOutput: 25, rejectedOutput: 1 }));
    const saved = [...deskCompletions.values()].flat().map(row => ({ ...row, sourceId: row.id, sourceType: "ProductionCompletion", itemId: 101, itemCode: item.itemCode, itemName: item.name, unitId: 1, unitName: "PCS" }));
    const matching = [...sample, ...saved].filter(row => (!url.searchParams.get("fromDate") || row.businessDate >= url.searchParams.get("fromDate")) && (!url.searchParams.get("toDate") || row.businessDate <= url.searchParams.get("toDate")));
    const number = Number(url.searchParams.get("pageNumber")) || 1, size = Number(url.searchParams.get("pageSize")) || 200;
    data = { items: matching.slice((number - 1) * size, number * size), pageNumber: number, pageSize: size, totalCount: matching.length, summary: [] };
  }
  else if (path.endsWith("/orders") && req.method === "GET") {
    const matching = deskOrders.filter(row => (!url.searchParams.get("status") || row.status === Number(url.searchParams.get("status"))) && (!url.searchParams.get("search") || row.orderNumber.includes(url.searchParams.get("search"))));
    const number = Number(url.searchParams.get("pageNumber")) || 1, size = Number(url.searchParams.get("pageSize")) || 20;
    data = { items: matching.slice((number - 1) * size, number * size), pageNumber: number, pageSize: size, totalCount: matching.length, totalPages: Math.ceil(matching.length / size) };
  }
  else if (/\/orders\/\d+(\/context)?$/.test(path) && req.method === "GET") {
    const current = deskOrders.find(row => String(row.id) === path.match(/\/orders\/(\d+)/)[1]);
    if (!current) { res.statusCode = 404; message = "Synthetic order not found"; }
    else data = path.endsWith("/context") ? { order: current, materials: [{ id: 501, itemId: 102, unitId: 2, quantityPerOutput: 0.5, wastePercent: 0.5, requiredQuantity: 50.25, consumedQuantity: 0, sourceComponentQuantity: 0.5, outputBaseQuantity: 1, baselineOutputQuantity: 0, baselineExpectedQuantity: 0 }], reservations: [], completions: deskCompletions.get(current.id) || [], bomSnapshotJson: null, routeSnapshotJson: null } : current;
  }
  else if (/\/orders\/\d+\/(release|completions)$/.test(path) && req.method === "POST") {
    const current = deskOrders.find(row => String(row.id) === path.match(/\/orders\/(\d+)/)[1]);
    const command = `${current?.id}:${body.idempotencyKey}`;
    if (deskCommands.has(command)) data = deskCommands.get(command);
    else if (!current || body.version !== current.version) { res.statusCode = 409; message = "Synthetic version conflict"; }
    else {
      if (path.endsWith("/release")) { current.status = 2; current.releasedQuantity = body.quantity; current.remainingQuantity = body.quantity; }
      else {
        current.completedQuantity = Number(current.completedQuantity) + Number(body.goodOutput);
        current.rejectedQuantity = Number(current.rejectedQuantity) + Number(body.rejectedOutput);
        current.remainingQuantity = Number(current.releasedQuantity) - current.completedQuantity - current.rejectedQuantity;
        current.status = current.remainingQuantity === 0 ? 4 : 3;
        const events = deskCompletions.get(current.id) || [];
        events.push({ id: 900 + events.length, businessDate: body.businessDate, occurredAt: body.occurredAt, goodOutput: body.goodOutput, rejectedOutput: body.rejectedOutput, materials: body.materials.map(line => ({ ...line, expectedQuantity: (Number(body.goodOutput) + Number(body.rejectedOutput)) * 0.5025 })) });
        deskCompletions.set(current.id, events);
      }
      current.version = `TEST-V${Date.now()}`;
      data = { id: current.id, version: current.version, status: current.status };
      deskCommands.set(command, data);
    }
  }
  else if (path.endsWith("/imports/stage")) { staged = { batchId: snapshotId, version, status: "Staged", cutoverDate: body.cutoverDate, fileName: body.fileName, fileFingerprint: body.fileFingerprint, rows: page(body.rows.map((row, index) => ({ id: index + 1, tab: row.tab, rowNumber: row.row, columnName: row.column, eventFingerprint: row.eventFingerprint, originalJson: row.originalJson, rowStatus: "Staged", exceptionCode: "MAPPING_REQUIRED" }))) }; data = { batchId: snapshotId, version, rows: staged.rows.totalCount, exceptions: staged.rows.totalCount, status: "Staged" }; }
  else if (path.endsWith("/preview")) data = staged || { batchId: snapshotId, version, status: "Staged", rows: page() };
  else if (path.includes("/reports/operational/")) data = page([{ sourceId: 101, sourceType: "StockAsOf", businessDate: "2026-10-27", itemId: 101, itemCode: "TEST-FG", itemName: item.name, unitId: 1, unitName: "PCS", onHandQuantity: 50, reservedQuantity: 0, availableQuantity: 50, reconciliationDifference: 0, calculationVersion: "TEST-ONLY" }], 50, { QuantityTotals: [{ UnitId: 1, UnitName: "PCS", OnHandQuantity: 50, ReservedQuantity: 0 }], DataQualityRows: 0, CalculationVersion: "TEST-ONLY" });
  else if (req.method !== "GET") { res.statusCode = 400; message = "This synthetic UI fixture does not simulate this transaction. SQL integration remains unverified."; }
  res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ succeeded: res.statusCode < 400, message, data, errors: [] }));
}); } }] });
await server.listen();
console.log("Synthetic UI fixture only: http://127.0.0.1:4177/manufacturing/orders");
