const guards = new Map();
let bypassDepth = 0;

export const registerDirtyWork = (key, message) => {
  guards.set(key, message);
  return () => guards.delete(key);
};
export const hasDirtyWork = () => bypassDepth === 0 && guards.size > 0;
export const dirtyWorkMessage = () => [...guards.values()][0] || "You have unsaved changes. Leave this page and keep the recoverable draft?";
export const withoutDirtyPrompt = (callback) => {
  bypassDepth += 1;
  try { return callback?.(); } finally { bypassDepth -= 1; }
};
