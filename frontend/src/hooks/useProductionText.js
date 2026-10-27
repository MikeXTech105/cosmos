import english from "../i18n/locales/en/production.json";
import hinglish from "../i18n/locales/hi-en/production.json";

export default function useProductionText(messages = {}) {
  const locale = globalThis.localStorage?.getItem("cosmos.language") || "en";
  const dictionary = { ...(locale === "hi-en" ? hinglish : english), ...messages.en, ...messages[locale] };
  return (key, options = {}) => {
    const text = dictionary[key] || english[key] || options.defaultValue || key;
    return text.replace(/\{\{(\w+)\}\}/g, (_, name) => options[name] ?? "");
  };
}
