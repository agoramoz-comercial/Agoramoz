'use client';

/**
 * Última linha de defesa: uma falha no próprio layout raiz, onde nem o
 * `error.tsx` chega. Tem de trazer o seu `<html>` e `<body>` e não pode contar
 * com nada — nem com o CSS da aplicação. Por isso os estilos são inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0a0a0b',
          color: '#ededeb',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <main>
          <p style={{ letterSpacing: '0.2em', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#8e8e96' }}>
            AGORAMOZ
          </p>
          <h1 style={{ marginTop: '1rem', fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', lineHeight: 1.1 }}>
            Alguma coisa falhou deste lado.
          </h1>
          <p style={{ marginTop: '1rem', color: '#8e8e96', maxWidth: '38ch', marginInline: 'auto', lineHeight: 1.6 }}>
            Não é culpa sua. Tente de novo; se voltar a acontecer, escreva para
            comercial@agoramoz.com.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              minHeight: '3rem',
              padding: '0 2rem',
              border: 0,
              background: '#e22a00',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tentar de novo
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.6875rem', color: '#5c5c63' }}>
              Referência: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
