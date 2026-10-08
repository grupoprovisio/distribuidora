import type { Metadata } from "next";
import { MarketplaceInfoPage } from "@/components/marketplace-info-page";
export const metadata: Metadata = { title: "Como funciona · Distribuidora" };
export default function HowItWorksPage() { return <MarketplaceInfoPage eyebrow="Operação híbrida B2B" title="Uma cadeia comercial com papéis claros." intro="Compradores encontram ofertas autorizadas, fornecedores publicam depois da homologação e vendedores aproximam as pontas com consentimento." bullets={["Produto mestre separado de oferta, estoque e organização vendedora.", "Distribuidora própria e parceiros seguem o mesmo núcleo comercial.", "Cotação, carrinho e pedido preservam fornecedor, preço e condições por subpedido.", "Dados externos não entram automaticamente no catálogo vendável."]} />; }
