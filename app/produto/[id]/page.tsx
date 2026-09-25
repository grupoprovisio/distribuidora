import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { ProductLookup } from "@/components/product-lookup";
import { skuInfo } from "@/lib/atacadao";
import { WRAP } from "@/lib/ui";

const SKU = /^\d{1,9}$/;

export async function generateMetadata(props: PageProps<"/produto/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const info = SKU.test(id) ? await skuInfo(id).catch(() => null) : null;
  return { title: info ? `${info.name} · Distribuidora` : "Produto · Distribuidora" };
}

/** Página do produto: `id` é o SKU da Distribuidora (o mesmo usado na lista e nos favoritos). */
export default async function ProductPage(props: PageProps<"/produto/[id]">) {
  const { id } = await props.params;
  if (!SKU.test(id)) notFound();

  const info = await skuInfo(id).catch(() => null);
  if (!info) notFound();

  return (
    <>
      <AppHeader theme="wine" title="Detalhes do produto" backHref="/buscar" />
      <main className={`${WRAP} animate-page-in pb-16 pt-2`}>
        {/* Preço na filial escolhida, semelhantes de outras marcas e filiais: tudo real, conforme as Configurações. */}
        <ProductLookup ean={info.ean} layout="page" />
      </main>
    </>
  );
}
