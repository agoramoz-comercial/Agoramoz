'use client';

import { ViewTransition, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const profundidade = (c: string) => c.split('/').filter(Boolean).length;

/**
 * A transição exclusiva AGORAMOZ entre páginas («abertura»), para TODAS as
 * navegações internas, de uma vez, na casca — sem embrulhar cada page.tsx.
 *
 * O `key={pathname}` faz a página antiga sair e a nova entrar no mesmo commit
 * da navegação (que o App Router já corre dentro de uma Transition), e o
 * <ViewTransition> dá a cada uma a classe `pagina`: o CSS em globals.css faz
 * a antiga recuar para o fundo e a nova abrir-se por uma abertura em pílula.
 * Mudar só a query (?q=, ?seccao=) não muda o pathname: não há transição nem
 * remontagem (a pesquisa do Cívico e o jornal mantêm o estado).
 *
 * Direcção: descer na hierarquia (mais segmentos) é «avancar»; subir, ou o
 * botão de trás do browser, é «voltar». Vai para `html[data-nav]` num
 * layout effect — corre dentro do commit, antes de o browser calcular as
 * animações dos pseudo-elementos da transição.
 *
 * Sem suporte de View Transitions, o React troca a página sem animar e a
 * cortina TransicaoPagina faz de alternativa. Movimento reduzido: o CSS
 * reduz tudo a zero.
 */
export function TransicaoVista({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const anterior = useRef(pathname);
  const voltou = useRef(false);

  useLayoutEffect(() => {
    const marcar = () => {
      voltou.current = true;
    };
    window.addEventListener('popstate', marcar);
    return () => window.removeEventListener('popstate', marcar);
  }, []);

  useLayoutEffect(() => {
    if (anterior.current === pathname) return;
    const subir = voltou.current || profundidade(pathname) < profundidade(anterior.current);
    document.documentElement.dataset.nav = subir ? 'voltar' : 'avancar';
    voltou.current = false;
    anterior.current = pathname;
  }, [pathname]);

  return (
    <ViewTransition key={pathname} enter="pagina" exit="pagina" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
