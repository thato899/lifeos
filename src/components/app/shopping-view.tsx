"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addShoppingItemAction,
  createShoppingListAction,
  removeShoppingItemAction,
  toggleShoppingItemAction,
} from "@/lib/actions/shopping";

interface ItemRow {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  completed: boolean;
}
interface ListRow {
  id: string;
  name: string;
  items: ItemRow[];
}

export function ShoppingView({
  lists,
  openCreateOnLoad,
}: {
  lists: ListRow[];
  openCreateOnLoad?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(openCreateOnLoad));
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Shopping</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" />
              New list
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form
              action={(formData) =>
                startTransition(async () => {
                  const result = await createShoppingListAction(formData);
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("List created.");
                  setOpen(false);
                })
              }
              className="flex flex-col gap-4"
            >
              <DialogHeader>
                <DialogTitle>New shopping list</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="list-name">Name</Label>
                <Input
                  id="list-name"
                  name="name"
                  required
                  autoFocus
                  placeholder="e.g. Groceries"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 && (
        <p className="text-muted-foreground text-sm">No shopping lists yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map((list) => (
          <Card key={list.id}>
            <CardHeader>
              <CardTitle>{list.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                {list.items.length === 0 && (
                  <p className="text-muted-foreground text-sm">No items yet.</p>
                )}
                {list.items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={(checked) =>
                        startTransition(async () => {
                          const result = await toggleShoppingItemAction(
                            list.id,
                            item.id,
                            Boolean(checked),
                          );
                          if (!result.success)
                            toast.error(result.error.message);
                        })
                      }
                    />
                    <span
                      className={
                        item.completed
                          ? "text-muted-foreground flex-1 line-through"
                          : "flex-1"
                      }
                    >
                      {item.name}
                      {item.quantity ? ` (${item.quantity})` : ""}
                    </span>
                    <button
                      className="text-muted-foreground opacity-0 group-hover:opacity-100"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await removeShoppingItemAction(
                            list.id,
                            item.id,
                          );
                          if (!result.success)
                            toast.error(result.error.message);
                        })
                      }
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <form
                action={(formData) =>
                  startTransition(async () => {
                    formData.set("listId", list.id);
                    const result = await addShoppingItemAction(formData);
                    if (!result.success) toast.error(result.error.message);
                  })
                }
                className="flex gap-2"
              >
                <Input
                  name="item"
                  placeholder="Add an item…"
                  required
                  className="h-8"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                >
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
