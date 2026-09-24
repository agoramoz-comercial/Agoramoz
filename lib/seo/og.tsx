import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

/**
 * O cartão de partilha, num sítio só.
 *
 * Até 2026-09-24 não havia imagem nenhuma: a etiqueta `og:image` não era
 * emitida em página nenhuma, e cada ligação partilhada no LinkedIn e no
 * WhatsApp saía sem cartão. Isso já está corrigido. O que isto acrescenta é o
 * passo seguinte — cada página partilhar o SEU assunto em vez do mesmo texto
 * genérico. Quem recebe uma ligação para «Agentes de IA» vê «Agentes de IA»,
 * não «Moçambique · Portugal · Brasil».
 *
 * É só texto que já existe no conteúdo. Não há gerador público parametrizado
 * por query string: seria um renderizador de texto arbitrário no nosso
 * domínio, à disposição de quem quisesse fabricar um cartão com a nossa marca.
 */
export function ogImage({ eyebrow, title }: { eyebrow: string; title: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#050D1A',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 14, height: 56, background: '#00B060' }} />
            <div style={{ width: 14, height: 56, background: '#FF3B10' }} />
            <div style={{ width: 14, height: 56, background: '#FFD62E' }} />
          </div>
          <div style={{ color: '#fff', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>AGORAMOZ</div>
        </div>

        <div
          style={{
            color: '#fff',
            // Um título longo num corpo grande sai cortado. A escala é
            // grosseira de propósito: duas medidas chegam, e o texto vem do
            // conteúdo, que já é escrito curto.
            fontSize: title.length > 58 ? 52 : 62,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 940,
          }}
        >
          {title}
        </div>

        <div style={{ color: '#8AB2D6', fontSize: 26 }}>{eyebrow}</div>
      </div>
    ),
    OG_SIZE,
  );
}
