export const canEditDataBookEntry = (capabilities, entry) =>
  Boolean(capabilities?.canEdit && entry?.canEdit);

export const canDeleteDataBookEntry = (capabilities, entry) =>
  Boolean(capabilities?.canDelete && entry?.canDelete);
