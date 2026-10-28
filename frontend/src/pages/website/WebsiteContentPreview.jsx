import { Fragment } from "react";
import { formatWebsiteMoney } from "./websiteFormat";

const safeHref = (value) => {
  if (!String(value || "").trim()) return null;
  try { const url = new URL(value, window.location.origin); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
};
const inline = (text) => String(text).split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((token, index) => {
  const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
  if (link) { const href = safeHref(link[2]); return href ? <a className="text-brand underline" href={href} key={index} target="_blank" rel="noopener noreferrer">{link[1]}</a> : <Fragment key={index}>{link[1]}</Fragment>; }
  if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
  if (token.startsWith("`") && token.endsWith("`")) return <code className="rounded bg-slate-100 px-1" key={index}>{token.slice(1, -1)}</code>;
  if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
  return <Fragment key={index}>{token}</Fragment>;
});

export const WebsiteArticlePreview = ({ title, excerpt, coverImageUrl, content }) => {
  const blocks = String(content || "").replace(/\r\n/g, "\n").split(/\n\s*\n/);
  return <article className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-8" aria-label="Article preview">
    {coverImageUrl && safeHref(coverImageUrl) && <img src={safeHref(coverImageUrl)} alt={title || "Article cover"} className="max-h-80 w-full rounded-xl object-cover" />}
    {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}{excerpt && <p className="text-lg text-slate-500">{excerpt}</p>}
    {blocks.map((block, index) => {
      if (/^```/.test(block)) return <pre className="overflow-x-auto rounded-xl bg-slate-50 p-4 text-sm" key={index}>{block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "")}</pre>;
      const heading = /^(#{1,6})\s+(.+)$/.exec(block);
      if (heading) return <h2 className="text-xl font-semibold text-slate-900" key={index}>{inline(heading[2])}</h2>;
      const lines = block.split("\n");
      if (lines.every((line) => /^[-*]\s+/.test(line))) return <ul className="list-disc space-y-2 pl-5 text-slate-700" key={index}>{lines.map((line, position) => <li key={position}>{inline(line.replace(/^[-*]\s+/, ""))}</li>)}</ul>;
      if (lines.every((line) => /^\d+\.\s+/.test(line))) return <ol className="list-decimal space-y-2 pl-5 text-slate-700" key={index}>{lines.map((line, position) => <li key={position}>{inline(line.replace(/^\d+\.\s+/, ""))}</li>)}</ol>;
      return <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700" key={index}>{inline(block)}</p>;
    })}
    {!content && <p className="text-sm text-slate-500">Nothing to preview yet.</p>}
  </article>;
};

export const WebsiteProductPreview = ({ product }) => <article className="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2" aria-label="Product preview">
  <div className="space-y-3">{(product.media || []).filter((item) => safeHref(item.publicUrl || item.url || "")).map((item, index) => <img key={index} className="max-h-80 w-full rounded-xl object-contain" src={safeHref(item.publicUrl || item.url)} alt={item.altText || product.name} />)}</div>
  <div className="space-y-4"><p className="text-sm font-semibold text-brand">{product.badge}</p><h2 className="text-2xl font-bold">{product.name || "Product name"}</h2><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{product.description}</p>{product.displayPrice !== "" && <p className="text-xl font-semibold">{formatWebsiteMoney(product.displayPrice, product.currencyCode)}</p>}<p className="text-sm">{product.availabilityText}</p><ul className="list-disc space-y-2 pl-5 text-sm">{product.benefits?.map((benefit, index) => <li key={index}>{benefit.benefitText}</li>)}</ul><dl className="text-sm">{[["Material", product.material], ["Quantity", product.quantityDisplay], ["Warranty", product.warrantyDisplay]].filter(([, value]) => value).map(([label, value]) => <div className="flex justify-between gap-3 border-t border-slate-100 py-2" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
</article>;

export const WebsiteAnnouncementPreview = ({ announcement }) => <aside aria-label="Announcement preview" className="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-slate-900 px-5 py-4 text-center text-sm text-white"><p>{announcement.message || "Your announcement message"}</p>{announcement.ctaLabel && safeHref(announcement.ctaUrl) && <a href={safeHref(announcement.ctaUrl)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{announcement.ctaLabel}</a>}</aside>;
