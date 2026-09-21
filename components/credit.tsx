import { WRAP } from "@/lib/ui";

export const AUTHOR = { name: "Distribuidora", url: "https://github.com/bvdistribuidoradesuprimentos-byte/distribuidora" } as const;

/** Link do autor para o GitHub (usado no rodapé e no popup de boas-vindas). */
export function AuthorLink({ className = "" }: { className?: string }) {
  return (
    <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer" className={`font-extrabold underline decoration-current/40 underline-offset-2 hover:decoration-current ${className}`}>
      {AUTHOR.name}
    </a>
  );
}

/** Rodapé de todas as telas: "Sistema desenvolvido com 💙 por Distribuidora". */
export function Credit() {
  return (
    <footer className={`${WRAP} pb-4 pt-10`}>
      <p className="text-center text-xs font-medium text-muted">
        Sistema desenvolvido com <span aria-label="amor">💙</span> por <AuthorLink className="text-forest" />
      </p>
    </footer>
  );
}
