import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../components/common/AppTooltip", () => ({
  default: ({ children }) => children,
}));

import DispatchRecommendationMatrix from "./DispatchRecommendationMatrix";

describe("Dispatch recommendation matrix", () => {
  it("keeps two channel SKUs mapped to one item and warehouse as separate rows", () => {
    const recommendations = [
      {
        id: 101,
        itemId: 1,
        channelItemMappingId: 11,
        itemCode: "ITEM-1",
        itemName: "Shared item",
        channelSku: "CHANNEL-SKU-A",
        warehouseId: 5,
        warehouseCode: "WH-1",
        warehouseName: "Warehouse 1",
        finalRecommendationQuantity: 7,
        allocatedQuantity: 3,
      },
      {
        id: 102,
        itemId: 1,
        channelItemMappingId: 12,
        itemCode: "ITEM-1",
        itemName: "Shared item",
        channelSku: "CHANNEL-SKU-B",
        warehouseId: 5,
        warehouseCode: "WH-1",
        warehouseName: "Warehouse 1",
        finalRecommendationQuantity: 9,
        allocatedQuantity: 4,
      },
    ];

    const html = renderToStaticMarkup(
      <DispatchRecommendationMatrix
        canOverride
        loading={false}
        onOverride={() => {}}
        recommendations={recommendations}
        view="matrix"
      />,
    );

    expect(html.match(/ITEM-1 · CHANNEL-SKU-A/g)).toHaveLength(1);
    expect(html.match(/ITEM-1 · CHANNEL-SKU-B/g)).toHaveLength(1);
    expect(html.match(/Shared item/g)).toHaveLength(2);
    expect(html).toContain("Final</span>");
    expect(html).toContain(">7</span>");
    expect(html).toContain(">9</span>");
    expect(html).toContain(">3</span>");
    expect(html).toContain(">4</span>");
    expect(html).toContain('aria-label="Override CHANNEL-SKU-A for WH-1"');
    expect(html).toContain('aria-label="Override CHANNEL-SKU-B for WH-1"');
  });
});
