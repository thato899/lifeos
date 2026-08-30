"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import {
  addShoppingItemSchema,
  createShoppingListSchema,
} from "@/lib/validation/shopping";
import * as shoppingService from "@/services/shopping.service";

export async function createShoppingListAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const input = createShoppingListSchema.parse({
      name: formData.get("name"),
    });
    const list = await shoppingService.createShoppingList(
      userId,
      input,
      "human",
    );
    revalidatePath("/app");
    return toServiceResult(list);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function addShoppingItemAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const input = addShoppingItemSchema.parse({
      listId: formData.get("listId"),
      item: formData.get("item"),
      quantity: formData.get("quantity") || undefined,
      category: formData.get("category") || undefined,
    });
    const item = await shoppingService.addShoppingItem(userId, input, "human");
    revalidatePath("/app");
    return toServiceResult(item);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function toggleShoppingItemAction(
  listId: string,
  itemId: string,
  completed: boolean,
) {
  try {
    const userId = await requireUserId();
    const item = await shoppingService.updateShoppingItem(
      userId,
      { listId, itemId, completed },
      "human",
    );
    revalidatePath("/app");
    return toServiceResult(item);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function removeShoppingItemAction(listId: string, itemId: string) {
  try {
    const userId = await requireUserId();
    const result = await shoppingService.removeShoppingItem(
      userId,
      { listId, itemId },
      "human",
    );
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
