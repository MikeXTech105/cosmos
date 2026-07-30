import {
  Children,
  cloneElement,
  isValidElement,
} from "react";

import { enhanceTableHeaders } from "../../utils/tableAccessibility";
import { buildMobileCards } from "./mobileTableCards";

const getElementChildren = (element) => {
  return isValidElement(element) ? Children.toArray(element.props.children) : [];
};

const collectRows = (elements) => {
  return elements.flatMap((element) => {
    if (!isValidElement(element)) {
      return [];
    }

    if (element.type === "tr") {
      return [element];
    }

    return collectRows(getElementChildren(element));
  });
};

const ResponsiveTableRegion = ({
  children,
  className = "",
  mobileConfig,
  tableLabel = "Records",
}) => {
  const table = Children.toArray(children).find(isValidElement);
  const tableSections = getElementChildren(table);
  const tableHead = tableSections.find((element) => element.type === "thead");
  const tableBody = tableSections.find((element) => element.type === "tbody");
  const headRow = getElementChildren(tableHead).find(
    (element) => element.type === "tr",
  );
  const headings = getElementChildren(headRow);
  const rows = collectRows(getElementChildren(tableBody));
  const mobileCards = buildMobileCards({
    children: rows,
    config: mobileConfig,
    head: headings,
  });
  const accessibleTable = cloneElement(table, {
    "aria-label": table.props["aria-label"] ?? tableLabel,
    children: enhanceTableHeaders(table.props.children),
  });

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {rows.length} {rows.length === 1 ? "result" : "results"}
      </p>
      <div className="grid gap-3 md:hidden">{mobileCards}</div>
      <div
        role="region"
        aria-label={`${tableLabel} table view`}
        tabIndex={0}
        className={`hidden overflow-x-auto md:block ${className}`}
      >
        {accessibleTable}
      </div>
    </>
  );
};

export default ResponsiveTableRegion;
