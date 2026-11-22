# E-mail do «Enquadramento preliminar» (Resend)

Depois de uma submissão **nova** do diagnóstico, a pessoa recebe, de
`comercial@agoramoz.com`, um e-mail com o PDF «Enquadramento preliminar»
(problema preliminar, contexto, sponsor e decisão, elegibilidade preliminar,
decisão da fase, o que recebe no diagnóstico, garantias e próximos passos),
feito só com as respostas dela. Língua: pt; as outras recebem em inglês.

- Código: `lib/email/` (`enquadramento.ts` conteúdo, `pdf.ts` PDF com pdf-lib,
  `html.ts` corpo do e-mail, `enviar.ts` envio pela API da Resend).
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
5. Publicar de novo (as variáveis só valem num deploy novo) e fazer um
   diagnóstico de teste com um e-mail próprio.

## Desligar

`EMAIL_LEADS=off` (ou apagar a chave) e publicar. O formulário continua igual.
