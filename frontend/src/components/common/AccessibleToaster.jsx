import { useEffect, useState } from "react";
import { Toaster } from "sonner";

const getToastMessage = (toastElement) => {
  return (
    toastElement.querySelector("[data-content]")?.textContent?.trim() ??
    toastElement.textContent?.trim() ??
    ""
  );
};

const AccessibleToaster = (props) => {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  useEffect(() => {
    const announcedToasts = new WeakSet();

    const announceToast = (toastElement) => {
      if (
        !toastElement ||
        announcedToasts.has(toastElement) ||
        toastElement.dataset.removed === "true"
      ) {
        return;
      }

      const message = getToastMessage(toastElement);

      if (!message) {
        return;
      }

      announcedToasts.add(toastElement);
      const updateMessage =
        toastElement.dataset.type === "error"
          ? setAssertiveMessage
          : setPoliteMessage;

      updateMessage("");
      window.requestAnimationFrame(() => updateMessage(message));
    };

    const inspectNode = (node) => {
      if (!(node instanceof Element)) {
        return;
      }

      if (node.matches("[data-sonner-toaster]")) {
        node.parentElement?.setAttribute("aria-live", "off");
      }

      const toastElement = node.matches("[data-sonner-toast]")
        ? node
        : node.closest("[data-sonner-toast]");

      announceToast(toastElement);
      node
        .querySelectorAll("[data-sonner-toast]")
        .forEach((element) => announceToast(element));
    };

    document
      .querySelectorAll("[data-sonner-toaster]")
      .forEach((element) => inspectNode(element));

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        inspectNode(mutation.target);
        mutation.addedNodes.forEach(inspectNode);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <p
        className="sr-only"
        role="status"
        aria-atomic="true"
      >
        {politeMessage}
      </p>
      <p
        className="sr-only"
        role="alert"
        aria-atomic="true"
      >
        {assertiveMessage}
      </p>
      <Toaster {...props} />
    </>
  );
};

export default AccessibleToaster;
