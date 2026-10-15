import { ArrowUpRight, Mail } from "lucide-react";

/** No client PII collection before approved lead backend and privacy workflow. */
export function ContactForm() {
  return <div className="rounded-3xl bg-forest p-6 text-white sm:p-8">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Fale com a Provisio</p>
    <h2 className="mt-2 text-2xl font-black">Atendimento por e-mail</h2>
    <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-white/80">
      Nosso cadastro e atendimento pela plataforma ainda estão em desenvolvimento.
      Para conversar com a equipe, envie uma mensagem diretamente pelo seu aplicativo de e-mail.
      Não coletamos dados por formulários demonstrativos.
    </p>
    <a href="mailto:contato@grupoprovisio.com?subject=Contato%20pelo%20site%20Provisio" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-forest-deep focus-visible:ring-4 focus-visible:ring-white/50">
      <Mail size={16} aria-hidden /> Escrever para contato@grupoprovisio.com <ArrowUpRight size={16} aria-hidden />
    </a>
  </div>;
}
