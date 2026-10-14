"use client";

import { ClipboardCheck, MapPinned, ShoppingBasket, Users } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { WRAP } from "@/lib/ui";

const advantages = [
  { icon: ShoppingBasket, title: "Portfólio com contexto", text: "Apresente soluções de abastecimento com produtos, apresentações e condições comerciais organizadas." },
  { icon: Users, title: "Relacionamento de verdade", text: "Acompanhe seus compradores com histórico e comunicação pensados para o negócio." },
  { icon: MapPinned, title: "Atuação por região", text: "Estruture sua carteira e oportunidades de acordo com seu território de atendimento." },
  { icon: ClipboardCheck, title: "Processos claros", text: "Pedidos, propostas e acompanhamento em uma jornada mais previsível para todos." },
];

export function VendorAdvantages() {
  return (
    <MotionConfig reducedMotion="user">
      <section className={`${WRAP} py-20 sm:py-24`} aria-labelledby="beneficios-vendedor">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#a16c43]">Por que fazer parte</p>
        <h2 id="beneficios-vendedor" className="mt-3 max-w-3xl text-3xl font-black tracking-[-.03em] sm:text-5xl">
          Tudo o que um bom vendedor precisa para <span className="text-[#597a4e]">ir mais longe.</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map(({ icon: Icon, title, text }, index) => (
            <motion.article
              key={title}
              className="rounded-[1.5rem] border border-[#e3e9df] bg-white p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#e8f0dc] text-[#23563f]">
                <Icon size={22} aria-hidden />
              </span>
              <h3 className="mt-6 text-xl font-extrabold leading-snug">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#64736a]">{text}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
