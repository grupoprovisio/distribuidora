/**
 * Recria a cada troca de aba e dá entrada suave só ao conteúdo da página.
 * Fica DENTRO do layout das abas de propósito: assim a nav flutuante permanece montada (o indicador desliza)
 * e nenhum `transform` de animação envolve elementos `fixed`.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
