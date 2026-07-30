import { Children, cloneElement, Fragment, isValidElement } from "react";

const SERIAL_HEADER_TEXT = "#";

const getTextContent = (nodes) => {
  return Children.toArray(nodes)
    .map((node) => {
      if (typeof node === "string" || typeof node === "number") {
        return String(node);
      }

      return isValidElement(node) ? getTextContent(node.props.children) : "";
    })
    .join("");
};

export const enhanceTableHeaders = (nodes) => {
  return Children.map(nodes, (node) => {
    if (!isValidElement(node)) {
      return node;
    }

    if (node.type === Fragment) {
      return cloneElement(node, {
        children: enhanceTableHeaders(node.props.children),
      });
    }

    if (node.type === "th") {
      const isSerial =
        getTextContent(node.props.children).trim() === SERIAL_HEADER_TEXT;

      return cloneElement(node, {
        scope: node.props.scope ?? "col",
        children: isSerial ? (
          <>
            <span className="sr-only">Row number</span>
            <span aria-hidden="true">#</span>
          </>
        ) : node.props.children,
      });
    }

    return node.props.children
      ? cloneElement(node, {
          children: enhanceTableHeaders(node.props.children),
        })
      : node;
  });
};
