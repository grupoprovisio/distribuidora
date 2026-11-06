import { NextResponse } from "next/server";

const destinations = ["/entrar", "/entrar?erro=confirmacao", "/redefinir-senha", "/app"] as const;
type AuthDestination = typeof destinations[number];
const allowedDestinations = new Set<string>(destinations);

export function authRedirect(destination: AuthDestination): NextResponse {
  if (!allowedDestinations.has(destination)) {
    throw new Error("Destino de autenticação inválido.");
  }
  // Caminhos relativos preservam a origem e os cookies mesmo quando Next normaliza request.url.
  // Nunca receber um destino, host ou protocolo fornecido pelo cliente.
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: destination,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Redirecionamento pós-login limitado a um slug de produto validado. */
export function authBuyerProductRedirect(slug: string): NextResponse {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) {
    return authRedirect("/app");
  }
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: "/app/comprador/catalogo?produto=" + encodeURIComponent(slug),
      "Cache-Control": "private, no-store",
    },
  });
}
