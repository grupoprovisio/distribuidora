import { AppHeader } from "@/components/app-header";
import { SettingsForm } from "@/components/settings-form";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Configurações · Atacadão Best Price" };

export default function ConfiguracoesPage() {
  return (
    <>
      <AppHeader theme="forest" title="Configurações" backHref="/conta" />
      <main className={`${WRAP} pt-2`}>
        <div className="mx-auto max-w-2xl">
          <SettingsForm />
        </div>
      </main>
    </>
  );
}
