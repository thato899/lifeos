import { z } from "zod";

export const createShoppingListSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type CreateShoppingListInput = z.infer<typeof createShoppingListSchema>;

export const addShoppingItemSchema = z.object({
  listId: z.string().trim().min(1),
  item: z.string().trim().min(1).max(200),
  quantity: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type AddShoppingItemInput = z.infer<typeof addShoppingItemSchema>;

export const removeShoppingItemSchema = z.object({
  listId: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
});
export type RemoveShoppingItemInput = z.infer<typeof removeShoppingItemSchema>;

export const updateShoppingItemSchema = z.object({
  listId: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  quantity: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  completed: z.boolean().optional(),
});
export type UpdateShoppingItemInput = z.infer<typeof updateShoppingItemSchema>;

export const getShoppingListSchema = z.object({
  listId: z.string().trim().min(1).optional(),
});
export type GetShoppingListInput = z.infer<typeof getShoppingListSchema>;
