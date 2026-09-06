# SSO

O modelo suporta OIDC e SAML.

OIDC:
- issuer
- clientId
- authorizationUrl
- tokenUrl
- jwksUrl

SAML:
- entityId
- ssoUrl
- certificatePem
- metadataUrl

O pacote não implementa um IdP completo. A integração deve validar `state`, `nonce`, assinatura SAML, audience, issuer, redirect URI e expiração de tokens.
