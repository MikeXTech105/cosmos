export function setupReturnLink(path, returnTo) { const parts = path.split("?"); const query = new URLSearchParams(parts[1]); query.set("returnTo", returnTo); return `${parts[0]}?${query}`; }
