# AGORAMOZ — website

Sistema de segmentação e conversão para Moçambique, Portugal e Brasil.
Next.js 16 (App Router) · TypeScript · Tailwind v4 · GSAP 3.15 · Lenis.

```bash
pnpm install
pnpm dev            # desenvolvimento
pnpm build && pnpm start
pnpm lint && pnpm exec tsc --noEmit
```

## Como acrescentar uma vertical

Uma nova landing setorial é um **ficheiro de conteúdo**, não código novo:

1. Criar `content/sectors/<pais>/<setor>.ts` exportando um `SectorPage`.
2. Adicionar uma linha em `content/registry.ts` → `SECTOR_PAGES`.

A rota, o `generateStaticParams`, o sitemap, o hreflang, o seletor do hero,
o mega-menu e o footer passam a incluí-la automaticamente. O mesmo vale para
`content/solutions/`.

## Regras vinculativas

Não são preferências de estilo. Violá-las quebra a tese do site.

### Integridade de conteúdo

O que o documento estratégico proíbe está codificado nos tipos, não apenas
prometido — o proibido é **irrepresentável** e não compila:

- `ProofItem` não tem variante que aceite um depoimento em texto livre ou um
  nome de cliente. Existem quatro: `methodology`, `capability`,
  `conceptual-demo` (exige `disclaimer`, tipo literal) e `public-reference`
  (exige `sourceUrl` **e** `consentRef`).
- `CtaBlock` tem rótulos de tipo literal. Não há campos de urgência, escassez
  ou contagem decrescente — não existem no tipo.
- Um número só pode ser publicado através de `SourcedStat`, que exige fonte.
- Nunca garantir resultados comerciais. Garantir apenas compromissos técnicos.

### Contraste (valores calculados, verificados com axe)

- `--color-cta` (`#E22A00`) é o fundo do CTA primário em **qualquer**
  superfície. Nunca usar `--accent` como fundo com texto branco: em superfícies
  escuras resolve para `#FF3B10`, que dá 3,56:1 e reprova AA.
- `--accent` é cor de **texto e traço**. Resolve para `#B82200` em claro
  (6,15:1) e `#FF3B10` em escuro (5,46:1).
- `#00B060` e `#FFD62E` nunca são texto sobre branco. São traços, preenchimentos
  e nós de diagrama. O amarelo só emparelha com texto `--color-ink`.

### Superfícies

`<Section surface="light|tint|dark|deep">` escreve `data-surface`, que religa os
tokens semânticos (`--surface`, `--on-surface`, `--muted`, `--border`,
`--accent`, `--ok`). Os filhos leem só semântica — ficam corretos em qualquer
superfície. Não escrever variantes `dark:` em componentes.

### Movimento

Vale o contrato da skill `gsap-motion-architect`. Em particular:

- Um ScrollTrigger por animação de topo; valores dependentes de layout são
  funções, com `invalidateOnRefresh`.
- Todo o GSAP dentro de `useGSAP({ scope })`. `ScrollTrigger.getAll().length`
  tem de ser estável entre navegações (verificado: 17, constante).
- `prefers-reduced-motion` via `gsap.matchMedia()`, mais o interruptor do
  footer (`data-motion="reduced"`).
- Anti-FOUC: `[data-animate] { visibility: hidden }` + revelação por
  `autoAlpha` + fallback `<noscript>`. **Nunca** pôr `data-animate` num
  controlo interativo — tem de estar disponível no primeiro frame.
- `markers` atrás de `NODE_ENV !== 'production'`.

## Estrutura

```
app/                 rotas (App Router)
  [pais]/[setor]/    15 landings possíveis, dynamicParams = false
  solucoes/[solucao]/
  api/diagnostico/   stub: valida, pontua, regista — não persiste
content/             a fonte de verdade (types, registry, países, setores, soluções)
components/          ui/ layout/ home/ sections/ form/ motion/ seo/ brand/
lib/                 motion/ forms/ analytics/ seo/ utils/
```

## Variáveis de ambiente

| Variável | Efeito |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Domínio canónico (defeito: `https://agoramoz.com`) |
| `NEXT_PUBLIC_MOTION_DEBUG` | `1` expõe `window.__AGORAMOZ_ST__` para o harness de QA |
| `VERCEL_ENV` | Quando ≠ `production`, o `robots.txt` bloqueia toda a indexação |

## Por fazer

- Números de telefone e WhatsApp reais por país (`content/countries/*.ts`,
  campo `whatsapp`, hoje `null` — a UI esconde o botão em vez de mostrar um
  número inventado).
- Persistência de leads: `app/api/diagnostico/route.ts` é o único ponto a
  alterar para ligar a n8n ou a um CRM.
- As restantes 4 soluções e 14 verticais, à medida que existir evidência
  comercial — conforme a secção 15 do documento estratégico.
