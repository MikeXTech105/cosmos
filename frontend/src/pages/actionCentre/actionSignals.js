import {
  Boxes,
  PackageOpen,
  PackageX,
  SlidersHorizontal,
  Timer,
  Unlink,
} from "lucide-react";

import messages from "../../i18n/locales/en/actionCentre.json";
import { PlanningRunStatus } from "../../constants/procurementEnums";
import { dashboardService } from "../../services/dashboard/dashboardService";
import { dispatchSettingService } from "../../services/dispatch/settingService";
import { bomService } from "../../services/procurement/bomService";
import { planningService } from "../../services/procurement/planningService";
import { procurementSettingService } from "../../services/procurement/procurementSettingService";
import { supplyChainItemMappingService } from "../../services/supplyChain/itemMappingService";
import { supplyChainPackagingProfileService } from "../../services/supplyChain/packagingProfileService";
import { ACTION_SIGNAL_PERMISSIONS } from "./actionCentrePermissions";

const MAX_PAGE_SIZE = 200;

const toCount = (value) => {
  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) {
    throw new Error("The server returned an invalid attention count.");
  }

  return Math.trunc(count);
};

const getCollectionCount = (response) => {
  if (!Array.isArray(response?.data)) {
    throw new Error("The server returned an invalid collection.");
  }

  return response.data.length;
};

const getPagedItems = (response) => {
  if (!Array.isArray(response?.data?.items)) {
    throw new Error("The server returned an invalid paged list.");
  }

  return response.data.items;
};

const getPagedCount = (response) => toCount(response?.data?.totalCount);

const getAllPagedItems = async (request, params = {}) => {
  const firstResponse = await request({
    ...params,
    PageNumber: 1,
    PageSize: MAX_PAGE_SIZE,
  });
  const firstItems = getPagedItems(firstResponse);
  const totalCount = toCount(firstResponse.data.totalCount);
  const totalPages = Math.max(
    1,
    Number(firstResponse.data.totalPages) ||
      Math.ceil(totalCount / MAX_PAGE_SIZE),
  );

  if (totalPages === 1) {
    return firstItems;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      request({
        ...params,
        PageNumber: index + 2,
        PageSize: MAX_PAGE_SIZE,
      }),
    ),
  );

  return [
    ...firstItems,
    ...remainingResponses.flatMap((response) => getPagedItems(response)),
  ];
};

const hasIdentifier = (value) =>
  value !== null && value !== undefined && value !== "";

const getDispatchPackagingCount = async () => {
  const [settings, packagingProfiles] = await Promise.all([
    getAllPagedItems(dispatchSettingService.list, { IsActive: true }),
    getAllPagedItems(supplyChainPackagingProfileService.list, {
      IsActive: true,
    }),
  ]);
  const packagingKeys = new Set(
    packagingProfiles.flatMap((profile) => {
      if (!hasIdentifier(profile.itemId)) {
        return [];
      }

      const itemKey = String(profile.itemId);
      const channelKey = hasIdentifier(profile.channelId)
        ? String(profile.channelId)
        : "*";

      return [`${itemKey}:${channelKey}`];
    }),
  );
  const missingSkuKeys = new Set();

  settings.forEach((setting) => {
    if (
      hasIdentifier(setting.packagingProfileId) ||
      String(setting.packagingCode ?? "").trim()
    ) {
      return;
    }

    const itemKey = hasIdentifier(setting.itemId)
      ? String(setting.itemId)
      : "";
    const channelKey = hasIdentifier(setting.channelId)
      ? String(setting.channelId)
      : "*";
    const hasMatchingProfile =
      itemKey &&
      (packagingKeys.has(`${itemKey}:${channelKey}`) ||
        packagingKeys.has(`${itemKey}:*`));

    if (!hasMatchingProfile) {
      missingSkuKeys.add(`${itemKey || "unknown"}:${channelKey}`);
    }
  });

  return missingSkuKeys.size;
};

export const actionSignals = Object.freeze([
  Object.freeze({
    fetch: async () =>
      getCollectionCount(await supplyChainItemMappingService.unmatched()),
    group: "blocking",
    hint: messages.signals.unmatchedChannelSkus.hint,
    icon: Unlink,
    id: "unmatched-channel-skus",
    label: messages.signals.unmatchedChannelSkus.label,
    permission: ACTION_SIGNAL_PERMISSIONS.supplyChainMappings,
    route: "/supply-chain/item-mappings?tab=unmatched",
  }),
  Object.freeze({
    fetch: async () =>
      getPagedCount(
        await bomService.getIssues({
          PageNumber: 1,
          PageSize: 1,
        }),
      ),
    group: "blocking",
    hint: messages.signals.productsMissingBom.hint,
    icon: PackageX,
    id: "products-missing-bom",
    label: messages.signals.productsMissingBom.label,
    permission: ACTION_SIGNAL_PERMISSIONS.procurementBom,
    route: "/procurement/setup?tab=bom",
  }),
  Object.freeze({
    fetch: async () =>
      getPagedCount(
        await procurementSettingService.getMissing({
          PageNumber: 1,
          PageSize: 1,
        }),
      ),
    group: "blocking",
    hint: messages.signals.materialsMissingSettings.hint,
    icon: SlidersHorizontal,
    id: "materials-missing-settings",
    label: messages.signals.materialsMissingSettings.label,
    permission: ACTION_SIGNAL_PERMISSIONS.procurementSettings,
    route: "/procurement/setup?tab=settings",
  }),
  Object.freeze({
    fetch: getDispatchPackagingCount,
    group: "blocking",
    hint: messages.signals.dispatchMissingPackaging.hint,
    icon: PackageOpen,
    id: "dispatch-missing-packaging",
    label: messages.signals.dispatchMissingPackaging.label,
    permission: ACTION_SIGNAL_PERMISSIONS.dispatchSettings,
    route: "/dispatch/settings",
  }),
  Object.freeze({
    // CONFIRM: PlanningRunStatus.Draft = 1 was verified against the
    // 2026-07-29 live response; status 2 was shown as Finalized.
    fetch: async () =>
      getPagedCount(
        await planningService.listRuns({
          PageNumber: 1,
          PageSize: 1,
          Status: PlanningRunStatus.Draft,
        }),
      ),
    group: "waiting",
    hint: messages.signals.draftPlansNotFinalized.hint,
    icon: Timer,
    id: "draft-plans-not-finalized",
    label: messages.signals.draftPlansNotFinalized.label,
    permission: ACTION_SIGNAL_PERMISSIONS.procurementPlanningHistory,
    route: "/procurement/planning-history",
  }),
  Object.freeze({
    fetch: async () => {
      const response = await dashboardService.getAlerts({ PreviewLimit: 1 });

      return toCount(response?.data?.inventory?.count ?? 0);
    },
    group: "watch",
    hint: messages.signals.itemsBelowMinimumStock.hint,
    icon: Boxes,
    id: "items-below-minimum-stock",
    label: messages.signals.itemsBelowMinimumStock.label,
    permission: ACTION_SIGNAL_PERMISSIONS.inventoryItems,
    route: "/inventory/items",
  }),
]);

export const omittedActionSignals = Object.freeze([
  Object.freeze({
    id: "dispatch-runs-awaiting-finalize",
    // CONFIRM: Calculated and Allocated values are inferred in the frontend only.
    reason: "Dispatch run status values are not authoritatively mapped.",
  }),
  Object.freeze({
    id: "import-batches-uncommitted",
    // CONFIRM: Live Swagger exposes Supply Chain Import Status as a bare integer,
    // while the current UI sends text labels.
    reason: "Validated import status is not authoritatively mapped.",
  }),
  Object.freeze({
    id: "items-not-classified",
    // CONFIRM: GET /api/items has no documented null-classification filter.
    reason: "The Items API cannot express a null classification filter.",
  }),
]);

export const getPermittedActionSignals = (signals, permissions) =>
  signals.filter(
    (signal) =>
      Boolean(signal?.permission?.key) &&
      Boolean(permissions[signal.permission.key]),
  );

export const fetchActionSignals = async (signals) => {
  const settled = await Promise.allSettled(
    signals.map((signal) => signal.fetch()),
  );

  return signals.map((signal, index) => {
    const result = settled[index];

    return result.status === "fulfilled"
      ? {
          count: toCount(result.value),
          id: signal.id,
          status: "success",
        }
      : {
          error: result.reason,
          id: signal.id,
          status: "error",
        };
  });
};
