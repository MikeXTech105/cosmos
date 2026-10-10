import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";
import { buildSlide07 } from "./template-modules/slide-07.mjs";
import { buildSlide10 } from "./template-modules/slide-10.mjs";
import { buildSlide11 } from "./template-modules/slide-11.mjs";
import { buildSlide12 } from "./template-modules/slide-12.mjs";
import { buildSlide16 } from "./template-modules/slide-16.mjs";
import { buildSlide17 } from "./template-modules/slide-17.mjs";
import { buildSlide18 } from "./template-modules/slide-18.mjs";
import { buildSlide26 } from "./template-modules/slide-26.mjs";

const OUT_DIR = "D:/Work/My_Projects/cosmos/tmp/supply_chain_client_presentation/output";
const OUTPUT_PPTX = "D:/Work/My_Projects/cosmos/backend/docs/COSMOS_SUPPLY_CHAIN_CLIENT_HANDOVER.pptx";
const COVER_IMAGE = "D:/Work/My_Projects/cosmos/backend/docs/assets/supply-chain-handover-cover.png";

const C = {
  ink: "#111827",
  slate: "#4B5563",
  muted: "#6B7280",
  pale: "#F4F7FA",
  blue: "#3D8DFF",
  lightBlue: "#EAF5FB",
  green: "#0F9D76",
  lightGreen: "#E8F7F1",
  red: "#D14B5A",
  lightRed: "#FCEBED",
  white: "#FFFFFF",
};

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addBox(slide, x, y, width, height, fill, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "roundRect",
    name: options.name,
    position: { left: x, top: y, width, height },
    fill,
    line: {
      style: "solid",
      fill: options.line ?? "none",
      width: options.lineWidth ?? 0,
    },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
}

function addText(slide, value, x, y, width, height, fontSize, options = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    name: options.name,
    position: { left: x, top: y, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = value;
  box.text.style = {
    fontSize,
    typeface: "Helvetica Neue",
    color: options.color ?? C.ink,
    bold: options.bold ?? false,
    alignment: options.alignment ?? "left",
    verticalAlignment: options.verticalAlignment ?? "top",
  };
  return box;
}

function addFooter(slide, number, fill = C.muted) {
  addText(slide, `COSMOS ERP  |  Client handover overview`, 48, 678, 420, 20, 13, {
    color: fill,
  });
  addText(slide, String(number), 1190, 678, 40, 20, 13, {
    color: fill,
    alignment: "right",
  });
}

function textCard(title, body) {
  return {
    titleHere: title,
    titleGoesHere: title,
    topic: title,
    loremIpsumDolorSitAmetConsecteturAdipiscing: `\n${body}`,
    loremIpsumDolorSitAmetConsecteturAdipiscing2: "",
  };
}

async function makeCover(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addBox(slide, 0, 0, 1280, 720, C.pale, { geometry: "rect" });
  addBox(slide, 0, 0, 670, 720, C.white, { geometry: "rect" });
  addBox(slide, 0, 0, 14, 720, C.blue, { geometry: "rect" });
  slide.images.add({
    blob: await readImageBlob(COVER_IMAGE),
    contentType: "image/png",
    alt: "Orderly warehouse and dispatch team preparing a shipment",
    fit: "cover",
    position: { left: 670, top: 0, width: 610, height: 720 },
    geometry: "rect",
  });
  addText(slide, "COSMOS ERP", 72, 68, 230, 32, 18, {
    color: C.blue,
    bold: true,
  });
  addText(slide, "Supply Chain\nmade simple", 72, 158, 540, 175, 66, {
    bold: true,
    color: C.ink,
  });
  addText(
    slide,
    "A client-friendly overview of how planning, dispatch and shipments work together.",
    72,
    364,
    500,
    95,
    25,
    { color: C.slate },
  );
  addBox(slide, 72, 520, 490, 88, C.lightBlue, { line: "#CDE8F7", lineWidth: 1 });
  addText(slide, "Plan better  →  Send clearly  →  Know what changed", 98, 546, 438, 34, 20, {
    color: C.ink,
    bold: true,
  });
  addFooter(slide, 1);
  return slide;
}

function makeStockMoments(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addText(slide, "Two moments change stock", 42, 38, 870, 72, 48, { bold: true });
  addText(
    slide,
    "The system separates planning from the real-world events that affect stock.",
    42,
    116,
    920,
    42,
    22,
    { color: C.slate },
  );

  addBox(slide, 42, 196, 460, 398, C.pale, { line: "#E2E8F0", lineWidth: 1 });
  addText(slide, "Planning and preparation", 72, 226, 370, 38, 28, { bold: true });
  addText(slide, "Helpful work — but stock stays the same", 72, 268, 360, 30, 18, {
    color: C.slate,
  });
  const noStock = [
    ["1", "Procurement recommendation"],
    ["2", "Dispatch allocation proposal"],
    ["3", "Shipment draft, packing or docket"],
  ];
  noStock.forEach(([n, label], index) => {
    const top = 322 + index * 76;
    addBox(slide, 72, top, 40, 40, C.white, { line: "#CBD5E1", lineWidth: 1, geometry: "ellipse" });
    addText(slide, n, 82, top + 8, 20, 20, 16, { bold: true, alignment: "center" });
    addText(slide, label, 128, top + 7, 305, 30, 19, { color: C.ink });
  });
  addText(slide, "No stock deduction yet", 72, 548, 240, 24, 16, { color: C.muted, bold: true });

  addBox(slide, 540, 196, 698, 398, C.white, { line: "#D7E3EE", lineWidth: 1 });
  addText(slide, "Real operating events", 574, 226, 390, 38, 28, { bold: true });
  addText(slide, "These are the two points where stock can move.", 574, 268, 470, 30, 18, {
    color: C.slate,
  });
  addBox(slide, 574, 326, 300, 184, C.lightRed, { line: "#F5CAD1", lineWidth: 1 });
  addText(slide, "Confirmed dispatch", 602, 354, 250, 30, 24, { bold: true, color: C.red });
  addText(slide, "Goods have left.\nStock goes down.", 602, 402, 230, 52, 20, { color: C.ink });
  addText(slide, "↓", 806, 402, 42, 60, 42, { color: C.red, bold: true, alignment: "center" });
  addBox(slide, 908, 326, 300, 184, C.lightGreen, { line: "#BFE8D8", lineWidth: 1 });
  addText(slide, "Restockable return receipt", 936, 354, 252, 30, 22, { bold: true, color: C.green });
  addText(slide, "Usable goods came back.\nStock goes up.", 936, 402, 215, 52, 20, { color: C.ink });
  addText(slide, "↑", 1132, 402, 42, 60, 42, { color: C.green, bold: true, alignment: "center" });
  addText(slide, "The record keeps a clear history of who confirmed each event.", 574, 540, 570, 25, 16, {
    color: C.muted,
  });
  addFooter(slide, 7);
  return slide;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

  await makeCover(presentation);

  buildSlide07(presentation, {
    title: "Three jobs, one connected process",
    body1: "Procurement\nWhat should we arrange or buy?",
    body2: "Dispatch\nWhere should available stock go?",
    body3: "Shipment Operations\nHas it left, arrived or returned?",
    footer1: "2",
  });

  buildSlide17(presentation, {
    title: "From planning to proven delivery",
    label1: "1. Prepare",
    label2: "2. Decide",
    label3: "3. Confirm",
    body1: textCard("Clean inputs", "Products, warehouses, sales history and rules."),
    body2: textCard("Protected plans", "The team reviews recommendations before acting."),
    body3: textCard("Real proof", "Shipment, receipt and return events create the history."),
    footer1: "3",
  });

  buildSlide12(presentation, {
    title: "Start with reliable operating data",
    body1: {
      topic: "One source of truth\n",
      loremIpsumDolorSitAmetConsecteturAdipiscing:
        "Good plans depend on clear product, location and packaging information.",
    },
    body2: textCard("Products and ingredients", "What each finished product contains."),
    body3: textCard("Channels and warehouses", "Where products are sold, held or supplied."),
    body4: textCard("SKU mapping", "The same item must be recognised everywhere."),
    body5: textCard("Planning rules", "Pack sizes, lead times and safety stock targets."),
    footer1: "4",
  });

  buildSlide11(presentation, {
    title: "Planning makes recommendations — it does not move stock",
    body1: {
      topic: "Why this matters\n",
      loremIpsumDolorSitAmetConsecteturAdipiscing:
        "Both planning activities produce a reviewed proposal for the team.",
      loremIpsumDolorSitAmetConsecteturAdipiscing2:
        " They are saved as a clear snapshot, not as an automatic warehouse transaction.",
    },
    body2: "Procurement\nrecommendation",
    body3: "Dispatch\nrecommendation",
    body4: {
      detailGoesHere: "Uses demand, stock and supply inputs.\n",
      detailGoesHere2: "Suggests what to arrange or buy.\n",
      detailGoesHere3: "No purchase order or stock change is created.",
    },
    body5: {
      detailGoesHere: "Uses channel need and company stock.\n",
      detailGoesHere2: "Suggests where stock should be allocated.\n",
      detailGoesHere3: "No stock is deducted until a shipment is dispatched.",
    },
    footer1: "5",
  });

  buildSlide18(presentation, {
    title: "Shipment Operations turns the plan into a real delivery",
    body1: textCard("Prepare", "Create the shipment, add items, record the carrier and pack the goods."),
    body2: textCard("Dispatch", "Confirm that goods have left. This is the stock-out moment."),
    body3: textCard("Close the loop", "Record delivery, then record any restockable return."),
    label1: "Draft",
    label2: "Dispatch",
    label3: "Receipt / return",
    footer1: "6",
  });

  makeStockMoments(presentation);

  buildSlide16(presentation, {
    title: "Everyone has a clear part to play",
    body1: textCard("Administrator", "Maintains products, mappings and operating rules."),
    body2: textCard("Planner", "Reviews what to buy or arrange."),
    body3: textCard("Channel team", "Confirms local needs and priorities."),
    body4: textCard("Warehouse", "Packs goods and confirms dispatch."),
    body5: textCard("Delivery team", "Records receipt and delivery outcome."),
    body6: textCard("Returns team", "Marks what can safely go back into stock."),
    body7: textCard("Managers", "Use the dashboard and exports to follow activity."),
    body8: textCard("Access owner", "Gives each person the right level of access."),
    footer1: "8",
  });

  buildSlide12(presentation, {
    title: "Simple reports support daily decisions",
    body1: {
      topic: "Built for conversations\n",
      loremIpsumDolorSitAmetConsecteturAdipiscing:
        "Exports give teams a simple way to review the plan, allocation and shipment activity together.",
    },
    body2: textCard("Procurement plan", "What the business should arrange or buy."),
    body3: textCard("Dispatch proposal", "Where available company stock should go."),
    body4: textCard("Shipment activity", "What went out, arrived or returned."),
    body5: textCard("CSV / Excel exports", "Easy sharing, follow-up and record keeping."),
    footer1: "9",
  });

  buildSlide10(presentation, {
    title: "Before go-live, agree these five things",
    body1: "When these are agreed, run one realistic test journey from planning through a possible return.",
    body2: {
      loremIpsumDolorSitAmetConsecteturAdipiscing: "Confirm the owner, the data source and the expected approval for each item.\n",
      loremIpsumDolorSitAmetConsecteturAdipiscing2: "Also agree how teams will use the system day to day.",
    },
    label1: "Product and SKU mapping",
    label2: "Planning rules",
    label3: "Meaning of company stock",
    label4: "Shipping and return rules",
    label5: "User access and reports",
    footer1: "10",
  });

  buildSlide26(presentation, {
    title: "COSMOS ERP",
    title2: "Success means a\ntested, shared process",
    title3: {
      loremIpsumDetails: "Agree the data and ownership.\n",
      loremIpsumDetails2: "Test one complete journey.",
      loremIpsumDetails3: "",
    },
  });

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(`${OUT_DIR}/${stem}.png`, await presentation.export({ slide, format: "png", scale: 1 }));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(`${OUT_DIR}/${stem}.layout.json`, await layout.text());
  }
  await writeBlob(`${OUT_DIR}/deck-montage.webp`, await presentation.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(OUTPUT_PPTX);
  console.log(`Created ${OUTPUT_PPTX}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
