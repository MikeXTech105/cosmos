import english from "./orderMessages.en.json";
import hinglish from "./orderMessages.hi-en.json";

// Follow the existing application language preference; preserve server evidence.
export const orderText = (key, params = {}) => {
  if (typeof key !== "string") return key;
  const dictionary = globalThis.localStorage?.getItem("cosmos.language") === "hi-en" ? hinglish : english;
  return (dictionary[key] ?? english[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) => params[name] ?? "");
};
