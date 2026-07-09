import { getApiErrorMessage } from "../../../utils/apiError";

export const PAGE_STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const PAGE_VIEW_OPTIONS = [
  { value: "table", label: "Grouped Table" },
  { value: "tree", label: "Tree View" },
];

export const PAGE_ICON_OPTIONS = [
  "layoutdashboard",
  "pages",
  "users",
  "roles",
  "permissions",
  "foldertree",
  "filetext",
  "settings",
  "products",
  "inventory",
  "sale",
  "purchase",
  "hr",
  "oee",
  "report",
  "activity",
  "building",
  "category",
  "clock",
  "cash",
];

const LIST_KEYS = ["items", "pages", "records", "results", "content"];

export const getPageErrorMessage = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

export const extractPageCollection = (payload, responseMeta) => {
  if (Array.isArray(payload)) {
    return { items: payload, meta: responseMeta ?? {} };
  }

  const listKey = LIST_KEYS.find((key) => Array.isArray(payload?.[key]));

  return {
    items: listKey ? payload[listKey] : [],
    meta: {
      ...(responseMeta ?? {}),
      ...(payload?.meta ?? {}),
      ...(payload?.pagination ?? {}),
      total:
        payload?.total ??
        payload?.totalCount ??
        payload?.totalElements ??
        responseMeta?.total ??
        responseMeta?.totalCount ??
        responseMeta?.totalElements,
    },
  };
};

export const extractSinglePage = (payload) => {
  return payload?.page ?? payload?.item ?? payload?.record ?? payload;
};

export const getPageId = (page) => {
  return page?.id ?? page?.pageId ?? page?.pageID ?? page?._id ?? page?.route;
};

export const normalizeParentId = (value) => {
  if (
    value === 0 ||
    value === "0" ||
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return value;
};

export const getParentId = (page) => {
  return normalizeParentId(
    page?.parentPageId ?? page?.parentId ?? page?.parent_id ?? page?.parent?.id,
  );
};

export const normalizeActiveState = (page) => {
  const rawValue =
    page?.isActive ?? page?.active ?? page?.enabled ?? page?.status;

  if (rawValue === undefined || rawValue === null) {
    return true;
  }

  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  if (typeof rawValue === "number") {
    return rawValue === 1;
  }

  if (typeof rawValue === "string") {
    return ["active", "enabled", "true", "1"].includes(
      rawValue.trim().toLowerCase(),
    );
  }

  return Boolean(rawValue);
};

export const flattenPageRecords = (pages = [], inheritedParentId = null) => {
  return pages.flatMap((page) => {
    const pageId = getPageId(page);
    const parentPageId = getParentId(page) ?? inheritedParentId;
    const normalizedPage = {
      ...page,
      parentPageId,
    };
    const children = Array.isArray(page.children) ? page.children : [];

    return [normalizedPage, ...flattenPageRecords(children, pageId)];
  });
};

export const normalizePage = (page) => {
  if (!page) {
    return null;
  }

  const name = page.name ?? page.pageName ?? page.key ?? page.route;
  const displayName =
    page.displayName ?? page.label ?? page.title ?? page.pageName ?? name;
  const id = getPageId(page);

  if (!id || !name || !displayName) {
    return null;
  }

  return {
    displayName,
    icon: page.icon ?? page.iconName ?? page.moduleIcon ?? "pages",
    id,
    isActive: normalizeActiveState(page),
    name,
    parentPageId: getParentId(page),
    route: page.route ?? page.path ?? page.url ?? "",
    sortOrder: Number(
      page.sortOrder ??
        page.displayOrder ??
        page.sequence ??
        page.order ??
        page.position ??
        0,
    ),
  };
};

export const dedupePages = (pages) => {
  const pageMap = new Map();

  pages.filter(Boolean).forEach((page) => {
    pageMap.set(String(page.id), page);
  });

  return Array.from(pageMap.values());
};

export const normalizePageListPayload = (payload, meta) => {
  const collection = extractPageCollection(payload, meta);

  return dedupePages(
    flattenPageRecords(collection.items).map(normalizePage).filter(Boolean),
  );
};

const sortPages = (pages) => {
  return [...pages].sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    return first.displayName.localeCompare(second.displayName);
  });
};

const hasAncestor = (page, candidateAncestorId, byId) => {
  const seen = new Set();
  let parentId = page.parentPageId;

  while (parentId !== null && parentId !== undefined) {
    const key = String(parentId);

    if (seen.has(key)) {
      return false;
    }

    if (key === String(candidateAncestorId)) {
      return true;
    }

    seen.add(key);
    parentId = byId.get(key)?.parentPageId;
  }

  return false;
};

export const buildPageTree = (flatPages = []) => {
  const byId = new Map();
  const nodes = new Map();

  flatPages.forEach((page) => {
    const key = String(page.id);

    byId.set(key, page);
    nodes.set(key, {
      ...page,
      children: [],
      depth: 0,
      isSynthetic: false,
    });
  });

  const roots = [];
  const orphans = [];

  nodes.forEach((node, key) => {
    const parentId = normalizeParentId(node.parentPageId);

    if (!parentId) {
      roots.push(node);
      return;
    }

    const parentKey = String(parentId);
    const parentNode = nodes.get(parentKey);
    const createsCycle = parentNode
      ? hasAncestor(byId.get(parentKey), key, byId)
      : false;

    if (!parentNode || createsCycle || parentKey === key) {
      orphans.push(node);
      return;
    }

    parentNode.children.push(node);
  });

  const assignDepth = (items, depth = 0) => {
    sortPages(items).forEach((node) => {
      node.depth = depth;
      assignDepth(node.children, depth + 1);
    });

    return sortPages(items);
  };

  const sortedRoots = assignDepth(roots);
  const sortedOrphans = assignDepth(orphans, 1);

  if (sortedOrphans.length > 0) {
    sortedRoots.push({
      children: sortedOrphans,
      depth: 0,
      displayName: "Ungrouped",
      icon: "foldertree",
      id: "__ungrouped__",
      isActive: true,
      isSynthetic: true,
      name: "ungrouped",
      parentPageId: null,
      route: "",
      sortOrder: Number.MAX_SAFE_INTEGER,
    });
  }

  return sortedRoots;
};

export const collectTreeIds = (nodes = []) => {
  return nodes.flatMap((node) => [
    String(node.id),
    ...collectTreeIds(node.children ?? []),
  ]);
};

export const getDescendantIds = (pages, pageId) => {
  const tree = buildPageTree(pages);
  const targetId = String(pageId);
  const descendants = new Set();

  const visit = (nodes, insideTarget = false) => {
    nodes.forEach((node) => {
      const isTarget = String(node.id) === targetId;
      const shouldCollect = insideTarget || isTarget;

      if (insideTarget) {
        descendants.add(String(node.id));
      }

      visit(node.children ?? [], shouldCollect);
    });
  };

  visit(tree);

  return descendants;
};

export const filterPages = (pages, filters) => {
  const query = filters.search.trim().toLowerCase();

  return pages.filter((page) => {
    const haystack = [page.name, page.displayName, page.route, page.icon]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const statusMatches =
      filters.status === "all" ||
      (filters.status === "active" ? page.isActive : !page.isActive);
    const parentMatches =
      filters.parentPageId === "all" ||
      (filters.parentPageId === "root"
        ? !normalizeParentId(page.parentPageId)
        : String(page.parentPageId) === String(filters.parentPageId));

    return (!query || haystack.includes(query)) && statusMatches && parentMatches;
  });
};

export const getTopLevelCount = (pages) => {
  return pages.filter((page) => !normalizeParentId(page.parentPageId)).length;
};

export const normalizePageNumberInput = (rawValue) => {
  const value = String(rawValue ?? "").replace(/[^\d]/g, "");

  if (!value) {
    return "";
  }

  return value.replace(/^0+(?=\d)/, "") || "0";
};

export const normalizePageNumberBlurValue = (value) => {
  const normalized = normalizePageNumberInput(value);

  return normalized || "0";
};

export const toCreatePagePayload = (values) => ({
  name: values.name.trim(),
  displayName: values.displayName.trim(),
  route: values.route.trim(),
  icon: values.icon.trim(),
  parentPageId: values.parentPageId ? Number(values.parentPageId) : null,
  sortOrder: Number(values.sortOrder) || 0,
  isActive: Boolean(values.isActive),
});

export const toUpdatePagePayload = (values) => ({
  displayName: values.displayName.trim(),
  route: values.route.trim(),
  icon: values.icon.trim(),
  parentPageId: values.parentPageId ? Number(values.parentPageId) : null,
  sortOrder: Number(values.sortOrder) || 0,
  isActive: Boolean(values.isActive),
});
