import type { NextConfig } from 'next';

/**
 * Política de segurança de conteúdo.
 *
 * Entra em `Report-Only` por omissão, e é uma decisão deliberada, não
 * preguiça: uma CSP imposta sem ter sido medida parte o site em silêncio para
 * quem já o tem em cache, e este site injeta estilos (Tailwind v4, next/font)
 * e usa GSAP e WebGL. O endpoint `/api/csp-report` regista as violações; quando
 * vierem a zero durante tráfego real, passa-se `CSP_REPORT_ONLY=false` e a
 * política passa a valer. É uma variável, não uma reescrita.
 *
 * Sem `nonce` por escolha: o nonce muda a cada pedido, o que obriga a gerá-lo
 * em middleware e torna dinâmica cada página. As dezasseis rotas públicas são
 * hoje estáticas ou pré-geradas; trocar isso por uma CSP mais apertada seria
 * pagar em tempo de carregamento — que é o que o utilizador sente — para
 * ganhar em rigor num vetor que o `'self'` já limita muito.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Estilos injetados em linha pelo Tailwind v4 e pelo next/font.
  "style-src 'self' 'unsafe-inline'",
  // O Next injeta scripts de arranque em linha. Sem `unsafe-eval`: se for
  // preciso, os relatórios dirão, em vez de o abrirmos por precaução.
  // Cal.com: o carregador do embed (/marcar) vem de app.cal.com.
  "script-src 'self' 'unsafe-inline' https://app.cal.com",
  // O calendário do Cal.com é um iframe de app.cal.com (cal.com redirige para lá).
  "frame-src 'self' https://app.cal.com https://cal.com",
  // `blob:` só cobre objectos criados pela própria página: o GLTFLoader do three
  // lê as texturas embutidas nos GLB do TerraBuild com fetch() de um URL blob:.
  "connect-src 'self' blob: https://app.cal.com",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
  'report-uri /api/csp-report',
].join('; ');

const reportOnly = process.env.CSP_REPORT_ONLY !== 'false';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    /**
     * As fotografias do News vêm do bucket público `news-imagens` (0023) do
     * Supabase. Só esse caminho é optimizado. `NEWS_QA_LOCAL=1` (só no build
     * de QA local) aceita um Supabase falso em 127.0.0.1.
     */
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/news-imagens/**' },
      ...(process.env.NEWS_QA_LOCAL === '1'
        ? [{ protocol: 'http' as const, hostname: '127.0.0.1', pathname: '/storage/v1/object/public/news-imagens/**' }]
        : []),
    ],
    dangerouslyAllowLocalIP: process.env.NEWS_QA_LOCAL === '1',
  },
  /** A fotografia do artigo chega a uma Server Action em WebP + JPEG (≤ 1,5 MB cada). */
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
  /**
   * O PDF do «Enquadramento preliminar» lê o Inter (subconjunto latino, OFL)
   * de lib/email/fontes em tempo de execução: o rastreio de ficheiros não o
   * vê sozinho, por isso inclui-se aqui na rota que envia o e-mail.
   */
  outputFileTracingIncludes: {
    '/api/diagnostico': ['./lib/email/fontes/**'],
    // A revista do News (PDF) embute a Newsreader (lib/news/fontes) e o Inter (lib/email/fontes), ambas OFL.
    '/news/revista.pdf': ['./lib/news/fontes/**', './lib/email/fontes/**'],
    '/en/news/revista.pdf': ['./lib/news/fontes/**', './lib/email/fontes/**'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
      {
        /**
         * Área administrativa e documentos com token nunca devem ser
         * indexados. O cabeçalho é a única defesa que funciona para páginas
         * que um motor de busca alcance por um link partilhado — o
         * `robots.txt` pede, o `X-Robots-Tag` impede.
         */
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          /**
           * `no-store` além do `X-Robots-Tag`: um ecrã de CRM não pode ficar
           * em cache de disco do browser nem em proxy intermédio. Sem isto,
           * quem usar o computador a seguir alcança pelo botão «voltar» uma
           * página que já devia exigir sessão — e o middleware nunca chega a
           * ser consultado, porque não há pedido nenhum.
           */
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
      {
        /**
         * Documentos de diagnóstico, endereçados por token.
         *
         * A rota ainda não existe — a camada de PDF está bloqueada em B-03 e
         * B-04. O cabeçalho entra ANTES dela de propósito: é a única das três
         * defesas que não depende de alguém se lembrar. Quando a rota for
         * escrita, já está protegida.
         *
         * `Referrer-Policy: no-referrer` é a que ninguém se lembra. A política
         * global é `strict-origin-when-cross-origin`, e o token viaja no
         * CAMINHO — qualquer ligação externa clicada a partir da página do
         * documento entregaria o token ao destino, no cabeçalho `Referer`.
         */
        source: '/documento/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        // Inquéritos: o mesmo caso dos documentos — o token vai no caminho.
        source: '/i/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        /**
         * Demonstração TerraBuild (D-41): números fictícios fora do índice em
         * toda a árvore, mesmo numa página nova que esqueça `noindex: true`.
         * As duas fontes, porque `:path*` não garante o caminho sem barra.
         * Sai quando houver um projeto real e autorizado.
         */
        source: '/projetos',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/projetos/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Pré-visualizações de QA (só com ADMIN_PREVIEW, nunca em produção):
        // fora dos motores de busca mesmo que algum dia respondam.
        source: '/qa/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' }],
      },
    ];
  },
};

export default nextConfig;
