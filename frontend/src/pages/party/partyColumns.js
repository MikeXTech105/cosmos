export const PARTY_QUERY_PARAMS = [
  "Search",
  "PageNumber",
  "PageSize",
  "SortBy",
  "SortDirection",
  "IsActive",
];

export const PARTY_COMMAND_FIELDS = [
  { name: "partyCode", type: "string", nullable: true, section: "basic" },
  { name: "partyName", type: "string", nullable: true, section: "basic" },
  { name: "mobileNo", type: "string", nullable: true, section: "basic" },
  { name: "email", type: "string", nullable: true, section: "basic" },
  { name: "legalName", type: "string", nullable: true, section: "basic" },
  { name: "tradeName", type: "string", nullable: true, section: "basic" },
  { name: "gstTreatment", type: "integer", section: "gst" },
  { name: "gstin", type: "string", nullable: true, section: "gst" },
  {
    name: "billingAddressLine1",
    type: "string",
    nullable: true,
    section: "address",
  },
  {
    name: "billingAddressLine2",
    type: "string",
    nullable: true,
    section: "address",
  },
  { name: "billingCity", type: "string", nullable: true, section: "address" },
  { name: "billingState", type: "string", nullable: true, section: "address" },
  {
    name: "billingCountry",
    type: "string",
    nullable: true,
    section: "address",
  },
  {
    name: "billingPincode",
    type: "string",
    nullable: true,
    section: "address",
  },
  {
    name: "shippingAddressLine1",
    type: "string",
    nullable: true,
    section: "address",
  },
  {
    name: "shippingAddressLine2",
    type: "string",
    nullable: true,
    section: "address",
  },
  { name: "shippingCity", type: "string", nullable: true, section: "address" },
  {
    name: "shippingState",
    type: "string",
    nullable: true,
    section: "address",
  },
  {
    name: "shippingCountry",
    type: "string",
    nullable: true,
    section: "address",
  },
  {
    name: "shippingPincode",
    type: "string",
    nullable: true,
    section: "address",
  },
  { name: "openingBalance", type: "number", section: "credit" },
  { name: "openingBalanceType", type: "integer", section: "credit" },
  { name: "creditLimit", type: "number", section: "credit" },
  { name: "creditPeriodDays", type: "integer", section: "credit" },
  { name: "isActive", type: "boolean", section: "additional" },
];

export const PARTY_FIELD_SECTIONS = [
  { id: "basic", title: "Basic Information" },
  { id: "gst", title: "GST & Tax" },
  { id: "address", title: "Address" },
  { id: "credit", title: "Credit Settings" },
  { id: "additional", title: "Additional Details" },
];

export const PARTY_LIST_COLUMNS = [
  "id",
  "partyCode",
  "partyName",
  "mobileNo",
  "email",
  "gstTreatment",
  "gstin",
  "openingBalance",
  "openingBalanceType",
  "creditLimit",
  "creditPeriodDays",
  "isActive",
  "createdOn",
  "modifiedOn",
  "totalCount",
];

export const PARTY_DTO_FIELDS = [
  "id",
  ...PARTY_COMMAND_FIELDS.map((field) => field.name),
  "createdOn",
  "createdBy",
  "modifiedOn",
  "modifiedBy",
  "isDeleted",
  "deletedOn",
  "rowVersion",
];

export const PARTY_SETTINGS_COMMAND_FIELDS = [
  { name: "enablePartyGrouping", type: "boolean", section: "general" },
  { name: "enableShippingAddress", type: "boolean", section: "general" },
  { name: "printShippingAddress", type: "boolean", section: "general" },
  { name: "enablePartyStatus", type: "boolean", section: "general" },
  { name: "enablePaymentReminder", type: "boolean", section: "reminders" },
  { name: "reminderDays", type: "integer", section: "reminders" },
  {
    name: "reminderMessage",
    type: "string",
    nullable: true,
    section: "reminders",
  },
  { name: "enableLoyaltyPoints", type: "boolean", section: "loyalty" },
  {
    name: "additionalField1Name",
    type: "string",
    nullable: true,
    section: "additional1",
  },
  { name: "additionalField1Enabled", type: "boolean", section: "additional1" },
  {
    name: "additionalField1ShowInPrint",
    type: "boolean",
    section: "additional1",
  },
  {
    name: "additionalField2Name",
    type: "string",
    nullable: true,
    section: "additional2",
  },
  { name: "additionalField2Enabled", type: "boolean", section: "additional2" },
  {
    name: "additionalField2ShowInPrint",
    type: "boolean",
    section: "additional2",
  },
  {
    name: "additionalField3Name",
    type: "string",
    nullable: true,
    section: "additional3",
  },
  { name: "additionalField3Enabled", type: "boolean", section: "additional3" },
  {
    name: "additionalField3ShowInPrint",
    type: "boolean",
    section: "additional3",
  },
  {
    name: "additionalField4Name",
    type: "string",
    nullable: true,
    section: "additional4",
  },
  { name: "additionalField4Enabled", type: "boolean", section: "additional4" },
  {
    name: "additionalField4ShowInPrint",
    type: "boolean",
    section: "additional4",
  },
  { name: "additionalField4Type", type: "integer", section: "additional4" },
];

export const PARTY_SETTINGS_SECTIONS = [
  { id: "general", title: "General" },
  { id: "reminders", title: "Payment Reminder" },
  { id: "loyalty", title: "Loyalty" },
  { id: "additional1", title: "Additional Field 1" },
  { id: "additional2", title: "Additional Field 2" },
  { id: "additional3", title: "Additional Field 3" },
  { id: "additional4", title: "Additional Field 4" },
];

export const PARTY_SETTINGS_DTO_FIELDS = [
  "id",
  ...PARTY_SETTINGS_COMMAND_FIELDS.map((field) => field.name),
  "createdOn",
  "modifiedOn",
];
