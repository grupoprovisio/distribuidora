// Cookie que só diz "quem está logado" (o e-mail da conta da Distribuidora) para as telas saberem de quem são as compras salvas.
// Não é a sessão: ela continua no cookie httpOnly do servidor. Este é legível pelo navegador, sem rede, e some no logout.
export const ACCOUNT_COOKIE = "abp_account";
