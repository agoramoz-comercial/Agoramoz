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
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
  'report-uri /api/csp-report',
].join('; ');

const reportOnly = process.env.CSP_REPORT_ONLY !== 'false';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: { formats: ['image/avif', 'image/webp'] },
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
    ];
  },
};

export default nextConfig;
