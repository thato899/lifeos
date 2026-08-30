import { db } from "@/lib/db";
import { logActivity, type Actor } from "@/lib/activity/log";
import { AppError } from "@/lib/errors/app-error";
import type {
  AddShoppingItemInput,
  CreateShoppingListInput,
  RemoveShoppingItemInput,
  UpdateShoppingItemInput,
} from "@/lib/validation/shopping";

const listInclude = { items: { orderBy: { createdAt: "asc" } as const } };

async function findOwnedList(userId: string, listId: string) {
  const list = await db.shoppingList.findFirst({
    where: { id: listId, userId },
    include: listInclude,
  });
  if (!list) throw AppError.notFound("shopping list", listId);
  return list;
}

export async function listShoppingLists(userId: string) {
  return db.shoppingList.findMany({
    where: { userId },
    include: listInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** listId omitted returns the user's most recently created list, for convenience. */
export async function getShoppingList(userId: string, listId?: string) {
  if (listId) return findOwnedList(userId, listId);

  const mostRecent = await db.shoppingList.findFirst({
    where: { userId },
    include: listInclude,
    orderBy: { createdAt: "desc" },
  });
  if (!mostRecent)
    throw new AppError(
      "NO_SHOPPING_LISTS",
      "You don't have any shopping lists yet.",
    );
  return mostRecent;
}

export async function createShoppingList(
  userId: string,
  input: CreateShoppingListInput,
  actor: Actor,
) {
  const list = await db.shoppingList.create({
    data: { userId, name: input.name },
    include: listInclude,
  });

  await logActivity({
    userId,
    type: "SHOPPING_LIST_CREATED",
    actor,
    summary: `Created shopping list "${list.name}"`,
    metadata: { listId: list.id },
  });

  return list;
}

export async function addShoppingItem(
  userId: string,
  input: AddShoppingItemInput,
  actor: Actor,
) {
  await findOwnedList(userId, input.listId);

  const item = await db.shoppingItem.create({
    data: {
      listId: input.listId,
      name: input.item,
      quantity: input.quantity,
      category: input.category,
      notes: input.notes,
    },
  });

  await logActivity({
    userId,
    type: "SHOPPING_ITEM_ADDED",
    actor,
    summary: `Added "${item.name}" to the shopping list`,
    metadata: { listId: input.listId, itemId: item.id },
  });

  return item;
}

export async function updateShoppingItem(
  userId: string,
  input: UpdateShoppingItemInput,
  actor: Actor,
) {
  const list = await findOwnedList(userId, input.listId);
  const item = list.items.find((i) => i.id === input.itemId);
  if (!item) throw AppError.notFound("shopping item", input.itemId);

  const { listId, itemId, ...fields } = input;

  const updated = await db.shoppingItem.update({
    where: { id: itemId },
    data: fields,
  });

  await logActivity({
    userId,
    type: "SHOPPING_ITEM_UPDATED",
    actor,
    summary: `Updated "${updated.name}" on the shopping list`,
    metadata: { listId, itemId },
  });

  return updated;
}

export async function removeShoppingItem(
  userId: string,
  input: RemoveShoppingItemInput,
  actor: Actor,
) {
  const list = await findOwnedList(userId, input.listId);
  const item = list.items.find((i) => i.id === input.itemId);
  if (!item) throw AppError.notFound("shopping item", input.itemId);

  await db.shoppingItem.delete({ where: { id: input.itemId } });

  await logActivity({
    userId,
    type: "SHOPPING_ITEM_REMOVED",
    actor,
    summary: `Removed "${item.name}" from the shopping list`,
    metadata: { listId: input.listId, itemId: input.itemId },
  });

  return { id: input.itemId, name: item.name };
}
