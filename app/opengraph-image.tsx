import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AGORAMOZ — Infraestrutura digital para crescimento e produtividade';

export default function OpengraphImage() {
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

        <div style={{ color: '#fff', fontSize: 62, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2, maxWidth: 940 }}>
          Transformamos processos lentos e oportunidades perdidas em sistemas digitais.
        </div>

        <div style={{ color: '#8AB2D6', fontSize: 26 }}>
          Moçambique · Portugal · Brasil
        </div>
      </div>
    ),
    size,
  );
}
