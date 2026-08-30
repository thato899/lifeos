import {
  addShoppingItemSchema,
  createShoppingListSchema,
  removeShoppingItemSchema,
  updateShoppingItemSchema,
} from "@/lib/validation/shopping";
import {
  addShoppingItem,
  createShoppingList,
  removeShoppingItem,
  updateShoppingItem,
} from "@/services/shopping.service";
import { defineTool } from "../types";

export const createShoppingListTool = defineTool({
  name: "create_shopping_list",
  title: "Create a shopping list",
  description:
    "Use this to start a new shopping/errands list, e.g. 'create a shopping list for Saturday'.",
  inputSchema: createShoppingListSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Created shopping list "${input.name}"`,
  execute: (userId, input, actor) => createShoppingList(userId, input, actor),
});

export const addShoppingItemTool = defineTool({
  name: "add_shopping_item",
  title: "Add a shopping list item",
  description:
    "Use this to add one item (with optional quantity, category, notes) to an existing shopping list.",
  inputSchema: addShoppingItemSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) =>
    `Added "${input.item}" to shopping list ${input.listId}`,
  execute: (userId, input, actor) => addShoppingItem(userId, input, actor),
});

export const updateShoppingItemTool = defineTool({
  name: "update_shopping_item",
  title: "Update a shopping list item",
  description:
    "Use this to change an item's name, quantity, category, notes, or completed state — e.g. checking something off, or correcting a quantity like 'make it two dozen eggs'.",
  inputSchema: updateShoppingItemSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) =>
    `Updated item ${input.itemId} on shopping list ${input.listId}`,
  execute: (userId, input, actor) => updateShoppingItem(userId, input, actor),
});

export const removeShoppingItemTool = defineTool({
  name: "remove_shopping_item",
  title: "Remove a shopping list item",
  description:
    "Use this to remove one item from a shopping list, e.g. 'remove bread from my list'.",
  inputSchema: removeShoppingItemSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) =>
    `Removed item ${input.itemId} from shopping list ${input.listId}`,
  execute: (userId, input, actor) => removeShoppingItem(userId, input, actor),
});

export const shoppingTools = [
  createShoppingListTool,
  addShoppingItemTool,
  updateShoppingItemTool,
  removeShoppingItemTool,
];
