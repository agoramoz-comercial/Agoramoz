# E-mail do «Enquadramento preliminar» (Resend)

Depois de uma submissão **nova** do diagnóstico, a pessoa recebe, de
`comercial@agoramoz.com`, um e-mail com o PDF «Enquadramento preliminar»
(problema preliminar, contexto, sponsor e decisão, elegibilidade preliminar,
decisão da fase, o que recebe no diagnóstico, garantias e próximos passos),
feito só com as respostas dela. Língua: pt; as outras recebem em inglês.

- Código: `lib/email/` (`enquadramento.ts` conteúdo, `pdf.ts` PDF com pdf-lib
  no design dos relatórios ZABATAINA, `html.ts` corpo do e-mail, `cta.ts` o
  botão de reunião, `enviar.ts` envio pela API da Resend).
- Tipo: Inter (subconjunto latino em TrueType, OFL) em `lib/email/fontes/`,
  incluído na função pelo `outputFileTracingIncludes` do `next.config.ts`.
  Sem as fontes, o PDF cai na Helvetica e continua a sair.
- Logótipo: vectorial no PDF (o mesmo desenho de `components/brand/Mark.tsx`)
  e `public/brand/email-logo-branco.png` no cabeçalho do e-mail.
- Disparo: `app/api/diagnostico/route.ts`, em `after()`, depois de a resposta
  sair; nunca atrasa nem parte o formulário. Repetições (`duplicate`) não
  voltam a enviar. Sem e-mail de seguimento sem consentimento (o schema exige-o).
- Logs sem endereços de e-mail nem chave.

## Configurar

1. **Resend → Domains → Add domain**
   - Name: `agoramoz.com`
   - Region: `eu-west-1` (Irlanda; serve bem Europa e África)
   - Custom Return-Path: `send` (o predefinido)
   - **Click tracking e open tracking: desligados.** O e-mail não leva píxeis
     nem ligações reescritas (privacidade/RGPD, e menos risco de spam).
2. **DNS**: a Resend mostra os registos a criar no DNS de `agoramoz.com`
   (normalmente 1 TXT DKIM em `resend._domainkey`, e em `send.agoramoz.com`
   1 MX e 1 TXT SPF). Criar exactamente como mostrados e esperar por «Verified».
   Recomendado também um DMARC: TXT em `_dmarc` com `v=DMARC1; p=none;`.
3. **Resend → API Keys**: criar uma chave com permissão «Sending access» só
   para `agoramoz.com`.
4. **Vercel → projecto agoramoz → Settings → Environment Variables**
   (Production):
   - `RESEND_API_KEY` = a chave (marcar como Sensitive). Nunca no Git nem no chat.
   - `EMAIL_LEADS` = `on`
   - Opcionais: `EMAIL_FROM` (predefinido `AGORAMOZ <comercial@agoramoz.com>`),
     `EMAIL_REPLY_TO` (predefinido `comercial@agoramoz.com`),
     `EMAIL_BCC_INTERNO` (cópia oculta para a equipa).
5. **Botão «Marcar reunião com um especialista» (Cal.com)**: quando houver
   conta, criar o evento e pôr na Vercel `CAL_LINK` = `utilizador/evento`
   (ex.: `agoramoz/especialista`; o mesmo formato da marcação no fim do
   diagnóstico) e, se for uma instalação própria, `CAL_ORIGIN`. O botão do
   e-mail e do PDF passa a levar à página **`/marcar`** do site (`/en/marcar`
   em inglês): o calendário do Cal.com embutido num painel de vidro, no design
   AGORAMOZ. O nome e o e-mail seguem no fragmento do URL (`#name=…&email=…`),
   que não chega a nenhum servidor, e pré-preenchem a marcação. A CSP permite
   `https://app.cal.com` (script, iframe, connect) e `https://cal.com` (iframe). Sem `CAL_LINK`, o botão diz «Falar com um especialista» e
   abre um e-mail para `comercial@agoramoz.com`.
6. Publicar de novo (as variáveis só valem num deploy novo) e fazer um
   diagnóstico de teste com um e-mail próprio.

## Desligar

`EMAIL_LEADS=off` (ou apagar a chave) e publicar. O formulário continua igual.
