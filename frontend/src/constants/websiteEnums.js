// CONFIRM: Swagger publishes only numeric enum values. The deployment must confirm
// these numeric-to-name mappings before content publishing is enabled in production.
export const WEBSITE_PUBLISH_STATUS = Object.freeze({
  Draft: 0,
  Published: 1,
  Archived: 2,
});

export const WEBSITE_PUBLISH_STATUS_NAMES = Object.freeze([
  "Draft",
  "Published",
  "Archived",
]);

// CONFIRM: The fourth resolution value is inferred as None from the documented
// Refund/Replacement/Repair workflow and the four-value Swagger enum.
export const WARRANTY_RESOLUTION_TYPE = Object.freeze({
  None: 0,
  Refund: 1,
  Replacement: 2,
  Repair: 3,
});

export const WARRANTY_RESOLUTION_NAMES = Object.freeze([
  "None",
  "Refund",
  "Replacement",
  "Repair",
]);

// CONFIRM: Swagger exposes a single placement value (0); the module contract names it TopBar.
export const ANNOUNCEMENT_PLACEMENT = Object.freeze({
  TopBar: 0,
});

export const ANNOUNCEMENT_PLACEMENT_NAMES = Object.freeze(["TopBar"]);

// CONFIRM: Warranty status is absent from Swagger. These exact strings come from
// the integration contract and still require a live authenticated response check.
export const WARRANTY_STATUS = Object.freeze({
  Submitted: "Submitted",
  UnderReview: "UnderReview",
  NeedMoreInformation: "NeedMoreInformation",
  Approved: "Approved",
  Rejected: "Rejected",
  Completed: "Completed",
});

export const WARRANTY_STATUS_NAMES = Object.freeze(Object.values(WARRANTY_STATUS));

export const DEFAULT_WEBSITE_PAGE_SIZE = 25;
export const MAX_WEBSITE_PAGE_SIZE = 200;
