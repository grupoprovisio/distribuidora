import { AppHeader } from "@/components/app-header";
import { PurchaseList } from "@/components/purchases-view";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Minhas compras · Atacadão Best Price" };

export default function ComprasPage() {
  return (
    <>
      <AppHeader theme="forest" title="Minhas compras" backHref="/conta" />
      <main className={`${WRAP} pt-2`}>
        <div className="mx-auto max-w-2xl">
          <PurchaseList />
        </div>
      </main>
    </>
  );
}
