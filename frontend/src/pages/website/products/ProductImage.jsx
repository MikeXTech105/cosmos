import { ImageOff, Package } from "lucide-react";
import { useState } from "react";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

export default function ProductImage({ url, name }) {
  const source = resolveMediaUrl(url);
  const [failedSource, setFailedSource] = useState("");
  if (!source) return <span aria-label="No product image" className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100"><Package className="h-4 w-4 text-slate-400" /></span>;
  if (source === failedSource) return <a href={source} target="_blank" rel="noreferrer" aria-label={`Image unavailable for ${name}. Open image URL`} title="The saved image could not be loaded from the server" className="grid h-12 w-12 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700"><ImageOff className="h-5 w-5" /></a>;
  return <img className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain" src={source} alt={name || "Product"} loading="lazy" onError={() => setFailedSource(source)} />;
}
