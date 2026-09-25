import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState, primaryButton } from "@/components/section";
import { WRAP } from "@/lib/ui";

export default function NotFound() {
  return (
    <>
      <main className={`${WRAP} grid min-h-[calc(100dvh-6rem)] place-items-center py-10`}>
        <EmptyState
          icon={SearchX}
          title="Página não encontrada"
          text="O produto ou a página que você procura não existe mais."
          action={
            <Link href="/" className={primaryButton}>
              Voltar ao início
            </Link>
          }
        />
      </main>
    </>
  );
}
