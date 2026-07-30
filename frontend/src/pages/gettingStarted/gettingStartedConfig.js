import { categoryService } from "../../services/inventory/categoryService";
import { itemService } from "../../services/inventory/itemService";
import { unitService } from "../../services/inventory/unitService";
import { roleService } from "../../services/rbac/roleService";
import { userService } from "../../services/rbac/userService";
import { supplyChainChannelService } from "../../services/supplyChain/channelService";
import { supplyChainItemMappingService } from "../../services/supplyChain/itemMappingService";
import { partyService } from "../party/partyService";

const countParams = Object.freeze({
  PageNumber: 1,
  PageSize: 1,
});

const createPermission = (label, route) => ({
  action: "create",
  label,
  route,
});

export const GETTING_STARTED_STEPS = Object.freeze([
  {
    check: () => categoryService.getCategories(countParams),
    description: "Categories group items for reporting and procurement planning.",
    href: "/categories",
    id: "category",
    label: "Add your first category",
    permissions: [createPermission("Categories", "/categories")],
  },
  {
    check: () => unitService.getUnits(countParams),
    description: "Units keep stock, purchase, and sales quantities consistent.",
    href: "/units",
    id: "unit",
    label: "Add your first unit",
    permissions: [createPermission("Units", "/units")],
  },
  {
    check: () => itemService.getItems(countParams),
    description: "Items are the products and services used throughout COSMOS.",
    href: "/items",
    id: "item",
    label: "Add your first item",
    permissions: [createPermission("Items", "/items")],
  },
  {
    check: () => partyService.getParties(countParams),
    description: "Parties represent the customers and suppliers you trade with.",
    href: "/party",
    id: "party",
    label: "Add a party",
    permissions: [createPermission("Party Master", "/party")],
  },
  {
    check: () => roleService.getRoles(countParams),
    description: "Roles bundle the permissions your users need.",
    href: "/roles",
    id: "role",
    label: "Create a user role",
    permissions: [createPermission("Roles", "/roles")],
  },
  {
    check: () => userService.getUsers(countParams),
    description: "Invite a teammate and assign the right role.",
    href: "/users",
    id: "user",
    label: "Invite a user",
    permissions: [
      createPermission("Users", "/users"),
      { action: "assignRole", label: "Users", route: "/users" },
    ],
  },
  {
    check: () => supplyChainChannelService.list(countParams),
    description: "Channels identify where demand and stock originate.",
    href: "/supply-chain/channels",
    id: "channel",
    label: "Set up channels",
    permissions: [
      createPermission(
        "SupplyChain.Channels",
        "/supply-chain/channels",
      ),
    ],
  },
  {
    check: () => supplyChainItemMappingService.list(countParams),
    description: "Map external channel SKUs to inventory items.",
    href: "/supply-chain/item-mappings",
    id: "mapping",
    label: "Map channel SKUs",
    permissions: [
      createPermission(
        "SupplyChain.ItemMappings",
        "/supply-chain/item-mappings",
      ),
    ],
  },
]);

export const GETTING_STARTED_PERMISSION_TARGETS = GETTING_STARTED_STEPS.flatMap(
  (step) =>
    step.permissions.map((permission) => ({
      ...permission,
      action: "view",
    })),
);
