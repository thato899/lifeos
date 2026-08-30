import { requireUserId } from "@/lib/auth-scope";
import { listShoppingLists } from "@/services/shopping.service";
import { ShoppingView } from "@/components/app/shopping-view";

export default async function ShoppingPage({
  searchParams,
}: PageProps<"/app/shopping">) {
  const userId = await requireUserId();
  const lists = await listShoppingLists(userId);
  const params = await searchParams;

  return (
    <ShoppingView
      lists={lists.map((l) => ({
        id: l.id,
        name: l.name,
        items: l.items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          category: i.category,
          completed: i.completed,
        })),
      }))}
      openCreateOnLoad={params.new === "1"}
    />
  );
}
