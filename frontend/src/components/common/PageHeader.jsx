import { Orbit } from "lucide-react";
import { Children, Fragment, isValidElement } from "react";

const PageHeader = ({
  actions,
  align = "start",
  badge,
  description,
  icon: Icon,
  title,
}) => {
  const badgeChildren = isValidElement(badge) && badge.type === Fragment
    ? Children.toArray(badge.props.children)
    : Children.toArray(badge);
  const badgeIconIndex = badgeChildren.findIndex(
    (child) => isValidElement(child) && typeof child.type !== "string",
  );
  const ResolvedIcon = Icon ?? badgeChildren[badgeIconIndex]?.type ?? Orbit;
  const badgeContent = badgeIconIndex >= 0
    ? badgeChildren.filter((_, index) => index !== badgeIconIndex)
    : badge;
  const hasBadgeContent = Children.count(badgeContent) > 0;

  return (
    <div className={`flex flex-col gap-5 xl:flex-row xl:justify-between ${
      align === "center" ? "xl:items-center" : "xl:items-start"
    }`}>
      <div className="flex min-w-0 items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand text-white shadow-lg shadow-brand/20">
          <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10" />
          <ResolvedIcon className="relative h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          {hasBadgeContent && (
            <div className="inline-flex max-w-full items-center gap-2 text-xs font-semibold text-brand [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0">
              {badgeContent}
            </div>
          )}
          <h1
            className={[
              "text-2xl font-semibold text-slate-900",
              hasBadgeContent ? "mt-1" : "",
            ].join(" ")}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center xl:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
