type AuthFailure = {
  code?: string;
  name?: string;
  status?: number;
  reasons?: unknown;
};

export function passwordUpdateErrorMessage(error: unknown): string {
  const failure: AuthFailure = error && typeof error === "object" ? error : {};
  if (failure.name === "AuthSessionMissingError") {
    return "Sua sessão expirou. Entre novamente ou solicite outro link de recuperação.";
  }
  if (failure.code === "weak_password" || failure.name === "AuthWeakPasswordError") {
    const reasons = Array.isArray(failure.reasons) ? failure.reasons : [];
    if (reasons.includes("pwned")) {
      return "Esta senha aparece em bases de senhas expostas. Escolha outra senha exclusiva.";
    }
    if (reasons.includes("length")) {
      return "A senha não atende ao tamanho mínimo exigido. Use uma senha mais longa.";
    }
    if (reasons.includes("characters")) {
      return "Use uma senha com letras maiúsculas, minúsculas, números e símbolos.";
    }
    return "A senha não atende aos requisitos de segurança. Escolha outra senha.";
  }
  switch (failure.code) {
    case "same_password":
      return "Escolha uma senha diferente da senha atual.";
    case "insufficient_aal":
      return "Confirme o código do seu autenticador para alterar a senha.";
    case "mfa_verification_failed":
    case "mfa_challenge_expired":
      return "Código incorreto ou expirado. Confira o autenticador e tente novamente.";
    case "mfa_factor_not_found":
      return "O autenticador selecionado não está disponível. Selecione outro autenticador ou tente novamente.";
    case "mfa_verification_rejected":
      return "Não foi possível confirmar o autenticador. Entre em contato com o suporte.";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
    case "bad_jwt":
    case "no_authorization":
      return "Sua sessão expirou. Entre novamente ou solicite outro link de recuperação.";
    case "reauthentication_needed":
    case "reauth_nonce_missing":
    case "reauthentication_not_valid":
      return "Por segurança, confirme novamente seu acesso antes de alterar a senha.";
    case "over_request_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
  }
  if (failure.status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
  }
  return "Não foi possível concluir a solicitação. Verifique sua conexão e tente novamente em instantes.";
}
