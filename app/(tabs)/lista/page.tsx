import { AppHeader } from "@/components/app-header";
import { ListTabs } from "@/components/list-tabs";
import { ListView } from "@/components/list-view";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Pedido · Distribuidora" };

export default function ListaPage() {
  return (
    <>
      <AppHeader theme="forest" title="Pedido" />
      <main className={`${WRAP} pt-2`}>
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <ListTabs />
        </div>
        <ListView />
      </main>
    </>
  );
}
