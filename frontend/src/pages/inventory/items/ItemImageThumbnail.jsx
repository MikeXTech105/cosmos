import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";

const ItemImageThumbnail = ({
  alt = "",
  className = "h-10 w-10 rounded-lg",
  iconClassName = "h-4 w-4",
  src,
}) => {
  const [failedSrc, setFailedSrc] = useState("");
  const hasError = Boolean(src) && failedSrc === src;

  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 text-slate-400",
        className,
      ].join(" ")}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon className={iconClassName} />
      )}
    </div>
  );
};

export default ItemImageThumbnail;
