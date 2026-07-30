import { Children, Fragment, isValidElement } from "react";

import MobileRecordCard from "./MobileRecordCard";

const getElementContent = (element) => {
  return isValidElement(element) ? element.props.children : element;
};

const getColumnLabel = (heading, index) => {
  const ariaLabel = isValidElement(heading)
    ? heading.props["aria-label"]
    : undefined;
  const value = getElementContent(heading);

  if (ariaLabel === "Row number") {
    return "#";
  }

  if (ariaLabel) {
    return ariaLabel;
  }

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : `Field ${index + 1}`;
};

const flattenFragments = (nodes) => {
  return Children.toArray(nodes).flatMap((node) => {
    if (isValidElement(node) && node.type === Fragment) {
      return flattenFragments(node.props.children);
    }

    return [node];
  });
};

const getConfiguredEntry = (entries, selector) => {
  if (typeof selector === "number") {
    return entries[selector];
  }

  if (typeof selector === "string" && selector !== "generated") {
    return entries.find(
      (entry) => entry.label.trim().toLowerCase() === selector.toLowerCase(),
    );
  }

  return undefined;
};

export const buildMobileCards = ({ children, config, head }) => {
  const headings = flattenFragments(head).map(getColumnLabel);

  return flattenFragments(children)
    .filter(isValidElement)
    .map((row, rowIndex) => {
      const cells = Children.toArray(row.props.children);
      const entries = cells.map((cell, index) => ({
        content: getElementContent(cell),
        index,
        label: headings[index] ?? `Field ${index + 1}`,
      }));
      const serialEntry = config
        ? getConfiguredEntry(entries, config.serial)
        : entries.find((entry) => entry.label.trim() === "#");
      const actionEntry = config
        ? getConfiguredEntry(entries, config.actions)
        : entries.find((entry) => /actions?/i.test(entry.label));
      const statusEntry = config
        ? getConfiguredEntry(entries, config.status)
        : entries.find((entry) => /status|state/i.test(entry.label));
      const subtitleEntry = config
        ? getConfiguredEntry(entries, config.subtitle)
        : undefined;
      const titleEntry =
        getConfiguredEntry(entries, config?.title) ??
        entries.find(
          (entry) =>
            entry !== serialEntry &&
            entry !== actionEntry &&
            entry !== statusEntry,
        ) ??
        entries[0];
      const configuredFields = config?.fields
        ?.map((selector) => getConfiguredEntry(entries, selector))
        .filter(Boolean);
      const fields = (
        configuredFields ??
        entries
          .filter(
            (entry) =>
              entry !== serialEntry &&
              entry !== titleEntry &&
              entry !== subtitleEntry &&
              entry !== actionEntry &&
              entry !== statusEntry,
          )
          .slice(0, 4)
      ).map((entry) => ({
          key: `${entry.label}-${entry.index}`,
          label: entry.label,
          value: entry.content,
        }));

      return (
        <MobileRecordCard
          key={row.key ?? rowIndex}
          serial={
            config?.serial === "generated"
              ? rowIndex + 1
              : serialEntry?.content
          }
          title={titleEntry?.content}
          subtitle={subtitleEntry?.content}
          status={statusEntry?.content}
          fields={fields}
          actions={actionEntry?.content}
        />
      );
    });
};
