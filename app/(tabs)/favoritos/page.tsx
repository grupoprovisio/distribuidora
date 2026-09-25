import { AppHeader } from "@/components/app-header";
import { FavoritesView } from "@/components/favorites-view";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Favoritos · Distribuidora" };

export default function FavoritosPage() {
  return (
    <>
      <AppHeader theme="plum" title="Favoritos" backHref="/conta" />
      <main className={`${WRAP} pt-2`}>
        <FavoritesView />
      </main>
    </>
  );
}
