import { AppHeader } from "@/components/app-header";
import { PurchaseDetail } from "@/components/purchases-view";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Compra · Atacadão Best Price" };

export default async function CompraPage(props: PageProps<"/conta/compras/[id]">) {
  const { id } = await props.params;

  return (
    <>
      <AppHeader theme="forest" title="Compra salva" backHref="/conta/compras" />
      <main className={`${WRAP} pt-2`}>
        <div className="mx-auto max-w-2xl">
          <PurchaseDetail id={id} />
        </div>
      </main>
    </>
  );
}
