import { AppHeader } from "@/components/app-header";
import { ListTabs } from "@/components/list-tabs";
import { SuggestView } from "@/components/suggest-view";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Sugestões de lista · Atacadão Best Price" };

export default async function SugestoesPage(props: PageProps<"/lista/sugestoes">) {
  const sp = await props.searchParams;
  const raw = Array.isArray(sp.modo) ? sp.modo[0] : sp.modo;
  const modo = raw && /^(casa|\d{1,6})$/.test(raw) ? raw : undefined;

  return (
    <>
      <AppHeader theme="forest" title="Sugestões de lista" backHref="/lista" />
      <main className={`${WRAP} pt-2`}>
        <div className="mx-auto max-w-2xl">
          <ListTabs />
          <SuggestView modo={modo} />
        </div>
      </main>
    </>
  );
}
