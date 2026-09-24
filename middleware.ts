import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Guarda da área administrativa.
 *
 * Ainda não existe autenticação — e por isso `/admin` não existe para o
 * exterior. Devolve 404, não 401: um 401 confirma que existe ali uma área
 * reservada e convida a procurar a porta. O 404 é indistinguível de uma rota
 * que nunca existiu.
 *
 * Quando a autenticação entrar, é aqui que se troca o `notFound()` por uma
 * verificação de sessão. O ficheiro existe desde já para que essa troca seja
 * num sítio só, e para que nenhuma página administrativa possa ser publicada
 * sem passar por este ponto.
 *
 * O `matcher` é estreito de propósito: middleware a correr em todas as rotas
 * torna dinâmico o que hoje é estático, e as dezasseis páginas públicas
 * perdiam a pré-geração — e com ela o tempo de carregamento que custou a
 * conquistar.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/404';

  return NextResponse.rewrite(url, { status: 404 });
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
