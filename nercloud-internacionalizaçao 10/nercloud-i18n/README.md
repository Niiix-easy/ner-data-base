# NERCloud i18n

Internacionalização completa base para:
pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ja-JP, ko-KR, zh-CN.

Inclui:
- mensagens por locale
- locale padrão pt-BR
- detecção por Accept-Language
- cookie `nercloud_locale`
- seletor de idioma
- formatação de moeda, número, data e data/hora
- rotas `/pt-BR`, `/en-US`, etc.
- fallback para pt-BR
- middleware Next.js

## Integração no nercloudlocal

Copie:
- `messages/`
- `src/i18n/`
- `src/components/LanguageSwitcher.tsx`
- lógica de `middleware.ts`

Depois substitua strings fixas das telas por `getTranslations(locale)`.

Para APIs, envie/aceite `locale` e use `Intl` no lado de apresentação. Valores financeiros continuam armazenados em centavos e a moeda deve ser definida pela conta/plano, não apenas pelo idioma.
