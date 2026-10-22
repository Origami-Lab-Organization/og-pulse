// Quem é a pessoa no Microsoft Entra, provado por id token — as mesmas checagens de
// `microsoft-sso`: assinatura no JWKS do tenant, `aud` igual ao NOSSO client id, `iss` e
// `tid` do NOSSO tenant, expiração. Nada do token vai para log, só o código do erro.

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "https://esm.sh/jose@5.9.6";

export interface IdentidadeEntra {
  /** Object id da pessoa no Entra — é por ele que o Graph acha as reuniões dela. */
  oid: string;
  email: string;
}

interface ClaimsEntra extends JWTPayload {
  oid?: string;
  tid?: string;
  email?: string;
  preferred_username?: string;
}

function identidadeDe(claims: ClaimsEntra, tenantId: string): IdentidadeEntra | null {
  if (claims.tid !== tenantId || !claims.oid) return null;
  const email = (claims.email ?? claims.preferred_username ?? "").trim().toLowerCase();
  return email.includes("@") ? { oid: claims.oid, email } : null;
}

export async function validarIdTokenEntra(
  idToken: string,
  clientId: string,
  tenantId: string,
): Promise<IdentidadeEntra | null> {
  try {
    const jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
    );
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience: clientId,
    });
    return identidadeDe(payload as ClaimsEntra, tenantId);
  } catch (error) {
    console.error("identidade Entra rejeitada:", (error as { code?: string }).code ?? "verificacao_falhou");
    return null;
  }
}
