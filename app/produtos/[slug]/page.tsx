import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Boxes, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Detalhes do produto · Grupo Provisio",
  description: "Conheça os produtos da Provisio e consulte condições comerciais com sua conta empresarial.",
};
export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) notFound();

  const db = await createClient();
  // A consulta usa apenas a RPC pública, que aplica as regras comerciais,
  // publicação explícita, isolamento QA e proteção de dados privados.
  const terms = slug.split("-").filter(term => term.length > 2);
  const search = terms[0] ?? "";
  const { data, error } = await db.rpc("provisio_public_product_showcase", {
    p_search: search, p_limit: 50, p_offset: 0,
  });
  const product = (data ?? []).find(row => row.slug === slug);
  if (error || !product) notFound();

  const imageUrl = product.image_storage_path
    ? (await db.storage.from("provisio-produtos")
      .createSignedUrl(product.image_storage_path, 5 * 60)).data?.signedUrl ?? null
    : null;

  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Detalhes do produto" backHref="/produtos" showListButton={false} />
    <main className={`${WRAP} animate-page-in py-6 sm:py-10`}>
      <Link href="/produtos" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest hover:underline">
        <ArrowLeft size={17} aria-hidden /> Voltar ao catálogo
      </Link>
      <article className="mt-4 grid gap-6 rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-8 md:grid-cols-2">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-canvas text-forest">
          {imageUrl ? <Image src={imageUrl} alt={"Foto de " + product.product_name} fill unoptimized
            sizes="(max-width: 768px) 90vw, 45vw" className="object-contain p-5"/> :
            <Boxes size={64} strokeWidth={1.4} aria-label="Imagem não disponível" />}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-wide text-terra">{product.category_name}</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-forest-deep sm:text-4xl">{product.product_name}</h1>
          <p className="mt-5 flex items-start gap-2 text-sm font-semibold leading-relaxed text-muted">
            <MapPin size={18} className="mt-0.5 shrink-0 text-forest" aria-hidden />
            Regiões com atendimento anunciado: {product.regions?.join(", ") || "sob consulta"}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Preços, quantidades mínimas, embalagens e demais condições comerciais são apresentados
            na área do comprador, conforme sua empresa e região autorizada.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            A disponibilidade e o frete para seu CEP são confirmados durante a cotação.
          </p>
          <Link href={"/entrar?produto=" + encodeURIComponent(product.slug)}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-black text-white">
            Consultar preço e cotar <ArrowRight size={17} aria-hidden />
          </Link>
          <p className="mt-3 text-center text-xs text-muted">Acesso empresarial necessário para visualizar ofertas.</p>
        </div>
      </article>
    </main>
    <SiteFooter />
  </div>;
}
