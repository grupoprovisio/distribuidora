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
