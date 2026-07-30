export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const isAvailable = (element) => {
  return (
    element instanceof HTMLElement &&
    !element.closest("[aria-hidden='true'], [inert]") &&
    element.getAttribute("aria-disabled") !== "true"
  );
};

export const getFocusableElements = (node) => {
  return Array.from(node?.querySelectorAll(FOCUSABLE_SELECTOR) ?? []).filter(
    isAvailable,
  );
};

const isDestructive = (element) => {
  const accessibleText = [
    element?.getAttribute?.("aria-label"),
    element?.getAttribute?.("title"),
    element?.textContent,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    element?.dataset?.destructive === "true" ||
    /\b(delete|remove|reverse|revoke|discard)\b/i.test(accessibleText)
  );
};

export const focusFirstIn = (
  node,
  { avoidDestructive = false, fallback } = {},
) => {
  if (!node) {
    return null;
  }

  const invalidField = node.querySelector(
    "[aria-invalid='true']:not([disabled])",
  );
  const autofocusTarget = node.querySelector("[data-autofocus='true']");
  const firstFormControl = node.querySelector(
    [
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[role='combobox']:not([aria-disabled='true'])",
      "[contenteditable='true']",
    ].join(","),
  );
  const focusable = getFocusableElements(node);
  const firstControl =
    autofocusTarget ?? invalidField ?? firstFormControl ?? focusable[0];
  const heading = node.querySelector(
    "[role='heading'], h1, h2, h3, h4, h5, h6",
  );
  const target =
    avoidDestructive && isDestructive(firstControl)
      ? heading ?? fallback ?? node
      : firstControl ?? heading ?? fallback ?? node;

  if (target instanceof HTMLElement) {
    if (
      !target.matches(FOCUSABLE_SELECTOR) &&
      !target.hasAttribute("tabindex")
    ) {
      target.setAttribute("tabindex", "-1");
    }

    target.focus({ preventScroll: true });
    return target;
  }

  return null;
};

export const trapFocus = (node) => {
  if (!node) {
    return () => {};
  }

  const handleKeyDown = (event) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(node);

    if (focusable.length === 0) {
      event.preventDefault();
      focusFirstIn(node);
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);

    if (!node.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
};

export const restoreFocus = (previouslyFocused, fallbackCandidates = []) => {
  const candidates = [
    previouslyFocused,
    ...(Array.isArray(fallbackCandidates)
      ? fallbackCandidates
      : [fallbackCandidates]),
  ];

  for (const candidate of candidates) {
    if (
      candidate instanceof HTMLElement &&
      candidate.isConnected &&
      !candidate.closest("[aria-hidden='true'], [inert]") &&
      candidate.getAttribute("aria-disabled") !== "true" &&
      !candidate.hasAttribute("disabled")
    ) {
      candidate.focus({ preventScroll: true });
      return true;
    }
  }

  return false;
};

export const activateDialogFocus = (
  node,
  { avoidDestructive = true, closeOnEscape = true, onEscape } = {},
) => {
  if (!node) {
    return () => {};
  }

  const previouslyFocused = document.activeElement;
  const outsideFocusable = getFocusableElements(document.body).filter(
    (element) => !node.contains(element),
  );
  const previousIndex = outsideFocusable.indexOf(previouslyFocused);
  const fallbackCandidates =
    previousIndex >= 0
      ? [
          outsideFocusable[previousIndex + 1],
          outsideFocusable[previousIndex - 1],
        ]
      : [];
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const focusFrame = window.requestAnimationFrame(() => {
    focusFirstIn(node, { avoidDestructive });
  });
  const releaseFocusTrap = trapFocus(node);
  let knownInvalidFields = new Set(
    node.querySelectorAll("[aria-invalid='true']"),
  );
  let invalidFocusFrame = null;
  const invalidFieldObserver = new MutationObserver(() => {
    const invalidFields = Array.from(
      node.querySelectorAll("[aria-invalid='true']"),
    );
    const newInvalidField = invalidFields.find(
      (field) => !knownInvalidFields.has(field),
    );

    knownInvalidFields = new Set(invalidFields);
    if (newInvalidField) {
      window.cancelAnimationFrame(invalidFocusFrame);
      invalidFocusFrame = window.requestAnimationFrame(() => {
        node
          .querySelector("[aria-invalid='true']:not([disabled])")
          ?.focus({ preventScroll: false });
      });
    }
  });
  invalidFieldObserver.observe(node, {
    attributeFilter: ["aria-invalid"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && closeOnEscape && onEscape) {
      event.preventDefault();
      onEscape();
    }
  };
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    window.cancelAnimationFrame(focusFrame);
    window.cancelAnimationFrame(invalidFocusFrame);
    releaseFocusTrap();
    invalidFieldObserver.disconnect();
    document.removeEventListener("keydown", handleKeyDown);
    document.body.style.overflow = previousOverflow;
    restoreFocus(previouslyFocused, fallbackCandidates);
  };
};
