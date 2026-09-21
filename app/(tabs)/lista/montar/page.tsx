import { AppHeader } from "@/components/app-header";
import { BuilderView } from "@/components/builder-view";
import { ListTabs } from "@/components/list-tabs";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Montar lista · Atacadão Best Price" };

export default function MontarPage() {
  return (
    <>
      <AppHeader theme="forest" title="Montar lista" backHref="/lista" />
      <main className={`${WRAP} pt-2`}>
        <div className="mx-auto max-w-2xl">
          <ListTabs />
          <BuilderView />
        </div>
      </main>
    </>
  );
}
