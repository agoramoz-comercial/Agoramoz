import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Guarda da área administrativa.
 *
 * Ponto único: nenhuma página administrativa pode ser publicada sem passar por
 * aqui. As páginas voltam a verificar a sessão, e a base volta a verificar o
 * papel em cada escrita — três camadas, porque cada uma falha de maneira
 * diferente.
 *
 * ## Porque é que `/admin/entrar` deixou de devolver 404
 *
 * Este ficheiro devolvia 404 em todo o `/admin`, com o argumento de que um 401
 * confirma que existe ali uma área reservada. Era correcto enquanto não havia
 * nada para proteger — não havia sequer porta. A partir do momento em que
 * existe autenticação, alguma página tem de responder a quem tem direito a
 * entrar.
 *
 * O que substitui a obscuridade: limite de tentativas por origem e por conta,
 * erro único que não distingue conta inexistente de palavra-passe errada,
 * `X-Robots-Tag: noindex` já configurado em `next.config.ts`, e auditoria de
 * cada entrada. Tudo o resto de `/admin` continua a devolver 404 sem sessão —
 * um visitante sem credenciais não descobre que ecrãs existem.
 *
 * O `matcher` é estreito de propósito: middleware a correr em todas as rotas
 * torna dinâmico o que hoje é estático, e as dezasseis páginas públicas
 * perdiam a pré-geração.
 */

const ENTRADA = '/admin/entrar';

function naoExiste(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/nao-encontrado';
  return NextResponse.rewrite(url, { status: 404 });
}

export async function middleware(request: NextRequest) {
  // Lido directamente, e não por `serverEnv()`: o middleware corre no runtime
  // Edge, onde importar a validação inteira arrastaria o Zod para um sítio que
  // corre em cada pedido a `/admin`.
  const ligado = process.env.ADMIN === 'on';
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY;

  // Sem configuração, a área administrativa não existe — exactamente como
  // antes de haver autenticação.
  if (!ligado || !url || !chave) return naoExiste(request);

  // `NextResponse.next()` aqui e não no fim: é neste objeto que o Supabase
  // escreve os cookies renovados, e tem de ser o mesmo que se devolve.
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  /**
   * `getUser()` e não `getSession()`. O primeiro valida o token contra o
   * servidor de autenticação; o segundo devolve o que estiver no cookie, que é
   * o que o atacante controla. Esta chamada é também o que renova o token.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const naEntrada = request.nextUrl.pathname === ENTRADA;

  if (!user) return naEntrada ? resposta : naoExiste(request);

  // Já autenticado a bater na porta: segue para dentro.
  if (naEntrada) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/admin';
    destino.search = '';
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
